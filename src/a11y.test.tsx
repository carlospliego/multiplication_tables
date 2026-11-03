import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GameState } from './state/gameReducer';
import { createFreshSave } from './storage/save';
import { makeFacts } from './engine/progress';
import { PLANETS } from './engine/facts';
import { NumberPad } from './components/NumberPad';
import { Planet } from './components/Planet';
import { QuestionCard } from './components/QuestionCard';

const dispatch = vi.fn();
let state: GameState;
vi.mock('./state/GameContext', () => ({ useGame: () => ({ state, dispatch }) }));
import { GalaxyMap } from './screens/GalaxyMap';

function setup(patch = {}) {
  const save = { ...createFreshSave('Leo', '2026-01-01T00:00:00Z'), placementDone: true, ...patch };
  state = { save, screen: 'map', loadStatus: 'ok', storageOk: true, corruptNotice: false };
}

beforeEach(() => dispatch.mockClear());
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('accessibility', () => {
  it('number pad buttons have accessible names', () => {
    render(<NumberPad value="" onChange={() => {}} onSubmit={() => {}} />);
    for (const n of ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Delete', 'Go']) {
      expect(screen.getByRole('button', { name: n })).toBeInTheDocument();
    }
  });

  it('planets are labelled "{Name}, {state}"', () => {
    render(<Planet planet={4} state="open" />);
    expect(screen.getByRole('img', { name: `${PLANETS[3]!.name}, open` })).toBeInTheDocument();
    setup();
    render(<GalaxyMap />);
    expect(screen.getByRole('img', { name: `${PLANETS[3]!.name}, locked` })).toBeInTheDocument();
  });

  it('QuestionCard starts its timer immediately under reduced motion', async () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} }));
    const st = vi.spyOn(globalThis, 'setTimeout');
    const onAnswer = vi.fn();
    render(<QuestionCard question={{ factId: '3x7', a: 3, b: 7, answer: 21, kind: 'normal' }} onAnswer={onAnswer} />);
    // No 600ms fallback timer is scheduled: the timer started synchronously on mount.
    expect(st.mock.calls.some(([, ms]) => ms === 600)).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onAnswer.mock.calls[0]![0].interrupted).toBe(false);
  });

  it('Sound button keeps a stable label and exposes state via aria-pressed', () => {
    setup();
    render(<GalaxyMap />);
    expect(screen.getByRole('button', { name: 'Sound' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('celebration overlay focuses OK and dismisses on Escape', async () => {
    setup({ facts: makeFacts(Object.fromEntries(PLANETS[0]!.factIds.map((f) => [f, { level: 2 }]))) });
    render(<GalaxyMap />);
    expect(screen.getByRole('button', { name: 'OK' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
