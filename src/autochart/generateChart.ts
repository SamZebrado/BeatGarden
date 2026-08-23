import type {
  AutoChartAnalysis,
  AutoChartDifficulty,
  AutoChartNote,
  GeneratedAutoChart,
  OnsetCandidate,
  AutoChartSection,
  AutoChartQuality,
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

function sectionAt(timeSec: number, durationSec: number, energy: number, medianEnergy: number): AutoChartSection {
  const progress = timeSec / Math.max(.001, durationSec);
  if (progress < .1) return 'intro';
  if (progress >= .9) return 'outro';
  if (energy < medianEnergy * .72) return 'low';
  if (progress >= .68 || energy > medianEnergy * 1.35) return 'peak';
  if (progress >= .48) return 'build';
  return 'low';
}

function frameEnergyAt(analysis: AutoChartAnalysis, timeSec: number, horizonSec = .38): number {
  const nearby = analysis.frames.filter((frame) => frame.timeSec >= timeSec && frame.timeSec <= timeSec + horizonSec);
  if (nearby.length === 0) return 0;
  return nearby.reduce((sum, frame) => sum + frame.rms, 0) / nearby.length;
}

function applyPhraseRests<T extends { onset: OnsetCandidate }>(candidates: readonly T[], difficulty: AutoChartDifficulty): T[] {
  const maxStreak = difficulty === 'easy' ? 3 : difficulty === 'normal' ? 6 : 10;
  const kept: T[] = [];
  let streak = 0;
  let restUntil = -Infinity;
  for (const candidate of candidates) {
    if (candidate.onset.timeSec < restUntil) continue;
    kept.push(candidate);
    streak++;
    if (streak >= maxStreak) {
      restUntil = candidate.onset.timeSec + .8;
      streak = 0;
    }
  }
  return kept;
}

function chartQuality(notes: readonly AutoChartNote[], durationSec: number, minimumGapSec: number): AutoChartQuality {
  let longestActionStreak = notes.length > 0 ? 1 : 0;
  let streak = longestActionStreak;
  let rests = 0;
  let changes = 0;
  let holdConflicts = 0;
  let impossibleProximity = 0;
  const sectionBalance: AutoChartQuality['sectionBalance'] = { intro: 0, low: 0, build: 0, peak: 0, outro: 0 };
  notes.forEach((note, index) => {
    sectionBalance[note.section]++;
    const next = notes[index + 1];
    if (!next) return;
    const gap = next.songTimeSec - note.songTimeSec;
    if (gap >= .8) { rests++; streak = 1; } else { streak++; longestActionStreak = Math.max(longestActionStreak, streak); }
    if (next.type !== note.type) changes++;
    if (gap < minimumGapSec - 1e-6) impossibleProximity++;
    if (note.type === 'hold' && note.songTimeSec + (note.durationSec ?? 0) + .12 > next.songTimeSec) holdConflicts++;
  });
  return {
    densityPerMinute: Number((notes.length / Math.max(1, durationSec) * 60).toFixed(2)),
    longestActionStreak,
    restRatio: Number((rests / Math.max(1, notes.length - 1)).toFixed(3)),
    gestureChangeRate: Number((changes / Math.max(1, notes.length - 1)).toFixed(3)),
    holdConflicts,
    impossibleProximity,
    sectionBalance,
  };
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

  // Phrase grammar deliberately leaves breathing space. Hard charts keep more
  // syncopation, but even they receive a predictable rest at phrase edges.
  const phraseFiltered = applyPhraseRests(selected, difficulty);
  const energies = phraseFiltered.map((candidate) => frameEnergyAt(analysis, candidate.onset.timeSec));
  const sortedEnergies = [...energies].sort((a, b) => a - b);
  const medianEnergy = sortedEnergies[Math.floor(sortedEnergies.length / 2)] ?? 0;
  const phraseDurationSec = analysis.tempo.bpm ? 4 * 60 / analysis.tempo.bpm : 4;

  const notes: AutoChartNote[] = phraseFiltered.map((candidate, index) => {
    const roll = random();
    const section = sectionAt(candidate.onset.timeSec, analysis.durationSec, energies[index] ?? 0, medianEnergy);
    const phraseIndex = Math.max(0, Math.floor(candidate.onset.timeSec / Math.max(1, phraseDurationSec)));
    const phraseSlot = index % (difficulty === 'hard' ? 6 : 4);
    const nextTime = phraseFiltered[index + 1]?.onset.timeSec ?? analysis.durationSec;
    const gapToNext = nextTime - candidate.onset.timeSec;
    const bandTotal = candidate.onset.lowStrength + candidate.onset.midStrength + candidate.onset.highStrength + 1e-9;
    const highShare = candidate.onset.highStrength / bandTotal;
    const midShare = candidate.onset.midStrength / bandTotal;
    const sustained = frameEnergyAt(analysis, candidate.onset.timeSec, .55) >= (energies[index] ?? 0) * .78;
    const accent = candidate.beatAlignment >= .82 && candidate.onset.normalizedStrength >= 2.4;
    let type: AutoChartNote['type'] = 'tap';
    const sectionAccentSwipe = difficulty !== 'easy' && (section === 'build' || section === 'peak') && phraseSlot === 2;
    const musicalSwipe = difficulty !== 'easy' && (candidate.onset.band === 'high' || highShare >= .34)
      && roll < profile.swipeChance + .2;
    const playableHold = gapToNext >= .72 && sustained && section !== 'intro'
      && (candidate.onset.band === 'mid' || midShare >= .3 || energies[index]! >= medianEnergy * .7);
    const sectionAccentHold = difficulty !== 'easy' && playableHold && index % 5 === 1;
    if (sectionAccentHold) type = 'hold';
    else if (sectionAccentSwipe || musicalSwipe) type = 'swipe';
    else if (playableHold && roll > 1 - profile.holdChance - (difficulty === 'hard' ? .16 : .08)) type = 'hold';
    const note: AutoChartNote = {
      id: `auto-${index}-${Math.round(candidate.onset.timeSec * 1000)}`,
      songTimeSec: candidate.onset.timeSec,
      beatIndex: candidate.nearest?.index ?? null,
      type,
      band: candidate.onset.band,
      score: Number(candidate.score.toFixed(6)),
      section,
      phraseIndex,
      accent,
    };
    if (type === 'swipe') note.swipeDirection = phraseIndex % 2 === phraseSlot % 2 ? 'right' : 'left';
    if (type === 'hold') note.durationSec = Math.min(1.25, Math.max(.55, gapToNext - .18));
    return note;
  });

  // Final ergonomic pass: no reverse-swipe reaction traps, no swipe streaks,
  // and no note may overlap an active hold.
  let lastSwipe: AutoChartNote | null = null;
  let consecutiveSwipes = 0;
  let holdUntil = -Infinity;
  for (const note of notes) {
    if (note.songTimeSec < holdUntil) note.type = 'tap';
    if (note.type === 'swipe') {
      consecutiveSwipes++;
      const reverseTooSoon = lastSwipe && lastSwipe.swipeDirection !== note.swipeDirection
        && note.songTimeSec - lastSwipe.songTimeSec < (difficulty === 'hard' ? .34 : .48);
      if (reverseTooSoon || consecutiveSwipes > (difficulty === 'hard' ? 2 : 1)) {
        note.type = 'tap';
        delete note.swipeDirection;
        consecutiveSwipes = 0;
      } else lastSwipe = note;
    } else consecutiveSwipes = 0;
    if (note.type === 'hold') holdUntil = note.songTimeSec + (note.durationSec ?? 0) + .12;
  }

  return {
    timingMode: analysis.tempo.mode,
    bpm: analysis.tempo.bpm,
    confidence: analysis.tempo.confidence,
    difficulty,
    seed,
    notes,
    quality: chartQuality(notes, analysis.durationSec, profile.minimumGapSec),
  };
}
