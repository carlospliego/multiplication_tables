import { PLANETS } from '../engine/facts';
import { Alien } from '../components/Alien';
import { Rocket } from '../components/Rocket';
import { Starfield } from '../components/Starfield';
import { useGame } from '../state/GameContext';
import styles from './Hangar.module.css';

export function Hangar() {
  const { state, dispatch } = useGame();
  const save = state.save;
  if (!save) return null;
  const beaten = save.bossesBeaten;
  const parts = beaten.map((p) => PLANETS[p - 1]!.shipPart);

  return (
    <main className={styles.screen}>
      <Starfield />
      <h1 className={styles.title}>Hangar</h1>
      <div className={styles.layout}>
        <section className={styles.rocketBox} aria-label="Your rocket">
          <Rocket parts={parts} size={150} />
          <p className={styles.note}>
            {parts.length === 0 ? 'Free a planet to add a ship part!' : `${parts.length} of 9 ship parts: ${parts.join(', ')}`}
          </p>
        </section>
        <section className={styles.crewBox} aria-labelledby="crew-title">
          <h2 id="crew-title" className={styles.crewTitle}>Your crew</h2>
          <ul className={styles.crew}>
            {PLANETS.map((p) => {
              const earned = beaten.includes(p.id);
              return (
                <li key={p.id} className={styles.slot} data-earned={earned ? 'true' : 'false'}>
                  <Alien planet={p.id} silhouette={!earned} size={72} />
                  <span className={styles.caption}>{earned ? `${p.alienName} from ${p.name}` : `Free ${p.name} to unlock`}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
      <button type="button" className={styles.back} onClick={() => dispatch({ type: 'navigate', screen: 'map' })}>
        Back to Galaxy
      </button>
    </main>
  );
}
