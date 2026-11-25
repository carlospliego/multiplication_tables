import type { FactId } from '../engine/types';

// 45 points tracing a rocket in a 0-100 box, most important first: outline, base, fins and flame
// tips, then window, inner body, rest of the flame and sparkles. With tables skipped there are
// fewer facts than points; the first N still draw a whole rocket.
const POINTS: readonly (readonly [number, number])[] = [
  // nose and body outline
  [50, 5],
  [41, 14], [59, 14],
  [36, 23], [64, 23],
  [33, 32], [67, 32],
  [32, 41], [68, 41],
  [32, 50], [68, 50],
  [32, 59], [68, 59],
  [32, 68], [68, 68],
  [32, 77], [68, 77],
  // base
  [38, 85], [50, 85], [62, 85],
  // fins
  [23, 66], [14, 78], [23, 90],
  [77, 66], [86, 78], [77, 90],
  // flame tips
  [44, 92], [56, 92],
  // window ring
  [50, 36], [42, 45], [58, 45], [50, 54],
  // inner body
  [42, 63], [58, 63], [50, 72],
  [50, 15], [50, 25],
  // rest of the flame
  [50, 97], [34, 95], [66, 95],
  // sparkles
  [10, 12], [90, 12], [12, 34], [88, 34], [8, 54], [92, 54], [30, 9],
];

/** Positions for the stars of the given facts (at most 45), in order. */
export function starPositions(ids: readonly FactId[]): Record<FactId, { x: number; y: number }> {
  return Object.fromEntries(
    ids.map((id, i) => {
      const [x, y] = POINTS[i]!;
      return [id, { x, y }];
    }),
  );
}
