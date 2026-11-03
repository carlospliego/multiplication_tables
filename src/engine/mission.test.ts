import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { advanceMission, applyMissionComplete, displayStreak, isMissionDoneToday, missionForToday } from './mission';

const T = '2026-11-02';

describe('mission', () => {
  it('starts fresh, resumes same day, resets on a new day', () => {
    expect(missionForToday(null, T)).toEqual({ day: T, step: 'warmup' });
    expect(missionForToday({ day: T, step: 'quest2' }, T)).toEqual({ day: T, step: 'quest2' });
    expect(missionForToday({ day: addDays(T, -1), step: 'quest2' }, T)).toEqual({ day: T, step: 'warmup' });
  });
  it('advances in order', () => {
    let m = missionForToday(null, T);
    const seen = [m.step];
    for (let i = 0; i < 5; i++) {
      m = advanceMission(m, true);
      seen.push(m.step);
    }
    expect(seen).toEqual(['warmup', 'quest1', 'quest2', 'quest3', 'boss', 'complete']);
    expect(advanceMission({ day: T, step: 'quest3' }, false).step).toBe('complete');
    expect(advanceMission({ day: T, step: 'complete' }, true).step).toBe('complete');
  });
  it('isMissionDoneToday', () => {
    expect(isMissionDoneToday({ day: T, step: 'complete' }, T)).toBe(true);
    expect(isMissionDoneToday({ day: addDays(T, -1), step: 'complete' }, T)).toBe(false);
    expect(isMissionDoneToday({ day: T, step: 'boss' }, T)).toBe(false);
    expect(isMissionDoneToday(null, T)).toBe(false);
  });
});

describe('streak', () => {
  const empty = { current: 0, best: 0, lastMissionDay: null };
  it('first completion', () => {
    expect(applyMissionComplete(empty, T)).toEqual({ current: 1, best: 1, lastMissionDay: T });
  });
  it('consecutive day extends', () => {
    const s = { current: 2, best: 2, lastMissionDay: T };
    expect(applyMissionComplete(s, addDays(T, 1))).toEqual({ current: 3, best: 3, lastMissionDay: addDays(T, 1) });
  });
  it('gap resets current, keeps best', () => {
    const s = { current: 4, best: 6, lastMissionDay: T };
    expect(applyMissionComplete(s, addDays(T, 2))).toEqual({ current: 1, best: 6, lastMissionDay: addDays(T, 2) });
  });
  it('same day twice unchanged', () => {
    const s = { current: 2, best: 3, lastMissionDay: T };
    expect(applyMissionComplete(s, T)).toEqual(s);
  });
  it('mission started on T, completed after midnight, counts T', () => {
    const mission = { day: T, step: 'complete' as const };
    expect(applyMissionComplete(empty, mission.day).lastMissionDay).toBe(T);
    expect(isMissionDoneToday(mission, addDays(T, 1))).toBe(false);
  });
  it('earlier day than lastMissionDay returns input unchanged', () => {
    const s = { current: 3, best: 5, lastMissionDay: '2026-11-05' };
    expect(applyMissionComplete(s, '2026-11-02')).toBe(s);
  });

  describe('displayStreak', () => {
    const s = { current: 3, best: 5, lastMissionDay: T };
    it('shows the count when the last mission was today or yesterday', () => {
      expect(displayStreak(s, T)).toBe(3);
      expect(displayStreak(s, addDays(T, 1))).toBe(3);
    });
    it('is 0 after a missed day', () => {
      expect(displayStreak(s, addDays(T, 2))).toBe(0);
      expect(displayStreak(s, addDays(T, 9))).toBe(0);
    });
    it('is 0 when no mission was ever finished', () => {
      expect(displayStreak({ current: 0, best: 0, lastMissionDay: null }, T)).toBe(0);
    });
  });
});
