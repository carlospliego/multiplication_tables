import { DotGrid } from './DotGrid';
import { tipFor } from '../engine/facts';
import type { Question } from '../engine/types';
import styles from './DiscoveryCard.module.css';

export function DiscoveryCard({ question, onContinue }: { question: Question; onContinue(): void }) {
  return (
    <section className={styles.card} aria-label="New discovery">
      <h2 className={styles.title}>New Discovery!</h2>
      <p className={styles.fact}>{`${question.a} × ${question.b} = ${question.answer}`}</p>
      <DotGrid rows={question.a} cols={question.b} />
      <p className={styles.tip}>{tipFor(question.factId)}</p>
      <button type="button" className={styles.button} onClick={onContinue}>
        Got it!
      </button>
    </section>
  );
}
