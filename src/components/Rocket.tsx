import styles from './Rocket.module.css';

export interface RocketProps {
  parts: readonly string[];
  size?: number;
  state?: 'idle' | 'boost' | 'wobble';
}

/** Chunky cartoon rocket. Each earned ship part adds one SVG layer tagged data-part. */
export function Rocket({ parts, size = 160, state = 'idle' }: RocketProps) {
  const has = (n: string) => parts.includes(n);
  return (
    <svg
      className={`${styles.rocket} ${styles[state]}`}
      width={size}
      height={size * 1.5}
      viewBox="0 0 120 180"
      role="img"
      aria-label={`Rocket with ${parts.length} upgrade${parts.length === 1 ? '' : 's'}`}
    >
      {has('Flame Trail') && (
        <g data-part="Flame Trail" className={styles.flame}>
          <path d="M46 130 Q60 185 74 130 Z" fill="#ff8a2b" />
          <path d="M52 130 Q60 164 68 130 Z" fill="#ffd23f" />
        </g>
      )}
      {has('Twin Boosters') && (
        <g data-part="Twin Boosters">
          <rect x="22" y="84" width="14" height="48" rx="7" fill="#c9d2f5" stroke="#2a3380" strokeWidth="3" />
          <rect x="84" y="84" width="14" height="48" rx="7" fill="#c9d2f5" stroke="#2a3380" strokeWidth="3" />
          <rect x="22" y="124" width="14" height="10" rx="4" fill="#ff8a2b" />
          <rect x="84" y="124" width="14" height="10" rx="4" fill="#ff8a2b" />
        </g>
      )}
      {has('Wings') && (
        <g data-part="Wings">
          <path d="M40 96 L6 128 L6 144 L40 130 Z" fill="#35e0ff" stroke="#2a3380" strokeWidth="3" strokeLinejoin="round" />
          <path d="M80 96 L114 128 L114 144 L80 130 Z" fill="#35e0ff" stroke="#2a3380" strokeWidth="3" strokeLinejoin="round" />
        </g>
      )}
      {has('Racing Fins') && (
        <g data-part="Racing Fins">
          <path d="M44 118 L28 150 L50 134 Z" fill="#ff4fd8" stroke="#2a3380" strokeWidth="3" strokeLinejoin="round" />
          <path d="M76 118 L92 150 L70 134 Z" fill="#ff4fd8" stroke="#2a3380" strokeWidth="3" strokeLinejoin="round" />
          <path d="M60 120 L60 154 L54 138 Z" fill="#ff4fd8" stroke="#2a3380" strokeWidth="3" strokeLinejoin="round" />
        </g>
      )}
      <path d="M60 14 C86 40 88 84 84 132 L36 132 C32 84 34 40 60 14 Z" fill="#f4f6ff" stroke="#2a3380" strokeWidth="4" strokeLinejoin="round" />
      <rect x="36" y="128" width="48" height="12" rx="6" fill="#8e9bd8" stroke="#2a3380" strokeWidth="3" />
      {has('Nose Cone') && (
        <path data-part="Nose Cone" d="M60 14 C70 24 76 36 78 48 L42 48 C44 36 50 24 60 14 Z" fill="#ff5c6c" stroke="#2a3380" strokeWidth="4" strokeLinejoin="round" />
      )}
      {has('Stripes') && (
        <g data-part="Stripes">
          <rect x="38" y="104" width="44" height="7" fill="#ffd23f" />
          <rect x="37" y="116" width="46" height="7" fill="#ffd23f" />
        </g>
      )}
      {has('Antenna') && (
        <g data-part="Antenna">
          <path d="M60 14 L60 -2" stroke="#2a3380" strokeWidth="4" strokeLinecap="round" transform="translate(0 6)" />
          <circle cx="60" cy="6" r="6" fill="#8dff4f" stroke="#2a3380" strokeWidth="3" />
        </g>
      )}
      {has('Golden Paint') && (
        <path data-part="Golden Paint" d="M60 14 C86 40 88 84 84 132 L36 132 C32 84 34 40 60 14 Z" fill="#ffd23f" fillOpacity="0.55" stroke="#ffb400" strokeWidth="4" strokeLinejoin="round" />
      )}
      <circle cx="60" cy="72" r="15" fill="#35e0ff" stroke="#2a3380" strokeWidth="4" />
      {has('Bubble Cockpit') && (
        <g data-part="Bubble Cockpit">
          <circle cx="60" cy="72" r="20" fill="#35e0ff" fillOpacity="0.45" stroke="#2a3380" strokeWidth="4" />
          <path d="M50 64 Q54 58 60 58" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>
      )}
    </svg>
  );
}
