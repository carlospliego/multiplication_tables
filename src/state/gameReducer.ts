import { applyAnswer } from '../engine/levels';
import { advanceMission, applyMissionComplete, missionForToday } from '../engine/mission';
import { applyPlacementAnswer } from '../engine/placement';
import { availableBoss } from '../engine/progress';
import { addActiveSeconds } from '../engine/stats';
import type { AnswerInput, Day, FactId, PlanetId } from '../engine/types';
import { createFreshSave } from '../storage/save';
import type { LoadResult, LoadStatus, SaveData } from '../storage/save';

export type Screen =
  | 'welcome' | 'systemsCheck' | 'map' | 'mission' | 'freeFlight'
  | 'starMap' | 'hangar' | 'parentGate' | 'parent';

export interface GameState {
  save: SaveData | null;
  screen: Screen;
  loadStatus: LoadStatus;
  storageOk: boolean;
  corruptNotice: boolean;
}

export type GameAction =
  | { type: 'createCaptain'; name: string; nowIso: string }
  | { type: 'answer'; factId: FactId; answer: AnswerInput; today: Day; mode: 'normal' | 'placement'; activeSeconds: number }
  | { type: 'finishPlacement' }
  | { type: 'startMission'; today: Day }
  | { type: 'advanceMission'; today: Day }
  | { type: 'completeMission' }
  | { type: 'bossBeaten'; planet: PlanetId }
  | { type: 'markCelebrated'; planet?: PlanetId; galaxyMaster?: boolean }
  | { type: 'toggleSound' }
  | { type: 'navigate'; screen: Screen }
  | { type: 'importSave'; save: SaveData }
  | { type: 'resetProgress' }
  | { type: 'storageFailed' }
  | { type: 'dismissCorruptNotice' };

export function initialGameState(load: LoadResult): GameState {
  const { save, status } = load;
  return {
    save,
    screen: !save ? 'welcome' : save.placementDone ? 'map' : 'systemsCheck',
    loadStatus: status,
    storageOk: status !== 'unavailable',
    corruptNotice: status === 'corrupt',
  };
}

function sanitizeAnswer(a: AnswerInput): AnswerInput {
  if (!Number.isFinite(a.responseMs) || a.responseMs < 0) {
    return { ...a, responseMs: 0, interrupted: true };
  }
  return a;
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'createCaptain':
      return {
        ...state,
        save: createFreshSave(action.name, action.nowIso),
        screen: 'systemsCheck',
      };
    case 'importSave':
      return {
        ...state,
        save: action.save,
        screen: action.save.placementDone ? 'map' : 'systemsCheck',
      };
    case 'resetProgress':
      return { ...state, save: null, screen: 'welcome' };
    case 'navigate':
      return { ...state, screen: action.screen };
    case 'storageFailed':
      return { ...state, storageOk: false };
    case 'dismissCorruptNotice':
      return { ...state, corruptNotice: false };
  }

  const save = state.save;
  if (!save) return state;
  const withSave = (next: Partial<SaveData>, screen?: Screen): GameState => ({
    ...state,
    save: { ...save, ...next },
    ...(screen ? { screen } : {}),
  });

  switch (action.type) {
    case 'answer': {
      const rec = save.facts[action.factId];
      if (!rec) return state;
      const ans = sanitizeAnswer(action.answer);
      const nextRec =
        action.mode === 'placement'
          ? applyPlacementAnswer(rec, ans, action.today)
          : applyAnswer(rec, ans, action.today);
      return withSave({
        facts: { ...save.facts, [action.factId]: nextRec },
        dailyActiveSeconds: addActiveSeconds(save.dailyActiveSeconds, action.today, action.activeSeconds),
      });
    }
    case 'finishPlacement':
      return withSave({ placementDone: true }, 'map');
    case 'startMission':
      return withSave({ mission: missionForToday(save.mission, action.today) });
    case 'advanceMission': {
      const m = missionForToday(save.mission, action.today);
      const bossAvailable = availableBoss(save.facts, save.bossesBeaten) !== null;
      return withSave({ mission: advanceMission(m, bossAvailable) });
    }
    case 'completeMission': {
      if (!save.mission) return state;
      return withSave({
        streak: applyMissionComplete(save.streak, save.mission.day),
        mission: { ...save.mission, step: 'complete' },
      });
    }
    case 'bossBeaten':
      if (save.bossesBeaten.includes(action.planet)) return state;
      return withSave({ bossesBeaten: [...save.bossesBeaten, action.planet] });
    case 'markCelebrated': {
      const { planetsUnlocked, galaxyMaster } = save.celebrated;
      const p = action.planet;
      return withSave({
        celebrated: {
          planetsUnlocked: p !== undefined && !planetsUnlocked.includes(p) ? [...planetsUnlocked, p] : planetsUnlocked,
          galaxyMaster: galaxyMaster || action.galaxyMaster === true,
        },
      });
    }
    case 'toggleSound':
      return withSave({ settings: { ...save.settings, soundOn: !save.settings.soundOn } });
  }
}
