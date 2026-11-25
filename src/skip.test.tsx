/**
 * The real skip list (src/skip.ts). Other test files mock it to [] to cover the full game rules;
 * this one checks that the configured tables are gone everywhere.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SKIP_TABLES } from './skip';
import {
  ACTIVE_NUMBERS, ACTIVE_PLANETS, ALL_FACT_IDS, FACT_COUNT, FIRST_PLANET, isSkipped, parseFact, PLANETS,
  shipParts, STORED_FACT_IDS,
} from './engine/facts';
import { availableBoss, frontierPlanet, makeFacts, masteredCount, openPlanets } from './engine/progress';
import { placementQuestions } from './engine/placement';
import { buildQuest, buildWarmup } from './engine/scheduler';
import { nextBossQuestion, startBoss } from './engine/boss';
import { createRng } from './engine/rng';
import type { FactRecord, PlanetId } from './engine/types';
import { createFreshSave, SAVE_KEY, validateSave } from './storage/save';
import { FactGrid } from './components/FactGrid';
import { GameProvider } from './state/GameContext';
import { GalaxyMap } from './screens/GalaxyMap';
import { StarMap } from './screens/StarMap';
import { Hangar } from './screens/Hangar';

const T = '2026-11-24';
const usesSkipped = (id: string) => {
  const { a, b } = parseFact(id);
  return SKIP_TABLES.includes(a) || SKIP_TABLES.includes(b);
};

function storageWith(save: object): Storage {
  const data = new Map([[SAVE_KEY, JSON.stringify(save)]]);
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  } as unknown as Storage;
}

describe('skip list', () => {
  it('skips the ×1 and ×2 tables', () => {
    expect(SKIP_TABLES).toEqual([1, 2]);
    expect(ACTIVE_NUMBERS).toEqual([3, 4, 5, 6, 7, 8, 9]);
  });

  it('leaves 28 facts in play, none with a skipped factor; saves still store all 45', () => {
    expect(FACT_COUNT).toBe(28);
    expect(ALL_FACT_IDS.some(usesSkipped)).toBe(false);
    expect(ALL_FACT_IDS.every((id) => !isSkipped(id))).toBe(true);
    expect(STORED_FACT_IDS).toHaveLength(45);
    expect(isSkipped('2x7')).toBe(true);
    expect(isSkipped('1x5')).toBe(true);
    expect(isSkipped('3x7')).toBe(false);
  });

  it('removes the ×1 and ×2 planets; the game starts on ×5', () => {
    expect(ACTIVE_PLANETS.map((p) => p.table)).toEqual([5, 3, 4, 9, 6, 7, 8]);
    expect(PLANETS[0]!.factIds).toEqual([]);
    expect(PLANETS[1]!.factIds).toEqual([]);
    expect(FIRST_PLANET).toBe(3);
  });

  it('unlocking, frontier and bosses only use planets in play', () => {
    const fresh = makeFacts();
    expect(openPlanets(fresh)).toEqual([3]);
    expect(frontierPlanet(fresh)).toBe(3);
    expect(availableBoss(fresh, [])).toBeNull();
    const p3: Record<string, Partial<FactRecord>> = {};
    for (const id of PLANETS[2]!.factIds) p3[id] = { level: 2 };
    expect(openPlanets(makeFacts(p3))).toEqual([3, 4]);
    expect(availableBoss(makeFacts(p3), [])).toBe(3);
  });

  it('mastery counts ignore skipped facts stored in the save', () => {
    const all: Record<string, Partial<FactRecord>> = {};
    for (const id of STORED_FACT_IDS) all[id] = { level: 5 };
    expect(masteredCount(makeFacts(all))).toBe(28);
    expect(masteredCount(makeFacts({ '2x7': { level: 5 } }))).toBe(0);
  });

  it('quests, warm-ups and bosses never ask a skipped fact, even one stored as due', () => {
    const all: Record<string, Partial<FactRecord>> = {};
    for (const id of STORED_FACT_IDS) all[id] = { level: 1, dueDay: '2020-01-01' };
    const facts = makeFacts(all);
    for (let seed = 1; seed <= 20; seed++) {
      const rng = createRng(seed);
      expect(buildQuest(facts, { today: T, allowNew: true }, rng).some((q) => usesSkipped(q.factId))).toBe(false);
      expect(buildWarmup(facts, T, rng).some((q) => usesSkipped(q.factId))).toBe(false);
      expect(usesSkipped(nextBossQuestion(facts, startBoss(9), rng).factId)).toBe(false);
    }
  });

  it('the Systems Check asks only the ×5 facts', () => {
    const qs = placementQuestions(createRng(1));
    expect(qs).toHaveLength(7);
    expect(qs.every((q) => q.factId.split('x').includes('5'))).toBe(true);
  });

  it('ship parts only come from planets in play', () => {
    expect(shipParts([1, 2, 3] as PlanetId[])).toEqual([PLANETS[2]!.shipPart]);
  });

  it('an existing save with all 45 facts still loads', () => {
    expect(validateSave(JSON.parse(JSON.stringify(createFreshSave('Leo', '2026-11-01T00:00:00Z'))))).not.toBeNull();
  });
});

describe('skip list in the UI', () => {
  const save = { ...createFreshSave('Leo', '2026-11-01T00:00:00Z'), placementDone: true, bossesBeaten: [1, 2] };

  it('the parent grid shows only 3-9', () => {
    render(<FactGrid facts={makeFacts()} onSelect={() => undefined} />);
    expect(screen.getAllByRole('button')).toHaveLength(49);
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['3', '4', '5', '6', '7', '8', '9']);
    expect(screen.queryByRole('button', { name: /2 × 7/ })).toBeNull();
  });

  it('the map shows 7 planets and counts 28 facts', () => {
    render(<GameProvider storage={storageWith(save)} session={null}><GalaxyMap /></GameProvider>);
    expect(document.querySelectorAll('[data-planet]')).toHaveLength(7);
    expect(document.querySelector('[data-planet="1"]')).toBeNull();
    expect(screen.getByText('0 of 28 facts mastered')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull(); // the first planet is not celebrated as new
  });

  it('the Star Map has 28 stars', () => {
    render(<GameProvider storage={storageWith(save)} session={null}><StarMap /></GameProvider>);
    expect(document.querySelectorAll('[data-fact]')).toHaveLength(28);
    expect(screen.getByText('★ 0 / 28 stars lit')).toBeInTheDocument();
  });

  it('the Hangar lists 7 crew slots and ignores bosses from skipped planets', () => {
    render(<GameProvider storage={storageWith(save)} session={null}><Hangar /></GameProvider>);
    expect(screen.getAllByRole('listitem')).toHaveLength(7);
    expect(screen.getByText('Free a planet to add a ship part!')).toBeInTheDocument();
  });
});
