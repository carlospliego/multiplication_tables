import type { FactId, Facts, PlanetId, Question, Rng } from './types';
import { PLANETS, makeQuestion } from './facts';
import { openPlanets } from './progress';

export const BOSS_SHIELD = 12;
export const BOSS_MAX_QUESTIONS = 20;
const PLANET_SHARE = 0.6;

export interface BossRun {
  planet: PlanetId;
  shield: number;
  asked: number;
  lastFactId: FactId | null;
  status: 'fighting' | 'won' | 'retreated';
}

export function startBoss(planet: PlanetId): BossRun {
  return { planet, shield: BOSS_SHIELD, asked: 0, lastFactId: null, status: 'fighting' };
}

function weightedPick(ids: FactId[], facts: Facts, rng: Rng): FactId {
  const weights = ids.map((id) => 6 - facts[id]!.level);
  let r = rng() * weights.reduce((s, w) => s + w, 0);
  for (let i = 0; i < ids.length; i++) {
    r -= weights[i]!;
    if (r < 0) return ids[i]!;
  }
  return ids[ids.length - 1]!;
}

export function nextBossQuestion(facts: Facts, run: BossRun, rng: Rng): Question {
  const introduced = (id: FactId): boolean => facts[id]!.level >= 1 && id !== run.lastFactId;
  const own = PLANETS[run.planet - 1]!.factIds.filter(introduced);
  const open = openPlanets(facts).filter((p) => p < run.planet);
  const earlier = open.flatMap((p) => PLANETS[p - 1]!.factIds.filter(introduced));

  let pool = rng() < PLANET_SHARE ? own : earlier;
  if (pool.length === 0) pool = own.length > 0 ? own : earlier;
  if (pool.length === 0) {
    // Degenerate (e.g. a single-fact boss planet with no review pool): allow the repeat.
    pool = PLANETS[run.planet - 1]!.factIds;
  }
  return makeQuestion(weightedPick(pool, facts, rng), rng);
}

export function recordBossAnswer(run: BossRun, factId: FactId, correct: boolean): BossRun {
  if (run.status !== 'fighting') return run;
  const shield = correct ? Math.max(0, run.shield - 1) : Math.min(BOSS_SHIELD, run.shield + 1);
  const asked = run.asked + 1;
  const status = shield === 0 ? 'won' : asked >= BOSS_MAX_QUESTIONS ? 'retreated' : 'fighting';
  return { ...run, shield, asked, lastFactId: factId, status };
}
