import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GameState } from '../state/gameReducer';
import { createFreshSave } from '../storage/save';
import type { SaveData } from '../storage/save';
import { makeFacts } from '../engine/progress';
import { ALL_FACT_IDS, PLANETS } from '../engine/facts';
import type { FactRecord } from '../engine/types';

const dispatch = vi.fn();
let state: GameState;
vi.mock('../state/GameContext', () => ({ useGame: () => ({ state, dispatch }) }));
import { GalaxyMap } from './GalaxyMap';

function lvl(planetIds: number[], level: number): Record<string, Partial<FactRecord>> {
  const o: Record<string, Partial<FactRecord>> = {};
  for (const p of planetIds) for (const f of PLANETS[p - 1]!.factIds) o[f] = { level: level as FactRecord['level'] };
  return o;
}

function setup(patch: Partial<SaveData> = {}) {
  const save = { ...createFreshSave('Leo', '2026-01-01T00:00:00Z'), placementDone: true, ...patch };
  state = { save, screen: 'map', loadStatus: 'ok', storageOk: true, corruptNotice: false };
}

const stateOf = (n: number) => document.querySelector(`[data-planet="${n}"]`)!.getAttribute('data-state');

beforeEach(() => dispatch.mockClear());

describe('GalaxyMap', () => {
  it('greets the captain and shows the buttons', () => {
    setup();
    render(<GalaxyMap />);
    expect(screen.getByText(/Captain Leo/)).toBeInTheDocument();
    for (const n of [/star map/i, /hangar/i, /sound/i, /grown-ups/i]) {
      expect(screen.getByRole('button', { name: n })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: /sound/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('navigates and toggles sound', async () => {
    setup();
    const user = userEvent.setup();
    render(<GalaxyMap />);
    await user.click(screen.getByRole('button', { name: /star map/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'navigate', screen: 'starMap' });
    await user.click(screen.getByRole('button', { name: /hangar/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'navigate', screen: 'hangar' });
    await user.click(screen.getByRole('button', { name: /grown-ups/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'navigate', screen: 'parentGate' });
    await user.click(screen.getByRole('button', { name: /sound/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'toggleSound' });
  });

  it('maps planet states with precedence freed > boss > frontier > open > locked', () => {
    // planet 1 level 2 (opens 2), planet 2 untouched
    setup({ facts: makeFacts(lvl([1], 2)), bossesBeaten: [1] });
    render(<GalaxyMap />);
    expect(stateOf(1)).toBe('freed');
    expect(stateOf(2)).toBe('frontier');
    expect(stateOf(3)).toBe('locked');
  });

  it('marks boss, open and locked planets', () => {
    // planet 1 level 2 (boss available, opens 2); planet 2 all level 1 -> no level-0 facts, so open
    setup({ facts: makeFacts({ ...lvl([1], 2), ...lvl([2], 1) }) });
    render(<GalaxyMap />);
    expect(stateOf(1)).toBe('boss');
    expect(stateOf(2)).toBe('open');
    expect(stateOf(3)).toBe('locked');
  });

  it('puts the frontier on the first open planet with new facts', () => {
    setup({ facts: makeFacts({ ...lvl([1, 2], 2) }), bossesBeaten: [1, 2] });
    render(<GalaxyMap />);
    expect(stateOf(2)).toBe('freed');
    expect(stateOf(3)).toBe('frontier');
    expect(stateOf(4)).toBe('locked');
  });

  it('celebrates the highest newly opened planet once, marking all open planets', async () => {
    setup({ facts: makeFacts(lvl([1, 2], 2)) });
    const user = userEvent.setup();
    render(<GalaxyMap />);
    const dlg = screen.getByRole('dialog');
    expect(within(dlg).getByText(`New planet detected: ${PLANETS[2]!.name}!`)).toBeInTheDocument();
    expect(screen.getAllByText(/New planet detected/)).toHaveLength(1);
    for (const p of [1, 2, 3]) expect(dispatch).toHaveBeenCalledWith({ type: 'markCelebrated', planet: p });
    await user.click(within(dlg).getByRole('button', { name: 'OK' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('does not celebrate planet 1 or already-celebrated planets', () => {
    setup();
    render(<GalaxyMap />);
    expect(screen.queryByRole('dialog')).toBeNull();
    setup({ facts: makeFacts(lvl([1], 2)), celebrated: { planetsUnlocked: [2], galaxyMaster: false } });
    render(<GalaxyMap />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows Galaxy Master once when all 45 are mastered', async () => {
    const o: Record<string, Partial<FactRecord>> = {};
    for (const id of ALL_FACT_IDS) o[id] = { level: 5 };
    setup({ facts: makeFacts(o), celebrated: { planetsUnlocked: [2, 3, 4, 5, 6, 7, 8, 9], galaxyMaster: false } });
    const user = userEvent.setup();
    render(<GalaxyMap />);
    expect(screen.getByText(/Galaxy Master/)).toBeInTheDocument();
    expect(dispatch).toHaveBeenCalledWith({ type: 'markCelebrated', galaxyMaster: true });
    await user.click(screen.getByRole('button', { name: 'OK' }));
    expect(screen.queryByText(/Galaxy Master/)).toBeNull();
  });

  it('keeps Launch Mission / Free Flight behaviour', async () => {
    setup();
    const user = userEvent.setup();
    render(<GalaxyMap />);
    await user.click(screen.getByRole('button', { name: /launch mission/i }));
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'startMission' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'navigate', screen: 'mission' });
  });
});
