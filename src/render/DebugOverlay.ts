// DebugOverlay — Timing Debug Overlay (off by default in release builds).
//
// Must include, at minimum:
//   - AudioContext time
//   - transport time (seconds and beat)
//   - BPM
//   - FPS (EMA)
//   - calibration offset ms
//   - last input delta (if any)
//   - last target time (beat + audio time)
//   - last judgement (PERFECT/GREAT/OK/MISS + delta)
//   - scheduled queue length (last tick)

import type { TransportSnapshot } from '../timing/Transport';
import type { JudgeResult, JudgementKind } from '../timing/config';

export interface DebugOverlaySnapshot {
  audioTime: number;
  transportTime: number;
  transportBeat: number;
  bpm: number;
  fps: number;
  calibrationOffsetMs: number;
  lastInputDeltaMs: number | null;
  lastInputAudioTime: number | null;
  lastTargetBeat: number | null;
  lastTargetAudioTime: number | null;
  lastJudgement: { kind: JudgementKind; deltaMs: number } | null;
  scheduledQueueLength: number;
  counts: Record<JudgementKind, number>;
}

export class DebugOverlay {
  public enabled: boolean = false;
  private snap: DebugOverlaySnapshot;

  constructor() {
    this.snap = {
      audioTime: 0,
      transportTime: 0,
      transportBeat: 0,
      bpm: 120,
      fps: 0,
      calibrationOffsetMs: 0,
      lastInputDeltaMs: null,
      lastInputAudioTime: null,
      lastTargetBeat: null,
      lastTargetAudioTime: null,
      lastJudgement: null,
      scheduledQueueLength: 0,
      counts: { PERFECT: 0, GREAT: 0, OK: 0, MISS: 0 },
    };
  }

  reportTransport(snap: TransportSnapshot, fps: number): void {
    this.snap.audioTime = snap.audioTime;
    this.snap.transportTime = snap.transportTime;
    this.snap.transportBeat = snap.beat;
    this.snap.bpm = snap.bpm;
    this.snap.fps = fps;
  }

  reportCalibration(offsetMs: number): void {
    this.snap.calibrationOffsetMs = offsetMs;
  }

  reportInput(deltaMs: number | null, audioTime: number | null): void {
    if (deltaMs !== null) this.snap.lastInputDeltaMs = deltaMs;
    if (audioTime !== null) this.snap.lastInputAudioTime = audioTime;
  }

  reportTarget(targetBeat: number | null, targetAudioTime: number | null): void {
    if (targetBeat !== null) this.snap.lastTargetBeat = targetBeat;
    if (targetAudioTime !== null) this.snap.lastTargetAudioTime = targetAudioTime;
  }

  reportJudgement(j: JudgeResult): void {
    this.snap.lastJudgement = { kind: j.kind, deltaMs: j.deltaMs };
  }

  reportSchedulerQueue(n: number): void {
    this.snap.scheduledQueueLength = n;
  }

  reportCounts(counts: Readonly<Record<JudgementKind, number>>): void {
    this.snap.counts = { ...counts };
  }

  /**
   * Render to the canvas 2D context.
   * Draws in top-left corner, using the same transform as stage render.
   * Coords are in logical pixels.
   */
  render(ctx: CanvasRenderingContext2D): void {
    if (!this.enabled) return;
    const pad = 24;
    const x = pad;
    const y = pad;
    const w = 560;
    const h = 360;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'rgba(15,18,38,0.88)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#6ef';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#eaf6ff';
    ctx.font = '18px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textBaseline = 'top';

    const s = this.snap;
    const lines = [
      `BeatGarden  TIMING DEBUG`,
      `audioTime       : ${s.audioTime.toFixed(4)} s`,
      `transportTime   : ${s.transportTime.toFixed(4)} s`,
      `transportBeat   : ${s.transportBeat.toFixed(4)} (bpm=${s.bpm.toFixed(2)})`,
      `FPS (EMA)       : ${s.fps.toFixed(1)}`,
      `calibration offs: ${s.calibrationOffsetMs.toFixed(1)} ms`,
      `last input Δ    : ${s.lastInputDeltaMs !== null ? s.lastInputDeltaMs.toFixed(1) + ' ms' : '—'}`,
      `last input t_a  : ${s.lastInputAudioTime !== null ? s.lastInputAudioTime.toFixed(4) + ' s' : '—'}`,
      `last target beat: ${s.lastTargetBeat !== null ? s.lastTargetBeat.toFixed(4) : '—'}`,
      `last target t_a : ${s.lastTargetAudioTime !== null ? s.lastTargetAudioTime.toFixed(4) + ' s' : '—'}`,
      `last judgement  : ${s.lastJudgement ? s.lastJudgement.kind + '  Δ=' + s.lastJudgement.deltaMs.toFixed(1) + 'ms' : '—'}`,
      `scheduler queue : ${s.scheduledQueueLength} events (last tick)`,
      `counts          : P=${s.counts.PERFECT}  G=${s.counts.GREAT}  OK=${s.counts.OK}  M=${s.counts.MISS}`,
    ];
    const lineH = 22;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x + 14, y + 14 + i * lineH);
    }
    ctx.restore();
  }
}
