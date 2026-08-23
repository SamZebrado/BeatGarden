import type { BestScore } from '../settings/scores';

export type ResultGrade = 'S' | 'A' | 'B' | 'C' | 'D';
export type ResultTimingTendency = 'fast' | 'balanced' | 'slow';

export function resultGrade(accuracy: number): ResultGrade {
  if (accuracy >= .95) return 'S';
  if (accuracy >= .88) return 'A';
  if (accuracy >= .75) return 'B';
  if (accuracy >= .6) return 'C';
  return 'D';
}

export function resultTimingTendency(meanSignedErrorMs: number): ResultTimingTendency {
  if (meanSignedErrorMs < -4) return 'fast';
  if (meanSignedErrorMs > 4) return 'slow';
  return 'balanced';
}

export function isNewBest(previous: BestScore | null, next: BestScore): boolean {
  return !previous || next.score > previous.score
    || (next.score === previous.score && next.accuracy > previous.accuracy);
}
