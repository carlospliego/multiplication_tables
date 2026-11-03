import styles from './LightningBurst.module.css';

export function LightningBurst() {
  return (
    <p className={styles.burst} role="status">
      <span aria-hidden="true">⚡ </span>Lightning!
    </p>
  );
}
