import { useEffect, useRef } from 'react';
import { play } from '../audio/sfx';
import { StreakFlame } from '../components/StreakFlame';
import { todayLocal } from '../engine/dates';
import { PLANETS } from '../engine/facts';
import type { PlanetId } from '../engine/types';
import { useGame } from '../state/GameContext';
import styles from './GalaxyMap.module.css';

export interface MissionCompleteProps {
  answered?: number;
  lightning?: number;
  /** Planet whose boss was beaten during this mission, if any. */
  bossWon?: PlanetId | null;
}

export function MissionComplete({ answered = 0, lightning = 0, bossWon = null }: MissionCompleteProps = {}) {
  const { state, dispatch } = useGame();
  const completed = useRef(false);

  useEffect(() => {
    if (completed.current) return;
    completed.current = true;
    dispatch({ type: 'completeMission' }); // idempotent safety net; streak is applied by the reducer
    play('celebrate');
  }, [dispatch]);

  const save = state.save;
  const today = todayLocal();
  const stars = save
    ? Object.values(save.facts).filter((f) => f.level === 5 && f.lastPromotedDay === today).length
    : 0;
  const streak = save?.streak.current ?? 0;
  const planet = bossWon ? PLANETS[bossWon - 1] : undefined;

  return (
    <main className={styles.screen}>
      <h1 className={styles.title}>Mission complete!</h1>
      <StreakFlame days={streak} size={96} />
      <p className={styles.sub}>{`Streak: ${streak} day${streak === 1 ? '' : 's'}`}</p>
      <ul aria-label="Mission summary">
        <li>{`${answered} questions answered`}</li>
        <li>{`⚡ ${lightning} lightning`}</li>
        <li>{`${stars} new star${stars === 1 ? '' : 's'}`}</li>
      </ul>
      {planet && (
        <section aria-label="Reward">
          <h2>{`${planet.name} freed!`}</h2>
          <p>{`${planet.alienName} joins your crew, and you earned the ${planet.shipPart}!`}</p>
        </section>
      )}
      <button type="button" className={styles.primary} onClick={() => dispatch({ type: 'navigate', screen: 'map' })}>
        Back to Galaxy
      </button>
      <button type="button" className={styles.nb} onClick={() => dispatch({ type: 'navigate', screen: 'freeFlight' })}>
        Free Flight
      </button>
    </main>
  );
}
