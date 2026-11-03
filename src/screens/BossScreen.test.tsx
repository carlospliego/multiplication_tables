import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BossScreen } from './BossScreen';
import { makeFacts } from '../engine/progress';
import { ALL_FACT_IDS } from '../engine/facts';
import { createRng } from '../engine/rng';

let user: ReturnType<typeof userEvent.setup>;
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
});
afterEach(() => vi.useRealTimers());

const facts = makeFacts(Object.fromEntries(ALL_FACT_IDS.map((id) => [id, { level: 1 }])));

function setup() {
  const p = { onAnswer: vi.fn(), onFinish: vi.fn() };
  render(<BossScreen planet={1} facts={facts} rng={createRng(5)} {...p} />);
  return p;
}
async function type(n: number) {
  for (const c of String(n)) await user.click(screen.getByRole('button', { name: c }));
  await user.click(screen.getByRole('button', { name: 'Go' }));
}
function current(): number {
  const [a, b] = screen.getByRole('heading', { level: 2 }).textContent!.split('×').map((s) => parseInt(s, 10));
  return a! * b!;
}
const skip = () => act(() => { vi.advanceTimersByTime(2000); });
const right = async () => { await type(current()); skip(); };
const wrong = async () => { await type(current() + 1); };
const fix = async () => { await type(Number(screen.getByText(/=/).textContent!.split('=')[1])); };

describe('BossScreen', () => {
  it('wins after 12 correct answers', async () => {
    const p = setup();
    expect(screen.getByLabelText('Shield 12 of 12')).toBeInTheDocument();
    for (let i = 0; i < 12; i++) await right();
    expect(screen.getByText('Planet freed!')).toBeInTheDocument();
    expect(p.onFinish).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(p.onFinish).toHaveBeenCalledTimes(1);
    expect(p.onFinish).toHaveBeenCalledWith('won');
    expect(p.onAnswer).toHaveBeenCalledTimes(12);
    const secs = p.onAnswer.mock.calls[0]![2];
    expect(Number.isFinite(secs) && secs >= 0).toBe(true);
  });

  it('wrong answer shows repair only and raises the shield', async () => {
    setup();
    for (let i = 0; i < 6; i++) await right();
    expect(screen.getByLabelText('Shield 6 of 12')).toBeInTheDocument();
    await wrong();
    expect(screen.getByRole('region', { name: "Let's fix it" })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Question' })).toBeNull();
    expect(screen.getByLabelText('Shield 7 of 12')).toBeInTheDocument();
    await fix();
    expect(screen.getByRole('region', { name: 'Question' })).toBeInTheDocument();
  });

  it('retreats after 20 answers without winning', async () => {
    const p = setup();
    for (let i = 0; i < 10; i++) { await wrong(); await fix(); await right(); }
    expect(screen.getByText(/recharge/i)).toBeInTheDocument();
    expect(screen.queryByText('Planet freed!')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(p.onFinish).toHaveBeenCalledTimes(1);
    expect(p.onFinish).toHaveBeenCalledWith('retreated');
  });

  it('has no timer element', () => {
    setup();
    expect(document.querySelector('[role="timer"], [data-timer], progress')).toBeNull();
    expect(screen.queryByText(/second|timer/i)).toBeNull();
  });
});
