import { describe, expect, it } from 'vitest';
import { analyzeMonoPcm } from '../src/autochart/analyzer';
import { generateAutoChart } from '../src/autochart/generateChart';

const SAMPLE_RATE = 22_050;

function rhythmicBursts(
  durationSec: number,
  intervalSec: number,
  frequencyHz: number,
  gain = 0.8,
  offsetSec = 0,
): Float32Array {
  const samples = new Float32Array(Math.ceil(durationSec * SAMPLE_RATE));
  const burstLength = Math.floor(0.045 * SAMPLE_RATE);
  for (let time = offsetSec; time < durationSec; time += intervalSec) {
    const start = Math.floor(time * SAMPLE_RATE);
    for (let i = 0; i < burstLength && start + i < samples.length; i++) {
      const envelope = Math.exp(-i / (SAMPLE_RATE * 0.012));
      samples[start + i] += Math.sin(2 * Math.PI * frequencyHz * i / SAMPLE_RATE) * envelope * gain;
    }
  }
  return samples;
}

function mix(...tracks: Float32Array[]): Float32Array {
  const output = new Float32Array(Math.max(...tracks.map((track) => track.length)));
  for (const track of tracks) for (let i = 0; i < track.length; i++) output[i] += track[i];
  return output;
}

describe('AutoChart deterministic DSP', () => {
  it('detects a 120 BPM low-frequency fixture with useful timing tolerance', () => {
    const analysis = analyzeMonoPcm(rhythmicBursts(10, 0.5, 90), SAMPLE_RATE);
    expect(analysis.onsets.length).toBeGreaterThanOrEqual(16);
    expect(analysis.tempo.bpm).not.toBeNull();
    expect(Math.abs(analysis.tempo.bpm! - 120)).toBeLessThanOrEqual(3);
    expect(analysis.onsets.slice(1, 8).every((onset) => onset.band === 'low')).toBe(true);
    for (const onset of analysis.onsets.slice(1, 8)) {
      const nearestHalfSecond = Math.round(onset.timeSec / 0.5) * 0.5;
      expect(Math.abs(onset.timeSec - nearestHalfSecond)).toBeLessThan(0.04);
    }
  });

  it('distinguishes alternating low downbeats and high offbeats', () => {
    const low = rhythmicBursts(8, 0.5, 90, 0.8, 0);
    const high = rhythmicBursts(8, 0.5, 6_000, 0.35, 0.25);
    const analysis = analyzeMonoPcm(mix(low, high), SAMPLE_RATE);
    expect(analysis.onsets.some((onset) => onset.band === 'low')).toBe(true);
    expect(analysis.onsets.some((onset) => onset.band === 'high')).toBe(true);
  });

  it('does not spam notes for silence', () => {
    const analysis = analyzeMonoPcm(new Float32Array(SAMPLE_RATE * 6), SAMPLE_RATE);
    expect(analysis.onsets).toEqual([]);
    expect(analysis.tempo.mode).toBe('onset-timed');
    expect(generateAutoChart(analysis, 'hard', 1).notes).toEqual([]);
  });

  it('is robust to a 20x loudness reduction', () => {
    const loud = analyzeMonoPcm(rhythmicBursts(8, 0.5, 120, 0.8), SAMPLE_RATE);
    const quiet = analyzeMonoPcm(rhythmicBursts(8, 0.5, 120, 0.04), SAMPLE_RATE);
    expect(Math.abs(loud.onsets.length - quiet.onsets.length)).toBeLessThanOrEqual(1);
    expect(Math.abs((loud.tempo.bpm ?? 0) - (quiet.tempo.bpm ?? 0))).toBeLessThanOrEqual(1);
  });

  it('generates deterministic songTimeSec-authoritative charts', () => {
    const analysis = analyzeMonoPcm(mix(
      rhythmicBursts(12, 0.5, 90, 0.7),
      rhythmicBursts(12, 0.25, 5_000, 0.25, 0.25),
    ), SAMPLE_RATE);
    const a = generateAutoChart(analysis, 'normal', 42);
    const b = generateAutoChart(analysis, 'normal', 42);
    const c = generateAutoChart(analysis, 'normal', 43);
    expect(a).toEqual(b);
    expect(a.notes.every((note) => Number.isFinite(note.songTimeSec))).toBe(true);
    expect(a.notes.map((note) => note.songTimeSec)).toEqual(c.notes.map((note) => note.songTimeSec));
    expect(a.notes.some((note, index) => note.type !== c.notes[index]?.type)).toBe(true);
  });

  it('keeps easy density and gestures meaningfully lower than hard', () => {
    const analysis = analyzeMonoPcm(mix(
      rhythmicBursts(14, 0.25, 120, 0.6),
      rhythmicBursts(14, 0.25, 6_500, 0.25, 0.125),
    ), SAMPLE_RATE);
    const easy = generateAutoChart(analysis, 'easy', 8);
    const hard = generateAutoChart(analysis, 'hard', 8);
    expect(easy.notes.length).toBeLessThan(hard.notes.length);
    expect(easy.notes.every((note) => note.type !== 'swipe')).toBe(true);
  });

  it('analyzes a one-minute fixture with bounded frame and chart storage', () => {
    const analysis = analyzeMonoPcm(rhythmicBursts(60, 0.5, 90), SAMPLE_RATE);
    const chart = generateAutoChart(analysis, 'hard', 17);
    expect(analysis.frames.length).toBeGreaterThan(5_000);
    expect(analysis.frames.length).toBeLessThan(5_300);
    expect(analysis.onsets.length).toBeLessThan(140);
    expect(chart.notes.length).toBeLessThanOrEqual(analysis.onsets.length);
  });
});
