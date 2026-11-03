import { describe, expect, it } from 'vitest';
import { ALL_FACT_IDS, PLANETS } from './facts';
import { createRng } from './rng';
import { buildQuest, buildWarmup, QUEST_SIZE } from './scheduler';
import { makeFacts } from './progress';
import type { FactId, FactRecord, Level, PlanetId, Question } from './types';

const T = '2026-03-10';

type Ov = Partial<Record<FactId, Partial<FactRecord>>>;

function planets(ids: PlanetId[], rec: Partial<FactRecord>, into: Ov = {}): Ov {
  for (const id of ids) for (const f of PLANETS[id - 1]!.factIds) into[f] = { ...rec };
  return into;
}

function due(level: Level, dueDay = T): Partial<FactRecord> {
  return { level, dueDay };
}

function discoveryGaps(qs: Question[]): number[] {
  const gaps: number[] = [];
  qs.forEach((q, i) => {
    if (q.kind !== 'discovery') return;
    const j = qs.findIndex((x, k) => k > i && x.factId === q.factId);
    gaps.push(j < 0 ? -1 : j - i);
  });
  return gaps;
}

describe('buildQuest', () => {
  it('introduces at most 3 new facts, each twice', () => {
    const qs = buildQuest(makeFacts(), { today: T, allowNew: true }, createRng(1));
    expect(qs).toHaveLength(6);
    expect(new Set(qs.map((q) => q.factId))).toEqual(new Set(['1x1', '1x2', '1x3']));
    for (const id of ['1x1', '1x2', '1x3']) {
      const mine = qs.filter((q) => q.factId === id);
      expect(mine.filter((q) => q.kind === 'discovery')).toHaveLength(1);
      expect(mine.filter((q) => q.kind === 'normal')).toHaveLength(1);
    }
  });

  it('discovery precedes its re-ask by at least 3 positions', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const a = buildQuest(makeFacts(), { today: T, allowNew: true }, createRng(seed));
      expect(discoveryGaps(a).every((g) => g >= 3)).toBe(true);
      const mixed = makeFacts(planets([1, 2, 3], due(2)));
      const b = buildQuest(mixed, { today: T, allowNew: true }, createRng(seed));
      const gaps = discoveryGaps(b);
      expect(gaps).toHaveLength(3);
      expect(gaps.every((g) => g >= 3)).toBe(true);
    }
  });

  it('new facts come from the frontier planet in order', () => {
    const f = makeFacts(planets([1, 2, 3], due(4, '2026-03-20')));
    const qs = buildQuest(f, { today: T, allowNew: true }, createRng(3));
    const disc = qs.filter((q) => q.kind === 'discovery').map((q) => q.factId);
    expect(disc.sort()).toEqual(['3x3', '3x4', '3x6']);
  });

  it('no new facts when allowNew is false', () => {
    const f = makeFacts(planets([1], due(2)));
    const qs = buildQuest(f, { today: T, allowNew: false }, createRng(4));
    expect(qs.some((q) => q.kind === 'discovery')).toBe(false);
    expect(qs.every((q) => f[q.factId]!.level >= 1)).toBe(true);
  });

  it('no new facts when >= 8 facts are at level 1', () => {
    const o: Ov = {};
    for (const id of ALL_FACT_IDS.slice(0, 8)) o[id] = due(1);
    const qs = buildQuest(makeFacts(o), { today: T, allowNew: true }, createRng(5));
    expect(qs.some((q) => q.kind === 'discovery')).toBe(false);
  });

  it('due facts are included oldest dueDay first', () => {
    const o: Ov = {};
    ALL_FACT_IDS.slice(0, 20).forEach((id, i) => {
      o[id] = due(2, `2026-03-${String(i + 1).padStart(2, '0')}`);
    });
    const qs = buildQuest(makeFacts(o), { today: '2026-03-31', allowNew: false }, createRng(6));
    expect(qs).toHaveLength(15);
    expect(new Set(qs.map((q) => q.factId))).toEqual(new Set(ALL_FACT_IDS.slice(0, 15)));
  });

  it('includes up to 2 mastered facts for maintenance', () => {
    const o: Ov = {};
    ALL_FACT_IDS.slice(0, 10).forEach((id) => (o[id] = due(2)));
    ALL_FACT_IDS.slice(10, 15).forEach((id) => (o[id] = { level: 5, dueDay: '2026-04-01' }));
    ALL_FACT_IDS.slice(15, 35).forEach((id) => (o[id] = { level: 2, dueDay: '2026-04-01' }));
    for (let seed = 1; seed <= 20; seed++) {
      const qs = buildQuest(makeFacts(o), { today: T, allowNew: false }, createRng(seed));
      const m = new Set(qs.filter((q) => makeFacts(o)[q.factId]!.level === 5).map((q) => q.factId));
      expect(m.size).toBeGreaterThanOrEqual(1);
      expect(m.size).toBeLessThanOrEqual(2);
    }
  });

  it('never places the same fact twice in a row', () => {
    const mixed = makeFacts(planets([1, 2, 3], due(2)));
    const few = makeFacts({ '1x1': due(2), '1x2': due(3), '1x3': due(1) });
    for (let seed = 1; seed <= 50; seed++) {
      for (const f of [makeFacts(), mixed, few]) {
        const qs = buildQuest(f, { today: T, allowNew: true }, createRng(seed));
        for (let i = 1; i < qs.length; i++) expect(qs[i]!.factId).not.toBe(qs[i - 1]!.factId);
      }
    }
  });

  it('length is QUEST_SIZE when enough introduced facts exist', () => {
    const f = makeFacts(planets([1, 2, 3], due(2)));
    expect(buildQuest(f, { today: T, allowNew: true }, createRng(7))).toHaveLength(QUEST_SIZE);
    expect(buildQuest(f, { today: T, allowNew: false }, createRng(7))).toHaveLength(QUEST_SIZE);
  });
});

describe('buildQuest small pools', () => {
  it('2 introduced facts alternate: length 15, never back-to-back', () => {
    const f = makeFacts({ '1x1': due(2), '1x2': due(3) });
    for (let seed = 1; seed <= 300; seed++) {
      const qs = buildQuest(f, { today: T, allowNew: false }, createRng(seed));
      expect(qs).toHaveLength(15);
      for (let i = 1; i < qs.length; i++) expect(qs[i]!.factId).not.toBe(qs[i - 1]!.factId);
    }
  });

  it('1 introduced fact yields a single question', () => {
    const f = makeFacts({ '1x1': due(2) });
    for (let seed = 1; seed <= 20; seed++) {
      expect(buildQuest(f, { today: T, allowNew: false }, createRng(seed))).toHaveLength(1);
    }
  });
});

describe('buildWarmup', () => {
  it('returns 5 questions, none discovery', () => {
    const f = makeFacts(planets([1, 2], due(2)));
    const qs = buildWarmup(f, T, createRng(8));
    expect(qs).toHaveLength(5);
    expect(qs.some((q) => q.kind === 'discovery')).toBe(false);
  });
});
