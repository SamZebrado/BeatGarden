// Judge — centralised PERFECT / GREAT / OK / MISS decision logic.
//
// Every stage routes judgements through here. No stage is allowed to roll
// its own windows.
//
// For a given input arriving at `inputAudioTime` targeting `targetBeat`:
//   1. Convert targetBeat to targetAudioTime using transport.
//   2. Apply user calibration offset (subtracted from input time):
//        deltaMs = (inputAudioTime - targetAudioTime - calibrationOffsetSec) * 1000
//   3. Compare deltaMs against windows, all expressed relative to zero.
//      Positive delta = late, Negative delta = early.
//
// For hold release, use the HOLD windows from config. For swipe, use tap
// windows and additionally validate direction.

import type { InputKind, JudgeResult, JudgementKind, TimingConfig } from './config';
import type { Transport } from './Transport';
import type { ScheduledJudgeTarget } from './Scheduler';
import { JUDGEMENT_ORDER } from './config';
import { mean, meanSignedError, median, medianSignedError, buildTimingHistogram } from '../utils/stats';

export interface CalibrationData {
  offsetMs: number;
  samples: number;
}

export interface StageScore {
  score: number;
  accuracy: number; // 0..1
  counts: Record<JudgementKind, number>;
  total: number;
  meanSignedErrorMs: number;
  medianSignedErrorMs: number;
  deltasMs: number[];
  histogramBucketsMs: Map<number, number>;
}

export class Judge {
  private readonly config: TimingConfig;
  private readonly transport: Transport;
  private calibrationOffsetMs: number;

  // In-progress run state:
  private runActive: boolean = false;
  private counts: Record<JudgementKind, number> = { PERFECT: 0, GREAT: 0, OK: 0, MISS: 0 };
  private deltas: number[] = [];
  // For hold matching: hold start targets waiting for a release.
  private pendingHolds: Map<string, { startedAudioTime: number; startBeat: number }> = new Map();
  // For call-and-response echo matching: received echo targets (beat window).
  // We keep per-stage simple: assume a linear sequence for now; stages can
  // push pending echo windows via pushEchoWindow().
  private echoWindows: Array<{ windowStartBeat: number; windowEndBeat: number; consumed: boolean }> = [];

  constructor(config: TimingConfig, transport: Transport, calibrationOffsetMs: number = 0) {
    this.config = config;
    this.transport = transport;
    this.calibrationOffsetMs = calibrationOffsetMs;
  }

  getCalibrationOffsetMs(): number {
    return this.calibrationOffsetMs;
  }

  setCalibrationOffsetMs(offsetMs: number): void {
    this.calibrationOffsetMs = offsetMs;
  }

  resetRun(): void {
    this.runActive = true;
    this.counts = { PERFECT: 0, GREAT: 0, OK: 0, MISS: 0 };
    this.deltas = [];
    this.pendingHolds.clear();
    this.echoWindows = [];
  }

  isRunActive(): boolean {
    return this.runActive;
  }

  finishRun(): StageScore {
    this.runActive = false;
    return this.buildScore();
  }

  get currentCounts(): Readonly<Record<JudgementKind, number>> {
    return this.counts;
  }

  /**
   * Core judgement. `target` + `inputAudioTime` (authoritative, from AudioContext).
   * Returns the judgement result. Records it in the run if a run is active.
   */
  judge(
    target: ScheduledJudgeTarget,
    inputAudioTime: number,
    inputKindActual: InputKind,
  ): JudgeResult {
    // Direction/semantic mismatch => MISS without consuming score windows?
    // Treat as MISS but still record delta (if timing window matched).
    const semanticOk = this.semanticMatch(target, inputKindActual);
    const targetAudioTime = this.transport.beatToAudioTime(target.beat);
    const calSec = this.calibrationOffsetMs / 1000;
    const deltaSec = inputAudioTime - targetAudioTime - calSec;
    const deltaMs = deltaSec * 1000;
    // Compare against SECONDS windows (convert ms → sec) to avoid *1000
    // floating-point magnification. Add 1e-9 for boundary stability.
    const windowsMs = this.windowsFor(target);
    const perfectSec = windowsMs.perfect / 1000 + 1e-9;
    const greatSec = windowsMs.great / 1000 + 1e-9;
    const okSec = windowsMs.ok / 1000 + 1e-9;
    const absSec = Math.abs(deltaSec);
    let kind: JudgementKind = 'MISS';
    if (semanticOk) {
      if (absSec <= perfectSec) kind = 'PERFECT';
      else if (absSec <= greatSec) kind = 'GREAT';
      else if (absSec <= okSec) kind = 'OK';
    }
    if (kind === 'MISS') {
      // For holds/releases: don't double-penalise if release comes, but
      // semantic mismatch is still a MISS.
    } else {
      // For hold start, register the pending release pair.
      if (target.inputKind === 'holdStart' && target.pairedId) {
        this.pendingHolds.set(target.pairedId, {
          startedAudioTime: inputAudioTime,
          startBeat: target.beat,
        });
      }
    }
    if (this.runActive) {
      this.counts[kind]++;
      this.deltas.push(deltaMs);
    }
    return { kind, deltaMs };
  }

