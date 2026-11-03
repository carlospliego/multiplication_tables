import { describe, expect, it } from 'vitest';
import { createFreshSave } from '../storage/save';
import type { SaveData } from '../storage/save';
import { makeFacts } from '../engine/progress';
import { gameReducer, initialGameState } from './gameReducer';
import type { GameState } from './gameReducer';

const NOW = '2026-11-02T10:00:00.000Z';
const D1 = '2026-11-02';
const D2 = '2026-11-03';

function withSave(over: Partial<SaveData> = {}, screen: GameState['screen'] = 'map'): GameState {
  return {
    save: { ...createFreshSave('Ada', NOW), placementDone: true, ...over },
    screen,
    loadStatus: 'ok',
    storageOk: true,
    corruptNotice: false,
  };
}
const empty = initialGameState({ status: 'none', save: null });
const ans = { correct: true, responseMs: 2000, interrupted: false };

describe('initialGameState', () => {
  it('no save -> welcome', () => {
    expect(empty.screen).toBe('welcome');
    expect(empty.storageOk).toBe(true);
  });
  it('save without placement -> systemsCheck, with -> map', () => {
    const s = createFreshSave('Ada', NOW);
    expect(initialGameState({ status: 'ok', save: s }).screen).toBe('systemsCheck');
    expect(initialGameState({ status: 'ok', save: { ...s, placementDone: true } }).screen).toBe('map');
  });
  it('corrupt -> notice and welcome; unavailable -> storageOk false', () => {
    const c = initialGameState({ status: 'corrupt', save: null });
    expect(c.corruptNotice).toBe(true);
    expect(c.screen).toBe('welcome');
    expect(initialGameState({ status: 'unavailable', save: null }).storageOk).toBe(false);
  });
});

