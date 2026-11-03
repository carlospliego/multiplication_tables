import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuestScreen } from './QuestScreen';
import type { Question } from '../engine/types';

const mk = (a: number, b: number, kind: Question['kind'] = 'normal'): Question => ({
  factId: `${a}x${b}`, a, b, answer: a * b, kind,
});

let user: ReturnType<typeof userEvent.setup>;
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
});
afterEach(() => vi.useRealTimers());

async function answer(n: number) {
  for (const c of String(n)) await user.click(screen.getByRole('button', { name: c }));
  await user.click(screen.getByRole('button', { name: 'Go' }));
}
const skip = () => act(() => { vi.advanceTimersByTime(1000); });

function setup(queue: Question[]) {
  const p = { onAnswer: vi.fn(), onComplete: vi.fn(), onExit: vi.fn() };
  render(<QuestScreen title="Test" queue={queue} rng={() => 0} {...p} />);
  return p;
}

describe('QuestScreen', () => {
  it('completes after all correct answers', async () => {
    const p = setup([mk(2, 3), mk(3, 4), mk(4, 5)]);
    await answer(6); skip();
    await answer(12); skip();
    await answer(20); skip();
    expect(p.onAnswer).toHaveBeenCalledTimes(3);
    const secs = p.onAnswer.mock.calls[0]![2];
    expect(Number.isFinite(secs) && secs >= 0).toBe(true);
    expect(p.onComplete).toHaveBeenCalledTimes(1);
    expect(p.onComplete.mock.calls[0]![0].answered).toBe(3);
  });

  it('shows repair after a wrong answer, then re-asks the fact', async () => {
    const p = setup([mk(2, 3), mk(3, 4), mk(4, 5)]);
    await answer(7);
    expect(screen.getByRole('region', { name: "Let's fix it" })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Question' })).toBeNull();
    await answer(6);
    await answer(12); skip();
    await answer(20); skip();
    expect(p.onComplete).not.toHaveBeenCalled();
    expect(screen.getByText('2 × 3')).toBeInTheDocument();
    await answer(6); skip();
    expect(p.onAnswer).toHaveBeenCalledTimes(4);
    expect(p.onComplete.mock.calls[0]![0].answered).toBe(4);
  });

  it('shows discovery before the question, only once', async () => {
    setup([mk(2, 3, 'discovery'), mk(3, 4)]);
    expect(screen.getByText('New Discovery!')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Question' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Got it!' }));
    expect(screen.getByText('2 × 3')).toBeInTheDocument();
    await answer(7);
    await answer(6);
    expect(screen.queryByText('New Discovery!')).toBeNull();
  });

  it('Map button exits', async () => {
    const p = setup([mk(2, 3)]);
    await user.click(screen.getByRole('button', { name: '⟵ Map' }));
    expect(p.onExit).toHaveBeenCalled();
  });

  it('fuel gauge does not drop after a wrong answer', async () => {
    setup([mk(2, 3), mk(3, 4), mk(4, 5)]);
    await answer(6); skip();
    const before = screen.getByRole('meter').getAttribute('aria-valuenow');
    await answer(1);
    expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe(before);
  });

  it('correct feedback clears within 1s', async () => {
    setup([mk(2, 3), mk(3, 4)]);
    await answer(6);
    expect(screen.getByText('Great!')).toBeInTheDocument();
    skip();
    expect(screen.queryByText('Great!')).toBeNull();
  });
});
