// Synthesized sound effects (Web Audio). Every export is safe to call anywhere: it never throws.
export type Sfx = 'correct' | 'lightning' | 'wrong' | 'laser' | 'explosion' | 'launch' | 'celebrate';

type Ctx = AudioContext;
let ctx: Ctx | null = null;
let muted = false;

const PEAK = 0.12; // modest gain so it is never harsh on headphones

export function unlockAudio(): void {
  try {
    if (!ctx) {
      const w = window as unknown as { AudioContext?: new () => Ctx; webkitAudioContext?: new () => Ctx };
      const C = w.AudioContext ?? w.webkitAudioContext;
      if (!C) return;
      ctx = new C();
    }
    if (ctx.state === 'suspended') void Promise.resolve(ctx.resume()).catch(() => undefined);
  } catch {
    ctx = null;
  }
}

export function setMuted(m: boolean): void {
  muted = m;
}

/** Test-only: forget the AudioContext and unmute. */
export function resetSfxForTests(): void {
  ctx = null;
  muted = false;
}

interface Tone {
  type: OscillatorType;
  from: number;
  to?: number;
  at: number; // start offset, seconds
  dur: number; // seconds
  vol?: number;
}

function tone(c: Ctx, t: Tone): void {
  const start = c.currentTime + t.at;
  const dur = Math.min(t.dur, 0.5);
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = t.type;
  osc.frequency.setValueAtTime(t.from, start);
  if (t.to) osc.frequency.exponentialRampToValueAtTime(t.to, start + dur);
  const peak = PEAK * (t.vol ?? 1);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(peak, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

const RECIPES: Record<Sfx, Tone[]> = {
  correct: [
    { type: 'sine', from: 660, at: 0, dur: 0.12 },
    { type: 'sine', from: 880, at: 0.1, dur: 0.2 },
  ],
  lightning: [
    { type: 'square', from: 400, to: 1600, at: 0, dur: 0.12, vol: 0.5 },
    { type: 'sine', from: 1200, at: 0.1, dur: 0.1 },
    { type: 'sine', from: 1800, at: 0.18, dur: 0.2 },
  ],
  wrong: [{ type: 'sawtooth', from: 220, to: 110, at: 0, dur: 0.3, vol: 0.5 }],
  laser: [{ type: 'sawtooth', from: 1400, to: 200, at: 0, dur: 0.25, vol: 0.5 }],
  explosion: [
    { type: 'sawtooth', from: 160, to: 40, at: 0, dur: 0.5, vol: 0.9 },
    { type: 'square', from: 90, to: 30, at: 0.02, dur: 0.45, vol: 0.5 },
  ],
  launch: [
    { type: 'sawtooth', from: 80, to: 700, at: 0, dur: 0.5, vol: 0.5 },
    { type: 'triangle', from: 160, to: 1400, at: 0, dur: 0.5, vol: 0.4 },
  ],
  celebrate: [
    { type: 'triangle', from: 523, at: 0, dur: 0.15 },
    { type: 'triangle', from: 659, at: 0.12, dur: 0.15 },
    { type: 'triangle', from: 784, at: 0.24, dur: 0.15 },
    { type: 'triangle', from: 1047, at: 0.36, dur: 0.2 },
  ],
};

export function play(sfx: Sfx): void {
  try {
    if (muted || !ctx) return;
    if (ctx.state === 'suspended') void Promise.resolve(ctx.resume()).catch(() => undefined);
    for (const t of RECIPES[sfx]) tone(ctx, t);
  } catch {
    // audio must never break the game
  }
}
