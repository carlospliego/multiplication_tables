import { useCallback, useEffect, useRef, useState } from 'react';
import { todayLocal } from '../engine/dates';
import { missionForToday } from '../engine/mission';
import type { MissionStep } from '../engine/mission';
import { createRng } from '../engine/rng';
import { buildQuest, buildWarmup } from '../engine/scheduler';
import { availableBoss } from '../engine/progress';
import type { AnswerInput, FactId, PlanetId, Question } from '../engine/types';
import { useGame } from '../state/GameContext';
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

function MissionQuest({ step, onSummary }: { step: 'warmup' | 'quest1' | 'quest2' | 'quest3'; onSummary(s: Summary): void }) {
  const { state, dispatch } = useGame();
  const [rng] = useState(() => createRng(Date.now()));
  // Built once per mount (the parent keys this component by step), from the latest facts.
  const [queue] = useState<Question[]>(() => {
    const facts = state.save!.facts;
    const today = todayLocal();
    return step === 'warmup'
      ? buildWarmup(facts, today, rng)
      : buildQuest(facts, { today, allowNew: true }, rng);
  });

  const onAnswer = useCallback(
    (factId: FactId, answer: AnswerInput, activeSeconds: number) =>
      dispatch({ type: 'answer', factId, answer, today: todayLocal(), mode: 'normal', activeSeconds }),
    [dispatch],
  );
  const onComplete = useCallback(
    (summary: Summary) => {
      onSummary(summary);
      dispatch({ type: 'advanceMission', today: todayLocal() });
    },
    [dispatch, onSummary],
  );
  const onExit = useCallback(() => dispatch({ type: 'navigate', screen: 'map' }), [dispatch]);

  return (
    <QuestScreen
      title={TITLES[step] as string}
      queue={queue}
      rng={rng}
      onAnswer={onAnswer}
      onComplete={onComplete}
      onExit={onExit}
    />
  );
}

function MissionBoss({ onWon }: { onWon(planet: PlanetId): void }) {
  const { state, dispatch } = useGame();
  const [rng] = useState(() => createRng(Date.now()));
  // Captured once when the step starts so later progress can't change the boss mid-fight.
  const [planet] = useState<PlanetId | null>(() =>
    availableBoss(state.save!.facts, state.save!.bossesBeaten),
  );
  const [facts] = useState(() => state.save!.facts);
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
  const onFinish = useCallback(
    (result: 'won' | 'retreated') => {
      if (advanced.current || planet === null) return;
      advanced.current = true;
      if (result === 'won') {
        onWon(planet);
        dispatch({ type: 'bossBeaten', planet });
      }
      dispatch({ type: 'advanceMission', today: todayLocal() });
    },
    [dispatch, planet, onWon],
  );

  if (planet === null) return null;
  return <BossScreen key={`boss-${planet}`} planet={planet} facts={facts} rng={rng} onAnswer={onAnswer} onFinish={onFinish} />;
}

export function MissionScreen() {
  const { state, dispatch } = useGame();
  const today = todayLocal();
  const mission = missionForToday(state.save?.mission ?? null, today);
  const [totals, setTotals] = useState<Summary>({ answered: 0, lightning: 0 });
  const [bossWon, setBossWon] = useState<PlanetId | null>(null);
  const addSummary = useCallback(
    (s: Summary) => setTotals((t) => ({ answered: t.answered + s.answered, lightning: t.lightning + s.lightning })),
    [],
  );
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
      return <MissionQuest key={mission.step} step={mission.step} onSummary={addSummary} />;
    case 'boss':
      return <MissionBoss key="boss" onWon={setBossWon} />;
    case 'complete':
      return <MissionComplete answered={totals.answered} lightning={totals.lightning} bossWon={bossWon} />;
  }
}
