import { describe, expect, it } from 'vitest';
import { createRng } from './rng';
import { PLANETS, planetOf } from './facts';
import { makeFacts } from './progress';
import { BOSS_SHIELD, nextBossQuestion, recordBossAnswer, startBoss } from './boss';

function openUpTo4() {
  const o: Record<string, { level: 2 }> = {};
  for (const p of PLANETS.slice(0, 3)) for (const id of p.factIds) o[id] = { level: 2 };
  for (const id of PLANETS[3]!.factIds) o[id] = { level: 1 } as never;
  return makeFacts(o);
}

describe('boss', () => {
  it('starts with full shield', () => expect(startBoss(4).shield).toBe(BOSS_SHIELD));
  it('12 correct wins', () => {
    let r = startBoss(4);
    for (let i = 0; i < 12; i++) r = recordBossAnswer(r, '3x4', true);
    expect(r.shield).toBe(0);
    expect(r.status).toBe('won');
  });
  it('wrong regenerates, capped at 12', () => {
    expect(recordBossAnswer(startBoss(4), '3x4', false).shield).toBe(12);
    let r = startBoss(4);
    for (let i = 0; i < 7; i++) r = recordBossAnswer(r, '3x4', true);
    expect(r.shield).toBe(5);
    expect(recordBossAnswer(r, '3x4', false).shield).toBe(6);
  });
  it('retreats after 20 answers', () => {
    let r = startBoss(4);
    for (let i = 0; i < 20; i++) r = recordBossAnswer(r, '3x4', i % 2 === 0);
    expect(r.status).toBe('retreated');
  });
  it('question mix ~60% planet, no repeats, only introduced earlier-open facts', () => {
    const facts = openUpTo4();
    const rng = createRng(7);
    let run = startBoss(4);
    let own = 0;
    for (let i = 0; i < 500; i++) {
      const q = nextBossQuestion(facts, run, rng);
      expect(q.factId).not.toBe(run.lastFactId);
      expect(planetOf(q.factId)).toBeLessThanOrEqual(4);
      expect(facts[q.factId]!.level).toBeGreaterThanOrEqual(1);
      if (planetOf(q.factId) === 4) own++;
      run = { ...run, lastFactId: q.factId };
    }
    expect(own / 500).toBeGreaterThan(0.5);
    expect(own / 500).toBeLessThan(0.7);
  });
  it('only boss-planet facts when no earlier facts introduced', () => {
    const o: Record<string, { level: 1 }> = {};
    for (const id of PLANETS[0]!.factIds) o[id] = { level: 1 };
    const facts = makeFacts(o as never);
    const rng = createRng(3);
    let run = startBoss(1);
    for (let i = 0; i < 100; i++) {
      const q = nextBossQuestion(facts, run, rng);
      expect(planetOf(q.factId)).toBe(1);
      run = { ...run, lastFactId: q.factId };
    }
  });
});
