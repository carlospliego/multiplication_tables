import styles from './StreakFlame.module.css';

export function StreakFlame({ days, size = 64 }: { days: number; size?: number }) {
  const lit = days > 0;
  return (
    <svg className={`${styles.flame} ${lit ? styles.lit : ''}`} width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={`${days} day streak`}>
      <path d="M32 4 C40 18 54 26 52 42 C50 56 40 60 32 60 C22 60 12 54 12 42 C12 32 20 28 22 18 C26 22 28 24 30 26 C30 18 30 10 32 4 Z" fill={lit ? '#ff8a2b' : '#3a4290'} stroke="#0b1030" strokeWidth="3" strokeLinejoin="round" />
      <path d="M32 28 C38 36 44 40 42 48 C41 54 36 56 32 56 C27 56 22 53 22 48 C22 42 29 38 32 28 Z" fill={lit ? '#ffd23f' : '#5560b8'} />
      <text x="32" y="50" textAnchor="middle" fontSize="16" fontWeight="700" fill="#0b1030" fontFamily="inherit">{days}</text>
    </svg>
  );
}
