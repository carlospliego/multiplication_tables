import { compareDays } from './dates';
import { makeQuestion, PLANETS } from './facts';
import { isDue } from './levels';
import { frontierPlanet } from './progress';
import { shuffle } from './rng';
import type { Day, FactId, Facts, Question, Rng } from './types';

export const QUEST_SIZE = 15;
export const WARMUP_SIZE = 5;
export const MAX_NEW_PER_QUEST = 3;
export const MAX_LEVEL1_FOR_NEW = 8;
const MAX_MAINTENANCE = 2;
const DISCOVERY_SLOTS = [0, 2, 4];
const REASK_GAP = 3;

export interface BuildOptions {
  today: Day;
  allowNew: boolean;
  size?: number;
}

function ids(facts: Facts): FactId[] {
  return Object.keys(facts);
}

function pickNewFacts(facts: Facts, allowNew: boolean): FactId[] {
  if (!allowNew) return [];
  if (ids(facts).filter((id) => facts[id]!.level === 1).length >= MAX_LEVEL1_FOR_NEW) return [];
  const planet = frontierPlanet(facts);
  if (planet === null) return [];
  return PLANETS[planet - 1]!.factIds.filter((id) => facts[id]!.level === 0).slice(0, MAX_NEW_PER_QUEST);
}

/** Introduced facts of lowest level first, random among ties. */
function byLevelRandom(candidates: FactId[], facts: Facts, rng: Rng): FactId[] {
  return shuffle(candidates, rng).sort((x, y) => facts[x]!.level - facts[y]!.level);
}

function chooseBase(facts: Facts, today: Day, slots: number, rng: Rng): FactId[] {
  if (slots <= 0) return [];
  // Due facts: oldest dueDay first, then lowest level.
  const dueIds = ids(facts)
    .filter((id) => isDue(facts[id]!, today))
    .sort((x, y) => {
      const rx = facts[x]!;
      const ry = facts[y]!;
      return compareDays(rx.dueDay!, ry.dueDay!) || rx.level - ry.level;
    })
    .slice(0, slots);
  const chosen = [...dueIds];

  // Maintenance: mastered facts, if none are already included.
  const mastered = ids(facts).filter((id) => facts[id]!.level === 5);
  if (mastered.length > 0 && !chosen.some((id) => facts[id]!.level === 5)) {
    const extra = shuffle(mastered, rng).slice(0, Math.min(MAX_MAINTENANCE, slots));
    const keep = Math.max(0, Math.min(chosen.length, slots - extra.length));
    chosen.length = keep; // lowest-priority due facts make room
    chosen.push(...extra);
  }

  // Filler: unused introduced facts (lowest level first), then repeats.
  if (chosen.length < slots) {
    const introduced = ids(facts).filter((id) => facts[id]!.level >= 1);
    const unused = byLevelRandom(
      introduced.filter((id) => !chosen.includes(id)),
      facts,
      rng,
    );
    for (const id of unused) {
      if (chosen.length >= slots) break;
      chosen.push(id);
    }
    if (chosen.length < slots && introduced.length > 0) {
      const cycle = byLevelRandom(introduced, facts, rng);
      for (let i = 0; chosen.length < slots; i++) chosen.push(cycle[i % cycle.length]!);
    }
  }
  return chosen;
}

interface Item {
  q: Question;
  pinned: boolean;
}

function arrange(base: Question[], newIds: FactId[], rng: Rng): Question[] {
  const items: Item[] = shuffle(base, rng).map((q) => ({ q, pinned: false }));
  const disc: Item[] = newIds.map((id) => ({ q: makeQuestion(id, rng, 'discovery'), pinned: true }));
  disc.forEach((d, i) => items.splice(Math.min(DISCOVERY_SLOTS[i]!, items.length), 0, d));
  for (const d of disc) {
    const at = items.indexOf(d) + REASK_GAP;
    items.splice(Math.min(at, items.length), 0, { q: makeQuestion(d.q.factId, rng, 'normal'), pinned: true });
  }

  // Repair adjacency by swapping with a later unpinned item.
  for (let i = 1; i < items.length; i++) {
    const cur = items[i]!;
    if (cur.pinned || cur.q.factId !== items[i - 1]!.q.factId) continue;
    const next = items[i + 1]?.q.factId;
    for (let j = i + 1; j < items.length; j++) {
      const cand = items[j]!;
      if (cand.pinned) continue;
      const cf = cand.q.factId;
      if (cf === cur.q.factId || cf === items[i - 1]!.q.factId || cf === next) continue;
      if (items[j - 1]!.q.factId === cur.q.factId && j - 1 !== i) continue;
      if (items[j + 1]?.q.factId === cur.q.factId) continue;
      items[i] = cand;
      items[j] = cur;
      break;
    }
  }
  return items.map((it) => it.q);
}

const MAX_ARRANGE_ATTEMPTS = 30;

function hasAdjacentRepeat(qs: Question[]): boolean {
  return qs.some((q, i) => i > 0 && q.factId === qs[i - 1]!.factId);
}

export function buildQuest(facts: Facts, opts: BuildOptions, rng: Rng): Question[] {
  const size = opts.size ?? QUEST_SIZE;
  const newIds = pickNewFacts(facts, opts.allowNew);
  const baseIds = chooseBase(facts, opts.today, size - 2 * newIds.length, rng);
  const base = baseIds.map((id) => makeQuestion(id, rng));
  // Repeats of a tiny pool can defeat the single repair pass; retry the shuffle a few times.
  let best = arrange(base, newIds, rng);
  for (let attempt = 0; attempt < MAX_ARRANGE_ATTEMPTS && hasAdjacentRepeat(best); attempt++) {
    best = arrange(base, newIds, rng);
  }
  return best;
}

export function buildWarmup(facts: Facts, today: Day, rng: Rng): Question[] {
  return buildQuest(facts, { today, allowNew: false, size: WARMUP_SIZE }, rng);
}
