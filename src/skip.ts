/**
 * Times tables left out of the whole game.
 *
 * A fact is skipped when either factor is listed here (with 1 and 2 skipped, 2×7 and 1×5 are
 * gone, 3×7 stays). Skipped facts are never asked, counted, drawn or unlocked; planets left with
 * no facts disappear from the map. Saves still store every fact, so removing a number here
 * brings that table back with its old progress.
 */
export const SKIP_TABLES: readonly number[] = [1, 2];
