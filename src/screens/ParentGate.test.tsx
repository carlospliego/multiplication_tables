import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GameState } from '../state/gameReducer';
import { createFreshSave } from '../storage/save';
import { createRng } from '../engine/rng';

const dispatch = vi.fn();
let state: GameState;
vi.mock('../state/GameContext', () => ({ useGame: () => ({ state, dispatch }) }));
import { ParentGate } from './ParentGate';

beforeEach(() => {
  dispatch.mockClear();
  state = {
    save: { ...createFreshSave('Leo', '2026-01-01T00:00:00Z'), placementDone: true },
    screen: 'parentGate',
    loadStatus: 'ok',
    storageOk: true,
    corruptNotice: false,
  };
});

function problem(): { a: number; b: number } {
  const m = /what is (\d+) × (\d+)\?/.exec(screen.getByTestId('gate-problem').textContent ?? '');
  return { a: Number(m![1]), b: Number(m![2]) };
}

async function typeAnswer(n: number) {
  for (const d of String(n)) await userEvent.click(screen.getByRole('button', { name: d }));
  await userEvent.click(screen.getByRole('button', { name: 'Go' }));
}

describe('ParentGate', () => {
  it('asks a 2-digit x 2-digit problem', () => {
    render(<ParentGate rng={createRng(1)} />);
    const { a, b } = problem();
    expect(a).toBeGreaterThanOrEqual(11);
    expect(a).toBeLessThanOrEqual(29);
    expect(b).toBeGreaterThanOrEqual(11);
    expect(b).toBeLessThanOrEqual(29);
    expect(screen.getByTestId('gate-problem')).toHaveTextContent(/^Grown-ups only: what is \d+ × \d+\?$/);
  });

  it('opens the dashboard on the correct product (3 digits)', async () => {
    render(<ParentGate rng={createRng(7)} />);
    const { a, b } = problem();
    await typeAnswer(a * b);
    expect(dispatch).toHaveBeenCalledWith({ type: 'navigate', screen: 'parent' });
  });

  it('accepts the largest product, 841', async () => {
    // rng() near 1 -> 29 x 29
    render(<ParentGate rng={() => 0.999999} />);
    expect(problem()).toEqual({ a: 29, b: 29 });
    await typeAnswer(841);
    expect(dispatch).toHaveBeenCalledWith({ type: 'navigate', screen: 'parent' });
  });

  it('shows a new problem and a gentle note on a wrong answer, and stays', async () => {
    render(<ParentGate rng={createRng(7)} />);
    const first = problem();
    await typeAnswer(first.a * first.b + 1);
    expect(dispatch).not.toHaveBeenCalled();
    expect(screen.getByText(/not quite — try this one/i)).toBeInTheDocument();
    const second = problem();
    expect(second).not.toEqual(first);
    // pad was cleared, still usable
    await typeAnswer(second.a * second.b);
    expect(dispatch).toHaveBeenCalledWith({ type: 'navigate', screen: 'parent' });
  });

  it('close goes back to the map', async () => {
    render(<ParentGate rng={createRng(1)} />);
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'navigate', screen: 'map' });
  });
});
