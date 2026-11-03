import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const dispatch = vi.fn();
vi.mock('../state/GameContext', () => ({ useGame: () => ({ state: null, dispatch }) }));
import { Welcome } from './Welcome';

beforeEach(() => dispatch.mockClear());

describe('Welcome', () => {
  it('disables Launch for empty or whitespace names', async () => {
    const user = userEvent.setup();
    render(<Welcome />);
    const launch = screen.getByRole('button', { name: /launch/i });
    expect(launch).toBeDisabled();
    await user.type(screen.getByRole('textbox'), '   ');
    expect(launch).toBeDisabled();
  });

  it('limits the name to 16 characters', () => {
    render(<Welcome />);
    expect(screen.getByRole('textbox')).toHaveAttribute('maxlength', '16');
  });

  it('dispatches the trimmed name on click', async () => {
    const user = userEvent.setup();
    render(<Welcome />);
    await user.type(screen.getByRole('textbox'), '  Leo ');
    await user.click(screen.getByRole('button', { name: /launch/i }));
    expect(dispatch).toHaveBeenCalledTimes(1);
    const a = dispatch.mock.calls[0]![0];
    expect(a.type).toBe('createCaptain');
    expect(a.name).toBe('Leo');
    expect(Number.isNaN(Date.parse(a.nowIso))).toBe(false);
  });

  it('submits on Enter when valid, not when empty', async () => {
    const user = userEvent.setup();
    render(<Welcome />);
    await user.type(screen.getByRole('textbox'), '{Enter}');
    expect(dispatch).not.toHaveBeenCalled();
    await user.type(screen.getByRole('textbox'), 'Mia{Enter}');
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0]![0].name).toBe('Mia');
  });

  it('shows the Add to Home Screen tip', () => {
    render(<Welcome />);
    expect(screen.getByText(/Add to Home Screen/)).toBeInTheDocument();
  });
});
