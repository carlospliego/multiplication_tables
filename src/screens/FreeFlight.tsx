import { useCallback, useState } from 'react';
import { todayLocal } from '../engine/dates';
import { createRng } from '../engine/rng';
import { buildQuest } from '../engine/scheduler';
import type { AnswerInput, FactId, Question } from '../engine/types';
import { PLANETS } from '../engine/facts';
import { useGame } from '../state/GameContext';
import { QuestScreen } from './QuestScreen';

function FreeFlightRound({ onNext }: { onNext(): void }) {
  const { state, dispatch } = useGame();
  const [rng] = useState(() => createRng(Date.now()));
  const [queue] = useState<Question[]>(() =>
    buildQuest(state.save!.facts, { today: todayLocal(), allowNew: false }, rng),
  );
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
      parts={state.save!.bossesBeaten.map((p) => PLANETS[p - 1]!.shipPart)}
      onAnswer={onAnswer}
      onComplete={onNext}
      onExit={onExit}
    />
  );
}

export function FreeFlight() {
  const [round, setRound] = useState(0);
  const next = useCallback(() => setRound((r) => r + 1), []);
  return <FreeFlightRound key={round} onNext={next} />;
}
