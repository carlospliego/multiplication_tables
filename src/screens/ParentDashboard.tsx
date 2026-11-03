import { useRef, useState } from 'react';
import { FactGrid, LEVEL_NAME } from '../components/FactGrid';
import { Starfield } from '../components/Starfield';
import { todayLocal } from '../engine/dates';
import { parseFact } from '../engine/facts';
import { masteredCount } from '../engine/progress';
import { factStats, lastNDays } from '../engine/stats';
import type { FactId } from '../engine/types';
import { downloadSave, parseImport } from '../storage/backup';
import type { SaveData } from '../storage/save';
import { useGame } from '../state/GameContext';
import styles from './ParentDashboard.module.css';

const minutes = (seconds: number): number => Math.round(seconds / 60);

export function ParentDashboard() {
  const { state, dispatch } = useGame();
  const [selected, setSelected] = useState<FactId | null>(null);
  const [pending, setPending] = useState<SaveData | null>(null);
  const [importError, setImportError] = useState(false);
  const [resetText, setResetText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const save = state.save;
  if (!save) return null;

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    let text = '';
    try {
      text = await file.text();
    } catch {
      // unreadable file is treated as invalid
    }
    const parsed = parseImport(text);
    setImportError(parsed === null);
    setPending(parsed);
  };

  const today = todayLocal();
  const week = lastNDays(save.dailyActiveSeconds, today, 7);
  const weekSeconds = week.reduce((sum, d) => sum + d.seconds, 0);
  const maxSeconds = Math.max(60, ...week.map((d) => d.seconds));

  const rec = selected ? save.facts[selected] : undefined;
  const stats = rec ? factStats(rec) : null;
  const fact = selected ? parseFact(selected) : null;

  return (
    <main className={styles.screen}>
      <Starfield />
      <h1 className={styles.title}>Grown-ups</h1>

      {state.corruptNotice && (
        <section className={styles.panel} role="status">
          <p>We found a damaged save and started fresh. A copy of the old data was kept on this device.</p>
          <button type="button" className={styles.action} onClick={() => dispatch({ type: 'dismissCorruptNotice' })}>
            Dismiss
          </button>
        </section>
      )}

      <section className={styles.panel} aria-labelledby="summary-title">
        <h2 id="summary-title" className={styles.h2}>Summary</h2>
        <p className={styles.stars}>{`★ ${masteredCount(save.facts)} / 45`}</p>
        <dl className={styles.stats}>
          <div><dt>Current streak</dt><dd>{save.streak.current}</dd></div>
          <div><dt>Best streak</dt><dd>{save.streak.best}</dd></div>
          <div><dt>Planets freed</dt><dd>{save.bossesBeaten.length}</dd></div>
        </dl>
      </section>

      <section className={styles.panel} aria-labelledby="grid-title">
        <h2 id="grid-title" className={styles.h2}>Facts</h2>
        <FactGrid facts={save.facts} selected={selected} onSelect={setSelected} />
        {selected && rec && stats && fact && (
          <section className={styles.detail} role="region" aria-label="Fact detail">
            <h3 className={styles.h3}>{`${fact.a} × ${fact.b}`}</h3>
            <dl className={styles.detailList}>
              <div><dt>Level</dt><dd>{`Level ${rec.level} · ${LEVEL_NAME[rec.level]}`}</dd></div>
              <div><dt>Attempts</dt><dd>{rec.attempts}</dd></div>
              <div><dt>Accuracy</dt><dd>{stats.accuracy === null ? '—' : `${Math.round(stats.accuracy * 100)}%`}</dd></div>
              <div><dt>Average time</dt><dd>{stats.avgCorrectMs === null ? '—' : `${(stats.avgCorrectMs / 1000).toFixed(1)} s`}</dd></div>
              <div><dt>Last practiced</dt><dd>{rec.lastSeenDay ?? 'never'}</dd></div>
            </dl>
          </section>
        )}
      </section>

      <section className={styles.panel} aria-labelledby="minutes-title">
        <h2 id="minutes-title" className={styles.h2}>Minutes played</h2>
        <ul className={styles.minutes} aria-label="Minutes per day">
          {week.map((d) => (
            <li key={d.day} className={styles.minuteRow}>
              <span className={styles.day}>{d.day === today ? 'Today' : d.day.slice(5)}</span>
              <span className={styles.bar} aria-hidden="true">
                <span className={styles.fill} style={{ width: `${(d.seconds / maxSeconds) * 100}%` }} />
              </span>
              <span className={styles.min}>{`${minutes(d.seconds)} min`}</span>
            </li>
          ))}
        </ul>
        <dl className={styles.stats}>
          <div><dt>Total this week</dt><dd>{`${minutes(weekSeconds)} min`}</dd></div>
        </dl>
      </section>

      <section className={styles.panel} aria-labelledby="backup-title">
        <h2 id="backup-title" className={styles.h2}>Backup</h2>
        <p className={styles.note}>Tip: on iPad, tap Share → Add to Home Screen so progress is kept safe.</p>
        <div className={styles.row}>
          <button type="button" className={styles.action} onClick={() => downloadSave(save, today)}>
            Export progress
          </button>
          <label className={styles.fileLabel}>
            Import a save file
            <input ref={fileRef} type="file" accept="application/json,.json" className={styles.file} onChange={onPick} />
          </label>
        </div>
        {importError && <p role="alert" className={styles.error}>That file isn't a Times Table Rocket save</p>}
        {pending && (
          <div className={styles.confirm} role="group" aria-label="Confirm import">
            <p>{`Replace current progress with ${pending.captainName}'s save?`}</p>
            <div className={styles.row}>
              <button type="button" className={styles.danger} onClick={() => { dispatch({ type: 'importSave', save: pending }); setPending(null); }}>
                Replace
              </button>
              <button type="button" className={styles.action} onClick={() => setPending(null)}>Cancel</button>
            </div>
          </div>
        )}
      </section>

      <section className={styles.panel} aria-labelledby="reset-title">
        <h2 id="reset-title" className={styles.h2}>Reset</h2>
        <label className={styles.fileLabel}>
          Type RESET to erase all progress
          <input type="text" value={resetText} onChange={(e) => setResetText(e.target.value)} autoComplete="off" className={styles.input} />
        </label>
        <button type="button" className={styles.danger} disabled={resetText !== 'RESET'} onClick={() => dispatch({ type: 'resetProgress' })}>
          Reset
        </button>
      </section>

      <button type="button" className={styles.back} onClick={() => dispatch({ type: 'navigate', screen: 'map' })}>
        Back to Galaxy
      </button>
    </main>
  );
}
