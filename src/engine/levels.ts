import { addDays, compareDays } from './dates';
import type { AnswerInput, Day, FactRecord, Level } from './types';

export const FAST_MS = 4000;

export const INTERVAL_DAYS: Record<Level, number> = { 0: 0, 1: 0, 2: 1, 3: 2, 4: 4, 5: 7 };

const MAX_COUNTED_MS = 30000;
const FAST_DAYS_KEPT = 5;

export function newFactRecord(): FactRecord {
  return {
    level: 0,
    dueDay: null,
    lastPromotedDay: null,
    fastDays: [],
    everMastered: false,
    attempts: 0,
    correct: 0,
    totalCorrectMs: 0,
    lastSeenDay: null,
  };
}

export function isFastAnswer(ans: AnswerInput): boolean {
  return ans.correct && !ans.interrupted && ans.responseMs <= FAST_MS;
}

export function applyAnswer(rec: FactRecord, ans: AnswerInput, today: Day): FactRecord {
  // 1. stats
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

  // 2. first exposure
  if (rec.level === 0) {
    next.level = 1;
    next.dueDay = today;
    return next;
  }

  if (!ans.correct) {
    // 3. wrong
    next.level = 1;
  } else if (isFastAnswer(ans)) {
    // 4. correct and fast
    if (!next.fastDays.includes(today)) next.fastDays.push(today);
    next.fastDays = next.fastDays.slice(-FAST_DAYS_KEPT);
    if (rec.lastPromotedDay !== today && rec.level < 5) {
      const target = (rec.level + 1) as Level;
      if (target < 5 || new Set(next.fastDays).size >= 2) {
        next.level = target;
        next.lastPromotedDay = today;
        if (target === 5) next.everMastered = true;
      }
    }
  }
  // 5. slow correct: level unchanged

  // 6. schedule
  next.dueDay = addDays(today, INTERVAL_DAYS[next.level]);
  return next;
}

export function isDue(rec: FactRecord, today: Day): boolean {
  return rec.level >= 1 && rec.dueDay !== null && compareDays(rec.dueDay, today) <= 0;
}
