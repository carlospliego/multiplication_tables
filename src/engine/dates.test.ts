import { describe, expect, it } from 'vitest';
import { addDays, compareDays, daysBetween, todayLocal } from './dates';

describe('dates', () => {
  it('todayLocal uses local date', () => {
    expect(todayLocal(new Date(2026, 10, 2, 23, 59))).toBe('2026-11-02');
  });
  it('addDays crosses year, DST and negatives', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(addDays('2026-11-02', -2)).toBe('2026-10-31');
  });
  it('compareDays and daysBetween', () => {
    expect(compareDays('2026-11-02', '2026-11-10')).toBeLessThan(0);
    expect(compareDays('2026-11-10', '2026-11-02')).toBeGreaterThan(0);
    expect(compareDays('2026-11-02', '2026-11-02')).toBe(0);
    expect(daysBetween('2026-11-02', '2026-11-09')).toBe(7);
  });
});
