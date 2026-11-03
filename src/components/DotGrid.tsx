import styles from './DotGrid.module.css';

export function DotGrid({ rows, cols }: { rows: number; cols: number }) {
  return (
    <div
      className={styles.grid}
      role="img"
      aria-label={`${rows} rows of ${cols} dots`}
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
    >
      {Array.from({ length: rows * cols }, (_, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const cls = [styles.dot, r % 2 === 0 ? styles.even : styles.odd, c === 4 ? styles.gapLeft : '']
          .filter(Boolean)
          .join(' ');
        return <span key={i} className={cls} aria-hidden="true" />;
      })}
    </div>
  );
}
