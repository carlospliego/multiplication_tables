import { describe, expect, it } from 'vitest';
import { ALL_FACT_IDS } from '../engine/facts';
import type { FactRecord } from '../engine/types';
import { SAVE_KEY, createFreshSave, getStorage, loadSave, validateSave, writeSave } from './save';

class MemStorage implements Storage {
  private m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  clear() {
    this.m.clear();
  }
  getItem(k: string) {
    return this.m.has(k) ? (this.m.get(k) as string) : null;
  }
  key(i: number) {
    return Array.from(this.m.keys())[i] ?? null;
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
}

const ISO = '2026-11-02T10:00:00.000Z';
function F(s: { facts: Record<string, unknown> }, id = '3x7'): FactRecord {
  const r = s.facts[id];
  if (!r) throw new Error('missing fact');
  return r as FactRecord;
}
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

describe('createFreshSave', () => {
  it('has 45 fresh facts and zeroed state', () => {
    const s = createFreshSave('Leo', ISO);
    expect(Object.keys(s.facts)).toHaveLength(45);
    for (const id of ALL_FACT_IDS) expect(F(s, id).level).toBe(0);
    expect(s.schemaVersion).toBe(1);
    expect(s.captainName).toBe('Leo');
    expect(s.createdAt).toBe(ISO);
    expect(s.placementDone).toBe(false);
    expect(s.streak).toEqual({ current: 0, best: 0, lastMissionDay: null });
    expect(s.settings.soundOn).toBe(true);
    expect(s.mission).toBeNull();
    expect(validateSave(clone(s))).toEqual(s);
  });
});

describe('loadSave / writeSave', () => {
  it('round trips', () => {
    const st = new MemStorage();
    const s = createFreshSave('Leo', ISO);
    expect(writeSave(st, s)).toBe(true);
    expect(loadSave(st, 1)).toEqual({ status: 'ok', save: s });
  });
  it('none when empty', () => {
    expect(loadSave(new MemStorage(), 1)).toEqual({ status: 'none', save: null });
  });
  it('corrupt JSON is copied aside', () => {
    const st = new MemStorage();
    st.setItem(SAVE_KEY, '{oops');
    const r = loadSave(st, 123);
    expect(r).toEqual({ status: 'corrupt', save: null });
    expect(st.getItem('ttr.save.corrupt.123')).toBe('{oops');
  });
  it('invalid shape is corrupt', () => {
    const st = new MemStorage();
    const s = clone(createFreshSave('Leo', ISO));
    s.schemaVersion = 2 as never;
    st.setItem(SAVE_KEY, JSON.stringify(s));
    expect(loadSave(st, 5).status).toBe('corrupt');
    expect(st.getItem('ttr.save.corrupt.5')).not.toBeNull();
  });
  it('unavailable when storage null', () => {
    expect(loadSave(null, 1)).toEqual({ status: 'unavailable', save: null });
  });
  it('writeSave returns false on quota error or null', () => {
    const st = new MemStorage();
    st.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
    expect(writeSave(st, createFreshSave('Leo', ISO))).toBe(false);
    expect(writeSave(null, createFreshSave('Leo', ISO))).toBe(false);
  });
});

describe('validateSave', () => {
  const base = () => clone(createFreshSave('Leo', ISO));
  it('rejects non-objects', () => {
    expect(validateSave(null)).toBeNull();
    expect(validateSave('x')).toBeNull();
    expect(validateSave([])).toBeNull();
  });
  it('rejects missing fact', () => {
    const s = base();
    delete (s.facts as Record<string, unknown>)['3x7'];
    expect(validateSave(s)).toBeNull();
  });
  it('rejects extra fact id', () => {
    const s = base();
    (s.facts as Record<string, unknown>)['7x3'] = s.facts['3x7'];
    expect(validateSave(s)).toBeNull();
  });
  it('rejects level 9 and bad fact fields', () => {
    const mut = (f: (s: ReturnType<typeof base>) => void) => {
      const s = base();
      f(s);
      return validateSave(s);
    };
    expect(mut((s) => ((F(s).level as number) = 9))).toBeNull();
    expect(mut((s) => ((F(s).level as number) = 1.5))).toBeNull();
    expect(mut((s) => ((F(s).attempts as number) = -1))).toBeNull();
    expect(mut((s) => (F(s).correct = 1))).toBeNull(); // correct > attempts
    expect(mut((s) => (F(s).dueDay = '2026-13-45'))).toBeNull();
    expect(mut((s) => (F(s).lastSeenDay = 'nope'))).toBeNull();
    expect(mut((s) => (F(s).fastDays = ['2026-01-01', '2026-01-01']))).toBeNull();
    expect(
      mut(
        (s) =>
          (F(s).fastDays = [
            '2026-01-01',
            '2026-01-02',
            '2026-01-03',
            '2026-01-04',
            '2026-01-05',
            '2026-01-06',
          ]),
      ),
    ).toBeNull();
    expect(mut((s) => ((F(s).everMastered as unknown) = 'yes'))).toBeNull();
    expect(mut((s) => (F(s).totalCorrectMs = Number.NaN))).toBeNull();
  });
  it('accepts a populated fact', () => {
    const s = base();
    s.facts['3x7'] = {
      level: 3,
      dueDay: '2026-11-04',
      lastPromotedDay: '2026-11-02',
      fastDays: ['2026-11-01', '2026-11-02'],
      everMastered: true,
      attempts: 5,
      correct: 4,
      totalCorrectMs: 9000,
      lastSeenDay: '2026-11-02',
    };
    expect(validateSave(s)).toEqual(s);
  });
  it('captainName: trimmed length 1..16', () => {
    const n = (name: string) => validateSave({ ...base(), captainName: name });
    expect(n('')).toBeNull();
    expect(n('   ')).toBeNull();
    expect(n('a'.repeat(17))).toBeNull();
    expect(n(' ' + 'a'.repeat(16) + ' ')).not.toBeNull();
    expect(n('a'.repeat(16))).not.toBeNull();
    expect(validateSave({ ...base(), captainName: 5 })).toBeNull();
  });
  it('validates other top-level fields', () => {
    const b = base();
    expect(validateSave({ ...b, createdAt: 'yesterday' })).toBeNull();
    expect(validateSave({ ...b, placementDone: 1 })).toBeNull();
    expect(validateSave({ ...b, bossesBeaten: [10] })).toBeNull();
    expect(validateSave({ ...b, bossesBeaten: [1, 1] })).toBeNull();
    expect(validateSave({ ...b, bossesBeaten: [1, 2] })).not.toBeNull();
    expect(
      validateSave({ ...b, streak: { current: -1, best: 0, lastMissionDay: null } }),
    ).toBeNull();
    expect(
      validateSave({ ...b, streak: { current: 3, best: 2, lastMissionDay: null } }),
    ).toBeNull();
    expect(
      validateSave({ ...b, streak: { current: 1, best: 2, lastMissionDay: '2026-11-01' } }),
    ).not.toBeNull();
    expect(validateSave({ ...b, mission: { day: '2026-11-02', step: 'boss' } })).not.toBeNull();
    expect(validateSave({ ...b, mission: { day: '2026-11-02', step: 'fly' } })).toBeNull();
    expect(validateSave({ ...b, dailyActiveSeconds: { '2026-11-02': 600 } })).not.toBeNull();
    expect(validateSave({ ...b, dailyActiveSeconds: { '2026-11-02': -1 } })).toBeNull();
    expect(validateSave({ ...b, dailyActiveSeconds: { bad: 1 } })).toBeNull();
    expect(validateSave({ ...b, settings: { soundOn: 'x' } })).toBeNull();
    expect(
      validateSave({ ...b, celebrated: { planetsUnlocked: [0], galaxyMaster: false } }),
    ).toBeNull();
    expect(
      validateSave({ ...b, celebrated: { planetsUnlocked: [1], galaxyMaster: 1 } }),
    ).toBeNull();
  });
});

describe('getStorage', () => {
  it('returns a working storage in jsdom', () => {
    expect(getStorage()).not.toBeNull();
  });
  it('returns null when window.localStorage getter throws', () => {
    const orig = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('denied', 'SecurityError');
      },
    });
    try {
      expect(getStorage()).toBeNull();
    } finally {
      if (orig) Object.defineProperty(window, 'localStorage', orig);
    }
  });
  it('returns null when setItem throws', () => {
    const orig = Object.getOwnPropertyDescriptor(window, 'localStorage');
    const bad = new MemStorage();
    bad.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
    Object.defineProperty(window, 'localStorage', { configurable: true, get: () => bad });
    try {
      expect(getStorage()).toBeNull();
    } finally {
      if (orig) Object.defineProperty(window, 'localStorage', orig);
    }
  });
});
