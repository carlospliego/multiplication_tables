import { describe, expect, it } from 'vitest';
import { PLANETS } from './facts';
import {
  availableBoss,
  frontierPlanet,
  makeFacts,
  masteredCount,
  openPlanets,
  starStates,
} from './progress';
import type { FactId, FactRecord, Level, PlanetId } from './types';

function planetAt(ids: PlanetId[], level: Level): Partial<Record<FactId, Partial<FactRecord>>> {
  const o: Partial<Record<FactId, Partial<FactRecord>>> = {};
  for (const id of ids) for (const f of PLANETS[id - 1]!.factIds) o[f] = { level };
  return o;
}

describe('progress', () => {
  it('makeFacts builds 45 new records', () => {
    const f = makeFacts();
    expect(Object.keys(f)).toHaveLength(45);
    expect(f['1x1']!.level).toBe(0);
  });

  it('all new', () => {
    const f = makeFacts();
    expect(openPlanets(f)).toEqual([1]);
    expect(frontierPlanet(f)).toBe(1);
    expect(availableBoss(f, [])).toBeNull();
  });

  it('planet 1 all level 2 opens planet 2', () => {
    const f = makeFacts(planetAt([1], 2));
    expect(openPlanets(f)).toEqual([1, 2]);
    expect(frontierPlanet(f)).toBe(2);
  });

  it('one level-1 fact keeps planet 2 closed', () => {
    const f = makeFacts({ ...planetAt([1], 2), '1x1': { level: 1 } });
    expect(openPlanets(f)).toEqual([1]);
  });

  it('planets 1-3 level 4 open 4', () => {
    const f = makeFacts(planetAt([1, 2, 3], 4));
    expect(openPlanets(f)).toEqual([1, 2, 3, 4]);
    expect(frontierPlanet(f)).toBe(4);
  });

  it('boss availability', () => {
    const f = makeFacts(planetAt([1], 1));
    expect(availableBoss(f, [])).toBe(1);
    expect(availableBoss(f, [1])).toBeNull();
  });

  it('earliest boss first', () => {
    const f = makeFacts(planetAt([1, 2], 2));
    expect(availableBoss(f, [])).toBe(1);
    expect(availableBoss(f, [1])).toBe(2);
  });

  it('locked planet is not offered a boss', () => {
    const f = makeFacts(planetAt([3], 1));
    expect(availableBoss(f, [])).toBeNull();
  });

  it('star states and masteredCount', () => {
    const f = makeFacts({
      '1x1': { level: 5 },
      '1x2': { level: 2, everMastered: true },
      '1x3': { level: 3 },
    });
    const s = starStates(f);
    expect(s['1x1']).toBe('lit');
    expect(s['1x2']).toBe('tuneUp');
    expect(s['1x3']).toBe('dark');
    expect(masteredCount(f)).toBe(1);
  });

  it('frontier is null when no open planet has level-0 facts', () => {
    const all = planetAt([1, 2, 3, 4, 5, 6, 7, 8, 9], 2);
    expect(frontierPlanet(makeFacts(all))).toBeNull();
  });
});
