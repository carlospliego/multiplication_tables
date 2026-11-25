/**
 * Times tables left out of the game.
 *
 * A fact is skipped when either factor is skipped (with 1 and 2 skipped, 2×7 and 1×5 are gone,
 * 3×7 stays). Skipped facts are never asked, counted, drawn or unlocked; planets left with no
 * facts disappear from the map.
 *
 * DEFAULT_SKIP_TABLES is the repo default, used by every save that has no list of its own. The
 * child can change the list on the Tables screen; that choice is stored in the save
 * (settings.skipTables) and wins from then on. Saves always keep every fact, so bringing a
 * table back restores its old progress.
 */
export const DEFAULT_SKIP_TABLES: readonly number[] = [1, 2];

/** The Tables screen never lets the child skip below this many tables in play. */
export const MIN_TABLES_IN_PLAY = 3;

export const TABLES: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** A sorted list of distinct tables 1-9 that leaves at least MIN_TABLES_IN_PLAY in play. */
export function isSkipList(x: unknown): x is number[] {
  if (!Array.isArray(x)) return false;
  if (!x.every((n) => typeof n === 'number' && TABLES.includes(n))) return false;
  if (new Set(x).size !== x.length) return false;
  return TABLES.length - x.length >= MIN_TABLES_IN_PLAY;
}

/** The skip list a save plays with: its own if it has one, else the repo default. */
export function skipTablesOf(settings: { skipTables?: readonly number[] }): readonly number[] {
  return settings.skipTables ?? DEFAULT_SKIP_TABLES;
}

/** Skip or bring back one table. Returns the list unchanged if that would leave too few in play. */
export function toggleSkip(skip: readonly number[], table: number): readonly number[] {
  if (!TABLES.includes(table)) return skip;
  const next = skip.includes(table) ? skip.filter((n) => n !== table) : [...skip, table].sort((a, b) => a - b);
  return isSkipList(next) ? next : skip;
}
