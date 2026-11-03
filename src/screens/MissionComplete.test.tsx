import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GameState } from '../state/gameReducer';
import { createFreshSave } from '../storage/save';
import type { SaveData } from '../storage/save';
import { makeFacts } from '../engine/progress';
import { todayLocal } from '../engine/dates';
import { PLANETS } from '../engine/facts';

const dispatch = vi.fn();
let state: GameState;
vi.mock('../state/GameContext', () => ({ useGame: () => ({ state, dispatch }) }));
vi.mock('../audio/sfx', () => ({ play: vi.fn(), unlockAudio: vi.fn(), setMuted: vi.fn() }));
import { MissionComplete } from './MissionComplete';

function setup(patch: Partial<SaveData> = {}) {
  const save = { ...createFreshSave('Leo', '2026-01-01T00:00:00Z'), placementDone: true, ...patch };
  state = { save, screen: 'mission', loadStatus: 'ok', storageOk: true, corruptNotice: false };
}

beforeEach(() => dispatch.mockClear());

describe('MissionComplete', () => {
  it('shows answered, lightning, new stars, streak and buttons', async () => {
    const facts = makeFacts();
    facts['1x1'] = { ...facts['1x1']!, level: 5, lastPromotedDay: todayLocal() };
    facts['1x2'] = { ...facts['1x2']!, level: 5, lastPromotedDay: todayLocal() };
    facts['1x3'] = { ...facts['1x3']!, level: 5, lastPromotedDay: '2020-01-01' };
    setup({ facts, streak: { current: 4, best: 4, lastMissionDay: todayLocal() } });
    render(<MissionComplete answered={37} lightning={9} bossWon={null} />);
    expect(screen.getByText(/mission complete/i)).toBeInTheDocument();
    expect(screen.getByText(/37/)).toBeInTheDocument();
    expect(screen.getByText(/⚡\s*9|9\s*⚡/)).toBeInTheDocument();
    expect(screen.getByText(/2 new stars/i)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /4 day streak/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /free flight/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'navigate', screen: 'freeFlight' });
    await userEvent.click(screen.getByRole('button', { name: /back to galaxy/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'navigate', screen: 'map' });
  });

  it('singular star and boss reward reveal', () => {
    const facts = makeFacts();
    facts['1x1'] = { ...facts['1x1']!, level: 5, lastPromotedDay: todayLocal() };
    setup({ facts });
    render(<MissionComplete answered={5} lightning={0} bossWon={2} />);
    expect(screen.getByText(/1 new star\b/i)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(PLANETS[1]!.alienName))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(PLANETS[1]!.shipPart, 'i'))).toBeInTheDocument();
  });

  it('renders without summary props', () => {
    setup();
    render(<MissionComplete />);
    expect(screen.getByText(/0 new stars/i)).toBeInTheDocument();
  });
});
