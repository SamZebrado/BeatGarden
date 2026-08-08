// Judge — centralised PERFECT / GREAT / OK / MISS decision logic.
//
// Every stage routes judgements through here. No stage is allowed to roll
// its own windows.
//
// ============================================================
// CALIBRATION SIGN CONVENTION (GATE 0 PARTIAL Issue 3, explicit)
// ============================================================
//
// Definitions:
//   targetAudioTime  = beatToAudioTime(targetBeat)  — audio time when the
//                      beat would be perfectly on.
//   rawInputAudioTime = AudioContext.currentTime() captured INSIDE the
//                       pointerdown/pointerup handler (not later).
//   rawDeltaMs       = (rawInputAudioTime - targetAudioTime) * 1000
//                    > 0 → user tapped LATE  (after beat arrived)
//                    < 0 → user tapped EARLY (before beat arrived)
//
//   calibrationOffsetMs  = stored number from Calibration page (median of
//                          N valid metronome taps).
//     • Positive value (+X ms) means: historically, the user taps LATE
//       by X ms relative to metronome audio (e.g. slow Android digitizer).
//     • Negative value (−X ms) means: historically, the user taps EARLY
//       by X ms (e.g. audio pipeline reports late relative to screen taps).
//
// Effective delta after calibration applied:
//     effectiveDeltaMs = rawDeltaMs − calibrationOffsetMs
//
// This is the ONLY formula. Worked examples:
//
//  Case A. Android digitizer + 80 ms latency, user is perfectly in sync
//          with their physical sensation → the signal we SEE is always
//          rawDeltaMs = +80 ms.
//          Calibration produces calibrationOffsetMs = +80 ms.
//          effectiveDeltaMs = 80 − 80 = 0 → PERFECT. ✓
//
//  Case B. Audio engine + 40 ms "early" screen vs speaker, user is perfectly
//          synced → rawDeltaMs = −40 ms.
//          CalibrationOffsetMs = −40 ms.
//          effectiveDeltaMs = −40 − (−40) = 0 → PERFECT. ✓
//
//  Case C. User taps 20 ms early (raw = −20) AND there is +80 ms digitizer
//          (so raw was already shifted +80; "actual" physical user tap was
//          100 ms early). Not our problem: the calibration captures the
//          COMBINED shift that best predicts what the user will do on real
//          gameplay taps relative to the beat sound they hear.
//
// We judge effectiveDeltaMs against windows. |effectiveDeltaMs| <= 32 → PERFECT
// etc. Delta positivity is preserved semantically:
//   effectiveDeltaMs > 0 → judged LATE.   effectiveDeltaMs < 0 → judged EARLY.
// ============================================================
//
// For a given input arriving at `inputAudioTime` targeting `targetBeat`:
//   1. targetAudioTime = transport.beatToAudioTime(targetBeat)
//   2. effectiveDeltaMs = (inputAudioTime − targetAudioTime)*1000 − calibrationOffsetMs
//      [= rawDeltaMs − calibrationOffsetMs]
//   3. Compare against ±windows. +ve = LATE, −ve = EARLY.
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
  // Already-judged target ids (prevents double-judging a single target).
  private judgedTargetIds: Set<string> = new Set();
  // Optional callback invoked whenever a judgement is recorded.
  private onJudgeCb: ((res: JudgeResult, target: ScheduledJudgeTarget) => void) | undefined;
  // For hold matching: hold start targets waiting for a release.
  private pendingHolds: Map<string, { startedAudioTime: number; startBeat: number }> = new Map();
  // For call-and-response echo matching: received echo targets (beat window).
  // We keep per-stage simple: assume a linear sequence for now; stages can
  // push pending echo windows via pushEchoWindow().
  private echoWindows: Array<{ windowStartBeat: number; windowEndBeat: number; consumed: boolean }> = [];

  constructor(
    config: TimingConfig,
    transport: Transport,
    calibrationOffsetMs: number = 0,
    opts?: {
      onJudge?: (res: JudgeResult, target: ScheduledJudgeTarget) => void;
    },
  ) {
    this.config = config;
    this.transport = transport;
    this.calibrationOffsetMs = calibrationOffsetMs;
    this.onJudgeCb = opts?.onJudge;
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
    this.judgedTargetIds.clear();
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
   * Fires onJudge callback if registered.
   *
   * NOTE: does NOT deduplicate multiple calls for the same target id. Use
   * `judgeTarget()` for idempotent once-per-target calling.
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
    const result: JudgeResult = { kind, deltaMs };
    if (this.onJudgeCb) this.onJudgeCb(result, target);
    return result;
  }

  /**
   * Idempotent judgement. If `target.id` has already been judged (even as a
   * miss), this returns the existing result as null — the caller should not
   * double-fire. Useful for stage input routers + auto-miss loop both trying
   * to judge the same target.
   */
  judgeTarget(
    target: ScheduledJudgeTarget,
    inputAudioTime: number,
    inputKindActual: InputKind,
  ): JudgeResult | null {
    if (this.judgedTargetIds.has(target.id)) return null;
    const res = this.judge(target, inputAudioTime, inputKindActual);
    this.judgedTargetIds.add(target.id);
    return res;
  }

  /** Returns true if the target has already been judged. */
  hasRecorded(targetId: string): boolean {
    return this.judgedTargetIds.has(targetId);
  }

  /** Convenience alias for currentCounts. */
  statsCounts(): Readonly<Record<JudgementKind, number>> {
    return this.currentCounts;
  }

  /** Convenience alias for finishRun. */
  finalScore(): StageScore {
    return this.finishRun();
  }

  /**
   * Special: mark a target as MISS without an input (auto-miss on window expiry).
   * Idempotent via judgedTargetIds.
   */
  autoMiss(target: ScheduledJudgeTarget): JudgeResult | null {
    if (this.judgedTargetIds.has(target.id)) return null;
    this.judgedTargetIds.add(target.id);
    const targetAudioTime = this.transport.beatToAudioTime(target.beat);
    const deltaMs = (this.transport.snapshot().audioTime - targetAudioTime) * 1000;
    if (this.runActive) {
      this.counts.MISS++;
      this.deltas.push(deltaMs);
    }
    const result: JudgeResult = { kind: 'MISS', deltaMs };
    if (this.onJudgeCb) this.onJudgeCb(result, target);
    return result;
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
