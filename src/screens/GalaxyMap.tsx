import { useEffect, useRef, useState } from 'react';
import { play } from '../audio/sfx';
import { todayLocal } from '../engine/dates';
import { DIFFICULTIES, DIFFICULTY, difficultyOf } from '../engine/difficulty';
import { activePlanets, PLANETS, shipParts } from '../engine/facts';
import { playFacts } from '../storage/save';
import { displayStreak, isMissionDoneToday } from '../engine/mission';
import { availableBoss, frontierPlanet, masteredCount, openPlanets } from '../engine/progress';
import type { PlanetId } from '../engine/types';
import { Planet } from '../components/Planet';
import type { PlanetState } from '../components/Planet';
import { Rocket } from '../components/Rocket';
import { Starfield } from '../components/Starfield';
import { StreakFlame } from '../components/StreakFlame';
import { useGame } from '../state/GameContext';
import styles from './GalaxyMap.module.css';

// Points (percent of the map box) for the winding path, top to bottom: one per planet in play,
// zig-zagging left and right and spread evenly down the map.
const XS = [25, 72, 28, 70, 30, 72, 28, 70, 40];
function pathPoints(n: number): { x: number; y: number }[] {
  return Array.from({ length: n }, (_, i) => ({
    x: i === n - 1 && n > 1 ? 40 : XS[i]!,
    y: n === 1 ? 50 : 6 + (88 * i) / (n - 1),
  }));
}
function pathD(points: readonly { x: number; y: number }[]): string {
  const p = points.map((q) => [q.x, q.y * 2] as const); // viewBox is 100 x 200
  if (p.length === 0) return '';
  let d = `M${p[0]![0]} ${p[0]![1]}`;
  for (let i = 1; i < p.length; i++) {
    const [px, py] = p[i - 1]!;
    const [x, y] = p[i]!;
    const my = (py + y) / 2;
    d += ` C${px} ${my} ${x} ${my} ${x} ${y}`;
  }
  return d;
}

type Celebration = { kind: 'planet'; planet: PlanetId } | { kind: 'galaxyMaster' };

