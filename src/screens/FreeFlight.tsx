import { useCallback, useState } from 'react';
import { todayLocal } from '../engine/dates';
import { DIFFICULTY, difficultyOf } from '../engine/difficulty';
import { useQuestSession } from '../hooks/useQuestSession';
import { createRng } from '../engine/rng';
import { buildQuest } from '../engine/scheduler';
import type { AnswerInput, FactId, Question } from '../engine/types';
import { shipParts } from '../engine/facts';
import { useGame } from '../state/GameContext';
import { QuestScreen } from './QuestScreen';

function FreeFlightRound({ onNext }: { onNext(): void }) {
  const { state, dispatch, session } = useGame();
  const [rng] = useState(() => createRng(Date.now()));
  const save = state.save!;
  const difficulty = difficultyOf(save.settings);
  const { fastMs, questSize } = DIFFICULTY[difficulty];
  const quest = useQuestSession(
    session,
    { kind: 'freeFlight', owner: save.createdAt, day: todayLocal(), difficulty },
    (): Question[] => buildQuest(save.facts, { today: todayLocal(), allowNew: false, size: questSize }, rng),
  );
  const queue = quest.queue;
  const clearQuest = quest.clear;
  const onComplete = useCallback(() => {
    clearQuest();
    onNext();
  }, [clearQuest, onNext]);
  const onAnswer = useCallback(
    (factId: FactId, answer: AnswerInput, activeSeconds: number) =>
      dispatch({ type: 'answer', factId, answer, today: todayLocal(), mode: 'normal', activeSeconds }),
    [dispatch],
  );
  const onExit = useCallback(() => dispatch({ type: 'navigate', screen: 'map' }), [dispatch]);
  if (queue.length === 0) {
    return (
      <main>
        <p>Nothing to practise yet. Complete a mission first!</p>
        <button type="button" onClick={onExit}>Back to the map</button>
      </main>
    );
  }
  return (
    <QuestScreen
      title="Free Flight"
      queue={queue}
      rng={rng}
      parts={shipParts(save.bossesBeaten)}
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

export function FreeFlight() {
  const [round, setRound] = useState(0);
  const next = useCallback(() => setRound((r) => r + 1), []);
  return <FreeFlightRound key={round} onNext={next} />;
}
