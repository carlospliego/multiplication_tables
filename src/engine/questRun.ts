import type { FactId, Question, Rng } from './types';
import { randInt } from './rng';

export const MAX_REINSERTS_PER_FACT = 2;
export const MAX_QUEST_LENGTH = 20;

export interface QuestRun {
  queue: Question[];
  index: number;
  reinserts: Record<FactId, number>;
  fuel: number;
  lightning: number;
  answered: number;
}

export function startQuestRun(queue: Question[]): QuestRun {
  return { queue: [...queue], index: 0, reinserts: {}, fuel: 0, lightning: 0, answered: 0 };
}

export function currentQuestion(run: QuestRun): Question | null {
  return run.queue[run.index] ?? null;
}

export function isQuestDone(run: QuestRun): boolean {
  return run.index >= run.queue.length;
}

export function fuelFraction(run: QuestRun): number {
  if (run.queue.length === 0) return 0;
  return Math.min(1, Math.max(0, run.fuel / run.queue.length));
}

export function recordQuestResult(run: QuestRun, correct: boolean, fast: boolean, rng: Rng): QuestRun {
  const q = currentQuestion(run);
  if (!q) return run;
  const next: QuestRun = {
    ...run,
    queue: [...run.queue],
    reinserts: { ...run.reinserts },
    index: run.index + 1,
    answered: run.answered + 1,
  };
  if (correct) {
    next.fuel += 1;
    if (fast) next.lightning += 1;
    return next;
  }
  const used = run.reinserts[q.factId] ?? 0;
  if (used >= MAX_REINSERTS_PER_FACT || next.queue.length >= MAX_QUEST_LENGTH) return next;

  const len = next.queue.length;
  const base = Math.min(run.index + randInt(3, 5, rng), len);
  // Prefer the chosen spot; nudge later (then earlier) to avoid an adjacent identical fact.
  const clash = (pos: number): boolean =>
    next.queue[pos - 1]?.factId === q.factId || next.queue[pos]?.factId === q.factId;
  let pos = base;
  if (clash(pos)) {
    const candidates: number[] = [];
    for (let p = base + 1; p <= len; p++) candidates.push(p);
    for (let p = base - 1; p > run.index; p--) candidates.push(p);
    const ok = candidates.find((p) => !clash(p));
    if (ok !== undefined) pos = ok;
  }
  next.queue.splice(pos, 0, { ...q, kind: 'normal' });
  next.reinserts[q.factId] = used + 1;
  return next;
}
