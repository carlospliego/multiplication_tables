/**
 * The real skip list: the repo default (src/skip.ts) and the child's own list from the Tables
 * screen. Other UI test files mock the default to [] to cover the full 45-fact game.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_SKIP_TABLES, isSkipList, MIN_TABLES_IN_PLAY, skipTablesOf, toggleSkip } from './skip';
import {
  activeNumbers, activePlanets, ALL_FACT_IDS, factsInPlay, isSkipped, parseFact, PLANETS, shipParts,
} from './engine/facts';
import { availableBoss, frontierPlanet, makeFacts, masteredCount, openPlanets } from './engine/progress';
import { placementQuestions } from './engine/placement';
import { buildQuest, buildWarmup } from './engine/scheduler';
import { nextBossQuestion, startBoss } from './engine/boss';
import { createRng } from './engine/rng';
import type { FactRecord, PlanetId } from './engine/types';
import { createFreshSave, playFacts, SAVE_KEY, validateSave } from './storage/save';
import type { SaveData } from './storage/save';
import { gameReducer } from './state/gameReducer';
import type { GameState } from './state/gameReducer';
import { FactGrid } from './components/FactGrid';
import { GameProvider } from './state/GameContext';
import { StarMap } from './screens/StarMap';
import { Hangar } from './screens/Hangar';
import { App } from './App';

const T = '2026-11-24';
const DEFAULT = DEFAULT_SKIP_TABLES;
const hasSkipped = (id: string, skip: readonly number[]) => {
  const { a, b } = parseFact(id);
  return skip.includes(a) || skip.includes(b);
};
const fresh = (over: Partial<SaveData> = {}): SaveData => ({
  ...createFreshSave('Leo', '2026-11-01T00:00:00Z'),
  placementDone: true,
  ...over,
});

function storageWith(save: object): Storage {
  const data = new Map([[SAVE_KEY, JSON.stringify(save)]]);
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  } as unknown as Storage;
}

afterEach(() => window.localStorage.clear());

describe('skip list rules', () => {
  it('the repo default skips ×1 and ×2', () => {
    expect(DEFAULT).toEqual([1, 2]);
    expect(skipTablesOf({})).toEqual([1, 2]);
    expect(skipTablesOf({ skipTables: [7] })).toEqual([7]);
    expect(skipTablesOf({ skipTables: [] })).toEqual([]);
  });

  it('toggleSkip adds and removes tables, keeping the list sorted', () => {
    expect(toggleSkip([1, 2], 7)).toEqual([1, 2, 7]);
    expect(toggleSkip([1, 2, 7], 2)).toEqual([1, 7]);
    expect(toggleSkip([5], 3)).toEqual([3, 5]);
    expect(toggleSkip([1], 10)).toEqual([1]);
  });

  it(`never leaves fewer than ${MIN_TABLES_IN_PLAY} tables in play`, () => {
    const six = [1, 2, 3, 4, 5, 6];
    expect(toggleSkip(six, 7)).toBe(six);
    expect(toggleSkip(six, 6)).toEqual([1, 2, 3, 4, 5]);
    expect(isSkipList(six)).toBe(true);
    expect(isSkipList([...six, 7])).toBe(false);
    expect(isSkipList([1, 1])).toBe(false);
    expect(isSkipList([0])).toBe(false);
    expect(isSkipList('1,2')).toBe(false);
  });
});

describe('facts in play with the default list', () => {
  const facts = factsInPlay(makeFacts(), DEFAULT);

  it('leaves 28 facts, none with a skipped factor; nothing skipped leaves all 45', () => {
    expect(Object.keys(facts)).toHaveLength(28);
    expect(Object.keys(facts).some((id) => hasSkipped(id, DEFAULT))).toBe(false);
    expect(Object.keys(factsInPlay(makeFacts(), []))).toHaveLength(45);
    expect(isSkipped('2x7', DEFAULT)).toBe(true);
    expect(isSkipped('3x7', DEFAULT)).toBe(false);
    expect(activeNumbers(DEFAULT)).toEqual([3, 4, 5, 6, 7, 8, 9]);
  });

  it('removes the ×1 and ×2 planets; the game starts on ×5', () => {
    expect(activePlanets(facts).map((p) => p.table)).toEqual([5, 3, 4, 9, 6, 7, 8]);
    expect(openPlanets(facts)).toEqual([3]);
    expect(frontierPlanet(facts)).toBe(3);
    expect(availableBoss(facts, [])).toBeNull();
    const p3: Record<string, Partial<FactRecord>> = {};
    for (const id of PLANETS[2]!.factIds) p3[id] = { level: 2 };
    const opened = factsInPlay(makeFacts(p3), DEFAULT);
    expect(openPlanets(opened)).toEqual([3, 4]);
    expect(availableBoss(opened, [])).toBe(3);
  });

  it('mastery counts ignore skipped facts', () => {
    const all: Record<string, Partial<FactRecord>> = {};
    for (const id of ALL_FACT_IDS) all[id] = { level: 5 };
    expect(masteredCount(factsInPlay(makeFacts(all), DEFAULT))).toBe(28);
    expect(masteredCount(factsInPlay(makeFacts({ '2x7': { level: 5 } }), DEFAULT))).toBe(0);
  });

  it('quests, warm-ups and bosses never ask a skipped fact, even one stored as due', () => {
    const all: Record<string, Partial<FactRecord>> = {};
    for (const id of ALL_FACT_IDS) all[id] = { level: 1, dueDay: '2020-01-01' };
    for (const skip of [DEFAULT, [1, 2, 7, 8], [3, 5, 9]]) {
      const inPlay = factsInPlay(makeFacts(all), skip);
      const boss = activePlanets(inPlay).at(-1)!.id;
      for (let seed = 1; seed <= 10; seed++) {
        const rng = createRng(seed);
        expect(buildQuest(inPlay, { today: T, allowNew: true }, rng).some((q) => hasSkipped(q.factId, skip))).toBe(false);
        expect(buildWarmup(inPlay, T, rng).some((q) => hasSkipped(q.factId, skip))).toBe(false);
        expect(hasSkipped(nextBossQuestion(inPlay, startBoss(boss), rng).factId, skip)).toBe(false);
      }
    }
  });

  it('the Systems Check asks only the ×5 facts', () => {
    const qs = placementQuestions(facts, createRng(1));
    expect(qs).toHaveLength(7);
    expect(qs.every((q) => q.factId.split('x').includes('5'))).toBe(true);
  });

  it('ship parts only come from planets in play', () => {
    expect(shipParts([1, 2, 3] as PlanetId[], facts)).toEqual([PLANETS[2]!.shipPart]);
  });
});

describe('the save keeps the child\'s own list', () => {
  it('playFacts uses the save\'s list, or the default when it has none', () => {
    expect(Object.keys(playFacts(fresh()))).toHaveLength(28);
    expect(Object.keys(playFacts(fresh({ settings: { soundOn: true, skipTables: [] } })))).toHaveLength(45);
    expect(Object.keys(playFacts(fresh({ settings: { soundOn: true, skipTables: [1, 2, 3] } })))).toHaveLength(21);
  });

  it('validateSave keeps a valid list and drops an invalid one', () => {
    const load = (skipTables: unknown) =>
      validateSave(JSON.parse(JSON.stringify(fresh({ settings: { soundOn: true, skipTables } as SaveData['settings'] }))));
    expect(load([2, 7])!.settings.skipTables).toEqual([2, 7]);
    expect(load([1, 2, 3, 4, 5, 6, 7])!.settings.skipTables).toBeUndefined();
    expect(load([1, 1])!.settings.skipTables).toBeUndefined();
    expect(load('1,2')!.settings.skipTables).toBeUndefined();
    expect(validateSave(JSON.parse(JSON.stringify(createFreshSave('Leo', '2026-11-01T00:00:00Z'))))!.settings.skipTables).toBeUndefined();
  });

  it('toggleSkipTable stores the new list, starting from the default', () => {
    const state: GameState = { save: fresh(), screen: 'tables', loadStatus: 'ok', storageOk: true, corruptNotice: false };
    const s1 = gameReducer(state, { type: 'toggleSkipTable', table: 2 });
    expect(s1.save!.settings.skipTables).toEqual([1]);
    const s2 = gameReducer(s1, { type: 'toggleSkipTable', table: 9 });
    expect(s2.save!.settings.skipTables).toEqual([1, 9]);
    const atMin = { ...state, save: fresh({ settings: { soundOn: true, skipTables: [1, 2, 3, 4, 5, 6] } }) };
    expect(gameReducer(atMin, { type: 'toggleSkipTable', table: 7 })).toBe(atMin);
  });
});

describe('skip list in the UI', () => {
  it('the parent grid shows only the numbers it is given', () => {
    render(<FactGrid facts={makeFacts()} numbers={activeNumbers(DEFAULT)} onSelect={() => undefined} />);
    expect(screen.getAllByRole('button')).toHaveLength(49);
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['3', '4', '5', '6', '7', '8', '9']);
  });

  it('the Star Map has a star per fact in play', () => {
    render(<GameProvider storage={storageWith(fresh())} session={null}><StarMap /></GameProvider>);
    expect(document.querySelectorAll('[data-fact]')).toHaveLength(28);
    expect(screen.getByText('★ 0 / 28 stars lit')).toBeInTheDocument();
  });

  it('the Hangar lists crew only for planets in play', () => {
    render(<GameProvider storage={storageWith(fresh({ bossesBeaten: [1, 2] }))} session={null}><Hangar /></GameProvider>);
    expect(screen.getAllByRole('listitem')).toHaveLength(7);
    expect(screen.getByText('Free a planet to add a ship part!')).toBeInTheDocument();
  });

  it('the child skips and restores tables from the map, and the map follows', async () => {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(fresh({ celebrated: { planetsUnlocked: [3], galaxyMaster: false } })));
    const user = userEvent.setup();
    render(<App />);
    expect(document.querySelectorAll('[data-planet]')).toHaveLength(7);
    expect(screen.getByText('0 of 28 facts mastered')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tables' }));
    const group = screen.getByRole('group', { name: 'Times tables to practise' });
    const table = (n: number) => within(group).getByRole('button', { name: `×${n}` });
    expect(table(1)).toHaveAttribute('aria-pressed', 'false');
    expect(table(2)).toHaveAttribute('aria-pressed', 'false');
    expect(table(3)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('7 tables on, 28 facts to practise.')).toBeInTheDocument();

    await user.click(table(2)); // bring ×2 back
    expect(table(2)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('8 tables on, 36 facts to practise.')).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(SAVE_KEY)!).settings.skipTables).toEqual([1]);

    await user.click(screen.getByRole('button', { name: 'Back to Galaxy' }));
    expect(document.querySelectorAll('[data-planet]')).toHaveLength(8);
    expect(document.querySelector('[data-planet="2"]')).not.toBeNull();
    expect(screen.getByText('0 of 36 facts mastered')).toBeInTheDocument();
  });

  it('the last tables in play cannot be skipped', async () => {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(fresh({ settings: { soundOn: true, skipTables: [1, 2, 3, 4, 5] } })));
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Tables' }));
    const group = screen.getByRole('group', { name: 'Times tables to practise' });
    await user.click(within(group).getByRole('button', { name: '×6' }));
    expect(screen.getByText(/Keep at least 3 tables on/)).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: '×7' })).toBeDisabled();
    expect(within(group).getByRole('button', { name: '×6' })).toHaveAttribute('aria-pressed', 'false');
    expect(within(group).getByRole('button', { name: '×1' })).toBeEnabled();
  });
});
