import type { FactId, Facts, PlanetId, Question, Rng } from './types';
import { pick } from './rng';

export const TABLE_ORDER = [1, 2, 5, 3, 4, 9, 6, 7, 8] as const;

export interface PlanetInfo {
  id: PlanetId;
  name: string;
  table: number;
  factIds: FactId[];
  alienName: string;
  shipPart: string;
}

const NAMES = ['Launch Pad', 'Twinara', 'Pentaro', 'Trion', 'Quadrix', 'Nonova', 'Hexion', 'Septura', 'Octavia'];
const SHIP_PARTS = ['Racing Fins', 'Nose Cone', 'Twin Boosters', 'Wings', 'Flame Trail', 'Antenna', 'Stripes', 'Bubble Cockpit', 'Golden Paint'];
const ALIENS = ['Bleep', 'Twix', 'Penny', 'Zib', 'Quorp', 'Nova', 'Hex', 'Septi', 'Octo'];

export function factId(a: number, b: number): FactId {
  return a <= b ? `${a}x${b}` : `${b}x${a}`;
}

export function parseFact(id: FactId): { a: number; b: number } {
  const [a, b] = id.split('x').map(Number);
  return { a: a as number, b: b as number };
}

function orderIndex(n: number): number {
  return (TABLE_ORDER as readonly number[]).indexOf(n);
}

export function planetOf(id: FactId): PlanetId {
  const { a, b } = parseFact(id);
  return (Math.min(orderIndex(a), orderIndex(b)) + 1) as PlanetId;
}

/** All 45 facts in table order. Saves always store every one, skipped or not. */
export const ALL_FACT_IDS: readonly FactId[] = TABLE_ORDER.flatMap((table, i) => {
  const ids: FactId[] = [];
  for (let other = 1; other <= 9; other++) {
    const id = factId(table, other);
    if (planetOf(id) === i + 1) ids.push(id);
  }
  return ids;
});

/** Indexed by planet id (PLANETS[id - 1]), with every fact. Use planetFactIds for the ones in play. */
export const PLANETS: readonly PlanetInfo[] = TABLE_ORDER.map((table, i) => {
  const factIds = ALL_FACT_IDS.filter((id) => planetOf(id) === i + 1);
  return {
    id: (i + 1) as PlanetId,
    name: NAMES[i] as string,
    table,
    factIds,
    alienName: ALIENS[i] as string,
    shipPart: SHIP_PARTS[i] as string,
  };
});

/*
 * Facts in play. The engine treats the facts object it is given as the facts in play: callers
 * pass factsInPlay(save.facts, skip) (see playFacts in storage/save.ts), and every fact missing
 * from it is skipped. With nothing skipped that is all 45.
 */

/** True when either factor is in the skip list. */
export function isSkipped(id: FactId, skip: readonly number[]): boolean {
  const { a, b } = parseFact(id);
  return skip.includes(a) || skip.includes(b);
}

/** The facts with no skipped factor, in table order. */
export function factsInPlay(facts: Facts, skip: readonly number[]): Facts {
  const out: Facts = {};
  for (const id of ALL_FACT_IDS) {
    const rec = facts[id];
    if (rec && !isSkipped(id, skip)) out[id] = rec;
  }
  return out;
}

/** A planet's facts that are in play. */
export function planetFactIds(planet: PlanetId, facts: Facts): FactId[] {
  return PLANETS[planet - 1]!.factIds.filter((id) => id in facts);
}

/** Planets with at least one fact in play, in table order. */
export function activePlanets(facts: Facts): PlanetInfo[] {
  return PLANETS.filter((p) => planetFactIds(p.id, facts).length > 0);
}

/** Numbers 1-9 that are not skipped. */
export function activeNumbers(skip: readonly number[]): number[] {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((n) => !skip.includes(n));
}

/** Bosses beaten on planets still in play. */
export function activeBossesBeaten(bossesBeaten: readonly PlanetId[], facts: Facts): PlanetId[] {
  return bossesBeaten.filter((p) => planetFactIds(p, facts).length > 0);
}

/** Ship parts for the bosses beaten on planets still in play. */
export function shipParts(bossesBeaten: readonly PlanetId[], facts: Facts): string[] {
  return activeBossesBeaten(bossesBeaten, facts).map((p) => PLANETS[p - 1]!.shipPart);
}

const TIPS: Record<number, string> = {
  1: 'Anything times 1 stays the same!',
  2: 'Times 2 means double it!',
  5: 'Count by 5s — like the minutes on a clock!',
  3: 'Double it, then add one more group.',
  4: 'Double it, then double again!',
  9: 'The tens digit is one less, and the digits add up to 9!',
  6: 'Do ×5, then add one more group.',
  8: 'Double, double, double!',
};

export function tipFor(id: FactId): string {
  const table = PLANETS[planetOf(id) - 1]!.table;
  if (table === 7) {
    const { a, b } = parseFact(id);
    const n = a === 7 ? b : a;
    return `7×${n} = 7×5 + 7×${n - 5} = ${35} + ${7 * (n - 5)}`;
  }
  return TIPS[table] as string;
}

export function makeQuestion(id: FactId, rng: Rng, kind: Question['kind'] = 'normal'): Question {
  const { a, b } = parseFact(id);
  const [x, y] = pick([[a, b], [b, a]] as const, rng);
  return { factId: id, a: x, b: y, answer: a * b, kind };
}
