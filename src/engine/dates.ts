import type { Day } from './types';

const pad = (n: number, w = 2): string => String(n).padStart(w, '0');

function parse(day: Day): Date {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d, 12);
}

function format(date: Date): Day {
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayLocal(now: Date = new Date()): Day {
  return format(now);
}

export function addDays(day: Day, n: number): Day {
  const date = parse(day);
  date.setDate(date.getDate() + n);
  return format(date);
}

export function compareDays(a: Day, b: Day): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function daysBetween(from: Day, to: Day): number {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / 86_400_000);
}
