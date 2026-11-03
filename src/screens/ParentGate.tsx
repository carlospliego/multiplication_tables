import { useState } from 'react';
import { NumberPad } from '../components/NumberPad';
import { Starfield } from '../components/Starfield';
import { randInt } from '../engine/rng';
import type { Rng } from '../engine/types';
import { useGame } from '../state/GameContext';
import styles from './ParentGate.module.css';

function newProblem(rng: Rng): { a: number; b: number } {
  return { a: randInt(11, 29, rng), b: randInt(11, 29, rng) };
}

export function ParentGate({ rng }: { rng: Rng }) {
  const { dispatch } = useGame();
  const [problem, setProblem] = useState(() => newProblem(rng));
  const [value, setValue] = useState('');
  const [missed, setMissed] = useState(false);

  const submit = () => {
    if (Number(value) === problem.a * problem.b) {
      dispatch({ type: 'navigate', screen: 'parent' });
      return;
    }
    setProblem(newProblem(rng));
    setValue('');
    setMissed(true);
  };

  return (
    <main className={styles.screen}>
      <Starfield />
      <h1 className={styles.problem} data-testid="gate-problem">{`Grown-ups only: what is ${problem.a} × ${problem.b}?`}</h1>
      <p className={styles.note} role="status">{missed ? 'Not quite — try this one' : ' '}</p>
      <output className={styles.answer} aria-label="Your answer">{value || ' '}</output>
      <NumberPad value={value} onChange={setValue} onSubmit={submit} maxDigits={4} />
      <button type="button" className={styles.close} onClick={() => dispatch({ type: 'navigate', screen: 'map' })}>
        Close
      </button>
    </main>
  );
}
