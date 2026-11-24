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

/** Saves written before difficulty existed have no setting: they play on Normal. */
export function difficultyOf(settings: { difficulty?: Difficulty }): Difficulty {
  return settings.difficulty ?? DEFAULT_DIFFICULTY;
}
