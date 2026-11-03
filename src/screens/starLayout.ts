import { ALL_FACT_IDS } from '../engine/facts';
import type { FactId } from '../engine/types';

// 45 points tracing a rocket in a 0-100 box: nose, body, window, fins, flame, plus a few sparkles.
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
  // window ring
  [50, 36], [42, 45], [58, 45], [50, 54],
  // inner body
  [42, 63], [58, 63], [50, 72],
  [50, 15], [50, 25],
  // fins
  [23, 66], [14, 78], [23, 90],
  [77, 66], [86, 78], [77, 90],
  // flame
  [44, 92], [56, 92], [50, 97], [34, 95], [66, 95],
  // sparkles
  [10, 12], [90, 12], [12, 34], [88, 34], [8, 54], [92, 54], [30, 9],
];

export const STAR_POSITIONS: Record<FactId, { x: number; y: number }> = Object.fromEntries(
  ALL_FACT_IDS.map((id, i) => {
    const [x, y] = POINTS[i]!;
    return [id, { x, y }];
  }),
);
