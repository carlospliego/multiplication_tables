import { useState } from 'react';
import { FactGrid, LEVEL_NAME } from '../components/FactGrid';
import { Starfield } from '../components/Starfield';
import { todayLocal } from '../engine/dates';
import { parseFact } from '../engine/facts';
import { masteredCount } from '../engine/progress';
import { factStats, lastNDays } from '../engine/stats';
import type { FactId } from '../engine/types';
import { useGame } from '../state/GameContext';
import styles from './ParentDashboard.module.css';

const minutes = (seconds: number): number => Math.round(seconds / 60);

export function ParentDashboard() {
  const { state, dispatch } = useGame();
  const [selected, setSelected] = useState<FactId | null>(null);
  const save = state.save;
  if (!save) return null;

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

      <button type="button" className={styles.back} onClick={() => dispatch({ type: 'navigate', screen: 'map' })}>
        Back to Galaxy
      </button>
    </main>
  );
}
