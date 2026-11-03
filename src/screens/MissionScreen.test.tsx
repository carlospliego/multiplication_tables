import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { todayLocal } from '../engine/dates';
import { createFreshSave, SAVE_KEY } from '../storage/save';
import type { SaveData } from '../storage/save';
import { ALL_FACT_IDS } from '../engine/facts';
import { makeFacts } from '../engine/progress';
import { GameProvider, useGame } from '../state/GameContext';
import type { GameState } from '../state/gameReducer';

vi.mock('./QuestScreen', () => ({
  QuestScreen: (p: {
    title: string;
    queue: { factId: string }[];
    onAnswer(f: string, a: { correct: boolean; responseMs: number; interrupted: boolean }, s: number): void;
    onComplete(s: { answered: number; lightning: number }): void;
  }) => (
    <div>
      <h1>{p.title}</h1>
      <p data-testid="len">{p.queue.length}</p>
      <button onClick={() => p.onAnswer(p.queue[0]!.factId, { correct: true, responseMs: 1000, interrupted: false }, 3)}>
        answer
      </button>
      <button onClick={() => p.onComplete({ answered: p.queue.length, lightning: 0 })}>finish</button>
    </div>
  ),
}));

vi.mock('./BossScreen', () => ({
  BossScreen: (p: { planet: number; onFinish(r: 'won' | 'retreated'): void }) => (
    <div>
      <h1>Boss {p.planet}</h1>
      <button onClick={() => p.onFinish('won')}>win</button>
      <button onClick={() => p.onFinish('retreated')}>retreat</button>
    </div>
  ),
}));

import { MissionScreen } from './MissionScreen';
import { GalaxyMap } from './GalaxyMap';

function fakeStorage(save: SaveData) {
  const writes: SaveData[] = [];
  const s = {
    getItem: (k: string) => (k === SAVE_KEY ? JSON.stringify(save) : null),
    setItem: (k: string, v: string) => {
      if (k === SAVE_KEY) writes.push(JSON.parse(v));
    },
    removeItem: () => undefined,
  } as unknown as Storage;
  return { s, writes };
}

function baseSave(extra: Partial<SaveData> = {}): SaveData {
  const overrides = Object.fromEntries(ALL_FACT_IDS.map((id) => [id, { level: 1 as const, dueDay: '2020-01-01' }]));
  return {
    ...createFreshSave('Ada', '2026-11-02T10:00:00.000Z'),
    placementDone: true,
    facts: makeFacts(overrides),
    ...extra,
  };
}

let latest: GameState;
function Probe() {
  latest = useGame().state;
  return null;
}

describe('MissionScreen', () => {
  it('walks warmup -> quest1..3 -> complete and completes the mission once (StrictMode)', async () => {
    const user = userEvent.setup();
    const { s, writes } = fakeStorage(baseSave());
    render(
      <StrictMode>
        <GameProvider storage={s}>
          <Probe />
          <MissionScreen />
        </GameProvider>
      </StrictMode>,
    );
    expect(screen.getByText('Warm-up')).toBeInTheDocument();
    expect(screen.getByTestId('len').textContent).toBe('5');
    await user.click(screen.getByText('answer'));
    expect(Object.values(latest.save!.facts).reduce((n, f) => n + f.attempts, 0)).toBe(1);
    for (const title of ['Quest 1', 'Quest 2', 'Quest 3']) {
      await user.click(screen.getByText('finish'));
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    await user.click(screen.getByText('finish'));
    expect(screen.getByText('Boss 1')).toBeInTheDocument();
    await user.click(screen.getByText('win'));
    expect(latest.save!.bossesBeaten).toEqual([1]);
    expect(screen.getByText(/mission complete/i)).toBeInTheDocument();
    expect(latest.save!.mission).toEqual({ day: todayLocal(), step: 'complete' });
    expect(latest.save!.streak.current).toBe(1);
    const completions = writes.filter((w) => w.mission?.step === 'complete' && w.streak.current === 1);
    expect(completions.length).toBeGreaterThan(0);
    expect(writes.every((w) => w.streak.current <= 1 && w.streak.best <= 1)).toBe(true);
  });

  it('retreating from the boss advances without marking it beaten', async () => {
    const user = userEvent.setup();
    const { s } = fakeStorage(baseSave({ mission: { day: todayLocal(), step: 'boss' } }));
    render(<GameProvider storage={s}><Probe /><MissionScreen /></GameProvider>);
    await user.click(screen.getByText('retreat'));
    expect(latest.save!.bossesBeaten).toEqual([]);
    expect(latest.save!.mission!.step).toBe('complete');
  });

  it('skips the boss step when no boss is available', () => {
    const facts = makeFacts();
    const { s } = fakeStorage(baseSave({ facts, mission: { day: todayLocal(), step: 'boss' } }));
    render(<GameProvider storage={s}><Probe /><MissionScreen /></GameProvider>);
    expect(latest.save!.mission!.step).toBe('complete');
  });

  it('resumes at the saved step on the same day', () => {
    const { s } = fakeStorage(baseSave({ mission: { day: todayLocal(), step: 'quest2' } }));
    render(
      <GameProvider storage={s}>
        <MissionScreen />
      </GameProvider>,
    );
    expect(screen.getByText('Quest 2')).toBeInTheDocument();
  });

  it('starts over at warm-up when the saved mission is from another day', () => {
    const { s } = fakeStorage(baseSave({ mission: { day: '2020-01-01', step: 'quest3' } }));
    render(
      <GameProvider storage={s}>
        <MissionScreen />
      </GameProvider>,
    );
    expect(screen.getByText('Warm-up')).toBeInTheDocument();
  });
});

describe('GalaxyMap', () => {
  it('offers Launch Mission before and Free Flight after completion', () => {
    const a = fakeStorage(baseSave());
    const { unmount } = render(<GameProvider storage={a.s}><GalaxyMap /></GameProvider>);
    expect(screen.getByRole('button', { name: /launch mission/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /free flight/i })).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(9);
    unmount();
    const b = fakeStorage(baseSave({ mission: { day: todayLocal(), step: 'complete' } }));
    act(() => {
      render(<GameProvider storage={b.s}><GalaxyMap /></GameProvider>);
    });
    expect(screen.getByRole('button', { name: /free flight/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /launch mission/i })).toBeNull();
  });
});
