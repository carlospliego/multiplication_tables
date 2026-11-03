import { describe, expect, it } from 'vitest';
import { createRng, pick, randInt, shuffle } from './rng';

describe('rng', () => {
  it('is deterministic and in [0,1)', () => {
    const a = createRng(42);
    const b = createRng(42);
    const xs = Array.from({ length: 5 }, () => a());
    expect(xs).toEqual(Array.from({ length: 5 }, () => b()));
    const r = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('shuffle is a non-mutating permutation', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const out = shuffle(input, createRng(1));
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect([...out].sort((x, y) => x - y)).toEqual(input);
  });
  it('randInt covers range only', () => {
    const r = createRng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) seen.add(randInt(3, 5, r));
    expect([...seen].sort()).toEqual([3, 4, 5]);
  });
  it('pick returns an element', () => {
    expect(['a', 'b']).toContain(pick(['a', 'b'], createRng(5)));
  });
});
