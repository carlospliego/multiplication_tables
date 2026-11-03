import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const dispatch = vi.fn();
vi.mock('../state/GameContext', () => ({ useGame: () => ({ state: null, dispatch }) }));
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
      if (i < 23) {
        expect(screen.getByText('logged!')).toBeInTheDocument();
        act(() => { vi.advanceTimersByTime(1000); });
        expect(screen.getByText(`${i + 2} / 24`)).toBeInTheDocument();
      }
    }
    const answers = dispatch.mock.calls.filter((c) => c[0].type === 'answer');
    expect(answers).toHaveLength(24);
    expect(answers[0]![0].mode).toBe('placement');
    expect(answers[0]![0].answer.correct).toBe(false);
    expect(dispatch.mock.calls.at(-1)![0]).toEqual({ type: 'finishPlacement' });
    expect(dispatch.mock.calls.filter((c) => c[0].type === 'finishPlacement')).toHaveLength(1);
  });
});
