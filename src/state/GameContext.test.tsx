import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createFreshSave, SAVE_KEY } from '../storage/save';
import { GameProvider, useGame } from './GameContext';
import type { GameAction } from './gameReducer';

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const writes: string[] = [];
  const s = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (k === SAVE_KEY) writes.push(v);
      data.set(k, v);
    },
    removeItem: (k: string) => void data.delete(k),
  } as unknown as Storage;
  return { s, data, writes };
}

describe('GameProvider', () => {
  it('writes on change but not on initial load', () => {
    const save = { ...createFreshSave('Ada', '2026-11-02T10:00:00.000Z'), placementDone: true };
    const { s, writes } = fakeStorage({ [SAVE_KEY]: JSON.stringify(save) });
    let dispatch!: (a: GameAction) => void;
    function Probe() {
      dispatch = useGame().dispatch;
      return null;
    }
    render(<GameProvider storage={s}><Probe /></GameProvider>);
    expect(writes).toHaveLength(0);
    act(() => dispatch({ type: 'toggleSound' }));
    expect(writes).toHaveLength(1);
    expect(JSON.parse(writes[0]!).settings.soundOn).toBe(false);
  });

  it('resetProgress removes the saved key', () => {
    const save = createFreshSave('Ada', '2026-11-02T10:00:00.000Z');
    const { s, data } = fakeStorage({ [SAVE_KEY]: JSON.stringify(save) });
    let dispatch!: (a: GameAction) => void;
    function Probe() {
      dispatch = useGame().dispatch;
      return null;
    }
    render(<GameProvider storage={s}><Probe /></GameProvider>);
    act(() => dispatch({ type: 'resetProgress' }));
    expect(data.has(SAVE_KEY)).toBe(false);
  });
});
