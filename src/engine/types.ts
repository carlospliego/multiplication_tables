export type Day = string; // 'YYYY-MM-DD' local
export type FactId = string; // 'axb', a <= b
export type PlanetId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type Level = 0 | 1 | 2 | 3 | 4 | 5;

export interface FactRecord {
  level: Level;
  dueDay: Day | null;
  lastPromotedDay: Day | null;
  fastDays: Day[];
  everMastered: boolean;
  attempts: number;
  correct: number;
  totalCorrectMs: number;
  lastSeenDay: Day | null;
}

export type Facts = Record<FactId, FactRecord>;

export interface Question {
  factId: FactId;
  a: number;
  b: number;
  answer: number;
  kind: 'normal' | 'discovery';
}

export interface AnswerInput {
  correct: boolean;
  responseMs: number;
  interrupted: boolean;
}

export type Rng = () => number; // [0, 1)
