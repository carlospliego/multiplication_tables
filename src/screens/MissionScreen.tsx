import { useCallback, useEffect, useRef, useState } from 'react';
import { todayLocal } from '../engine/dates';
import { missionForToday } from '../engine/mission';
import type { MissionStep } from '../engine/mission';
import { createRng } from '../engine/rng';
import { buildQuest, buildWarmup } from '../engine/scheduler';
import type { AnswerInput, FactId, Question } from '../engine/types';
import { useGame } from '../state/GameContext';
import { MissionComplete } from './MissionComplete';
import { QuestScreen } from './QuestScreen';

const TITLES: Partial<Record<MissionStep, string>> = {
  warmup: 'Warm-up',
  quest1: 'Quest 1',
  quest2: 'Quest 2',
  quest3: 'Quest 3',
};

function MissionQuest({ step }: { step: 'warmup' | 'quest1' | 'quest2' | 'quest3' }) {
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
    () => dispatch({ type: 'advanceMission', today: todayLocal() }),
    [dispatch],
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

function BossPlaceholder() {
  const { dispatch } = useGame();
  const advanced = useRef(false);
  useEffect(() => {
    if (advanced.current) return;
    advanced.current = true;
    dispatch({ type: 'advanceMission', today: todayLocal() });
  }, [dispatch]);
  return null;
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
      return <BossPlaceholder key="boss" />;
    case 'complete':
      return <MissionComplete />;
  }
}
