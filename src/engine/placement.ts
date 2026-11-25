import { addDays } from './dates';
import { makeQuestion, planetFactIds } from './facts';
import { INTERVAL_DAYS, isFastAnswer } from './levels';
import { shuffle } from './rng';
import type { AnswerInput, Day, FactRecord, Facts, Level, PlanetId, Question, Rng } from './types';

/** The tables he already knew (×1, ×2, ×5); skipped tables drop out (with ×1, ×2 skipped: ×5's facts). */
export const PLACEMENT_PLANETS: readonly PlanetId[] = [1, 2, 3];
const MAX_COUNTED_MS = 30000;

/** `facts` is the facts in play (see factsInPlay). */
export function placementQuestions(facts: Facts, rng: Rng): Question[] {
  const ids = PLACEMENT_PLANETS.flatMap((p) => planetFactIds(p, facts));
  return shuffle(ids, rng).map((id) => makeQuestion(id, rng, 'normal'));
}

/** Sets the level directly (fast -> 4, slow -> 2, wrong -> 1); bypasses applyAnswer's promotion rules. */
export function applyPlacementAnswer(rec: FactRecord, ans: AnswerInput, today: Day): FactRecord {
  const next: FactRecord = {
    ...rec,
    fastDays: [...rec.fastDays],
    attempts: rec.attempts + 1,
    lastSeenDay: today,
  };
  if (ans.correct) {
    next.correct = rec.correct + 1;
    next.totalCorrectMs = rec.totalCorrectMs + Math.min(ans.responseMs, MAX_COUNTED_MS);
  }
  let level: Level;
  if (!ans.correct) {
    level = 1;
  } else if (isFastAnswer(ans)) {
    level = 4;
    next.fastDays = [today];
    next.lastPromotedDay = today;
  } else {
    level = 2;
  }
  next.level = level;
  next.dueDay = addDays(today, INTERVAL_DAYS[level]);
  return next;
}
