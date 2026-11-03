import type { FactId, PlanetId, Question, Rng } from './types';
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

export const PLANETS: readonly PlanetInfo[] = TABLE_ORDER.map((table, i) => {
  const factIds: FactId[] = [];
  for (let other = 1; other <= 9; other++) {
    const id = factId(table, other);
    if (planetOf(id) === i + 1) factIds.push(id);
  }
  return {
    id: (i + 1) as PlanetId,
    name: NAMES[i] as string,
    table,
    factIds,
    alienName: ALIENS[i] as string,
    shipPart: SHIP_PARTS[i] as string,
  };
});

export const ALL_FACT_IDS: readonly FactId[] = PLANETS.flatMap((p) => p.factIds);

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
