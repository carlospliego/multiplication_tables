import { describe, expect, it } from 'vitest';
import { startQuestRun, recordQuestResult } from '../engine/questRun';
import type { Question } from '../engine/types';
import {
  clearQuestSnapshot,
  getSessionStorage,
  loadQuestSnapshot,
  loadSessionScreen,
  SESSION_QUEST_KEY,
  writeQuestSnapshot,
  writeSessionScreen,
} from './session';
import type { QuestContext } from './session';

const mk = (a: number, b: number): Question => ({ factId: `${Math.min(a, b)}x${Math.max(a, b)}`, a, b, answer: a * b, kind: 'normal' });
const ctx: QuestContext = { kind: 'mission', owner: '2026-11-02T10:00:00.000Z', day: '2026-11-23', step: 'quest1', difficulty: 'normal' };
const run = recordQuestResult(startQuestRun([mk(2, 3), mk(4, 3), mk(5, 5)]), true, true, () => 0);

describe('session screen', () => {
  it('round trips and tolerates a missing store', () => {
    const s = getSessionStorage();
    expect(loadSessionScreen(s)).toBeNull();
    writeSessionScreen(s, 'hangar');
    expect(loadSessionScreen(s)).toBe('hangar');
    expect(loadSessionScreen(null)).toBeNull();
    expect(() => writeSessionScreen(null, 'map')).not.toThrow();
  });
});

describe('quest snapshot', () => {
  it('round trips for the same context', () => {
    const s = getSessionStorage();
    writeQuestSnapshot(s, { context: ctx, run, introduced: ['2x3'] });
    const snap = loadQuestSnapshot(s, { ...ctx });
    expect(snap?.run).toEqual(run);
    expect(snap?.introduced).toEqual(['2x3']);
  });

  it('is ignored when the save, day, step, kind or difficulty differ', () => {
    const s = getSessionStorage();
    writeQuestSnapshot(s, { context: ctx, run, introduced: [] });
    expect(loadQuestSnapshot(s, { ...ctx, owner: 'other' })).toBeNull();
    expect(loadQuestSnapshot(s, { ...ctx, day: '2026-11-24' })).toBeNull();
    expect(loadQuestSnapshot(s, { ...ctx, step: 'quest2' })).toBeNull();
    expect(loadQuestSnapshot(s, { ...ctx, difficulty: 'hard' })).toBeNull();
    expect(loadQuestSnapshot(s, { kind: 'freeFlight', owner: ctx.owner, day: ctx.day, difficulty: 'normal' })).toBeNull();
  });

  it('rejects malformed snapshots', () => {
    const s = getSessionStorage()!;
    const bad = (patch: object) => {
      s.setItem(SESSION_QUEST_KEY, JSON.stringify({ context: ctx, run, introduced: [], ...patch }));
      return loadQuestSnapshot(s, ctx);
    };
    expect(bad({})).not.toBeNull();
    expect(bad({ run: { ...run, index: 99 } })).toBeNull();
    expect(bad({ run: { ...run, queue: [{ ...mk(2, 3), answer: 7 }] } })).toBeNull();
    expect(bad({ run: { ...run, queue: [mk(10, 10)] } })).toBeNull();
    expect(bad({ run: { ...run, lightning: 5 } })).toBeNull();
    expect(bad({ introduced: ['nope'] })).toBeNull();
    s.setItem(SESSION_QUEST_KEY, '{not json');
    expect(loadQuestSnapshot(s, ctx)).toBeNull();
  });

  it('clear removes it', () => {
    const s = getSessionStorage();
    writeQuestSnapshot(s, { context: ctx, run, introduced: [] });
    clearQuestSnapshot(s);
    expect(loadQuestSnapshot(s, ctx)).toBeNull();
  });
});
