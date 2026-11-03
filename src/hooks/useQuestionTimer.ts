import { useCallback, useEffect, useRef } from 'react';

export interface TimerResult {
  responseMs: number;
  interrupted: boolean;
}

/** Invisible timer: measures time from start() to stop(); never rendered. */
export function useQuestionTimer(): { start(at?: number): void; stop(): TimerResult } {
  const startedAt = useRef<number | null>(null);
  const interrupted = useRef(false);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) interrupted.current = true;
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const start = useCallback((at?: number) => {
    if (startedAt.current !== null) return;
    startedAt.current = at ?? performance.now();
    if (document.hidden === true) interrupted.current = true;
  }, []);

  const stop = useCallback((): TimerResult => {
    if (startedAt.current === null) return { responseMs: 0, interrupted: true };
    const raw = performance.now() - startedAt.current;
    const responseMs = Number.isFinite(raw) && raw > 0 ? raw : 0;
    const result = { responseMs, interrupted: interrupted.current || !Number.isFinite(raw) };
    startedAt.current = null;
    interrupted.current = false;
    return result;
  }, []);

  return { start, stop };
}
