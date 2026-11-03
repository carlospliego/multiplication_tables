import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useQuestionTimer } from './useQuestionTimer';

afterEach(() => vi.restoreAllMocks());

function setHidden(h: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('useQuestionTimer', () => {
  it('measures elapsed ms', () => {
    const now = vi.spyOn(performance, 'now');
    const { result } = renderHook(() => useQuestionTimer());
    now.mockReturnValue(1000);
    result.current.start();
    now.mockReturnValue(3500);
    expect(result.current.stop()).toEqual({ responseMs: 2500, interrupted: false });
  });
  it('flags interruption when hidden', () => {
    const now = vi.spyOn(performance, 'now');
    const { result } = renderHook(() => useQuestionTimer());
    now.mockReturnValue(0);
    result.current.start();
    setHidden(true);
    setHidden(false);
    now.mockReturnValue(100);
    expect(result.current.stop().interrupted).toBe(true);
  });
  it('stop without start is finite and interrupted', () => {
    const { result } = renderHook(() => useQuestionTimer());
    expect(result.current.stop()).toEqual({ responseMs: 0, interrupted: true });
  });
  it('second start does not reset the start time', () => {
    const now = vi.spyOn(performance, 'now');
    const { result } = renderHook(() => useQuestionTimer());
    now.mockReturnValue(1000);
    result.current.start();
    now.mockReturnValue(2000);
    result.current.start();
    now.mockReturnValue(3000);
    expect(result.current.stop().responseMs).toBe(2000);
  });
  it('never returns negative', () => {
    const now = vi.spyOn(performance, 'now');
    const { result } = renderHook(() => useQuestionTimer());
    now.mockReturnValue(5000);
    result.current.start();
    now.mockReturnValue(4000);
    expect(result.current.stop().responseMs).toBe(0);
  });
});
