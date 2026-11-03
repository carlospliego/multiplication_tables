import { useEffect, useState } from 'react';
import { todayLocal } from '../engine/dates';
import { PLANETS } from '../engine/facts';
import { isMissionDoneToday } from '../engine/mission';
import { availableBoss, frontierPlanet, masteredCount, openPlanets } from '../engine/progress';
import type { PlanetId } from '../engine/types';
import { Planet } from '../components/Planet';
import type { PlanetState } from '../components/Planet';
import { Rocket } from '../components/Rocket';
import { Starfield } from '../components/Starfield';
import { StreakFlame } from '../components/StreakFlame';
import { useGame } from '../state/GameContext';
import styles from './GalaxyMap.module.css';

// Fixed points (percent of the map box) for the winding path, top to bottom.
const POINTS: readonly { x: number; y: number }[] = [
  { x: 25, y: 6 }, { x: 72, y: 17 }, { x: 28, y: 28 }, { x: 70, y: 39 }, { x: 30, y: 50 },
  { x: 72, y: 61 }, { x: 28, y: 72 }, { x: 70, y: 83 }, { x: 40, y: 94 },
];
const PATH_D = (() => {
  const p = POINTS.map((q) => [q.x, q.y * 2] as const); // viewBox is 100 x 200
  let d = `M${p[0]![0]} ${p[0]![1]}`;
  for (let i = 1; i < p.length; i++) {
    const [px, py] = p[i - 1]!;
    const [x, y] = p[i]!;
    const my = (py + y) / 2;
    d += ` C${px} ${my} ${x} ${my} ${x} ${y}`;
  }
  return d;
})();

type Celebration = { kind: 'planet'; planet: PlanetId } | { kind: 'galaxyMaster' };

export function GalaxyMap() {
  const { state, dispatch } = useGame();
  const save = state.save;
  const open = save ? openPlanets(save.facts) : [];
  const unmarked = save ? open.filter((p) => !save.celebrated.planetsUnlocked.includes(p)) : [];
  const toCelebrate = unmarked.filter((p) => p !== 1);
  const mastered = save ? masteredCount(save.facts) : 0;
  const masterPending = !!save && mastered === 45 && !save.celebrated.galaxyMaster;

  // Computed once on mount: at most one overlay at a time, highest newly opened planet first.
  const [queue, setQueue] = useState<Celebration[]>(() => {
    const q: Celebration[] = [];
    if (toCelebrate.length > 0) q.push({ kind: 'planet', planet: Math.max(...toCelebrate) as PlanetId });
    if (masterPending) q.push({ kind: 'galaxyMaster' });
    return q;
  });

  useEffect(() => {
    // Mark every open planet as celebrated so a placement result never replays them.
    for (const p of unmarked) dispatch({ type: 'markCelebrated', planet: p });
    if (masterPending) dispatch({ type: 'markCelebrated', galaxyMaster: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!save) return null;
  const done = isMissionDoneToday(save.mission, todayLocal());
  const frontier = frontierPlanet(save.facts);
  const boss = availableBoss(save.facts, save.bossesBeaten);
  const stateFor = (id: PlanetId): PlanetState =>
    save.bossesBeaten.includes(id) ? 'freed' : id === boss ? 'boss' : id === frontier ? 'frontier' : open.includes(id) ? 'open' : 'locked';
  const parts = save.bossesBeaten.map((p) => PLANETS[p - 1]!.shipPart);
  const current = queue[0];

  return (
    <main className={styles.screen}>
      <Starfield />
      <header className={styles.header}>
        <Rocket parts={parts} size={56} />
        <div className={styles.greeting}>
          <h1 className={styles.title}>{`Captain ${save.captainName}`}</h1>
          <p className={styles.sub}>{`${mastered} of 45 facts mastered`}</p>
        </div>
        <StreakFlame days={save.streak.current} size={56} />
      </header>
      <nav className={styles.nav} aria-label="Menu">
        <button type="button" className={styles.nb} onClick={() => dispatch({ type: 'navigate', screen: 'starMap' })}>Star Map</button>
        <button type="button" className={styles.nb} onClick={() => dispatch({ type: 'navigate', screen: 'hangar' })}>Hangar</button>
        <button type="button" className={styles.nb} aria-pressed={save.settings.soundOn} onClick={() => dispatch({ type: 'toggleSound' })}>
          {`Sound ${save.settings.soundOn ? 'on' : 'off'}`}
        </button>
        <button type="button" className={styles.nb} onClick={() => dispatch({ type: 'navigate', screen: 'parentGate' })}>Grown-ups</button>
      </nav>
      {done ? (
        <button type="button" className={styles.primary} onClick={() => dispatch({ type: 'navigate', screen: 'freeFlight' })}>
          Free Flight
        </button>
      ) : (
        <button
          type="button"
          className={styles.primary}
          onClick={() => {
            dispatch({ type: 'startMission', today: todayLocal() });
            dispatch({ type: 'navigate', screen: 'mission' });
          }}
        >
          Launch Mission
        </button>
      )}
      <div className={styles.map}>
        <svg className={styles.path} viewBox="0 0 100 200" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path d={PATH_D} fill="none" stroke="#35e0ff" strokeOpacity="0.45" strokeWidth="4" strokeDasharray="10 10" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <ul className={styles.stops}>
        {PLANETS.map((p, i) => {
          const pt = POINTS[i]!;
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
            {current.kind === 'galaxyMaster' && <p>You know all 45 star facts. Amazing, Captain!</p>}
            <button type="button" className={styles.primary} autoFocus onClick={() => setQueue((q) => q.slice(1))}>OK</button>
          </div>
        </div>
      )}
    </main>
  );
}
