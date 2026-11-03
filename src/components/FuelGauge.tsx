import { useRef } from 'react';
import styles from './FuelGauge.module.css';

/** Vertical fuel bar. Monotonic: never displays less than it has already shown. */
export function FuelGauge({ fraction }: { fraction: number }) {
  const shown = useRef(0);
  const f = Number.isFinite(fraction) ? Math.min(1, Math.max(0, fraction)) : 0;
  shown.current = Math.max(shown.current, f);
  const pct = Math.round(shown.current * 100);
  return (
    <div className={styles.gauge} role="meter" aria-label="Fuel" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-valuetext={`${pct}%`}>
      <div className={styles.track}>
        <div className={styles.fill} style={{ height: `${pct}%` }} />
      </div>
      <span className={styles.label}>{`${pct}%`}</span>
    </div>
  );
}
