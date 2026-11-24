import { describe, expect, it } from 'vitest';
import { DIFFICULTIES, DIFFICULTY, difficultyOf, isDifficulty } from './difficulty';
import { FAST_MS } from './levels';
import { QUEST_SIZE } from './scheduler';

describe('difficulty', () => {
  it('normal matches the original game', () => {
    expect(DIFFICULTY.normal).toMatchObject({ fastMs: FAST_MS, questSize: QUEST_SIZE });
  });
  it('easy is slower and shorter, hard is faster and longer', () => {
    expect(DIFFICULTY.easy).toMatchObject({ fastMs: 6000, questSize: 10 });
    expect(DIFFICULTY.hard).toMatchObject({ fastMs: 3000, questSize: 20 });
  });
  it('old saves without a setting play on normal', () => {
    expect(difficultyOf({})).toBe('normal');
    expect(difficultyOf({ difficulty: 'hard' })).toBe('hard');
  });
  it('isDifficulty', () => {
    for (const d of DIFFICULTIES) expect(isDifficulty(d)).toBe(true);
    expect(isDifficulty('insane')).toBe(false);
    expect(isDifficulty(1)).toBe(false);
  });
});
