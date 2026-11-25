import { ENABLED_DIFFICULTIES } from '../enabledDifficulties';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface DifficultyInfo {
  label: string;
  /** Correct answers at or under this time count as fast (Lightning, and toward mastery). */
  fastMs: number;
  /** Questions per quest (Quest 1-3 and Free Flight). The warm-up and boss are unchanged. */
  questSize: number;
}

export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];

export const DIFFICULTY: Record<Difficulty, DifficultyInfo> = {
  easy: { label: 'Easy', fastMs: 6000, questSize: 10 },
  normal: { label: 'Normal', fastMs: 4000, questSize: 15 },
  hard: { label: 'Hard', fastMs: 3000, questSize: 20 },
};

export const DEFAULT_DIFFICULTY: Difficulty = 'normal';

export function isDifficulty(x: unknown): x is Difficulty {
  return typeof x === 'string' && (DIFFICULTIES as readonly string[]).includes(x);
}

/** The levels the game offers (src/enabledDifficulties.ts), in easy-to-hard order. */
export function enabledDifficulties(): Difficulty[] {
  const on = DIFFICULTIES.filter((d) => ENABLED_DIFFICULTIES.includes(d));
  return on.length > 0 ? on : [DEFAULT_DIFFICULTY];
}

/**
 * The level a save plays on: its own choice if that level is enabled; otherwise Normal if
 * enabled, else the hardest enabled level. Saves from before difficulty existed have no choice.
 */
export function difficultyOf(settings: { difficulty?: Difficulty }): Difficulty {
  const on = enabledDifficulties();
  const chosen = settings.difficulty ?? DEFAULT_DIFFICULTY;
  if (on.includes(chosen)) return chosen;
  return on.includes(DEFAULT_DIFFICULTY) ? DEFAULT_DIFFICULTY : on[on.length - 1]!;
}
