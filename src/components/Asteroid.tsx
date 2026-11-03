import styles from './Asteroid.module.css';

function polar(r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [60 + r * Math.cos(a), 60 + r * Math.sin(a)];
}

/** Boss asteroid wrapped in `max` shield arc segments; the first `shield` are lit. */
export function Asteroid({ shield, max = 12, size = 200 }: { shield: number; max?: number; size?: number }) {
  const on = Math.max(0, Math.min(max, Math.round(shield)));
  const step = 360 / max;
  const gap = 6;
  return (
    <svg className={styles.asteroid} width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={`Asteroid shield ${on} of ${max}`}>
      <g className={styles.rock}>
        <path d="M60 24 L82 30 L94 50 L90 74 L72 92 L46 94 L28 78 L26 52 L38 32 Z" fill="#7a6a8a" stroke="#0b1030" strokeWidth="4" strokeLinejoin="round" />
        <circle cx="48" cy="52" r="7" fill="#5c4e6e" />
        <circle cx="72" cy="68" r="9" fill="#5c4e6e" />
        <circle cx="60" cy="40" r="4" fill="#5c4e6e" />
        <circle cx="50" cy="52" r="3.5" fill="#fff" /><circle cx="70" cy="52" r="3.5" fill="#fff" />
        <path d="M46 40 L56 45 M74 40 L64 45" stroke="#0b1030" strokeWidth="3" strokeLinecap="round" />
      </g>
      {Array.from({ length: max }, (_, i) => {
        const a0 = i * step + gap / 2;
        const a1 = (i + 1) * step - gap / 2;
        const [x0, y0] = polar(54, a0);
        const [x1, y1] = polar(54, a1);
        const lit = i < on;
        return (
          <path
            key={i}
            data-seg={lit ? 'on' : 'off'}
            d={`M${x0.toFixed(2)} ${y0.toFixed(2)} A54 54 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`}
            fill="none"
            stroke={lit ? '#35e0ff' : '#2a3070'}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={lit ? undefined : '1 6'}
          />
        );
      })}
    </svg>
  );
}
