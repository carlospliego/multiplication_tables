import { addDays, compareDays } from './dates';
import type { Day, FactRecord } from './types';

export const ACTIVE_CAP_SECONDS = 60;
export const ACTIVE_KEEP_DAYS = 60;

export function addActiveSeconds(map: Record<Day, number>, today: Day, seconds: number): Record<Day, number> {
  const add = Number.isFinite(seconds) ? Math.min(ACTIVE_CAP_SECONDS, Math.max(0, seconds)) : 0;
  const cutoff = addDays(today, -ACTIVE_KEEP_DAYS);
  const out: Record<Day, number> = {};
  for (const [day, s] of Object.entries(map)) {
    if (compareDays(day, cutoff) >= 0) out[day] = s;
  }
  out[today] = (out[today] ?? 0) + add;
  return out;
}

export function lastNDays(map: Record<Day, number>, today: Day, n: number): { day: Day; seconds: number }[] {
  const out: { day: Day; seconds: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const day = addDays(today, -i);
    out.push({ day, seconds: map[day] ?? 0 });
  }
  return out;
}

export function factStats(rec: FactRecord): { accuracy: number | null; avgCorrectMs: number | null } {
  return {
    accuracy: rec.attempts > 0 ? rec.correct / rec.attempts : null,
    avgCorrectMs: rec.correct > 0 ? rec.totalCorrectMs / rec.correct : null,
  };
}
