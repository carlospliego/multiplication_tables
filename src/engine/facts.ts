import type { FactId, PlanetId, Question, Rng } from './types';
import { pick } from './rng';
import { SKIP_TABLES } from '../skip';

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

/** True when either factor is in the skip list (src/skip.ts). */
export function isSkipped(id: FactId): boolean {
  const { a, b } = parseFact(id);
  return SKIP_TABLES.includes(a) || SKIP_TABLES.includes(b);
}

/** All 45 facts, skipped or not: the save format always stores every one. */
export const STORED_FACT_IDS: readonly FactId[] = TABLE_ORDER.flatMap((table, i) => {
  const ids: FactId[] = [];
  for (let other = 1; other <= 9; other++) {
    const id = factId(table, other);
    if (planetOf(id) === i + 1) ids.push(id);
  }
  return ids;
});

/**
 * Indexed by planet id (PLANETS[id - 1]). Each planet lists only the facts in play, so a planet
 * whose table is skipped has no facts; ACTIVE_PLANETS is the list to show and progress through.
 */
export const PLANETS: readonly PlanetInfo[] = TABLE_ORDER.map((table, i) => {
  const factIds = STORED_FACT_IDS.filter((id) => planetOf(id) === i + 1 && !isSkipped(id));
  return {
    id: (i + 1) as PlanetId,
    name: NAMES[i] as string,
    table,
    factIds,
    alienName: ALIENS[i] as string,
    shipPart: SHIP_PARTS[i] as string,
  };
});

/** Planets that still have facts after skipping, in table order. */
export const ACTIVE_PLANETS: readonly PlanetInfo[] = PLANETS.filter((p) => p.factIds.length > 0);

/** The planet the game starts on: open from day one, so it is never celebrated as new. */
export const FIRST_PLANET: PlanetId | undefined = ACTIVE_PLANETS[0]?.id;

/** Every fact in play (skipped facts left out). */
export const ALL_FACT_IDS: readonly FactId[] = PLANETS.flatMap((p) => p.factIds);

/** How many facts are in play: 28 with ×1 and ×2 skipped, 45 with nothing skipped. */
export const FACT_COUNT = ALL_FACT_IDS.length;

/** Numbers that still appear in the game (1-9 minus the skip list). */
export const ACTIVE_NUMBERS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((n) => !SKIP_TABLES.includes(n));

/** Ship parts for the bosses beaten on planets still in play. */
export function shipParts(bossesBeaten: readonly PlanetId[]): string[] {
  return bossesBeaten.filter((p) => PLANETS[p - 1]!.factIds.length > 0).map((p) => PLANETS[p - 1]!.shipPart);
}

/** Bosses beaten on planets still in play. */
export function activeBossesBeaten(bossesBeaten: readonly PlanetId[]): PlanetId[] {
  return bossesBeaten.filter((p) => PLANETS[p - 1]!.factIds.length > 0);
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
