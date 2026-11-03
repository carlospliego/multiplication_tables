import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Day } from '../engine/types';
import { createFreshSave } from './save';
import { downloadSave, exportFilename, parseImport, serializeSave } from './backup';

const ISO = '2026-11-02T10:00:00.000Z';
const TODAY: Day = '2026-11-02';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('exportFilename', () => {
  it('slugs the captain name into the filename', () => {
    const s = createFreshSave('Leo M!', ISO);
    expect(exportFilename(s, TODAY)).toBe('times-table-rocket-leo-m-2026-11-02.json');
  });

  it('falls back to captain when the slug is empty', () => {
    const s = createFreshSave('!!!', ISO);
    expect(exportFilename(s, TODAY)).toBe('times-table-rocket-captain-2026-11-02.json');
  });

  it('collapses runs of separators and trims edges', () => {
    const s = createFreshSave('  --Ana   Sofía__Rey--  ', ISO);
    expect(exportFilename(s, TODAY)).toBe('times-table-rocket-ana-sof-a-rey-2026-11-02.json');
  });
});

describe('serializeSave / parseImport', () => {
  it('round trips a save', () => {
    const s = createFreshSave('Leo', ISO);
    expect(parseImport(serializeSave(s))).toEqual(s);
  });

  it('serializes as pretty JSON', () => {
    const s = createFreshSave('Leo', ISO);
    expect(serializeSave(s)).toBe(JSON.stringify(s, null, 2));
  });

  it('returns null for invalid JSON', () => {
    expect(parseImport('hello')).toBeNull();
  });

  it('returns null for a payload that fails validation', () => {
    expect(parseImport('{"schemaVersion":1}')).toBeNull();
  });

  it('returns null for a JSON null or array', () => {
    expect(parseImport('null')).toBeNull();
    expect(parseImport('[]')).toBeNull();
  });
});

describe('downloadSave', () => {
  it('downloads the serialized save under the export filename and revokes the URL after a delay', () => {
    vi.useFakeTimers();
    const s = createFreshSave('Leo M!', ISO);
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:fake-url');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));

    let clicked: { href: string; download: string; connected: boolean } | null = null;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked = { href: this.href, download: this.download, connected: this.isConnected };
    });

    downloadSave(s, TODAY);

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/json');
    expect(clicked).toEqual({
      href: 'blob:fake-url',
      download: 'times-table-rocket-leo-m-2026-11-02.json',
      connected: true,
    });
    expect(document.querySelectorAll('a[download]')).toHaveLength(0);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(999);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');

    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
});
