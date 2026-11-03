import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GameState } from '../state/gameReducer';
import { createFreshSave } from '../storage/save';
import { makeFacts } from '../engine/progress';
import { ALL_FACT_IDS } from '../engine/facts';
import { STAR_POSITIONS } from './starLayout';

const dispatch = vi.fn();
let state: GameState;
vi.mock('../state/GameContext', () => ({ useGame: () => ({ state, dispatch }) }));
import { StarMap } from './StarMap';

function setup(overrides = {}) {
  const save = { ...createFreshSave('Leo', '2026-01-01T00:00:00Z'), placementDone: true, facts: makeFacts(overrides) };
  state = { save, screen: 'starMap', loadStatus: 'ok', storageOk: true, corruptNotice: false };
}

beforeEach(() => dispatch.mockClear());

describe('starLayout', () => {
  it('has a distinct position inside the viewBox for all 45 facts', () => {
    const seen = new Set<string>();
    for (const id of ALL_FACT_IDS) {
      const p = STAR_POSITIONS[id];
      expect(p, id).toBeDefined();
      expect(p!.x).toBeGreaterThanOrEqual(0);
      expect(p!.x).toBeLessThanOrEqual(100);
      expect(p!.y).toBeGreaterThanOrEqual(0);
      expect(p!.y).toBeLessThanOrEqual(100);
      seen.add(`${p!.x},${p!.y}`);
    }
    expect(ALL_FACT_IDS).toHaveLength(45);
    expect(seen.size).toBe(45);
  });
});

describe('StarMap', () => {
  it('renders 45 star buttons and the counter', () => {
    setup({ '1x1': { level: 5 }, '2x3': { level: 5 } });
    const { container } = render(<StarMap />);
    expect(container.querySelectorAll('button[data-fact]')).toHaveLength(45);
    expect(screen.getByText('★ 2 / 45 stars lit')).toBeInTheDocument();
  });

  it('shows the fact and state when a star is tapped', async () => {
    setup({ '3x7': { level: 5 } });
    render(<StarMap />);
    await userEvent.click(screen.getByRole('button', { name: /3 × 7/ }));
    expect(screen.getByText('3 × 7 = 21')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/shining bright/i);
  });

  it('labels tune-up stars and gives each state a distinct data-state and shape', () => {
    setup({ '1x1': { level: 5 }, '2x2': { level: 2, everMastered: true } });
    const { container } = render(<StarMap />);
    expect(screen.getByRole('button', { name: /2 × 2.*needs a tune-up/i })).toBeInTheDocument();
    const shape = (id: string) => container.querySelector(`button[data-fact="${id}"]`)!.querySelector('[data-shape]')!.getAttribute('data-shape');
    const st = (id: string) => container.querySelector(`button[data-fact="${id}"]`)!.getAttribute('data-state');
    expect([st('1x1'), st('2x2'), st('1x2')]).toEqual(['lit', 'tuneUp', 'dark']);
    expect([shape('1x1'), shape('2x2'), shape('1x2')]).toEqual(['star', 'ring', 'dot']);
  });

  it('goes back to the galaxy', async () => {
    setup();
    render(<StarMap />);
    await userEvent.click(screen.getByRole('button', { name: /back to galaxy/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'navigate', screen: 'map' });
  });
});
