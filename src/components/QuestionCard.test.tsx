import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuestionCard } from './QuestionCard';
import type { Question } from '../engine/types';

const q = (a: number, b: number): Question => ({
  factId: `${a}x${b}`, a, b, answer: a * b, kind: 'normal',
});

describe('QuestionCard', () => {
  it('shows the question with no countdown', () => {
    render(<QuestionCard question={q(3, 7)} onAnswer={() => {}} />);
    expect(screen.getByText('3 × 7')).toBeInTheDocument();
    expect(screen.queryByRole('timer')).toBeNull();
    expect(document.body.textContent).not.toMatch(/\d+s/);
  });
  it('submits a correct answer once', async () => {
    const onAnswer = vi.fn();
    render(<QuestionCard question={q(3, 7)} onAnswer={onAnswer} />);
    await userEvent.click(screen.getByRole('button', { name: '2' }));
    await userEvent.click(screen.getByRole('button', { name: '1' }));
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onAnswer).toHaveBeenCalledTimes(1);
    const r = onAnswer.mock.calls[0]![0];
    expect(r.value).toBe(21);
    expect(r.correct).toBe(true);
    expect(Number.isFinite(r.responseMs)).toBe(true);
  });
  it('treats 07 as 7', async () => {
    const onAnswer = vi.fn();
    render(<QuestionCard question={q(1, 7)} onAnswer={onAnswer} />);
    await userEvent.click(screen.getByRole('button', { name: '0' }));
    await userEvent.click(screen.getByRole('button', { name: '7' }));
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onAnswer.mock.calls[0]![0].correct).toBe(true);
  });
  it('wrong answer is reported incorrect', async () => {
    const onAnswer = vi.fn();
    render(<QuestionCard question={q(3, 7)} onAnswer={onAnswer} />);
    await userEvent.click(screen.getByRole('button', { name: '5' }));
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onAnswer.mock.calls[0]![0].correct).toBe(false);
  });
  it('locks after first submit (Enter then click)', async () => {
    const onAnswer = vi.fn();
    render(<QuestionCard question={q(3, 7)} onAnswer={onAnswer} />);
    await userEvent.click(screen.getByRole('button', { name: '2' }));
    await userEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onAnswer).toHaveBeenCalledTimes(1);
  });
  it('starts the timer via fallback timeout when animationend never fires', () => {
    vi.useFakeTimers();
    const now = vi.spyOn(performance, 'now').mockReturnValue(0);
    const onAnswer = vi.fn();
    render(<QuestionCard question={q(3, 7)} onAnswer={onAnswer} />);
    act(() => { vi.advanceTimersByTime(600); });
    now.mockReturnValue(2000);
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onAnswer.mock.calls[0]![0].responseMs).toBeGreaterThanOrEqual(1000);
    expect(onAnswer.mock.calls[0]![0].interrupted).toBe(false);
    vi.useRealTimers();
    now.mockRestore();
  });
});
