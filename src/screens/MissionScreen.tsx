import { useCallback, useEffect, useRef, useState } from 'react';
import { todayLocal } from '../engine/dates';
import { DIFFICULTY, difficultyOf } from '../engine/difficulty';
import { shipParts } from '../engine/facts';
import { missionForToday } from '../engine/mission';
import type { MissionStep } from '../engine/mission';
import { createRng } from '../engine/rng';
import { buildQuest, buildWarmup } from '../engine/scheduler';
import { availableBoss } from '../engine/progress';
import type { AnswerInput, FactId, PlanetId, Question } from '../engine/types';
import { useQuestSession } from '../hooks/useQuestSession';
import { useGame } from '../state/GameContext';
import { playFacts } from '../storage/save';
import { skipTablesOf } from '../skip';
import { BossScreen } from './BossScreen';
import { MissionComplete } from './MissionComplete';
import { QuestScreen } from './QuestScreen';

const TITLES: Partial<Record<MissionStep, string>> = {
  warmup: 'Warm-up',
  quest1: 'Quest 1',
  quest2: 'Quest 2',
  quest3: 'Quest 3',
};

type Summary = { answered: number; lightning: number };

function MissionQuest({ step }: { step: 'warmup' | 'quest1' | 'quest2' | 'quest3' }) {
  const { state, dispatch, session } = useGame();
  const [rng] = useState(() => createRng(Date.now()));
  const save = state.save!;
  const difficulty = difficultyOf(save.settings);
  const { fastMs, questSize } = DIFFICULTY[difficulty];
  // Resumed from the session if this exact quest was in progress; otherwise built once per
  // mount (the parent keys this component by step) from the latest facts.
  const quest = useQuestSession(
    session,
    { kind: 'mission', owner: save.createdAt, day: todayLocal(), step, difficulty, skip: skipTablesOf(save.settings).join(',') },
    (): Question[] => {
      const today = todayLocal();
      const facts = playFacts(save);
      return step === 'warmup'
        ? buildWarmup(facts, today, rng)
        : buildQuest(facts, { today, allowNew: true, size: questSize }, rng);
    },
  );

  const onAnswer = useCallback(
    (factId: FactId, answer: AnswerInput, activeSeconds: number) =>
      dispatch({ type: 'answer', factId, answer, today: todayLocal(), mode: 'normal', activeSeconds }),
    [dispatch],
  );
  const parts = shipParts(save.bossesBeaten, playFacts(save));
  const clearQuest = quest.clear;
  const onComplete = useCallback(
    (summary: Summary) => {
      clearQuest();
      dispatch({ type: 'advanceMission', today: todayLocal(), summary });
    },
    [dispatch, clearQuest],
  );
  const onExit = useCallback(() => dispatch({ type: 'navigate', screen: 'map' }), [dispatch]);

  return (
    <QuestScreen
      title={TITLES[step] as string}
      queue={quest.queue}
      rng={rng}
      parts={parts}
      fastMs={fastMs}
      initialRun={quest.initialRun}
      initialIntroduced={quest.initialIntroduced}
      onProgress={quest.saveProgress}
      onAnswer={onAnswer}
      onComplete={onComplete}
      onExit={onExit}
    />
  );
}

function MissionBoss() {
  const { state, dispatch } = useGame();
  const [rng] = useState(() => createRng(Date.now()));
  // Captured once when the step starts so later progress can't change the boss mid-fight.
  const [planet] = useState<PlanetId | null>(() =>
    availableBoss(playFacts(state.save!), state.save!.bossesBeaten),
  );
  const [facts] = useState(() => playFacts(state.save!));
  const advanced = useRef(false);

  useEffect(() => {
    if (planet === null && !advanced.current) {
      advanced.current = true;
      dispatch({ type: 'advanceMission', today: todayLocal() });
    }
  }, [planet, dispatch]);

  const onAnswer = useCallback(
    (factId: FactId, answer: AnswerInput, activeSeconds: number) =>
      dispatch({ type: 'answer', factId, answer, today: todayLocal(), mode: 'normal', activeSeconds }),
    [dispatch],
  );
  // Saved the moment the boss falls (idempotent), so closing the app before Continue keeps the win.
  const onWon = useCallback(() => {
    if (planet !== null) dispatch({ type: 'bossBeaten', planet });
  }, [dispatch, planet]);
  const onExit = useCallback(() => dispatch({ type: 'navigate', screen: 'map' }), [dispatch]);
  const onFinish = useCallback(
    (result: 'won' | 'retreated', summary: Summary) => {
      if (advanced.current || planet === null) return;
      advanced.current = true;
      dispatch({
        type: 'advanceMission',
        today: todayLocal(),
        summary,
        ...(result === 'won' ? { bossWon: planet } : {}),
      });
    },
    [dispatch, planet],
  );

  if (planet === null) return null;
  const fastMs = DIFFICULTY[difficultyOf(state.save!.settings)].fastMs;
  return <BossScreen key={`boss-${planet}`} planet={planet} facts={facts} rng={rng} fastMs={fastMs} onAnswer={onAnswer} onWon={onWon} onExit={onExit} onFinish={onFinish} />;
}

export function MissionScreen() {
  const { state, dispatch } = useGame();
  const today = todayLocal();
  const mission = missionForToday(state.save?.mission ?? null, today);
  const needsStart = !state.save?.mission || state.save.mission.day !== today;

  useEffect(() => {
    if (needsStart) dispatch({ type: 'startMission', today });
  }, [needsStart, today, dispatch]);

  if (!state.save) return null;
  switch (mission.step) {
    case 'warmup':
    case 'quest1':
    case 'quest2':
    case 'quest3':
      return <MissionQuest key={mission.step} step={mission.step} />;
    case 'boss':
      return <MissionBoss key="boss" />;
    case 'complete':
      return <MissionComplete />;
  }
}
