import type { ReactNode } from 'react';
import type { PlanetId } from '../engine/types';
import { PLANETS } from '../engine/facts';
import styles from './Planet.module.css';

export type PlanetState = 'locked' | 'open' | 'frontier' | 'boss' | 'freed';

const COLORS: Record<number, { base: string; shade: string }> = {
  1: { base: '#8dff4f', shade: '#3fae1c' },
  2: { base: '#35e0ff', shade: '#1b8fb0' },
  3: { base: '#ffd23f', shade: '#d9941a' },
  4: { base: '#ff4fd8', shade: '#b21f94' },
  5: { base: '#ff8a2b', shade: '#c24f0c' },
  6: { base: '#9b7bff', shade: '#5a3fc4' },
  7: { base: '#ff5c6c', shade: '#b52a3a' },
  8: { base: '#4fe0a8', shade: '#1b9a70' },
  9: { base: '#ffe27a', shade: '#e0a72b' },
};

/** One simple surface feature per planet, drawn in a 100x100 box. */
function feature(id: number): ReactNode {
  const f = 'rgba(255,255,255,0.45)';
  switch (id) {
    case 1: return <><circle cx="38" cy="40" r="9" fill={f} /><circle cx="64" cy="62" r="6" fill={f} /><circle cx="58" cy="30" r="4" fill={f} /></>;
    case 2: return <><rect x="14" y="42" width="72" height="8" rx="4" fill={f} /><rect x="20" y="60" width="60" height="8" rx="4" fill={f} /></>;
    case 3: return <><ellipse cx="50" cy="50" rx="52" ry="9" fill="none" stroke="#fff" strokeWidth="5" opacity="0.7" /></>;
    case 4: return <><path d="M30 34 L44 34 L37 46 Z M58 58 L74 58 L66 72 Z" fill={f} /></>;
    case 5: return <><path d="M22 66 Q36 48 50 66 Q64 48 78 66" fill="none" stroke={f} strokeWidth="6" strokeLinecap="round" /><circle cx="42" cy="32" r="6" fill={f} /></>;
    case 6: return <><circle cx="36" cy="38" r="10" fill="none" stroke={f} strokeWidth="5" /><circle cx="64" cy="60" r="12" fill="none" stroke={f} strokeWidth="5" /></>;
    case 7: return <><path d="M50 18 L54 40 L76 40 L58 53 L65 74 L50 61 L35 74 L42 53 L24 40 L46 40 Z" fill={f} /></>;
    case 8: return <><circle cx="38" cy="36" r="6" fill={f} /><circle cx="60" cy="30" r="6" fill={f} /><circle cx="68" cy="52" r="6" fill={f} /><circle cx="44" cy="62" r="6" fill={f} /><circle cx="28" cy="56" r="6" fill={f} /></>;
    default: return <><path d="M50 22 L56 40 L76 40 L60 52 L66 70 L50 59 L34 70 L40 52 L24 40 L44 40 Z" fill="#fff" opacity="0.6" /></>;
  }
}

const STATE_LABEL: Record<PlanetState, string> = {
  locked: 'locked',
  open: 'open',
  frontier: 'next stop',
  boss: 'boss battle',
  freed: 'freed',
};

export function Planet({ planet, state, size = 96 }: { planet: PlanetId; state: PlanetState; size?: number }) {
  const info = PLANETS[planet - 1]!;
  const c = COLORS[planet]!;
  const locked = state === 'locked';
  const clip = `planet-clip-${planet}`;
  return (
    <svg
      className={`${styles.planet} ${styles[state]}`}
      width={size}
      height={size}
      viewBox="-8 -8 116 116"
      role="img"
      aria-label={`${info.name}, ${STATE_LABEL[state]}`}
    >
      <defs>
        <clipPath id={clip}><circle cx="50" cy="50" r="42" /></clipPath>
      </defs>
      {state === 'frontier' && <circle className={styles.pulse} cx="50" cy="50" r="48" fill="none" stroke="#35e0ff" strokeWidth="4" strokeDasharray="8 6" />}
      {state === 'boss' && <circle className={styles.pulse} cx="50" cy="50" r="48" fill="none" stroke="#ff5c6c" strokeWidth="5" />}
      {state === 'freed' && <circle cx="50" cy="50" r="48" fill="none" stroke="#8dff4f" strokeWidth="4" />}
      <circle cx="50" cy="50" r="42" fill={locked ? '#2a3070' : c.base} stroke="#0b1030" strokeWidth="4" />
      {!locked && (
        <g clipPath={`url(#${clip})`}>
          <circle cx="68" cy="72" r="42" fill={c.shade} opacity="0.55" />
          {feature(planet)}
        </g>
      )}
      <circle cx="50" cy="50" r="42" fill="none" stroke="#0b1030" strokeWidth="4" />
      {locked && (
        <g>
          <path d="M40 48 V40 A10 10 0 0 1 60 40 V48" fill="none" stroke="#aab3e6" strokeWidth="6" strokeLinecap="round" />
          <rect x="34" y="46" width="32" height="26" rx="7" fill="#aab3e6" />
          <circle cx="50" cy="58" r="4" fill="#2a3070" />
        </g>
      )}
      {state === 'freed' && (
        <g>
          <circle cx="82" cy="18" r="14" fill="#8dff4f" stroke="#0b1030" strokeWidth="3" />
          <path d="M75 18 L80 24 L89 12" fill="none" stroke="#0b1030" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      {state === 'boss' && (
        <g>
          <circle cx="82" cy="18" r="14" fill="#ff5c6c" stroke="#0b1030" strokeWidth="3" />
          <path d="M82 10 V20 M82 24 V26" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}
