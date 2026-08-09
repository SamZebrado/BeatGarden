import { AUTOCHART_CONFIG, type AutoChartConfig } from './config';
import { fftMagnitude } from './fft';
import { mad, median, robustZ } from './statistics';
import type { AutoChartAnalysis, FeatureFrame, FrequencyBand, OnsetCandidate, TempoEstimate } from './types';

export type AnalysisProgress = (progress: number) => void;

function hann(index: number, size: number): number {
  return 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / (size - 1));
}

function bandRange(freq: number): FrequencyBand | 'low-mid' | null {
  if (freq >= 35 && freq < 180) return 'low';
  if (freq < 500) return 'low-mid';
  if (freq < 3_000) return 'mid';
  if (freq <= 11_000) return 'high';
  return null;
}

export function analyzeMonoPcm(
  samples: Float32Array,
  sampleRate: number,
  config: Readonly<AutoChartConfig> = AUTOCHART_CONFIG,
  onProgress?: AnalysisProgress,
): AutoChartAnalysis {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) throw new Error('Invalid sample rate');
  const { frameSize, hopSize } = config;
  if (samples.length < frameSize) {
    return {
      durationSec: samples.length / sampleRate,
      sampleRate,
      frames: [],
      onsets: [],
      tempo: emptyTempo(),
      peakRms: 0,
    };
  }

  const frameCount = 1 + Math.floor((samples.length - frameSize) / hopSize);
  const frames: FeatureFrame[] = [];
  const frame = new Float32Array(frameSize);
  let previousMagnitude: Float32Array | null = null;
  let peakRms = 0;

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
    const start = frameIndex * hopSize;
    let sumSquares = 0;
    for (let i = 0; i < frameSize; i++) {
      const value = samples[start + i];
      sumSquares += value * value;
      frame[i] = value * hann(i, frameSize);
    }
    const rms = Math.sqrt(sumSquares / frameSize);
    peakRms = Math.max(peakRms, rms);
    const magnitude = fftMagnitude(frame);
    let spectralTotal = 0;
    let weightedFrequency = 0;
    let lowEnergy = 0;
    let lowMidEnergy = 0;
    let midEnergy = 0;
    let highEnergy = 0;
    let globalFlux = 0;
    let lowFlux = 0;
    let midFlux = 0;
    let highFlux = 0;

    for (let bin = 1; bin < magnitude.length; bin++) {
      const frequency = bin * sampleRate / frameSize;
      const value = magnitude[bin];
      const power = value * value;
      spectralTotal += value;
      weightedFrequency += value * frequency;
      const band = bandRange(frequency);
      if (band === 'low') lowEnergy += power;
      else if (band === 'low-mid') lowMidEnergy += power;
      else if (band === 'mid') midEnergy += power;
      else if (band === 'high') highEnergy += power;
      if (previousMagnitude) {
        const positive = Math.max(0, value - previousMagnitude[bin]);
        globalFlux += positive;
        if (band === 'low') lowFlux += positive;
        else if (band === 'mid' || band === 'low-mid') midFlux += positive;
        else if (band === 'high') highFlux += positive;
      }
    }

    let cumulative = 0;
    let rolloff = 0;
    const rolloffTarget = spectralTotal * 0.85;
    for (let bin = 1; bin < magnitude.length; bin++) {
      cumulative += magnitude[bin];
      if (cumulative >= rolloffTarget) {
        rolloff = bin * sampleRate / frameSize;
        break;
      }
    }

    frames.push({
      timeSec: (start + frameSize / 2) / sampleRate,
      rms,
      spectralCentroidHz: spectralTotal > 0 ? weightedFrequency / spectralTotal : 0,
      spectralRolloffHz: rolloff,
      lowEnergy,
      lowMidEnergy,
      midEnergy,
      highEnergy,
      globalFlux,
      lowFlux,
      midFlux,
      highFlux,
      localDynamicRange: 0,
    });
    previousMagnitude = magnitude;
    if (frameIndex % 32 === 0) onProgress?.(frameIndex / frameCount * 0.75);
  }

  addLocalDynamicRange(frames, config.onsetWindowFrames);
  const onsets = detectOnsets(frames, config);
  onProgress?.(0.9);
  const tempo = estimateTempo(frames, onsets, config);
  onProgress?.(1);
  return { durationSec: samples.length / sampleRate, sampleRate, frames, onsets, tempo, peakRms };
}

function addLocalDynamicRange(frames: FeatureFrame[], windowSize: number): void {
  const half = Math.floor(windowSize / 2);
  for (let i = 0; i < frames.length; i++) {
    const local = frames.slice(Math.max(0, i - half), Math.min(frames.length, i + half + 1)).map((f) => f.rms);
    frames[i].localDynamicRange = Math.max(0, frames[i].rms - median(local));
  }
}

