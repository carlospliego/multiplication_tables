import { vi } from 'vitest';

/**
 * Module factory for vi.mock('<path>/skip', ...): the real skip module, but saves without their
 * own list skip nothing, so tests written for the full 45-fact game keep covering it.
 */
export async function skipNothing() {
  const real = await vi.importActual<typeof import('../skip')>('../skip');
  return {
    ...real,
    DEFAULT_SKIP_TABLES: [] as readonly number[],
    skipTablesOf: (s: { skipTables?: readonly number[] }) => s.skipTables ?? [],
  };
}
