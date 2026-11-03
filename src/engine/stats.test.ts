import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { newFactRecord } from './levels';
import { addActiveSeconds, factStats, lastNDays } from './stats';

const T = '2026-11-02';

describe('active seconds', () => {
  it('caps at 60', () => {
    expect(addActiveSeconds({}, T, 90)).toEqual({ [T]: 60 });
  });
  it('cap is per call, not per day', () => {
    expect(addActiveSeconds(addActiveSeconds({}, T, 50), T, 50)).toEqual({ [T]: 100 });
    expect(addActiveSeconds({ [T]: 50 }, T, 90)).toEqual({ [T]: 110 });
  });
  it('accumulates', () => {
    expect(addActiveSeconds({ [T]: 50 }, T, 30)).toEqual({ [T]: 80 });
    expect(addActiveSeconds({ [T]: 10 }, T, 20)).toEqual({ [T]: 30 });
  });
  it('prunes entries older than 60 days', () => {
    const old = addDays(T, -61);
    const keep = addDays(T, -59);
    const r = addActiveSeconds({ [old]: 5, [keep]: 7 }, T, 1);
    expect(r[old]).toBeUndefined();
    expect(r[keep]).toBe(7);
  });
  it('negative or NaN seconds add 0', () => {
    expect(addActiveSeconds({ [T]: 5 }, T, -10)[T]).toBe(5);
    expect(addActiveSeconds({}, T, -10)[T]).toBe(0);
    expect(addActiveSeconds({}, T, NaN)[T]).toBe(0);
  });
  it('does not mutate input', () => {
    const m = { [T]: 5 };
    addActiveSeconds(m, T, 5);
    expect(m).toEqual({ [T]: 5 });
  });
});

describe('lastNDays', () => {
  it('returns n entries oldest to newest, zero-filled', () => {
    const r = lastNDays({ [T]: 40, [addDays(T, -2)]: 10 }, T, 7);
    expect(r).toHaveLength(7);
    expect(r[0]).toEqual({ day: addDays(T, -6), seconds: 0 });
    expect(r[4]).toEqual({ day: addDays(T, -2), seconds: 10 });
    expect(r[6]).toEqual({ day: T, seconds: 40 });
  });
});

describe('factStats', () => {
  it('nulls with no attempts', () => {
    expect(factStats(newFactRecord())).toEqual({ accuracy: null, avgCorrectMs: null });
  });
  it('computes accuracy and average', () => {
    const rec = { ...newFactRecord(), attempts: 4, correct: 3, totalCorrectMs: 9000 };
    expect(factStats(rec)).toEqual({ accuracy: 0.75, avgCorrectMs: 3000 });
  });
  it('no correct answers gives null average', () => {
    const rec = { ...newFactRecord(), attempts: 2, correct: 0 };
    expect(factStats(rec)).toEqual({ accuracy: 0, avgCorrectMs: null });
  });
});
