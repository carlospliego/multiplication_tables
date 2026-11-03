import { todayLocal } from '../engine/dates';
import { PLANETS } from '../engine/facts';
import { isMissionDoneToday } from '../engine/mission';
import { openPlanets } from '../engine/progress';
import { useGame } from '../state/GameContext';
import styles from './GalaxyMap.module.css';

export function GalaxyMap() {
  const { state, dispatch } = useGame();
  const save = state.save;
  if (!save) return null;
  const open = openPlanets(save.facts);
  const done = isMissionDoneToday(save.mission, todayLocal());

  return (
    <main className={styles.screen}>
      <h1 className={styles.title}>Galaxy Map</h1>
      <p className={styles.sub}>{`Streak: ${save.streak.current} day${save.streak.current === 1 ? '' : 's'}`}</p>
      <ul className={styles.planets}>
        {PLANETS.map((p) => {
          const isOpen = open.includes(p.id);
          return (
            <li key={p.id} className={isOpen ? styles.open : styles.locked}>
              <span>{p.name}</span> <span>{`×${p.table}`}</span>{' '}
              <span>{isOpen ? 'Open' : 'Locked'}</span>
            </li>
          );
        })}
      </ul>
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
    </main>
  );
}
