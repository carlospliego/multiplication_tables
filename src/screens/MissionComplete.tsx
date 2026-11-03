import { useEffect, useRef } from 'react';
import { play } from '../audio/sfx';
import { StreakFlame } from '../components/StreakFlame';
import { todayLocal } from '../engine/dates';
import { PLANETS } from '../engine/facts';
import { openPlanets } from '../engine/progress';
import { useGame } from '../state/GameContext';
import styles from './GalaxyMap.module.css';

export function MissionComplete() {
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
  const tally = save?.mission?.day === today ? save.mission.tally : undefined;
  const answered = tally?.answered ?? 0;
  const lightning = tally?.lightning ?? 0;
  const bossWon = tally?.bossWon ?? null;
  const unlocked = save
    ? openPlanets(save.facts).filter((p) => p !== 1 && !save.celebrated.planetsUnlocked.includes(p))
    : [];
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
      {unlocked.map((p) => (
        <p key={p}>{`New planet unlocked: ${PLANETS[p - 1]!.name}`}</p>
      ))}
      <button type="button" className={styles.primary} onClick={() => dispatch({ type: 'navigate', screen: 'map' })}>
        Back to Galaxy
      </button>
      <button type="button" className={styles.nb} onClick={() => dispatch({ type: 'navigate', screen: 'freeFlight' })}>
        Free Flight
      </button>
    </main>
  );
}