export function GalaxyMap() {
  const { state, dispatch } = useGame();
  const save = state.save;
  // Only the facts in play: the child's skipped tables (Tables screen) are left out.
  const facts = save ? playFacts(save) : {};
  const planets = activePlanets(facts);
  const factCount = Object.keys(facts).length;
  const open = save ? openPlanets(facts) : [];
  const unmarked = save ? open.filter((p) => !save.celebrated.planetsUnlocked.includes(p)) : [];
  const toCelebrate = unmarked.filter((p) => p !== planets[0]?.id);
  const mastered = save ? masteredCount(facts) : 0;
  const masterPending = !!save && factCount > 0 && mastered === factCount && !save.celebrated.galaxyMaster;

  // Computed once on mount: at most one overlay at a time, highest newly opened planet first.
  const [queue, setQueue] = useState<Celebration[]>(() => {
    const q: Celebration[] = [];
    if (toCelebrate.length > 0) q.push({ kind: 'planet', planet: Math.max(...toCelebrate) as PlanetId });
    if (masterPending) q.push({ kind: 'galaxyMaster' });
    return q;
  });

  const okRef = useRef<HTMLButtonElement>(null);
  const hasOverlay = queue.length > 0;
  const currentKind = queue[0]?.kind;
  useEffect(() => {
    if (!hasOverlay) return;
    okRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setQueue((q) => q.slice(1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasOverlay, currentKind]);

  useEffect(() => {
    // Mark every open planet as celebrated so a placement result never replays them.
    for (const p of unmarked) dispatch({ type: 'markCelebrated', planet: p });
    if (masterPending) dispatch({ type: 'markCelebrated', galaxyMaster: true });
    if (queue.length > 0) play('celebrate');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!save) return null;
  const done = isMissionDoneToday(save.mission, todayLocal());
  const frontier = frontierPlanet(facts);
  const boss = availableBoss(facts, save.bossesBeaten);
  const points = pathPoints(planets.length);
  const stateFor = (id: PlanetId): PlanetState =>
    save.bossesBeaten.includes(id) ? 'freed' : id === boss ? 'boss' : id === frontier ? 'frontier' : open.includes(id) ? 'open' : 'locked';
  const parts = shipParts(save.bossesBeaten, facts);
  const difficulty = difficultyOf(save.settings);
  const current = queue[0];

  return (
    <main className={styles.screen}>
      <Starfield />
      <header className={styles.header}>
        <Rocket parts={parts} size={56} />
        <div className={styles.greeting}>
          <h1 className={styles.title}>{`Captain ${save.captainName}`}</h1>
          <p className={styles.sub}>{`${mastered} of ${factCount} facts mastered`}</p>
        </div>
        <StreakFlame days={displayStreak(save.streak, todayLocal())} size={56} />
      </header>
      <nav className={styles.nav} aria-label="Menu">
        <button type="button" className={styles.nb} onClick={() => dispatch({ type: 'navigate', screen: 'starMap' })}>Star Map</button>
        <button type="button" className={styles.nb} onClick={() => dispatch({ type: 'navigate', screen: 'hangar' })}>Hangar</button>
        <button type="button" className={styles.nb} onClick={() => dispatch({ type: 'navigate', screen: 'tables' })}>Tables</button>
        <button type="button" className={styles.nb} aria-pressed={save.settings.soundOn} onClick={() => dispatch({ type: 'toggleSound' })}>
          <span aria-hidden="true">{save.settings.soundOn ? '🔊 ' : '🔇 '}</span>
          <span className={styles.soundLabel}>Sound</span>
        </button>
        <button type="button" className={styles.nb} onClick={() => dispatch({ type: 'navigate', screen: 'parentGate' })}>Grown-ups</button>
      </nav>
      <div className={styles.difficulty} role="group" aria-labelledby="difficulty-label">
        <span id="difficulty-label" className={styles.difficultyLabel}>Difficulty</span>
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            type="button"
            className={styles.level}
            aria-pressed={difficulty === d}
            onClick={() => dispatch({ type: 'setDifficulty', difficulty: d })}
          >
            {DIFFICULTY[d].label}
            <span className={styles.levelHint}>{`${DIFFICULTY[d].questSize} questions`}</span>
          </button>
        ))}
      </div>
      {done ? (
        <button type="button" className={styles.primary} onClick={() => dispatch({ type: 'navigate', screen: 'freeFlight' })}>
          Free Flight
        </button>
      ) : (
        <button
          type="button"
          className={styles.primary}
          onClick={() => {
            play('launch');
            dispatch({ type: 'startMission', today: todayLocal() });
            dispatch({ type: 'navigate', screen: 'mission' });
          }}
        >
          Launch Mission
        </button>
      )}
      <div className={styles.map}>
        <svg className={styles.path} viewBox="0 0 100 200" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path d={pathD(points)} fill="none" stroke="#35e0ff" strokeOpacity="0.45" strokeWidth="4" strokeDasharray="10 10" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <ul className={styles.stops}>
        {planets.map((p, i) => {
          const pt = points[i]!;
          const s = stateFor(p.id);
          return (
            <li key={p.id} className={styles.stop} data-planet={p.id} data-state={s} style={{ left: `${pt.x}%`, top: `${pt.y}%` }}>
              <Planet planet={p.id} state={s} size={88} />
              <span className={styles.label}>{`${p.name} ×${p.table}`}</span>
            </li>
          );
        })}
        </ul>
      </div>
      {current && (
        <div className={styles.overlay}>
          <div className={styles.card} role="dialog" aria-modal="true" aria-labelledby="celebrate-title">
            <h2 id="celebrate-title" className={styles.cardTitle}>
              {current.kind === 'planet' ? `New planet detected: ${PLANETS[current.planet - 1]!.name}!` : 'Galaxy Master'}
            </h2>
            {current.kind === 'galaxyMaster' && <p>You know all {factCount} star facts. Amazing, Captain!</p>}
            <button type="button" className={styles.primary} ref={okRef} onClick={() => setQueue((q) => q.slice(1))}>OK</button>
          </div>
        </div>
      )}
    </main>
  );
}
