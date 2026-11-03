import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import {
  FAST_MS,
  INTERVAL_DAYS,
  applyAnswer,
  isDue,
  isFastAnswer,
  newFactRecord,
} from './levels';
import type { AnswerInput, FactRecord, Level } from './types';

const T = '2026-11-02';
const fast: AnswerInput = { correct: true, responseMs: 2000, interrupted: false };
const wrong: AnswerInput = { correct: false, responseMs: 2000, interrupted: false };

function rec(level: Level, extra: Partial<FactRecord> = {}): FactRecord {
  return { ...newFactRecord(), level, ...extra };
}

describe('levels', () => {
  it('has the spec constants', () => {
    expect(FAST_MS).toBe(4000);
    expect(INTERVAL_DAYS).toEqual({ 0: 0, 1: 0, 2: 1, 3: 2, 4: 4, 5: 7 });
  });

  it('newFactRecord is level 0 with empty stats', () => {
    expect(newFactRecord()).toEqual({
      level: 0,
      dueDay: null,
      lastPromotedDay: null,
      fastDays: [],
      everMastered: false,
      attempts: 0,
      correct: 0,
      totalCorrectMs: 0,
      lastSeenDay: null,
    });
  });

  it('first exposure → level 1 due today regardless of answer', () => {
    for (const ans of [wrong, fast]) {
      const r = applyAnswer(newFactRecord(), ans, T);
      expect(r.level).toBe(1);
      expect(r.dueDay).toBe(T);
      expect(r.attempts).toBe(1);
      expect(r.lastSeenDay).toBe(T);
    }
  });

  it('wrong drops to level 1 and due today', () => {
    const r = applyAnswer(rec(4, { dueDay: addDays(T, 4) }), wrong, T);
    expect(r.level).toBe(1);
    expect(r.dueDay).toBe(T);
    expect(r.attempts).toBe(1);
    expect(r.correct).toBe(0);
  });

  it('wrong on mastered keeps everMastered', () => {
    const r = applyAnswer(rec(5, { everMastered: true }), wrong, T);
    expect(r.level).toBe(1);
    expect(r.everMastered).toBe(true);
  });

  it('fast correct promotes one level', () => {
    const r = applyAnswer(rec(2, { lastPromotedDay: '2026-11-01' }), fast, T);
    expect(r.level).toBe(3);
    expect(r.dueDay).toBe(addDays(T, 2));
    expect(r.fastDays).toContain(T);
    expect(r.lastPromotedDay).toBe(T);
  });

  it('promotes at most once per day', () => {
    const once = applyAnswer(rec(2), fast, T);
    const twice = applyAnswer(once, fast, T);
    expect(twice.level).toBe(3);
    expect(twice.fastDays).toEqual([T]);
  });

  it('level 5 needs two distinct fast days', () => {
    expect(applyAnswer(rec(4), fast, T).level).toBe(4);
    const r = applyAnswer(rec(4, { fastDays: ['2026-10-29'] }), fast, T);
    expect(r.level).toBe(5);
    expect(r.everMastered).toBe(true);
    expect(r.dueDay).toBe(addDays(T, 7));
  });

  it('slow correct keeps level', () => {
    const r = applyAnswer(rec(3), { correct: true, responseMs: 4001, interrupted: false }, T);
    expect(r.level).toBe(3);
    expect(r.correct).toBe(1);
    expect(r.dueDay).toBe(addDays(T, 2));
    expect(r.fastDays).toEqual([]);
  });

  it('exactly FAST_MS counts as fast', () => {
    const r = applyAnswer(rec(2), { correct: true, responseMs: 4000, interrupted: false }, T);
    expect(r.level).toBe(3);
  });

  it('interrupted correct is treated as slow', () => {
    const ans = { correct: true, responseMs: 1000, interrupted: true };
    expect(isFastAnswer(ans)).toBe(false);
    expect(applyAnswer(rec(2), ans, T).level).toBe(2);
  });

  it('isFastAnswer requires correct', () => {
    expect(isFastAnswer(wrong)).toBe(false);
    expect(isFastAnswer(fast)).toBe(true);
  });

  it('fastDays keeps distinct last 5', () => {
    const days = ['2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29'];
    const r = applyAnswer(rec(2, { fastDays: days }), fast, T);
    expect(r.fastDays).toEqual([...days.slice(1), T]);
    const r2 = applyAnswer(rec(2, { fastDays: [T] }), fast, T);
    expect(r2.fastDays).toEqual([T]);
  });

  it('totalCorrectMs caps each answer at 30000', () => {
    const r = applyAnswer(rec(2), { correct: true, responseMs: 90000, interrupted: false }, T);
    expect(r.totalCorrectMs).toBe(30000);
  });

  it('isDue', () => {
    expect(isDue(newFactRecord(), T)).toBe(false);
    const r = rec(2, { dueDay: T });
    expect(isDue(r, T)).toBe(true);
    expect(isDue(r, addDays(T, -1))).toBe(false);
  });

  it('does not mutate input record', () => {
    const input = rec(2, { fastDays: ['2026-10-29'] });
    const snapshot = structuredClone(input);
    applyAnswer(input, fast, T);
    expect(input).toEqual(snapshot);
  });
});
