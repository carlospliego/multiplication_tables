/**
 * Per-tab session state (sessionStorage): where the player is right now, so a reload or a
 * restored tab lands back on the same screen and the same question. Long-term progress lives
 * in the localStorage save (save.ts); everything here is disposable and validated on read.
 */
import { isDifficulty } from '../engine/difficulty';
import type { Difficulty } from '../engine/difficulty';
import { ALL_FACT_IDS, parseFact } from '../engine/facts';
import type { MissionStep } from '../engine/mission';
import type { QuestRun } from '../engine/questRun';
import type { Day, FactId, Question } from '../engine/types';

export const SESSION_SCREEN_KEY = 'ttr.session.screen';
export const SESSION_QUEST_KEY = 'ttr.session.quest';

export type QuestStep = Extract<MissionStep, 'warmup' | 'quest1' | 'quest2' | 'quest3'>;

/** Which quest a snapshot belongs to. A snapshot is only resumed into an identical context. */
export type QuestContext =
  | { kind: 'mission'; owner: string; day: Day; step: QuestStep; difficulty: Difficulty; skip: string }
  | { kind: 'freeFlight'; owner: string; day: Day; difficulty: Difficulty; skip: string };

export interface QuestSnapshot {
  context: QuestContext;
  run: QuestRun;
  introduced: FactId[];
}

/** Returns a usable sessionStorage, or null if unavailable (blocked, throwing getter). */
export function getSessionStorage(): Storage | null {
  try {
    const s = window.sessionStorage;
    if (!s) return null;
    const probe = 'ttr.probe';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

function read(store: Storage | null, key: string): unknown {
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function write(store: Storage | null, key: string, value: unknown): void {
  if (!store) return;
  try {
    if (value === null) store.removeItem(key);
    else store.setItem(key, JSON.stringify(value));
  } catch {
    // best effort: losing session state only means starting the step over
  }
}

export function loadSessionScreen(store: Storage | null): string | null {
  const v = read(store, SESSION_SCREEN_KEY);
  return typeof v === 'string' ? v : null;
}

export function writeSessionScreen(store: Storage | null, screen: string): void {
  write(store, SESSION_SCREEN_KEY, screen);
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function isNonNegInt(x: unknown): x is number {
  return typeof x === 'number' && Number.isInteger(x) && x >= 0;
}

const FACT_SET: ReadonlySet<string> = new Set(ALL_FACT_IDS);

function isFactId(x: unknown): x is FactId {
  return typeof x === 'string' && FACT_SET.has(x);
}

function validQuestion(x: unknown): x is Question {
  if (!isRecord(x) || !isFactId(x.factId)) return false;
  if (x.kind !== 'normal' && x.kind !== 'discovery') return false;
  const { a, b } = parseFact(x.factId);
  const sameFact = (x.a === a && x.b === b) || (x.a === b && x.b === a);
  return sameFact && x.answer === a * b;
}

function validRun(x: unknown): x is QuestRun {
  if (!isRecord(x) || !Array.isArray(x.queue) || !x.queue.every(validQuestion)) return false;
  if (!isNonNegInt(x.index) || x.index > x.queue.length) return false;
  if (!isNonNegInt(x.fuel) || !isNonNegInt(x.lightning) || !isNonNegInt(x.answered)) return false;
  if (x.fuel > x.answered || x.lightning > x.fuel) return false;
  if (!isNonNegInt(x.maxLength) || x.queue.length > x.maxLength) return false;
  if (!isRecord(x.reinserts)) return false;
  return Object.entries(x.reinserts).every(([id, n]) => isFactId(id) && isNonNegInt(n));
}

function validContext(x: unknown): x is QuestContext {
  if (!isRecord(x) || typeof x.owner !== 'string' || typeof x.day !== 'string') return false;
  if (!isDifficulty(x.difficulty) || typeof x.skip !== 'string') return false;
  if (x.kind === 'freeFlight') return true;
  return x.kind === 'mission' && ['warmup', 'quest1', 'quest2', 'quest3'].includes(x.step as string);
}

export function sameContext(a: QuestContext, b: QuestContext): boolean {
  return (
    a.kind === b.kind &&
    a.owner === b.owner &&
    a.day === b.day &&
    a.difficulty === b.difficulty &&
    a.skip === b.skip &&
    (a.kind !== 'mission' || (b.kind === 'mission' && a.step === b.step))
  );
}

/** The saved quest for this exact context, or null (none, stale, or malformed). */
export function loadQuestSnapshot(store: Storage | null, context: QuestContext): QuestSnapshot | null {
  const v = read(store, SESSION_QUEST_KEY);
  if (!isRecord(v) || !validContext(v.context) || !validRun(v.run)) return null;
  if (!Array.isArray(v.introduced) || !v.introduced.every(isFactId)) return null;
  if (!sameContext(v.context, context)) return null;
  return v as unknown as QuestSnapshot;
}

export function writeQuestSnapshot(store: Storage | null, snap: QuestSnapshot): void {
  write(store, SESSION_QUEST_KEY, snap);
}

export function clearQuestSnapshot(store: Storage | null): void {
  write(store, SESSION_QUEST_KEY, null);
}
