import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { PLANETS } from './facts';
import { newFactRecord } from './levels';
import { PLACEMENT_PLANETS, applyPlacementAnswer, placementQuestions } from './placement';
import { createRng } from './rng';

const T = '2026-11-02';

describe('placement', () => {
  it('asks exactly the facts of planets 1-3', () => {
    expect(PLACEMENT_PLANETS).toEqual([1, 2, 3]);
    const qs = placementQuestions(createRng(1));
    expect(qs).toHaveLength(24);
    const expected = PLACEMENT_PLANETS.flatMap((p) => PLANETS[p - 1]!.factIds).sort();
    expect(qs.map((q) => q.factId).sort()).toEqual(expected);
    expect(qs.every((q) => q.kind === 'normal')).toBe(true);
  });
  it('fast -> level 4', () => {
    const r = applyPlacementAnswer(newFactRecord(), { correct: true, responseMs: 2000, interrupted: false }, T);
    expect(r.level).toBe(4);
    expect(r.fastDays).toEqual([T]);
    expect(r.lastPromotedDay).toBe(T);
    expect(r.dueDay).toBe(addDays(T, 4));
    expect(r.attempts).toBe(1);
    expect(r.correct).toBe(1);
    expect(r.totalCorrectMs).toBe(2000);
  });
  it('slow -> level 2', () => {
    const r = applyPlacementAnswer(newFactRecord(), { correct: true, responseMs: 9000, interrupted: false }, T);
    expect(r.level).toBe(2);
    expect(r.dueDay).toBe(addDays(T, 1));
    expect(r.attempts).toBe(1);
  });
  it('wrong -> level 1', () => {
    const r = applyPlacementAnswer(newFactRecord(), { correct: false, responseMs: 3000, interrupted: false }, T);
    expect(r.level).toBe(1);
    expect(r.dueDay).toBe(T);
    expect(r.attempts).toBe(1);
    expect(r.correct).toBe(0);
  });
});