  /**
   * Special: mark a target as MISS without an input (auto-miss on window expiry).
   */
  autoMiss(target: ScheduledJudgeTarget): JudgeResult {
    const targetAudioTime = this.transport.beatToAudioTime(target.beat);
    const deltaMs = (this.transport.snapshot().audioTime - targetAudioTime) * 1000;
    if (this.runActive) {
      this.counts.MISS++;
      this.deltas.push(deltaMs);
    }
    return { kind: 'MISS', deltaMs };
  }

  /**
   * For call-and-response echo matching: stages push a beat window and we
   * match a tap against the *closest* unconsumed window. Judgement windows
   * still apply relative to the window's center.
   */
  pushEchoWindow(centerBeat: number, toleranceHalfBeats: number = 0.5): void {
    this.echoWindows.push({
      windowStartBeat: centerBeat - toleranceHalfBeats,
      windowEndBeat: centerBeat + toleranceHalfBeats,
      consumed: false,
    });
  }

  matchEchoTap(inputAudioTime: number): JudgeResult | null {
    const inputBeat = this.transport.audioTimeToBeat(inputAudioTime);
    let bestIdx = -1;
    let bestBeat = Infinity;
    for (let i = 0; i < this.echoWindows.length; i++) {
      const w = this.echoWindows[i];
      if (w.consumed) continue;
      if (inputBeat < w.windowStartBeat || inputBeat > w.windowEndBeat) continue;
      const center = (w.windowStartBeat + w.windowEndBeat) / 2;
      const d = Math.abs(center - inputBeat);
      if (d < bestBeat) {
        bestBeat = d;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) return null;
    const w = this.echoWindows[bestIdx];
    w.consumed = true;
    const centerBeat = (w.windowStartBeat + w.windowEndBeat) / 2;
    const pseudoTarget: ScheduledJudgeTarget = {
      type: 'judge-target',
      id: 'echo-' + bestIdx,
      beat: centerBeat,
      inputKind: 'tap',
    };
    return this.judge(pseudoTarget, inputAudioTime, 'tap');
  }

  private windowsFor(target: ScheduledJudgeTarget): { perfect: number; great: number; ok: number } {
    const c = this.config;
    switch (target.inputKind) {
      case 'holdRelease':
        return {
          perfect: c.holdReleasePerfectMs,
          great: c.holdReleaseGreatMs,
          ok: c.holdReleaseOkMs,
        };
      default:
        return {
          perfect: c.perfectWindowMs,
          great: c.greatWindowMs,
          ok: c.okWindowMs,
        };
    }
  }

  private semanticMatch(target: ScheduledJudgeTarget, actual: InputKind): boolean {
    if (target.inputKind === actual) return true;
    // tap is a valid coarse input for echo/callEcho if stage sends echo.
    if (target.inputKind === 'callEcho' && actual === 'tap') return true;
    return false;
  }

  private buildScore(): StageScore {
    const total =
      this.counts.PERFECT + this.counts.GREAT + this.counts.OK + this.counts.MISS;
    // Simple additive scoring. Weights are centralised here; not magic per-stage.
    const weighted =
      this.counts.PERFECT * 300 +
      this.counts.GREAT * 200 +
      this.counts.OK * 100 +
      this.counts.MISS * 0;
    const accuracyMax = total * 300;
    return {
      score: weighted,
      accuracy: accuracyMax === 0 ? 0 : weighted / accuracyMax,
      counts: { ...this.counts },
      total,
      meanSignedErrorMs: total === 0 ? 0 : meanSignedError(this.deltas),
      medianSignedErrorMs: total === 0 ? 0 : medianSignedError(this.deltas),
      deltasMs: [...this.deltas],
      histogramBucketsMs: buildTimingHistogram(this.deltas),
    };
  }

  // ---- Stat helpers (exposed for debug overlay / tests) ----

  static mean(a: number[]): number {
    return mean(a);
  }
  static median(a: number[]): number {
    return median(a);
  }
  static judgementRank(j: JudgementKind): number {
    return JUDGEMENT_ORDER.indexOf(j);
  }
}

export { mean, median, meanSignedError, medianSignedError };
