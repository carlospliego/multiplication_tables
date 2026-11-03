import { describe, expect, it } from 'vitest';
import { createRng } from './rng';
import { makeQuestion } from './facts';
import {
  MAX_QUEST_LENGTH, currentQuestion, fuelFraction, isQuestDone, recordQuestResult, startQuestRun,
} from './questRun';

const ids = ['1x1', '1x2', '1x3', '1x4', '1x5', '1x6', '1x7', '1x8', '1x9', '2x2', '2x3', '2x4', '2x5', '2x6', '2x7'];
const mk = (n = 15) => ids.slice(0, n).map((id) => makeQuestion(id, createRng(1)));

describe('questRun', () => {
  it('fuelFraction: fresh run is 0; wrong never lowers it; full when done after re-asks', () => {
    let r = startQuestRun(mk(5));
    expect(fuelFraction(r)).toBe(0);
    r = recordQuestResult(r, true, false, createRng(1));
    const before = fuelFraction(r);
    r = recordQuestResult(r, false, false, createRng(1));
    expect(r.queue.length).toBe(6);
    expect(fuelFraction(r)).toBeGreaterThanOrEqual(before);
    while (!isQuestDone(r)) r = recordQuestResult(r, true, false, createRng(1));
    expect(fuelFraction(r)).toBe(1);
  });
  it('correct advances, adds fuel, lightning only when fast', () => {
    let r = startQuestRun(mk());
    r = recordQuestResult(r, true, false, createRng(1));
    expect([r.index, r.fuel, r.lightning]).toEqual([1, 1, 0]);
    r = recordQuestResult(r, true, true, createRng(1));
    expect([r.index, r.fuel, r.lightning]).toEqual([2, 2, 1]);
    expect(fuelFraction(r)).toBeCloseTo(2 / 15);
  });
  it('wrong re-inserts 3-5 positions later, never adjacent to itself', () => {
    for (let seed = 1; seed < 50; seed++) {
      const r0 = startQuestRun(mk());
      const id = currentQuestion(r0)!.factId;
      const r = recordQuestResult(r0, false, false, createRng(seed));
      expect(r.queue.length).toBe(16);
      const pos = r.queue.findIndex((q, i) => i > 0 && q.factId === id);
      expect(pos).toBeGreaterThanOrEqual(3);
      expect(pos).toBeLessThanOrEqual(5);
      for (let i = 1; i < r.queue.length; i++) expect(r.queue[i]!.factId).not.toBe(r.queue[i - 1]!.factId);
    }
  });
  it('goes to the end if fewer remain', () => {
    let r = startQuestRun(mk(4));
    r = recordQuestResult(r, false, false, createRng(1));
    expect(r.queue.length).toBe(5);
    expect(r.queue[4]!.factId).toBe('1x1');
  });
  it('third wrong on one fact does not re-insert', () => {
    let r = startQuestRun([makeQuestion('1x1', createRng(1)), ...mk(6).slice(1)]);
    for (let n = 0; n < 3; n++) {
      // advance to the next occurrence of 1x1
      while (currentQuestion(r)!.factId !== '1x1') r = recordQuestResult(r, true, false, createRng(1));
      r = recordQuestResult(r, false, false, createRng(2));
    }
    expect(r.queue.filter((q) => q.factId === '1x1').length).toBe(3);
    expect(r.reinserts['1x1']).toBe(2);
  });
  it('never exceeds 20 questions', () => {
    let r = startQuestRun(mk(15));
    let guard = 0;
    while (!isQuestDone(r) && guard++ < 100) r = recordQuestResult(r, false, false, createRng(guard));
    expect(r.queue.length).toBeLessThanOrEqual(MAX_QUEST_LENGTH);
    expect(isQuestDone(r)).toBe(true);
  });
  it('done once index reaches length', () => {
    let r = startQuestRun(mk(2));
    expect(isQuestDone(r)).toBe(false);
    r = recordQuestResult(r, true, false, createRng(1));
    r = recordQuestResult(r, true, false, createRng(1));
    expect(isQuestDone(r)).toBe(true);
    expect(currentQuestion(r)).toBeNull();
  });
  it('re-inserted discovery becomes normal', () => {
    const q = makeQuestion('1x1', createRng(1), 'discovery');
    const r = recordQuestResult(startQuestRun([q, ...mk(6).slice(1)]), false, false, createRng(1));
    expect(r.queue[0]!.kind).toBe('discovery');
    expect(r.queue.filter((x) => x.factId === '1x1')[1]!.kind).toBe('normal');
  });
});
