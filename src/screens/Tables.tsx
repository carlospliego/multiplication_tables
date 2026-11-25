import { Starfield } from '../components/Starfield';
import { factsInPlay } from '../engine/facts';
import { MIN_TABLES_IN_PLAY, skipTablesOf, TABLES } from '../skip';
import { useGame } from '../state/GameContext';
import styles from './Tables.module.css';

/** The child picks which times tables to practise: tap one to skip it or bring it back. */
export function Tables() {
  const { state, dispatch } = useGame();
  const save = state.save;
  if (!save) return null;
  const skip = skipTablesOf(save.settings);
  const onCount = TABLES.length - skip.length;
  const atMinimum = onCount <= MIN_TABLES_IN_PLAY;
  const factCount = Object.keys(factsInPlay(save.facts, skip)).length;

  return (
    <main className={styles.screen}>
      <Starfield />
      <h1 className={styles.title}>Times Tables</h1>
      <p className={styles.sub}>Tap a table to skip it, or tap it again to bring it back.</p>
      <div className={styles.grid} role="group" aria-label="Times tables to practise">
        {TABLES.map((n) => {
          const on = !skip.includes(n);
          const locked = on && atMinimum;
          return (
            <button
              key={n}
              type="button"
              className={styles.table}
              aria-pressed={on}
              aria-label={`×${n}`}
              aria-describedby={locked ? 'tables-min' : undefined}
              disabled={locked}
              onClick={() => dispatch({ type: 'toggleSkipTable', table: n })}
            >
              <span className={styles.num} aria-hidden="true">{`×${n}`}</span>
              <span className={styles.state} aria-hidden="true">{on ? 'Practising' : 'Skipped'}</span>
            </button>
          );
        })}
      </div>
      <p className={styles.note} role="status">
        {atMinimum
          ? <span id="tables-min">{`Keep at least ${MIN_TABLES_IN_PLAY} tables on. `}</span>
          : null}
        {`${onCount} tables on, ${factCount} facts to practise.`}
      </p>
      <button type="button" className={styles.back} onClick={() => dispatch({ type: 'navigate', screen: 'map' })}>
        Back to Galaxy
      </button>
    </main>
  );
}
