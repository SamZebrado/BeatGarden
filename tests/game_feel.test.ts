import { describe, expect, it } from 'vitest';
import { FEEDBACK_DURATION_SEC, feedbackScale, GameFeel, rhythmSection } from '../src/game/GameFeel';

describe('display-only game feel', () => {
  it('derives combo, best combo and groove from Judge results only', () => {
    const feel = new GameFeel();
    const first = feel.consume({ kind: 'PERFECT', deltaMs: -12 }, 1);
    expect(first).toMatchObject({ combo: 1, bestCombo: 1, timing: 'FAST' });
    expect(first.groove).toBeCloseTo(28);
    expect(feel.consume({ kind: 'GREAT', deltaMs: 18 }, 2)).toMatchObject({ combo: 2, bestCombo: 2, timing: 'SLOW' });
    const miss = feel.consume({ kind: 'MISS', deltaMs: 170, automatic: true }, 3);
    expect(miss.combo).toBe(0);
    expect(miss.bestCombo).toBe(2);
    expect(miss.groove).toBeGreaterThanOrEqual(0);
    expect(miss.timing).toBeNull();
    expect(miss.deltaMs).toBeNull();
  });

  it('does not label sub-4ms noise FAST or SLOW and resets cleanly', () => {
    const feel = new GameFeel();
    expect(feel.consume({ kind: 'PERFECT', deltaMs: 3.9 }, 1).timing).toBeNull();
    feel.reset();
    expect(feel.snapshot()).toMatchObject({ combo: 0, bestCombo: 0, groove: 0, peakGroove: 0, judgement: null });
  });

  it('derives five display-only sections from transport progress', () => {
    expect([0, 12, 42, 68, 90].map((beat) => rhythmSection(beat, 100))).toEqual([
      'INTRO', 'MAIN_A', 'VARIATION_B', 'CLIMAX', 'OUTRO',
    ]);
  });

  it('keeps judgement information static under reduced motion and bounded to 520ms', () => {
    expect(FEEDBACK_DURATION_SEC).toBe(.52);
    expect(feedbackScale(.05, true)).toBe(1);
    expect(feedbackScale(.05, false)).toBeGreaterThan(1);
  });
});
