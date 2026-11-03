import { useEffect, useRef, useState } from 'react';
import { QuestionCard, type AnswerResult } from '../components/QuestionCard';
import { placementQuestions } from '../engine/placement';
import { createRng } from '../engine/rng';
import { todayLocal } from '../engine/dates';
import { useGame } from '../state/GameContext';
import styles from './SystemsCheck.module.css';

export const LOGGED_MS = 700;

export function SystemsCheck() {
  const { dispatch } = useGame();
  const [questions] = useState(() => placementQuestions(createRng(Date.now())));
  const [index, setIndex] = useState(0);
  const [logged, setLogged] = useState(false);
  const lastAt = useRef(performance.now());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const q = questions[index];

  const handleAnswer = (r: AnswerResult) => {
    if (!q || logged) return;
    const now = performance.now();
    const raw = (now - lastAt.current) / 1000;
    const activeSeconds = Number.isFinite(raw) ? Math.max(0, raw) : 0;
    lastAt.current = now;
    dispatch({
      type: 'answer',
      factId: q.factId,
      answer: { correct: r.correct, responseMs: r.responseMs, interrupted: r.interrupted },
      today: todayLocal(),
      mode: 'placement',
      activeSeconds,
    });
    if (index + 1 >= questions.length) {
      dispatch({ type: 'finishPlacement' });
      return;
    }
    setLogged(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setLogged(false);
      setIndex((i) => i + 1);
    }, LOGGED_MS);
  };

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Systems Check</h1>
        <p className={styles.progress}>{`${Math.min(index + 1, questions.length)} / ${questions.length}`}</p>
      </header>
      <p className={styles.sub}>Checking the rocket's systems...</p>
      <div className={styles.main}>
        {logged ? (
          <p className={styles.logged} role="status">logged!</p>
        ) : q ? (
          <QuestionCard key={index} question={q} onAnswer={handleAnswer} />
        ) : null}
      </div>
    </div>
  );
}
