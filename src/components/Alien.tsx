import type { PlanetId } from '../engine/types';
import { PLANETS } from '../engine/facts';

const COLORS = ['#8dff4f', '#35e0ff', '#ffd23f', '#ff4fd8', '#ff8a2b', '#9b7bff', '#ff5c6c', '#4fe0a8', '#ffe27a'];

/** Friendly blob alien; the planet number picks colour and a few feature variations. */
export function Alien({ planet, silhouette = false, size = 96 }: { planet: PlanetId; silhouette?: boolean; size?: number }) {
  const name = PLANETS[planet - 1]!.alienName;
  const fill = silhouette ? '#1a2160' : COLORS[planet - 1]!;
  const eyes = (planet % 3) + 1; // 1..3 eyes
  const eyeXs = eyes === 1 ? [50] : eyes === 2 ? [38, 62] : [32, 50, 68];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" data-silhouette={silhouette ? 'true' : undefined} role="img" aria-label={silhouette ? 'Mystery alien' : `${name} the alien`}>
      <path d="M50 14 L50 24" stroke={fill} strokeWidth="5" strokeLinecap="round" />
      <circle cx="50" cy="12" r="6" fill={fill} />
      {planet % 2 === 0 && <><path d="M28 24 L34 34 M72 24 L66 34" stroke={fill} strokeWidth="5" strokeLinecap="round" /><circle cx="26" cy="21" r="5" fill={fill} /><circle cx="74" cy="21" r="5" fill={fill} /></>}
      <path d="M50 24 C86 24 90 62 82 80 C76 92 24 92 18 80 C10 62 14 24 50 24 Z" fill={fill} stroke={silhouette ? '#3a4290' : '#0b1030'} strokeWidth="4" />
      {!silhouette && (
        <>
          {eyeXs.map((x) => (
            <g key={x}>
              <circle cx={x} cy="50" r={eyes === 3 ? 8 : 10} fill="#fff" stroke="#0b1030" strokeWidth="3" />
              <circle cx={x + 1} cy="51" r="4" fill="#0b1030" />
            </g>
          ))}
          <path d="M38 70 Q50 80 62 70" fill="none" stroke="#0b1030" strokeWidth="4" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
