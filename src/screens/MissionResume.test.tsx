import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ALL_FACT_IDS } from '../engine/facts';
import { makeFacts } from '../engine/progress';
import type { Difficulty } from '../engine/difficulty';
import { createFreshSave, SAVE_KEY } from '../storage/save';
import type { SaveData } from '../storage/save';
import { SESSION_QUEST_KEY } from '../storage/session';
import type { QuestSnapshot } from '../storage/session';
import { GameProvider } from '../state/GameContext';
import { MissionScreen } from './MissionScreen';

/** A localStorage stand-in that keeps the latest write, like the real one across a reload. */
function persistentStorage(save: SaveData): Storage {
  const data = new Map([[SAVE_KEY, JSON.stringify(save)]]);
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  } as unknown as Storage;
}

function baseSave(difficulty: Difficulty = 'normal'): SaveData {
  const overrides = Object.fromEntries(ALL_FACT_IDS.map((id) => [id, { level: 1 as const, dueDay: '2020-01-01' }]));
  return {
    ...createFreshSave('Ada', '2026-11-02T10:00:00.000Z'),
    placementDone: true,
    facts: makeFacts(overrides),
    settings: { soundOn: false, difficulty },
  };
}

let user: ReturnType<typeof userEvent.setup>;
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
});
afterEach(() => vi.useRealTimers());

const snapshot = (): QuestSnapshot => JSON.parse(window.sessionStorage.getItem(SESSION_QUEST_KEY)!);
const heading = () => screen.getByRole('region', { name: 'Question' }).querySelector('h2')?.textContent ?? '';

async function answerCurrent() {
  const m = /(\d+)\s*×\s*(\d+)/.exec(heading());
  if (!m) throw new Error(`no question on screen: ${heading()}`);
  for (const c of String(Number(m[1]) * Number(m[2]))) await user.click(screen.getByRole('button', { name: c }));
  await user.click(screen.getByRole('button', { name: 'Go' }));
  act(() => { vi.advanceTimersByTime(1000); });
}

describe('mission resume within a browser session', () => {
  it('a reload mid warm-up returns to the same question with progress kept', async () => {
    const store = persistentStorage(baseSave());
    const first = render(<GameProvider storage={store}><MissionScreen /></GameProvider>);
    expect(screen.getByText('Warm-up')).toBeInTheDocument();
    await answerCurrent();
    await answerCurrent();
    const before = snapshot();
    expect(before.run.index).toBe(2);
    const third = before.run.queue[2]!;
    first.unmount();

    render(<GameProvider storage={store}><MissionScreen /></GameProvider>);
    expect(screen.getByText('Warm-up')).toBeInTheDocument();
    expect(heading()).toBe(`${third.a} × ${third.b}`);
    expect(snapshot().run).toEqual(before.run);
  });

  it('changing difficulty discards the saved quest', async () => {
    const store = persistentStorage(baseSave('normal'));
    const first = render(<GameProvider storage={store}><MissionScreen /></GameProvider>);
    await answerCurrent();
    expect(snapshot().run.index).toBe(1);
    first.unmount();

    const saved: SaveData = JSON.parse(store.getItem(SAVE_KEY)!);
    const easier = persistentStorage({ ...saved, settings: { ...saved.settings, difficulty: 'easy' } });
    render(<GameProvider storage={easier}><MissionScreen /></GameProvider>);
    expect(snapshot().run.index).toBe(0);
    expect(snapshot().context.difficulty).toBe('easy');
  });
});
