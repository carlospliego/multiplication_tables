import type { Day } from '../engine/types';
import { type SaveData, validateSave } from './save';

function slug(name: string): string {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'captain';
}

export function exportFilename(save: SaveData, today: Day): string {
  return `times-table-rocket-${slug(save.captainName)}-${today}.json`;
}

export function serializeSave(save: SaveData): string {
  return JSON.stringify(save, null, 2);
}

/** Returns the save if the text is JSON that passes validation, otherwise null. Never throws. */
export function parseImport(text: string): SaveData | null {
  try {
    return validateSave(JSON.parse(text));
  } catch {
    return null;
  }
}

export function downloadSave(save: SaveData, today: Day): void {
  const blob = new Blob([serializeSave(save)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = exportFilename(save, today);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
