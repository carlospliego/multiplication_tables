import { useEffect, useRef, useState } from 'react';
import { NumberPad } from './NumberPad';
import { useQuestionTimer } from '../hooks/useQuestionTimer';
import type { Question } from '../engine/types';
import styles from './QuestionCard.module.css';

export interface AnswerResult {
  value: number;
  correct: boolean;
  responseMs: number;
  interrupted: boolean;
}

const FALLBACK_MS = 600;

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Callers should pass a `key` that changes per question to reset state. */
export function QuestionCard({ question, onAnswer }: { question: Question; onAnswer(r: AnswerResult): void }) {
  const [value, setValue] = useState('');
  const [locked, setLocked] = useState(false);
  const lockedRef = useRef(false);
  const timer = useQuestionTimer();
  const { start } = timer;

  useEffect(() => {
    if (prefersReducedMotion()) {
      start();
      return;
    }
    const id = setTimeout(start, FALLBACK_MS);
    return () => clearTimeout(id);
  }, [start]);

  const submit = () => {
    if (lockedRef.current || value.length === 0) return;
    lockedRef.current = true;
    setLocked(true);
    const { responseMs, interrupted } = timer.stop();
    const n = parseInt(value, 10);
    onAnswer({ value: n, correct: n === question.answer, responseMs, interrupted });
  };

  return (
    <section className={styles.card} onAnimationEnd={timer.start} aria-label="Question">
      <h2 className={styles.question}>{`${question.a} × ${question.b}`}</h2>
      <output className={styles.answer} aria-live="polite" aria-label="Your answer">
        {value || '?'}
      </output>
      <NumberPad value={value} onChange={setValue} onSubmit={submit} disabled={locked} />
    </section>
  );
}
