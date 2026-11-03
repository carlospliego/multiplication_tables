import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { play, setMuted, unlockAudio, resetSfxForTests, type Sfx } from './sfx';

const ALL: Sfx[] = ['correct', 'lightning', 'wrong', 'laser', 'explosion', 'launch', 'celebrate'];

function installMock() {
  const oscs: { stop: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn> }[] = [];
  class Ctx {
    currentTime = 0;
    state = 'running';
    destination = {};
    resume = vi.fn();
    createOscillator() {
      const o = {
        type: 'sine', frequency: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
        connect: vi.fn(), start: vi.fn(), stop: vi.fn(),
      };
      oscs.push(o);
      return o;
    }
    createGain() {
      return { gain: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }, connect: vi.fn() };
    }
    createBuffer() { return {}; }
    createBufferSource() { return { buffer: null, connect: vi.fn(), start: vi.fn(), stop: vi.fn() }; }
  }
  (window as unknown as { AudioContext: unknown }).AudioContext = Ctx;
  return oscs;
}

beforeEach(() => resetSfxForTests());
afterEach(() => {
  delete (window as unknown as { AudioContext?: unknown }).AudioContext;
  delete (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext;
});

describe('sfx', () => {
  it('never throws when AudioContext is undefined', () => {
    expect(() => { unlockAudio(); for (const s of ALL) play(s); setMuted(true); }).not.toThrow();
  });

  it('never throws when AudioContext constructor throws', () => {
    (window as unknown as { AudioContext: unknown }).AudioContext = function () { throw new Error('nope'); };
    expect(() => { unlockAudio(); play('correct'); }).not.toThrow();
  });

  it('does nothing before unlock', () => {
    const oscs = installMock();
    play('correct');
    expect(oscs).toHaveLength(0);
  });

  it('creates oscillators for each effect once unlocked', () => {
    const oscs = installMock();
    unlockAudio();
    for (const s of ALL) {
      const before = oscs.length;
      play(s);
      expect(oscs.length).toBeGreaterThan(before);
    }
  });

  it('muted creates no oscillator, unmuted resumes', () => {
    const oscs = installMock();
    unlockAudio();
    setMuted(true);
    play('correct');
    expect(oscs).toHaveLength(0);
    setMuted(false);
    play('correct');
    expect(oscs.length).toBeGreaterThan(0);
  });

  it('falls back to webkitAudioContext', () => {
    installMock();
    const C = (window as unknown as { AudioContext: unknown }).AudioContext;
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
    (window as unknown as { webkitAudioContext: unknown }).webkitAudioContext = C;
    unlockAudio();
    expect(() => play('wrong')).not.toThrow();
  });
});
