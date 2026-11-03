import { addDays } from './dates';
import { PLANETS, makeQuestion } from './facts';
import { INTERVAL_DAYS, isFastAnswer } from './levels';
import { shuffle } from './rng';
import type { AnswerInput, Day, FactRecord, Level, PlanetId, Question, Rng } from './types';

export const PLACEMENT_PLANETS: readonly PlanetId[] = [1, 2, 3];
const MAX_COUNTED_MS = 30000;

export function placementQuestions(rng: Rng): Question[] {
  const ids = PLACEMENT_PLANETS.flatMap((p) => PLANETS[p - 1]!.factIds);
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
