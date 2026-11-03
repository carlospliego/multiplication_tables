import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GameState } from '../state/gameReducer';
import { createFreshSave } from '../storage/save';

const dispatch = vi.fn();
let state: GameState;
vi.mock('../state/GameContext', () => ({ useGame: () => ({ state, dispatch }) }));
import { Hangar } from './Hangar';

function setup(bossesBeaten: (1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9)[]) {
  const save = { ...createFreshSave('Leo', '2026-01-01T00:00:00Z'), placementDone: true, bossesBeaten };
  state = { save, screen: 'hangar', loadStatus: 'ok', storageOk: true, corruptNotice: false };
}

beforeEach(() => dispatch.mockClear());

describe('Hangar', () => {
  it('shows earned ship parts and crew, and locked slots', () => {
    setup([1, 2]);
    const { container } = render(<Hangar />);
    expect(container.querySelector('[data-part="Racing Fins"]')).not.toBeNull();
    expect(container.querySelector('[data-part="Nose Cone"]')).not.toBeNull();
    expect(container.querySelector('[data-part="Twin Boosters"]')).toBeNull();
    expect(screen.getByText('Bleep from Launch Pad')).toBeInTheDocument();
    expect(screen.getByText('Twix from Twinara')).toBeInTheDocument();
    expect(screen.getByText('Free Pentaro to unlock')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-silhouette="true"]')).toHaveLength(7);
  });

  it('goes back to the galaxy', async () => {
    setup([]);
    render(<Hangar />);
    await userEvent.click(screen.getByRole('button', { name: /back to galaxy/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'navigate', screen: 'map' });
  });
});
