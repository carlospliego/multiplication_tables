import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RepairScreen } from './RepairScreen';
import { DiscoveryCard } from './DiscoveryCard';
import type { Question } from '../engine/types';

const q: Question = { factId: '7x8', a: 7, b: 8, answer: 56, kind: 'normal' };

async function type(s: string) {
  for (const c of s) await userEvent.click(screen.getByRole('button', { name: c }));
}

describe('RepairScreen', () => {
  it('shows the fact, dot grid and tip', () => {
    render(<RepairScreen question={q} onDone={() => {}} />);
    expect(screen.getByText('7 × 8 = 56')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '7 rows of 8 dots' })).toBeInTheDocument();
    expect(screen.getByText(/7×5/)).toBeInTheDocument();
  });
  it('wrong retype clears input and does not finish', async () => {
    const onDone = vi.fn();
    render(<RepairScreen question={q} onDone={onDone} />);
    await type('54');
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Go' })).toBeDisabled();
  });
  it('correct retype finishes', async () => {
    const onDone = vi.fn();
    render(<RepairScreen question={q} onDone={onDone} />);
    await type('56');
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe('DiscoveryCard', () => {
  it('shows full fact, grid, tip and continues', async () => {
    const onContinue = vi.fn();
    render(<DiscoveryCard question={q} onContinue={onContinue} />);
    expect(screen.getByText('New Discovery!')).toBeInTheDocument();
    expect(screen.getByText('7 × 8 = 56')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '7 rows of 8 dots' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /continue|got it/i }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
