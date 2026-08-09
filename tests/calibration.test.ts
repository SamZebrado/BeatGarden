// Calibration simulation test.
//
// User taps a metronome beat, each tap is systematically EARLY by +X ms
// (e.g. due to touch digitizer latency on Android).
// Calibration should:
//   - Accept at least 16 samples
//   - Remove outliers using robust method
//   - Use median (not mean) so a few stray taps don't skew result.

import { describe, it, expect } from 'vitest';
import { TIMING_CONFIG } from '../src/timing/config';
import { calculateCalibrationOffset } from '../src/settings/calibration';

/**
 * Simulate a calibration run. Inputs: `rawTapDeltasMs` = raw deltaMs between
 * each tap and metronome click's audio time. Returns the recommended
 * calibration offset in ms: the value to subtract from future
 * (input - target) to center at 0.
 *
 * Convention: effectiveDeltaMs = rawDeltaMs - calibrationOffsetMs.
 * To make median(effectiveDeltaMs) ≈ 0: calibrationOffsetMs = median(rawDeltaMs).
 */
const simulateCalibration = calculateCalibrationOffset;

describe('Calibration — median + outlier removal robust', () => {
  it('all taps perfectly centered: offset ≈ 0', () => {
    const samples: number[] = [];
    for (let i = 0; i < 20; i++) samples.push(0);
    const offs = simulateCalibration(samples);
    expect(offs).toBeCloseTo(0, 8);
  });

  it('systematic +40 ms offset returns offset ≈ +40 ms', () => {
    // Android digitizer reports tap 40 ms after the user's finger actually
    // touched — we want to add 40ms conceptually so effectiveDelta = 0.
    // Under our convention: effectiveDelta = raw - calib.
    // If raw = +40 ms for all taps, then median = +40, calib = +40,
    // so effectiveDelta = +40 - (+40) = 0. ✓
    const samples: number[] = [];
    for (let i = 0; i < 20; i++) samples.push(40);
    const offs = simulateCalibration(samples);
    expect(offs).toBeCloseTo(40, 8);
  });

  it('small jitter around -20 ms still gives median ≈ -20', () => {
    const samples: number[] = [];
    for (let i = 0; i < 24; i++) samples.push(-20 + (i % 5) - 2);
    const offs = simulateCalibration(samples);
    expect(offs).toBeGreaterThan(-25);
    expect(offs).toBeLessThan(-15);
  });

  it('16 good samples plus 3 extreme outliers filtered; median stays near truth', () => {
    const samples: number[] = [];
    // Truth: user is systematically late by +15 ms.
    for (let i = 0; i < 18; i++) samples.push(15 + (Math.random() - 0.5) * 10);
    // Outliers: stray +500 / +800 / -600 ms.
    samples.push(500, 800, -600);
    const offs = simulateCalibration(samples);
    expect(offs).toBeGreaterThan(8);
    expect(offs).toBeLessThan(22);
  });

  it('fewer than calibrationMinSamples returns null', () => {
    const samples: number[] = [];
    for (let i = 0; i < TIMING_CONFIG.calibrationMinSamples - 1; i++) samples.push(0);
    expect(simulateCalibration(samples)).toBeNull();
  });
});