function detectOnsets(frames: readonly FeatureFrame[], config: Readonly<AutoChartConfig>): OnsetCandidate[] {
  const flux = frames.map((frame) => frame.globalFlux);
  const onsets: OnsetCandidate[] = [];
  const half = Math.floor(config.onsetWindowFrames / 2);
  let lastTime = -Infinity;
  for (let i = 1; i < frames.length - 1; i++) {
    const local = flux.slice(Math.max(0, i - half), Math.min(flux.length, i + half + 1));
    const center = median(local);
    const scale = Math.max(mad(local, center) * 1.4826, center * 0.15, 1e-8);
    const normalized = (flux[i] - center) / scale;
    if (normalized < config.onsetThresholdMad) continue;
    if (flux[i] < flux[i - 1] || flux[i] <= flux[i + 1]) continue;
    const timeSec = frames[i].timeSec;
    if (timeSec - lastTime < config.onsetMinimumGapSec) continue;
    const bandValues = [frames[i].lowFlux, frames[i].midFlux, frames[i].highFlux] as const;
    const largest = Math.max(...bandValues);
    const band: FrequencyBand = largest === bandValues[0] ? 'low' : largest === bandValues[2] ? 'high' : 'mid';
    onsets.push({
      timeSec,
      strength: flux[i],
      normalizedStrength: normalized,
      band,
      lowStrength: frames[i].lowFlux,
      midStrength: frames[i].midFlux,
      highStrength: frames[i].highFlux,
    });
    lastTime = timeSec;
  }
  return onsets;
}

function estimateTempo(
  frames: readonly FeatureFrame[],
  onsets: readonly OnsetCandidate[],
  config: Readonly<AutoChartConfig>,
): TempoEstimate {
  if (frames.length < 8 || onsets.length < 3) return emptyTempo();
  const hopSec = frames.length > 1 ? frames[1].timeSec - frames[0].timeSec : config.hopSize / config.analysisSampleRate;
  const envelope = new Array<number>(frames.length);
  for (let i = 0; i < frames.length; i++) {
    const localFlux = frames
      .slice(Math.max(0, i - 15), Math.min(frames.length, i + 16))
      .map((frame) => frame.globalFlux);
    envelope[i] = Math.max(0, robustZ(frames[i].globalFlux, localFlux));
  }
  let bestBpm = 0;
  let bestScore = -Infinity;
  let secondScore = -Infinity;
  for (let bpm = config.minBpm; bpm <= config.maxBpm; bpm += 0.5) {
    const lag = Math.max(1, Math.round((60 / bpm) / hopSec));
    let score = 0;
    let energy = 0;
    for (let i = lag; i < envelope.length; i++) {
      score += envelope[i] * envelope[i - lag];
      energy += envelope[i] * envelope[i];
    }
    const normalized = energy > 0 ? score / energy : 0;
    if (normalized > bestScore) {
      secondScore = bestScore;
      bestScore = normalized;
      bestBpm = bpm;
    } else if (normalized > secondScore) {
      secondScore = normalized;
    }
  }
  const confidence = Math.max(0, Math.min(1, bestScore * 0.7 + Math.max(0, bestScore - secondScore) * 2));
  if (!bestBpm || confidence < 0.18) return emptyTempo();
  const period = 60 / bestBpm;
  let bestPhase = onsets[0].timeSec % period;
  let bestPhaseError = Infinity;
  for (const onset of onsets.slice(0, Math.min(12, onsets.length))) {
    const phase = onset.timeSec % period;
    let error = 0;
    for (const candidate of onsets) {
      const grid = Math.round((candidate.timeSec - phase) / period) * period + phase;
      error += Math.min(period / 2, Math.abs(candidate.timeSec - grid)) / Math.max(0.1, candidate.normalizedStrength);
    }
    if (error < bestPhaseError) {
      bestPhaseError = error;
      bestPhase = phase;
    }
  }
  const beatTimesSec: number[] = [];
  const duration = frames[frames.length - 1].timeSec;
  for (let time = bestPhase; time <= duration + period; time += period) {
    if (time >= 0) beatTimesSec.push(time);
  }
  return { bpm: bestBpm, confidence, phaseSec: bestPhase, beatTimesSec, mode: confidence >= 0.38 ? 'beat-grid' : 'onset-timed' };
}

function emptyTempo(): TempoEstimate {
  return { bpm: null, confidence: 0, phaseSec: null, beatTimesSec: [], mode: 'onset-timed' };
}
