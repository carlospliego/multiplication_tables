import { createContext, useContext, useEffect, useReducer, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { getStorage, loadSave, SAVE_KEY, writeSave } from '../storage/save';
import { getSessionStorage, loadSessionScreen, writeSessionScreen } from '../storage/session';
import { gameReducer, initialGameState } from './gameReducer';
import type { GameAction, GameState } from './gameReducer';

interface GameContextValue {
  state: GameState;
  dispatch: (a: GameAction) => void;
  /** Per-tab sessionStorage for resuming the current screen and quest after a reload. */
  session: Storage | null;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({
  children,
  storage,
  session,
}: {
  children: ReactNode;
  storage?: Storage | null;
  session?: Storage | null;
}) {
  const [store] = useState<Storage | null>(() => (storage !== undefined ? storage : getStorage()));
  const [sessionStore] = useState<Storage | null>(() => (session !== undefined ? session : getSessionStorage()));
  const [state, dispatch] = useReducer(gameReducer, undefined, () =>
    initialGameState(loadSave(store, Date.now()), loadSessionScreen(sessionStore)),
  );
  const lastSave = useRef(state.save);

  useEffect(() => {
    if (state.save === lastSave.current) return;
    lastSave.current = state.save;
    if (state.save === null) {
      try {
        store?.removeItem(SAVE_KEY);
      } catch {
        // best effort
      }
    } else if (!writeSave(store, state.save)) {
      dispatch({ type: 'storageFailed' });
    }
  }, [state.save, store]);

  useEffect(() => {
    writeSessionScreen(sessionStore, state.screen);
  }, [state.screen, sessionStore]);

  useEffect(() => {
    try {
      void navigator.storage?.persist?.();
    } catch {
      // best effort
    }
  }, []);

  return <GameContext.Provider value={{ state, dispatch, session: sessionStore }}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}
