import { useEffect, useRef } from 'react';
import { useGame } from '../state/GameContext';
import styles from './GalaxyMap.module.css';

export function MissionComplete() {
  const { state, dispatch } = useGame();
  const completed = useRef(false);

  useEffect(() => {
    if (completed.current) return;
    completed.current = true;
    dispatch({ type: 'completeMission' });
  }, [dispatch]);

  const streak = state.save?.streak.current ?? 0;
  return (
    <main className={styles.screen}>
      <h1 className={styles.title}>Mission complete!</h1>
      <p className={styles.sub}>{`Streak: ${streak} day${streak === 1 ? '' : 's'}`}</p>
      <button type="button" className={styles.primary} onClick={() => dispatch({ type: 'navigate', screen: 'map' })}>
        Back to the map
      </button>
    </main>
  );
}
