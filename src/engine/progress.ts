import { activePlanets, ALL_FACT_IDS, planetFactIds } from './facts';
import { newFactRecord } from './levels';
import type { FactId, FactRecord, Facts, PlanetId } from './types';

export type StarState = 'lit' | 'tuneUp' | 'dark';

function planetAllAtLeast(facts: Facts, planet: PlanetId, level: number): boolean {
  return planetFactIds(planet, facts).every((id) => facts[id]!.level >= level);
}

/**
 * `facts` is the facts in play (see factsInPlay); planets with none of them are skipped.
 * Unlocked: the first planet in play, then each next one once the previous is all at level 2+.
 */
export function openPlanets(facts: Facts): PlanetId[] {
  const open: PlanetId[] = [];
  for (const p of activePlanets(facts)) {
    const prev = open[open.length - 1];
    if (prev !== undefined && !planetAllAtLeast(facts, prev, 2)) break;
    open.push(p.id);
  }
  return open;
}

export function frontierPlanet(facts: Facts): PlanetId | null {
  for (const id of openPlanets(facts)) {
    if (planetFactIds(id, facts).some((f) => facts[f]!.level === 0)) return id;
  }
  return null;
}

export function availableBoss(facts: Facts, bossesBeaten: readonly PlanetId[]): PlanetId | null {
  for (const id of openPlanets(facts)) {
    if (!bossesBeaten.includes(id) && planetAllAtLeast(facts, id, 1)) return id;
  }
  return null;
}

export function starStates(facts: Facts): Record<FactId, StarState> {
  const out: Record<FactId, StarState> = {};
  for (const id of Object.keys(facts)) {
    const r = facts[id]!;
    out[id] = r.level === 5 ? 'lit' : r.everMastered ? 'tuneUp' : 'dark';
  }
  return out;
}

export function masteredCount(facts: Facts): number {
  return Object.values(facts).filter((r) => r.level === 5).length;
}

/** Test helper: all 45 facts new, with per-fact overrides. */
export function makeFacts(overrides: Partial<Record<FactId, Partial<FactRecord>>> = {}): Facts {
  const facts: Facts = {};
  for (const id of ALL_FACT_IDS) facts[id] = { ...newFactRecord(), ...overrides[id] };
  return facts;
}
