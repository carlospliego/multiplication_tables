import { compareDays } from './dates';
import { makeQuestion, PLANETS } from './facts';
import { isDue } from './levels';
import { frontierPlanet } from './progress';
import { pick, shuffle } from './rng';
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

/**
 * Lays out the quest: pinned slots (discoveries at 0/2/4, each re-ask 3 positions later) first,
 * then the remaining slots are filled greedily with the fact that has the most copies left and
 * differs from both neighbours (random tie-break). If a slot cannot be filled without a
 * back-to-back repeat (e.g. a single distinct fact), the surplus is dropped.
 */
function arrange(base: Question[], newIds: FactId[], rng: Rng): Question[] {
  type Slot = Question | null;
  const slots: Slot[] = base.map(() => null);
  const disc = newIds.map((id) => makeQuestion(id, rng, 'discovery'));
  disc.forEach((d, i) => slots.splice(Math.min(DISCOVERY_SLOTS[i]!, slots.length), 0, d));
  for (const d of disc) {
    const at = slots.indexOf(d) + REASK_GAP;
    slots.splice(Math.min(at, slots.length), 0, makeQuestion(d.factId, rng, 'normal'));
  }

  const pool = new Map<FactId, Question[]>();
  for (const q of base) pool.set(q.factId, [...(pool.get(q.factId) ?? []), q]);

  const out: Question[] = [];
  const last = (): FactId | undefined => out[out.length - 1]?.factId;
  slots.forEach((slot, i) => {
    if (slot) {
      if (slot.factId !== last()) out.push(slot);
      return;
    }
    const nextPinned = slots[i + 1]?.factId;
    const options = [...pool.entries()].filter(
      ([id, qs]) => qs.length > 0 && id !== last() && id !== nextPinned,
    );
    if (options.length === 0) return; // surplus repeat dropped
    const most = Math.max(...options.map(([, qs]) => qs.length));
    const [id, qs] = pick(
      options.filter(([, q]) => q.length === most),
      rng,
    );
    out.push(qs.pop()!);
    pool.set(id, qs);
  });
  return out;
}

export function buildQuest(facts: Facts, opts: BuildOptions, rng: Rng): Question[] {
  const size = opts.size ?? QUEST_SIZE;
  const newIds = pickNewFacts(facts, opts.allowNew);
  const baseIds = chooseBase(facts, opts.today, size - 2 * newIds.length, rng);
  const base = baseIds.map((id) => makeQuestion(id, rng));
  return arrange(base, newIds, rng);
}

export function buildWarmup(facts: Facts, today: Day, rng: Rng): Question[] {
  return buildQuest(facts, { today, allowNew: false, size: WARMUP_SIZE }, rng);
}
