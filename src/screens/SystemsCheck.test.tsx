import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// These tests cover the full game rules, so saves skip nothing here (see src/skip.test.tsx).
vi.mock('../skip', () => import('../testing/skipNothing').then((m) => m.skipNothing()));

import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { createFreshSave } from '../storage/save';

const dispatch = vi.fn();
const save = createFreshSave('Ada', '2026-11-02T10:00:00.000Z');
vi.mock('../state/GameContext', () => ({ useGame: () => ({ state: { save }, dispatch }) }));
import { SystemsCheck } from './SystemsCheck';

let user: ReturnType<typeof userEvent.setup>;
beforeEach(() => {
  dispatch.mockClear();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
});
afterEach(() => vi.useRealTimers());

async function enter(n: number) {
  for (const c of String(n)) await user.click(screen.getByRole('button', { name: c }));
  await user.click(screen.getByRole('button', { name: 'Go' }));
}
function currentAnswer(): number {
  const text = screen.getByRole('region', { name: 'Question' }).textContent ?? '';
  const m = text.match(/(\d+)\s*[×x]\s*(\d+)/);
  return Number(m![1]) * Number(m![2]);
}

describe('SystemsCheck', () => {
  it('shows the title and progress', () => {
    render(<SystemsCheck />);
    expect(screen.getByText('Systems Check')).toBeInTheDocument();
    expect(screen.getByText('1 / 24')).toBeInTheDocument();
  });

  it('never shows Repair on wrong answers, shows logged!, and finishes after 24', async () => {
    render(<SystemsCheck />);
    for (let i = 0; i < 24; i++) {
      await enter(currentAnswer() + 1); // always wrong
      expect(screen.queryByText(/repair/i)).toBeNull();
      expect(screen.getByText('logged!')).toBeInTheDocument();
      if (i < 23) {
        act(() => { vi.advanceTimersByTime(1000); });
        expect(screen.getByText(`${i + 2} / 24`)).toBeInTheDocument();
      }
    }
    expect(dispatch.mock.calls.filter((c) => c[0].type === 'finishPlacement')).toHaveLength(0);
    act(() => { vi.advanceTimersByTime(1000); });
    const answers = dispatch.mock.calls.filter((c) => c[0].type === 'answer');
    expect(answers).toHaveLength(24);
    expect(answers[0]![0].mode).toBe('placement');
    expect(answers[0]![0].answer.correct).toBe(false);
    expect(dispatch.mock.calls.at(-1)![0]).toEqual({ type: 'finishPlacement' });
    expect(dispatch.mock.calls.filter((c) => c[0].type === 'finishPlacement')).toHaveLength(1);
  });
});
