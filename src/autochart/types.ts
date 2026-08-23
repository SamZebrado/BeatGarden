export type FrequencyBand = 'low' | 'mid' | 'high';
export type AutoChartTimingMode = 'beat-grid' | 'onset-timed';
export type AutoChartDifficulty = 'easy' | 'normal' | 'hard';
export type AutoChartSection = 'intro' | 'low' | 'build' | 'peak' | 'outro';

export interface FeatureFrame {
  timeSec: number;
  rms: number;
  spectralCentroidHz: number;
  spectralRolloffHz: number;
  lowEnergy: number;
  lowMidEnergy: number;
  midEnergy: number;
  highEnergy: number;
  globalFlux: number;
  lowFlux: number;
  midFlux: number;
  highFlux: number;
  localDynamicRange: number;
}

export interface OnsetCandidate {
  timeSec: number;
  strength: number;
  normalizedStrength: number;
  band: FrequencyBand;
  lowStrength: number;
  midStrength: number;
  highStrength: number;
}

export interface TempoEstimate {
  bpm: number | null;
  confidence: number;
  phaseSec: number | null;
  beatTimesSec: number[];
  mode: AutoChartTimingMode;
}

export interface AutoChartAnalysis {
  durationSec: number;
  sampleRate: number;
  frames: FeatureFrame[];
  onsets: OnsetCandidate[];
  tempo: TempoEstimate;
  peakRms: number;
}

export interface AutoChartNote {
  id: string;
  /** Authoritative target time. Beat position is annotation only. */
  songTimeSec: number;
  beatIndex: number | null;
  type: 'tap' | 'swipe' | 'hold';
  band: FrequencyBand;
  score: number;
  durationSec?: number;
  section: AutoChartSection;
  phraseIndex: number;
  accent: boolean;
  swipeDirection?: 'left' | 'right';
}

export interface AutoChartQuality {
  densityPerMinute: number;
  longestActionStreak: number;
  restRatio: number;
  gestureChangeRate: number;
  holdConflicts: number;
  impossibleProximity: number;
  sectionBalance: Record<AutoChartSection, number>;
}

export interface GeneratedAutoChart {
  timingMode: AutoChartTimingMode;
  bpm: number | null;
  confidence: number;
  difficulty: AutoChartDifficulty;
  seed: number;
  notes: AutoChartNote[];
  quality: AutoChartQuality;
}
