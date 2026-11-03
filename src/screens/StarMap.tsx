import { useState } from 'react';
import { ALL_FACT_IDS, parseFact } from '../engine/facts';
import { masteredCount, starStates } from '../engine/progress';
import type { StarState } from '../engine/progress';
import type { FactId } from '../engine/types';
import { Starfield } from '../components/Starfield';
import { useGame } from '../state/GameContext';
import { STAR_POSITIONS } from './starLayout';
import styles from './StarMap.module.css';

const WORDS: Record<StarState, string> = {
  lit: 'mastered, shining bright',
  tuneUp: 'needs a tune-up',
  dark: 'still faint, keep practising',
};

const STAR_POINTS = Array.from({ length: 10 }, (_, i) => {
  const r = i % 2 === 0 ? 11 : 4.6;
  const a = (Math.PI / 5) * i - Math.PI / 2;
  return `${(12 + r * Math.cos(a)).toFixed(2)},${(12 + r * Math.sin(a)).toFixed(2)}`;
}).join(' ');

function Shape({ state }: { state: StarState }) {
  return (
    <svg className={styles.shape} viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false">
      {state === 'lit' && <polygon data-shape="star" className={styles.lit} points={STAR_POINTS} />}
      {state === 'tuneUp' && <circle data-shape="ring" className={styles.ring} cx="12" cy="12" r="8" />}
      {state === 'dark' && <circle data-shape="dot" className={styles.dot} cx="12" cy="12" r="3" />}
    </svg>
  );
}

const label = (id: FactId) => {
  const { a, b } = parseFact(id);
  return `${a} × ${b}`;
};

export function StarMap() {
  const { state, dispatch } = useGame();
  const save = state.save;
  const [selected, setSelected] = useState<FactId | null>(null);
  if (!save) return null;
  const states = starStates(save.facts);
  const lit = masteredCount(save.facts);

  return (
    <main className={styles.screen}>
      <Starfield />
      <h1 className={styles.title}>Star Map</h1>
      <p className={styles.counter}>{`★ ${lit} / 45 stars lit`}</p>
      <div className={styles.body}>
        <div className={styles.sky} role="group" aria-label="Rocket constellation">
          {ALL_FACT_IDS.map((id) => {
            const s = states[id]!;
            const pos = STAR_POSITIONS[id]!;
            return (
              <button
                key={id}
                type="button"
                className={styles.star}
                data-fact={id}
                data-state={s}
                aria-pressed={selected === id}
                aria-label={`${label(id)}: ${WORDS[s]}`}
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                onClick={() => setSelected(id)}
              >
                <Shape state={s} />
              </button>
            );
          })}
        </div>
        <div className={styles.panel} role="status">
          {selected ? (
            <>
              <p className={styles.fact}>{`${label(selected)} = ${parseFact(selected).a * parseFact(selected).b}`}</p>
              <p className={styles.words}>{`This star is ${WORDS[states[selected]!]}.`}</p>
            </>
          ) : (
            <p className={styles.words}>Tap a star to see its fact!</p>
          )}
        </div>
      </div>
      <button type="button" className={styles.back} onClick={() => dispatch({ type: 'navigate', screen: 'map' })}>
        Back to Galaxy
      </button>
    </main>
  );
}
