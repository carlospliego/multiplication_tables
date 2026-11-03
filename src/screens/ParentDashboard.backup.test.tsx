import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GameState } from '../state/gameReducer';
import { createFreshSave } from '../storage/save';
import { serializeSave as serializeForTest } from '../storage/backup';

const dispatch = vi.fn();
let state: GameState;
vi.mock('../state/GameContext', () => ({ useGame: () => ({ state, dispatch }) }));
vi.mock('../storage/backup', async (orig) => ({ ...(await orig<typeof import('../storage/backup')>()), downloadSave: vi.fn() }));
import { downloadSave } from '../storage/backup';
import { ParentDashboard } from './ParentDashboard';

beforeEach(() => {
  dispatch.mockClear();
  vi.mocked(downloadSave).mockClear();
  const save = { ...createFreshSave('Leo', '2026-01-01T00:00:00Z'), placementDone: true };
  state = { save, screen: 'parent', loadStatus: 'ok', storageOk: true, corruptNotice: false };
});

const pick = async (content: string) => {
  const input = screen.getByLabelText(/import a save file/i) as HTMLInputElement;
  await userEvent.upload(input, new File([content], 'x.json', { type: 'application/json' }));
  return input;
};

describe('backup, reset and notices', () => {
  it('export calls downloadSave', async () => {
    render(<ParentDashboard />);
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(downloadSave).toHaveBeenCalledTimes(1);
    expect(vi.mocked(downloadSave).mock.calls[0][0]).toBe(state.save);
  });

  it('rejects an invalid file without dispatching', async () => {
    render(<ParentDashboard />);
    await pick('not json');
    expect(screen.getByText("That file isn't a Times Table Rocket save")).toBeInTheDocument();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('asks for confirmation then dispatches importSave on Replace', async () => {
    render(<ParentDashboard />);
    const other = { ...createFreshSave('Mia', '2026-02-01T00:00:00Z'), placementDone: true };
    const input = await pick(serializeForTest(other));
    expect(input.value).toBe('');
    expect(screen.getByText("Replace current progress with Mia's save?")).toBeInTheDocument();
    expect(dispatch).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Replace' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'importSave', save: expect.objectContaining({ captainName: 'Mia' }) });
  });

  it('Cancel dispatches nothing', async () => {
    render(<ParentDashboard />);
    await pick(serializeForTest(createFreshSave('Mia', '2026-02-01T00:00:00Z')));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(dispatch).not.toHaveBeenCalled();
    expect(screen.queryByText(/replace current progress/i)).toBeNull();
  });

  it('reset is enabled only when RESET is typed exactly', async () => {
    render(<ParentDashboard />);
    const btn = screen.getByRole('button', { name: 'Reset' });
    const input = screen.getByLabelText(/type reset/i);
    expect(btn).toBeDisabled();
    await userEvent.type(input, 'reset');
    expect(btn).toBeDisabled();
    await userEvent.clear(input);
    await userEvent.type(input, 'RESET');
    expect(btn).toBeEnabled();
    await userEvent.click(btn);
    expect(dispatch).toHaveBeenCalledWith({ type: 'resetProgress' });
  });

  it('shows and dismisses the corrupt notice', async () => {
    state = { ...state, corruptNotice: true };
    render(<ParentDashboard />);
    expect(screen.getByText('We found a damaged save and started fresh. A copy of the old data was kept on this device.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'dismissCorruptNotice' });
  });

  it('hides the corrupt notice when not flagged, and shows the Add to Home Screen tip', () => {
    render(<ParentDashboard />);
    expect(screen.queryByText(/damaged save/i)).toBeNull();
    expect(screen.getByText(/Add to Home Screen/)).toBeInTheDocument();
  });
});
