import { daysBetween } from './dates';
import type { Day, PlanetId } from './types';

export type MissionStep = 'warmup' | 'quest1' | 'quest2' | 'quest3' | 'boss' | 'complete';
export interface MissionState {
  day: Day;
  step: MissionStep;
  /** Running totals for today's mission (optional: absent in old saves). */
  tally?: MissionTally;
}
export interface MissionTally {
  answered: number;
  lightning: number;
  bossWon: PlanetId | null;
}
export interface Streak {
  current: number;
  best: number;
  lastMissionDay: Day | null;
}

export function missionForToday(saved: MissionState | null, today: Day): MissionState {
  return saved && saved.day === today ? saved : { day: today, step: 'warmup' };
}

export function advanceMission(m: MissionState, bossAvailable: boolean): MissionState {
  switch (m.step) {
    case 'warmup':
      return { ...m, step: 'quest1' };
    case 'quest1':
      return { ...m, step: 'quest2' };
    case 'quest2':
      return { ...m, step: 'quest3' };
    case 'quest3':
      return { ...m, step: bossAvailable ? 'boss' : 'complete' };
    default:
      return { ...m, step: 'complete' };
  }
}

export function isMissionDoneToday(saved: MissionState | null, today: Day): boolean {
  return saved !== null && saved.day === today && saved.step === 'complete';
}

/** Pass the mission's own start day (mission.day), not the current clock day. */
export function applyMissionComplete(streak: Streak, missionDay: Day): Streak {
  const last = streak.lastMissionDay;
  if (last !== null && daysBetween(last, missionDay) <= 0) return streak;
  const current = last !== null && daysBetween(last, missionDay) === 1 ? streak.current + 1 : 1;
  return { current, best: Math.max(streak.best, current), lastMissionDay: missionDay };
}

/** The streak to show: the stored count only while it is still alive (last mission today or yesterday). */
export function displayStreak(streak: Streak, today: Day): number {
  const last = streak.lastMissionDay;
  if (last === null) return 0;
  const gap = daysBetween(last, today);
  return gap === 0 || gap === 1 ? streak.current : 0;
}
