import { describe, it, expect } from 'vitest';
import { ALL_FACT_IDS, PLANETS, TABLE_ORDER, factId, parseFact, planetOf, tipFor, makeQuestion } from './facts';
import { createRng } from './rng';

describe('facts', () => {
  it('has 45 unique well-formed facts', () => {
    expect(ALL_FACT_IDS.length).toBe(45);
    expect(new Set(ALL_FACT_IDS).size).toBe(45);
    for (const id of ALL_FACT_IDS) {
      expect(id).toMatch(/^[1-9]x[1-9]$/);
      const { a, b } = parseFact(id);
      expect(a).toBeLessThanOrEqual(b);
    }
  });
  it('planets', () => {
    expect(PLANETS.map((p) => p.factIds.length)).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1]);
    expect(PLANETS.map((p) => p.table)).toEqual([...TABLE_ORDER]);
    expect(PLANETS[3]!.factIds).toEqual(['3x3', '3x4', '3x6', '3x7', '3x8', '3x9']);
    expect(PLANETS[5]!.factIds).toEqual(['6x9', '7x9', '8x9', '9x9']);
    expect(PLANETS.map((p) => p.name)).toEqual(['Launch Pad', 'Twinara', 'Pentaro', 'Trion', 'Quadrix', 'Nonova', 'Hexion', 'Septura', 'Octavia']);
  });
  it('factId / planetOf', () => {
    expect(factId(7, 3)).toBe('3x7');
    expect(planetOf('3x9')).toBe(4);
    expect(planetOf('6x9')).toBe(6);
    expect(planetOf('3x5')).toBe(3);
    expect(planetOf('8x8')).toBe(9);
  });
  it('tips', () => {
    expect(tipFor('2x7')).toContain('double');
    expect(tipFor('7x8')).toBe('7×8 = 7×5 + 7×3 = 35 + 21');
    expect(tipFor('7x7')).toBe('7×7 = 7×5 + 7×2 = 35 + 14');
  });
  it('makeQuestion', () => {
    const rng = createRng(1);
    const orders = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const q = makeQuestion('3x7', rng);
      expect(q.answer).toBe(21);
      expect(q.kind).toBe('normal');
      orders.add(`${q.a}x${q.b}`);
    }
    expect([...orders].sort()).toEqual(['3x7', '7x3']);
    expect(makeQuestion('3x7', rng, 'discovery').kind).toBe('discovery');
  });
});
