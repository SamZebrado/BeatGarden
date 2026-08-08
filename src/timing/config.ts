// Single source of truth for timing + judgement parameters.
// No magic numbers scattered across modules.

export interface TimingConfig {
  // Scheduler lookahead — how far the JS timer pre-fills the WebAudio queue.
  scheduleAheadMs: number; // 100-150 ms
  lookaheadMs: number;     // 20-30 ms — the JS timer tick interval

  // Logical design resolution for canvas.
  logicalWidth: number;
  logicalHeight: number;

  // Judge windows (in ms, centered on target time = 0).
  // Window for tap inputs.
  perfectWindowMs: number;   // ±
  greatWindowMs: number;     // ±
  okWindowMs: number;        // ±
  // Beyond okWindowMs => MISS.

  // Hold inputs have same windows for start; release uses:
  holdReleasePerfectMs: number;
  holdReleaseGreatMs: number;
  holdReleaseOkMs: number;

  // Swipe direction detection.
  swipeMinDistancePx: number;
  swipeMaxDurationMs: number;

  // Calibration defaults.
  calibrationDefaultOffsetMs: number;
  calibrationMinSamples: number; // 16
  calibrationOutlierStdDevMul: number;

  // Volume.
  musicVolumeDefault: number; // 0.8
  sfxVolumeDefault: number;   // 0.9

  // Canvas / render.
  dprMax: number;
  reducedMotionDefault: boolean;
}

export const TIMING_CONFIG: TimingConfig = {
  scheduleAheadMs: 120,
  lookaheadMs: 25,

  logicalWidth: 1920,
  logicalHeight: 1080,

  perfectWindowMs: 32,
  greatWindowMs: 72,
  okWindowMs: 130,

  holdReleasePerfectMs: 40,
  holdReleaseGreatMs: 90,
  holdReleaseOkMs: 160,

  swipeMinDistancePx: 40,
  swipeMaxDurationMs: 500,

  calibrationDefaultOffsetMs: 0,
  calibrationMinSamples: 16,
  calibrationOutlierStdDevMul: 2.0,

  musicVolumeDefault: 0.8,
  sfxVolumeDefault: 0.9,

  dprMax: 2.0,
  reducedMotionDefault: false,
};

export type JudgementKind = 'PERFECT' | 'GREAT' | 'OK' | 'MISS';

export const JUDGEMENT_ORDER: JudgementKind[] = ['PERFECT', 'GREAT', 'OK', 'MISS'];

export interface JudgeResult {
  kind: JudgementKind;
  deltaMs: number; // input - target (positive = late)
}

export type InputKind = 'tap' | 'holdStart' | 'holdRelease' | 'swipeLeft' | 'swipeRight' | 'callEcho';
