import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GameState } from '../state/gameReducer';
import { createFreshSave } from '../storage/save';
import { makeFacts } from '../engine/progress';
import { FactGrid } from '../components/FactGrid';

const dispatch = vi.fn();
let state: GameState;
vi.mock('../state/GameContext', () => ({ useGame: () => ({ state, dispatch }) }));
import { ParentDashboard } from './ParentDashboard';

function setup() {
  const facts = makeFacts({
    '3x7': { level: 5, attempts: 4, correct: 3, totalCorrectMs: 9000, lastSeenDay: '2026-11-01' },
    '2x2': { level: 5 },
    '4x5': { level: 2, attempts: 2, correct: 2, totalCorrectMs: 5000 },
  });
  const save = {
    ...createFreshSave('Leo', '2026-01-01T00:00:00Z'),
    placementDone: true,
    facts,
    bossesBeaten: [1, 2, 3] as (1 | 2 | 3)[],
    streak: { current: 4, best: 9, lastMissionDay: '2026-11-03' },
    dailyActiveSeconds: { '2026-11-03': 600, '2026-11-02': 120, '2026-10-20': 999 },
  };
  state = { save, screen: 'parent', loadStatus: 'ok', storageOk: true, corruptNotice: false };
}

beforeEach(() => {
  dispatch.mockClear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 3, 12));
  setup();
});
afterEach(() => vi.useRealTimers());

describe('FactGrid', () => {
  it('renders 81 cells with symmetric facts and a star on mastered', async () => {
    const onSelect = vi.fn();
    const { container } = render(<FactGrid facts={makeFacts({ '3x7': { level: 5 } })} onSelect={onSelect} />);
    expect(container.querySelectorAll('td[data-level], button[data-level]')).toHaveLength(81);
    const a = screen.getByRole('button', { name: '3 × 7: level 5' });
    const b = screen.getByRole('button', { name: '7 × 3: level 5' });
    expect(a).toHaveTextContent('★');
    expect(b).toHaveAttribute('data-level', '5');
    await userEvent.click(b);
    expect(onSelect).toHaveBeenCalledWith('3x7');
  });

  it('uses a distinct icon per colour band', () => {
    render(
      <FactGrid
        facts={makeFacts({ '1x2': { level: 1 }, '1x3': { level: 2 }, '1x4': { level: 3 }, '1x5': { level: 4 } })}
        onSelect={() => {}}
      />,
    );
    const icon = (n: string) => screen.getByRole('button', { name: n }).textContent;
    expect(icon('1 × 1: level 0')).toBe('·');
    expect(icon('1 × 2: level 1')).toBe('○');
    expect(icon('1 × 3: level 2')).toBe('◐');
    expect(icon('1 × 4: level 3')).toBe('◑');
    expect(icon('1 × 5: level 4')).toBe('◑');
  });
});

describe('ParentDashboard', () => {
  it('shows the fact detail when a cell is tapped', async () => {
    render(<ParentDashboard />);
    await userEvent.click(screen.getByRole('button', { name: '7 × 3: level 5' }));
    const d = screen.getByRole('region', { name: /fact detail/i });
    expect(d).toHaveTextContent('3 × 7');
    expect(d).toHaveTextContent(/level 5/i);
    expect(within(d).getByText('4')).toBeInTheDocument();
    expect(d).toHaveTextContent('75%');
    expect(d).toHaveTextContent('3.0 s');
    expect(d).toHaveTextContent('2026-11-01');
  });

  it('shows dashes and never for an unpracticed fact', async () => {
    render(<ParentDashboard />);
    await userEvent.click(screen.getByRole('button', { name: '9 × 9: level 0' }));
    const d = screen.getByRole('region', { name: /fact detail/i });
    expect(d).toHaveTextContent(/accuracy\s*—/i);
    expect(d).toHaveTextContent(/average time\s*—/i);
    expect(d).toHaveTextContent(/last practiced\s*never/i);
  });

  it('shows the summary', () => {
    render(<ParentDashboard />);
    expect(screen.getByText('★ 2 / 45')).toBeInTheDocument();
    expect(screen.getByText(/current streak/i).parentElement).toHaveTextContent('4');
    expect(screen.getByText(/best streak/i).parentElement).toHaveTextContent('9');
    expect(screen.getByText(/planets freed/i).parentElement).toHaveTextContent('3');
    const list = screen.getByRole('list', { name: /minutes per day/i });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(7);
    expect(items[6]).toHaveTextContent('10 min');
    expect(items[5]).toHaveTextContent('2 min');
    expect(items[0]).toHaveTextContent('0 min');
    expect(screen.getByText(/total this week/i).parentElement).toHaveTextContent('12 min');
  });

  it('goes back to the galaxy', async () => {
    render(<ParentDashboard />);
    await userEvent.click(screen.getByRole('button', { name: /back to galaxy/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'navigate', screen: 'map' });
  });
});