describe('gameReducer', () => {
  it('createCaptain -> systemsCheck with 45 facts', () => {
    const s = gameReducer(empty, { type: 'createCaptain', name: 'Ada', nowIso: NOW });
    expect(s.screen).toBe('systemsCheck');
    expect(Object.keys(s.save!.facts)).toHaveLength(45);
    expect(s.save!.captainName).toBe('Ada');
  });

  it('answer placement uses placement rules and adds active seconds', () => {
    const s = gameReducer(withSave({ placementDone: false }), {
      type: 'answer', factId: '2x3', answer: ans, today: D1, mode: 'placement', activeSeconds: 5,
    });
    expect(s.save!.facts['2x3']!.level).toBe(4);
    expect(s.save!.dailyActiveSeconds[D1]).toBe(5);
  });

  it('answer normal uses applyAnswer and adds active seconds', () => {
    const s = gameReducer(withSave(), {
      type: 'answer', factId: '2x3', answer: ans, today: D1, mode: 'normal', activeSeconds: 7,
    });
    expect(s.save!.facts['2x3']!.attempts).toBe(1);
    expect(s.save!.facts['2x3']!.level).toBe(1);
    expect(s.save!.dailyActiveSeconds[D1]).toBe(7);
  });

  it('answer sanitizes NaN / negative responseMs', () => {
    for (const bad of [NaN, -5, Infinity]) {
      const s = gameReducer(withSave(), {
        type: 'answer', factId: '2x3', answer: { correct: true, responseMs: bad, interrupted: false },
        today: D1, mode: 'normal', activeSeconds: 1,
      });
      const f = s.save!.facts['2x3']!;
      expect(Number.isFinite(f.totalCorrectMs)).toBe(true);
      expect(f.totalCorrectMs).toBeGreaterThanOrEqual(0);
      expect(f.fastDays).toEqual([]); // interrupted: not counted as fast
    }
  });

  it('answer for unknown fact is a no-op', () => {
    const st = withSave();
    expect(gameReducer(st, { type: 'answer', factId: 'zz', answer: ans, today: D1, mode: 'normal', activeSeconds: 1 })).toBe(st);
  });

  it('finishPlacement', () => {
    const s = gameReducer(withSave({ placementDone: false }, 'systemsCheck'), { type: 'finishPlacement' });
    expect(s.save!.placementDone).toBe(true);
    expect(s.screen).toBe('map');
  });

  it('startMission resets on a new day and keeps step on the same day', () => {
    const st = withSave({ mission: { day: D1, step: 'quest2' } });
    expect(gameReducer(st, { type: 'startMission', today: D1 }).save!.mission).toEqual({ day: D1, step: 'quest2' });
    expect(gameReducer(st, { type: 'startMission', today: D2 }).save!.mission).toEqual({ day: D2, step: 'warmup' });
  });

  it('advanceMission quest3 -> boss when available, else complete', () => {
    const mission = { day: D1, step: 'quest3' as const };
    const none = withSave({ mission });
    expect(gameReducer(none, { type: 'advanceMission', today: D1 }).save!.mission!.step).toBe('complete');
    const facts = makeFacts();
    for (const id of Object.keys(facts)) facts[id] = { ...facts[id]!, level: 5 };
    const boss = withSave({ mission, facts });
    expect(gameReducer(boss, { type: 'advanceMission', today: D1 }).save!.mission!.step).toBe('boss');
  });

  it('completeMission updates streak using mission.day', () => {
    const st = withSave({ mission: { day: D1, step: 'complete' } });
    const s = gameReducer(st, { type: 'completeMission' });
    expect(s.save!.streak).toEqual({ current: 1, best: 1, lastMissionDay: D1 });
  });

  it('bossBeaten is idempotent', () => {
    let s = gameReducer(withSave(), { type: 'bossBeaten', planet: 2 });
    s = gameReducer(s, { type: 'bossBeaten', planet: 2 });
    expect(s.save!.bossesBeaten).toEqual([2]);
  });

  it('markCelebrated', () => {
    let s = gameReducer(withSave(), { type: 'markCelebrated', planet: 3 });
    s = gameReducer(s, { type: 'markCelebrated', planet: 3, galaxyMaster: true });
    expect(s.save!.celebrated).toEqual({ planetsUnlocked: [3], galaxyMaster: true });
  });

  it('toggleSound and navigate', () => {
    let s = gameReducer(withSave(), { type: 'toggleSound' });
    expect(s.save!.settings.soundOn).toBe(false);
    s = gameReducer(s, { type: 'navigate', screen: 'hangar' });
    expect(s.screen).toBe('hangar');
  });

  it('importSave routes by placementDone', () => {
    const fresh = createFreshSave('Bo', NOW);
    expect(gameReducer(empty, { type: 'importSave', save: fresh }).screen).toBe('systemsCheck');
    const s = gameReducer(empty, { type: 'importSave', save: { ...fresh, placementDone: true } });
    expect(s.screen).toBe('map');
    expect(s.save!.captainName).toBe('Bo');
  });

  it('resetProgress', () => {
    const s = gameReducer(withSave(), { type: 'resetProgress' });
    expect(s.save).toBeNull();
    expect(s.screen).toBe('welcome');
  });

  it('storageFailed and dismissCorruptNotice', () => {
    expect(gameReducer(withSave(), { type: 'storageFailed' }).storageOk).toBe(false);
    const c = initialGameState({ status: 'corrupt', save: null });
    expect(gameReducer(c, { type: 'dismissCorruptNotice' }).corruptNotice).toBe(false);
  });

  it('save-dependent actions with null save are no-ops', () => {
    for (const a of [
      { type: 'answer', factId: '2x3', answer: ans, today: D1, mode: 'normal', activeSeconds: 1 },
      { type: 'finishPlacement' },
      { type: 'startMission', today: D1 },
      { type: 'advanceMission', today: D1 },
      { type: 'completeMission' },
      { type: 'bossBeaten', planet: 1 },
      { type: 'markCelebrated', planet: 1 },
      { type: 'toggleSound' },
    ] as const) {
      expect(gameReducer(empty, a)).toBe(empty);
    }
  });
});
