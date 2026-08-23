import { describe, expect, it } from 'vitest';
import { isNewBest, resultGrade, resultTimingTendency } from '../src/game/resultPresentation';

describe('result presentation', () => {
  it('assigns stable accuracy grades at the documented boundaries', () => {
    expect([.95, .88, .75, .6, .59].map(resultGrade)).toEqual(['S', 'A', 'B', 'C', 'D']);
  });

  it('uses a small balanced timing dead zone', () => {
    expect(resultTimingTendency(-4.01)).toBe('fast');
    expect(resultTimingTendency(4)).toBe('balanced');
    expect(resultTimingTendency(4.01)).toBe('slow');
  });

  it('marks only a genuinely improved local result as new best', () => {
    const prior = { score: 900, accuracy: .9, total: 4 };
    expect(isNewBest(null, prior)).toBe(true);
    expect(isNewBest(prior, { score: 899, accuracy: 1, total: 4 })).toBe(false);
    expect(isNewBest(prior, { score: 900, accuracy: .91, total: 4 })).toBe(true);
  });
});
