import { useState } from 'react';
import { NumberPad } from './NumberPad';
import { DotGrid } from './DotGrid';
import { tipFor } from '../engine/facts';
import type { Question } from '../engine/types';
import styles from './RepairScreen.module.css';

export function RepairScreen({ question, onDone }: { question: Question; onDone(): void }) {
  const [value, setValue] = useState('');
  const [tryAgain, setTryAgain] = useState(false);

  const submit = () => {
    if (value.length === 0) return;
    if (parseInt(value, 10) === question.answer) {
      onDone();
    } else {
      setValue('');
      setTryAgain(true);
    }
  };

  return (
    <section className={styles.card} aria-label="Let's fix it">
      <p className={styles.fact}>{`${question.a} × ${question.b} = ${question.answer}`}</p>
      <DotGrid rows={question.a} cols={question.b} />
      <p className={styles.tip}>{tipFor(question.factId)}</p>
      <p className={styles.prompt} role="status">
        {tryAgain ? 'Almost! Type the answer shown above.' : 'Type the answer to lock it in.'}
      </p>
      <output className={styles.answer} aria-label="Your answer">{value || '?'}</output>
      <NumberPad value={value} onChange={setValue} onSubmit={submit} />
    </section>
  );
}
