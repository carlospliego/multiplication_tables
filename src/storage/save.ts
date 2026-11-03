import { ALL_FACT_IDS } from '../engine/facts';
import { newFactRecord } from '../engine/levels';
import type { MissionState, Streak } from '../engine/mission';
import type { Day, FactRecord, Facts, PlanetId } from '../engine/types';

export const SAVE_KEY = 'ttr.save';
export const SCHEMA_VERSION = 1;

export interface SaveData {
  schemaVersion: 1;
  captainName: string;
  createdAt: string; // ISO timestamp
  placementDone: boolean;
  facts: Facts; // all 45 always present
  bossesBeaten: PlanetId[];
  streak: Streak;
  mission: MissionState | null;
  dailyActiveSeconds: Record<Day, number>; // last 60 days
  settings: { soundOn: boolean };
  celebrated: { planetsUnlocked: PlanetId[]; galaxyMaster: boolean };
}

export type LoadStatus = 'ok' | 'none' | 'corrupt' | 'unavailable';
export interface LoadResult {
  status: LoadStatus;
  save: SaveData | null;
}

const MAX_NAME_LEN = 16;
const MAX_FAST_DAYS = 5;
const STEPS = ['warmup', 'quest1', 'quest2', 'quest3', 'boss', 'complete'];

export function createFreshSave(captainName: string, nowIso: string): SaveData {
  const facts: Facts = {};
  for (const id of ALL_FACT_IDS) facts[id] = newFactRecord();
  return {
    schemaVersion: 1,
    captainName,
    createdAt: nowIso,
    placementDone: false,
    facts,
    bossesBeaten: [],
    streak: { current: 0, best: 0, lastMissionDay: null },
    mission: null,
    dailyActiveSeconds: {},
    settings: { soundOn: true },
    celebrated: { planetsUnlocked: [], galaxyMaster: false },
  };
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function isNonNegInt(x: unknown): x is number {
  return typeof x === 'number' && Number.isInteger(x) && x >= 0;
}

function isNonNegFinite(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x) && x >= 0;
}

function isDay(x: unknown): x is Day {
  if (typeof x !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(x)) return false;
  const [y = 0, m = 0, d = 0] = x.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function isDayOrNull(x: unknown): boolean {
  return x === null || isDay(x);
}

function isPlanetList(x: unknown): x is PlanetId[] {
  if (!Array.isArray(x)) return false;
  const seen = new Set<number>();
  for (const p of x) {
    if (typeof p !== 'number' || !Number.isInteger(p) || p < 1 || p > 9 || seen.has(p))
      return false;
    seen.add(p);
  }
  return true;
}

function validFact(x: unknown): x is FactRecord {
  if (!isRecord(x)) return false;
  if (!(typeof x.level === 'number' && Number.isInteger(x.level) && x.level >= 0 && x.level <= 5))
    return false;
  if (!isDayOrNull(x.dueDay) || !isDayOrNull(x.lastPromotedDay) || !isDayOrNull(x.lastSeenDay))
    return false;
  if (!Array.isArray(x.fastDays) || x.fastDays.length > MAX_FAST_DAYS) return false;
  if (!x.fastDays.every(isDay) || new Set(x.fastDays).size !== x.fastDays.length) return false;
  if (typeof x.everMastered !== 'boolean') return false;
  if (!isNonNegInt(x.attempts) || !isNonNegInt(x.correct) || x.correct > x.attempts) return false;
  if (!isNonNegFinite(x.totalCorrectMs)) return false;
  return true;
}

export function validateSave(raw: unknown): SaveData | null {
  if (!isRecord(raw)) return null;
  if (raw.schemaVersion !== SCHEMA_VERSION) return null;

  if (typeof raw.captainName !== 'string') return null;
  const nameLen = raw.captainName.trim().length;
  if (nameLen === 0 || nameLen > MAX_NAME_LEN) return null;

  if (typeof raw.createdAt !== 'string' || Number.isNaN(Date.parse(raw.createdAt))) return null;
  if (typeof raw.placementDone !== 'boolean') return null;

  if (!isRecord(raw.facts)) return null;
  const keys = Object.keys(raw.facts);
  if (keys.length !== ALL_FACT_IDS.length) return null;
  for (const id of ALL_FACT_IDS) {
    if (!Object.prototype.hasOwnProperty.call(raw.facts, id) || !validFact(raw.facts[id]))
      return null;
  }

  if (!isPlanetList(raw.bossesBeaten)) return null;

  const s = raw.streak;
  if (!isRecord(s) || !isNonNegInt(s.current) || !isNonNegInt(s.best) || s.current > s.best)
    return null;
  if (!isDayOrNull(s.lastMissionDay)) return null;

  if (raw.mission !== null) {
    const m = raw.mission;
    if (!isRecord(m) || !isDay(m.day) || typeof m.step !== 'string' || !STEPS.includes(m.step))
      return null;
    // tally is optional; a malformed one is dropped rather than rejecting the save
    if ('tally' in m) {
      const t = m.tally;
      const ok =
        isRecord(t) && isNonNegInt(t.answered) && isNonNegInt(t.lightning) &&
        (t.bossWon === null || (typeof t.bossWon === 'number' && isPlanetList([t.bossWon])));
      if (!ok) delete m.tally;
    }
  }

  if (!isRecord(raw.dailyActiveSeconds)) return null;
  for (const [day, secs] of Object.entries(raw.dailyActiveSeconds)) {
    if (!isDay(day) || !isNonNegFinite(secs)) return null;
  }

  if (!isRecord(raw.settings) || typeof raw.settings.soundOn !== 'boolean') return null;

  const c = raw.celebrated;
  if (!isRecord(c) || !isPlanetList(c.planetsUnlocked) || typeof c.galaxyMaster !== 'boolean')
    return null;

  return raw as unknown as SaveData;
}

/** Returns a usable localStorage, or null if unavailable (private mode, blocked, throwing getter). */
export function getStorage(): Storage | null {
  try {
    const s = window.localStorage;
    if (!s) return null;
    const probe = 'ttr.probe';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export function loadSave(storage: Storage | null, nowMs: number): LoadResult {
  if (!storage) return { status: 'unavailable', save: null };
  let raw: string | null;
  try {
    raw = storage.getItem(SAVE_KEY);
  } catch {
    return { status: 'unavailable', save: null };
  }
  if (raw === null) return { status: 'none', save: null };
  let parsed: unknown;
  let save: SaveData | null = null;
  try {
    parsed = JSON.parse(raw);
    save = validateSave(parsed);
  } catch {
    save = null;
  }
  if (save) return { status: 'ok', save };
  try {
    storage.setItem(`${SAVE_KEY}.corrupt.${nowMs}`, raw);
  } catch {
    // best effort: still report corrupt
  }
  return { status: 'corrupt', save: null };
}

export function writeSave(storage: Storage | null, save: SaveData): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}
