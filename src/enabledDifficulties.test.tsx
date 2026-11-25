/**
 * The real level setting (src/enabledDifficulties.ts): Hard only. Other test files offer all
 * three levels to cover choosing one.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ENABLED_DIFFICULTIES } from './enabledDifficulties';
import { DIFFICULTY, difficultyOf, enabledDifficulties } from './engine/difficulty';
import { makeFacts } from './engine/progress';
import { ALL_FACT_IDS } from './engine/facts';
import { todayLocal } from './engine/dates';
import { SESSION_QUEST_KEY } from './storage/session';
import type { QuestSnapshot } from './storage/session';
import { createFreshSave, SAVE_KEY } from './storage/save';
import type { SaveData } from './storage/save';
import { gameReducer } from './state/gameReducer';
import type { GameState } from './state/gameReducer';
import { GameProvider } from './state/GameContext';
import { GalaxyMap } from './screens/GalaxyMap';
import { MissionScreen } from './screens/MissionScreen';

const save = (over: Partial<SaveData> = {}): SaveData => ({
  ...createFreshSave('Leo', '2026-11-01T00:00:00Z'),
  placementDone: true,
  ...over,
});
const state = (s: SaveData): GameState => ({ save: s, screen: 'map', loadStatus: 'ok', storageOk: true, corruptNotice: false });

function storageWith(s: SaveData): Storage {
  const data = new Map([[SAVE_KEY, JSON.stringify(s)]]);
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  } as unknown as Storage;
}

describe('Hard only', () => {
  it('offers only Hard', () => {
    expect(ENABLED_DIFFICULTIES).toEqual(['hard']);
    expect(enabledDifficulties()).toEqual(['hard']);
  });

  it('every save plays on Hard, whatever it stored', () => {
    for (const difficulty of ['easy', 'normal', 'hard', undefined] as const) {
      expect(difficultyOf({ difficulty })).toBe('hard');
    }
  });

  it('picking Easy or Normal is ignored', () => {
    const s = state(save());
    expect(gameReducer(s, { type: 'setDifficulty', difficulty: 'easy' })).toBe(s);
    expect(gameReducer(s, { type: 'setDifficulty', difficulty: 'normal' })).toBe(s);
  });

  it('answers use the 3-second fast threshold', () => {
    const facts = makeFacts({ '3x6': { level: 2 } });
    const answer = (responseMs: number) =>
      gameReducer(state(save({ facts, settings: { soundOn: true, difficulty: 'easy' } })), {
        type: 'answer', factId: '3x6', answer: { correct: true, responseMs, interrupted: false },
        today: '2026-11-25', mode: 'normal', activeSeconds: 1,
      }).save!.facts['3x6']!.level;
    expect(answer(3000)).toBe(3);
    expect(answer(3500)).toBe(2);
  });

  it('the map has no difficulty picker', () => {
    render(<GameProvider storage={storageWith(save())} session={null}><GalaxyMap /></GameProvider>);
    expect(screen.queryByRole('group', { name: 'Difficulty' })).toBeNull();
    expect(screen.queryByRole('button', { name: /easy/i })).toBeNull();
  });

  it(`quests have ${DIFFICULTY.hard.questSize} questions, even for a save that chose Easy`, () => {
    const overrides = Object.fromEntries(ALL_FACT_IDS.map((id) => [id, { level: 1 as const, dueDay: '2020-01-01' }]));
    const s = save({
      facts: makeFacts(overrides),
      settings: { soundOn: false, difficulty: 'easy' },
      mission: { day: todayLocal(), step: 'quest1' },
    });
    render(<GameProvider storage={storageWith(s)}><MissionScreen /></GameProvider>);
    expect(screen.getByText('Quest 1')).toBeInTheDocument();
    const snap: QuestSnapshot = JSON.parse(window.sessionStorage.getItem(SESSION_QUEST_KEY)!);
    expect(snap.context.difficulty).toBe('hard');
    expect(snap.run.queue).toHaveLength(20);
  });
});
