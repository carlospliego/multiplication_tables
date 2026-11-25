import type { Difficulty } from './engine/difficulty';

/**
 * Difficulty levels the game offers. Every save plays on one of these: a stored choice that is
 * not listed falls back (to Normal if listed, otherwise the hardest listed level). The picker
 * on the Galaxy Map shows only these, and is hidden when there is just one.
 *
 * Currently Hard only: everyone plays 20-question quests with a 3-second fast threshold.
 * Add 'easy' and 'normal' back to let the child choose again.
 */
export const ENABLED_DIFFICULTIES: readonly Difficulty[] = ['hard'];
