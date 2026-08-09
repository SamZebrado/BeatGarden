import type {
  AutoChartAnalysis,
  AutoChartDifficulty,
  AutoChartNote,
  GeneratedAutoChart,
  OnsetCandidate,
} from './types';

interface DifficultyProfile {
  targetNotesPerMinute: number;
  minimumGapSec: number;
  swipeChance: number;
  holdChance: number;
  allowSyncopation: boolean;
}

const PROFILES: Record<AutoChartDifficulty, DifficultyProfile> = {
  easy: { targetNotesPerMinute: 52, minimumGapSec: 0.28, swipeChance: 0, holdChance: 0.04, allowSyncopation: false },
  normal: { targetNotesPerMinute: 82, minimumGapSec: 0.17, swipeChance: 0.18, holdChance: 0.08, allowSyncopation: true },
  hard: { targetNotesPerMinute: 120, minimumGapSec: 0.105, swipeChance: 0.35, holdChance: 0.12, allowSyncopation: true },
};

function seededRandom(seed: number): () => number {
  let state = seed >>> 0 || 0x9e3779b9;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4_294_967_296;
  };
}

function nearestBeat(onset: OnsetCandidate, beatTimes: readonly number[]): { index: number; distance: number } | null {
  if (beatTimes.length === 0) return null;
  let bestIndex = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < beatTimes.length; i++) {
    const distance = Math.abs(onset.timeSec - beatTimes[i]);
    if (distance < bestDistance) {
      bestIndex = i;
      bestDistance = distance;
    }
  }
  return { index: bestIndex, distance: bestDistance };
}

export function generateAutoChart(
  analysis: AutoChartAnalysis,
  difficulty: AutoChartDifficulty,
  seed: number,
): GeneratedAutoChart {
  const profile = PROFILES[difficulty];
  const random = seededRandom(seed);
  const targetCount = Math.max(1, Math.round(analysis.durationSec / 60 * profile.targetNotesPerMinute));
  const candidates = analysis.onsets.map((onset) => {
    const nearest = nearestBeat(onset, analysis.tempo.beatTimesSec);
    const period = analysis.tempo.bpm ? 60 / analysis.tempo.bpm : 0.5;
    const beatAlignment = nearest ? Math.max(0, 1 - nearest.distance / Math.max(0.08, period / 2)) : 0.5;
    const bandTotal = onset.lowStrength + onset.midStrength + onset.highStrength + 1e-9;
    const dominant = Math.max(onset.lowStrength, onset.midStrength, onset.highStrength) / bandTotal;
    const score = onset.normalizedStrength * (0.72 + 0.28 * beatAlignment) * (0.8 + 0.2 * dominant);
    return { onset, nearest, score, beatAlignment };
  }).filter((candidate) => profile.allowSyncopation || candidate.beatAlignment >= 0.72);

  candidates.sort((a, b) => b.score - a.score || a.onset.timeSec - b.onset.timeSec);
  const selected: typeof candidates = [];
  for (const candidate of candidates) {
    if (selected.length >= targetCount) break;
    if (selected.some((other) => Math.abs(other.onset.timeSec - candidate.onset.timeSec) < profile.minimumGapSec)) continue;
    selected.push(candidate);
  }
  selected.sort((a, b) => a.onset.timeSec - b.onset.timeSec);

  const notes: AutoChartNote[] = selected.map((candidate, index) => {
    const roll = random();
    let type: AutoChartNote['type'] = 'tap';
    if (candidate.onset.band === 'high' && roll < profile.swipeChance) type = 'swipe';
    else if (candidate.onset.band === 'mid' && roll > 1 - profile.holdChance) type = 'hold';
    const note: AutoChartNote = {
      id: `auto-${index}-${Math.round(candidate.onset.timeSec * 1000)}`,
      songTimeSec: candidate.onset.timeSec,
      beatIndex: candidate.nearest?.index ?? null,
      type,
      band: candidate.onset.band,
      score: Number(candidate.score.toFixed(6)),
    };
    if (type === 'hold') note.durationSec = 0.55 + random() * 0.7;
    return note;
  });

  return {
    timingMode: analysis.tempo.mode,
    bpm: analysis.tempo.bpm,
    confidence: analysis.tempo.confidence,
    difficulty,
    seed,
    notes,
  };
}

