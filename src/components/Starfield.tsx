import styles from './Starfield.module.css';

// Deterministic pseudo-random star layout so renders are stable.
const STARS = Array.from({ length: 40 }, (_, i) => ({
  x: (i * 37 + 11) % 100,
  y: (i * 53 + 7) % 100,
  r: 0.15 + ((i * 7) % 5) * 0.07,
  d: (i % 6) * 0.5,
}));

export function Starfield() {
  return (
    <svg className={styles.field} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      {STARS.map((s, i) => (
        <circle key={i} className={styles.star} cx={s.x} cy={s.y} r={s.r} fill="#f4f6ff" style={{ animationDelay: `${s.d}s` }} />
      ))}
    </svg>
  );
}
