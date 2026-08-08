import { describe, it, expect, beforeEach } from 'vitest';
import { Transport } from '../src/timing/Transport';
import { Judge } from '../src/timing/Judge';
import { TIMING_CONFIG } from '../src/timing/config';
import type { ScheduledJudgeTarget } from '../src/timing/Scheduler';
import { MockAudioClock } from './mockAudioClock';

const cfg = TIMING_CONFIG;

function makeTapTarget(beat: number, id: string = 't'): ScheduledJudgeTarget {
  return { type: 'judge-target', beat, id, inputKind: 'tap' };
}

function makeHoldReleaseTarget(beat: number, id: string, pairedId: string): ScheduledJudgeTarget {
  return { type: 'judge-target', beat, id, inputKind: 'holdRelease', pairedId };
}

describe('Judge — tap windows (central config)', () => {
  let clock: MockAudioClock;
  let transport: Transport;
  let judge: Judge;

  beforeEach(() => {
    clock = new MockAudioClock();
    transport = new Transport(() => clock.now(), 120, [4, 4]);
    transport.start(0, clock.now());
    judge = new Judge(cfg, transport, 0);
    judge.resetRun();
  });

  function judgeTap(targetBeat: number, deltaMs: number) {
    const target = makeTapTarget(targetBeat);
    const targetAudio = transport.beatToAudioTime(targetBeat);
    const inputAudio = targetAudio + deltaMs / 1000;
    return judge.judge(target, inputAudio, 'tap');
  }

  it('Δ=0 → PERFECT', () => {
    const r = judgeTap(4, 0);
    expect(r.kind).toBe('PERFECT');
    expect(r.deltaMs).toBeCloseTo(0, 4);
  });

  it('Δ at perfect boundary → PERFECT', () => {
    for (const sign of [-1, 1]) {
      const r = judgeTap(4, sign * cfg.perfectWindowMs);
      expect(r.kind).toBe('PERFECT');
    }
  });

  it('Δ just past perfect (1 ε into great) → GREAT', () => {
    const r = judgeTap(4, cfg.perfectWindowMs + 1e-3);
    expect(r.kind).toBe('GREAT');
  });

  it('Δ at great boundary → GREAT', () => {
    for (const sign of [-1, 1]) {
      const r = judgeTap(4, sign * cfg.greatWindowMs);
      expect(r.kind).toBe('GREAT');
    }
  });

  it('Δ just past great into OK → OK', () => {
    const r = judgeTap(4, cfg.greatWindowMs + 1e-3);
    expect(r.kind).toBe('OK');
  });

  it('Δ at OK boundary → OK', () => {
    for (const sign of [-1, 1]) {
      const r = judgeTap(4, sign * cfg.okWindowMs);
      expect(r.kind).toBe('OK');
    }
  });

  it('Δ beyond OK → MISS', () => {
    const r = judgeTap(4, cfg.okWindowMs + 1);
    expect(r.kind).toBe('MISS');
  });

  it('big miss way beyond window is still MISS', () => {
    const r = judgeTap(4, 500);
    expect(r.kind).toBe('MISS');
  });

  it('early / late sign: negative deltaMs = early, positive = late', () => {
    const early = judgeTap(10, -20);
    const late = judgeTap(10, +20);
    expect(early.deltaMs).toBeLessThan(0);
    expect(late.deltaMs).toBeGreaterThan(0);
  });

  it('semantic mismatch: swipe vs tap-target → MISS even with perfect timing', () => {
    const target = makeTapTarget(2);
    const targetAudio = transport.beatToAudioTime(2);
    const r = judge.judge(target, targetAudio, 'swipeLeft');
    expect(r.kind).toBe('MISS');
  });
});

describe('Judge — hold release uses wider windows', () => {
  let clock: MockAudioClock;
  let transport: Transport;
  let judge: Judge;

  beforeEach(() => {
    clock = new MockAudioClock();
    transport = new Transport(() => clock.now(), 120);
    transport.start(0);
    judge = new Judge(cfg, transport, 0);
    judge.resetRun();
  });

  it('hold release at Δ=0 → PERFECT (hold windows)', () => {
    const rel = makeHoldReleaseTarget(8, 'r1', 's1');
    const at = transport.beatToAudioTime(8);
    const r = judge.judge(rel, at, 'holdRelease');
    expect(r.kind).toBe('PERFECT');
  });

  it('hold release Δ at tap-perfect but hold-great boundary → GREAT under hold windows', () => {
    // Default: holdReleasePerfectMs = 40, holdReleaseGreatMs = 90.
    // Δ=50 is between 40 and 90, so GREAT.
    const rel = makeHoldReleaseTarget(10, 'r2', 's2');
    const at = transport.beatToAudioTime(10) + 50 / 1000;
    const r = judge.judge(rel, at, 'holdRelease');
    expect(r.kind).toBe('GREAT');
  });
});

describe('Judge — calibration sign convention: effectiveDelta = rawDelta − calOffset', () => {
  // Formula convention:
  //   rawDeltaMs = (inputAt - targetAt) * 1000
  //   effectiveDeltaMs = rawDeltaMs - calibrationOffsetMs
  // Test matrix: raw input EARLY (-20ms) / LATE (+20ms) × cal POS (+10) / NEG (-10).
  function runCase(rawDeltaMs: number, calOffsetMs: number) {
    const clock = new MockAudioClock();
    const transport = new Transport(() => clock.now(), 120);
    transport.start(0);
    const j = new Judge(cfg, transport, calOffsetMs);
    j.resetRun();
    const target = makeTapTarget(4);
    const targetAt = transport.beatToAudioTime(4);
    return j.judge(target, targetAt + rawDeltaMs / 1000, 'tap');
  }

  it('Case 1: LATE input (+20ms) + POSITIVE calibration (+10ms → digitizer late) → effective +10ms → PERFECT', () => {
    // User is 20ms late; we know there's a persistent +10ms digitizer shift.
    // effective = 20 - 10 = +10 ms (within ±32 → PERFECT).
    const r = runCase(+20, +10);
    expect(r.deltaMs).toBeCloseTo(+10, 4);
    expect(r.kind).toBe('PERFECT');
  });

  it('Case 2: LATE input (+20ms) + NEGATIVE calibration (−10ms → audio pipeline late) → effective +30ms → still PERFECT', () => {
    // effective = 20 - (-10) = +30 ms (within ±32 → PERFECT).
    const r = runCase(+20, -10);
    expect(r.deltaMs).toBeCloseTo(+30, 4);
    expect(r.kind).toBe('PERFECT');
  });

  it('Case 3: EARLY input (−20ms) + POSITIVE calibration (+10ms) → effective −30ms → PERFECT (boundary)', () => {
    // effective = -20 - (+10) = -30 ms (within ±32 → PERFECT).
    const r = runCase(-20, +10);
    expect(r.deltaMs).toBeCloseTo(-30, 4);
    expect(r.kind).toBe('PERFECT');
  });

  it('Case 4: EARLY input (−20ms) + NEGATIVE calibration (−10ms) → effective −10ms → PERFECT', () => {
    // effective = -20 - (-10) = -10 ms (within ±32 → PERFECT).
    const r = runCase(-20, -10);
    expect(r.deltaMs).toBeCloseTo(-10, 4);
    expect(r.kind).toBe('PERFECT');
  });

  it('canonical: Android 80ms digitizer (LATE) perfectly cancels → PERFECT', () => {
    // Case A from Judge.ts header: user in sync, but signal always arrives
    // 80 ms late in AudioContext time. Calibration learns offset = +80.
    const r = runCase(+80, +80);
    expect(r.deltaMs).toBeCloseTo(0, 4);
    expect(r.kind).toBe('PERFECT');
  });

  it('canonical: 40ms audio-late (EARLY taps) perfectly cancels → PERFECT', () => {
    // Case B from Judge.ts header: taps arrive 40ms before beat sound "feels"
    // like it should; calibration = -40 shifts effective delta → 0.
    const r = runCase(-40, -40);
    expect(r.deltaMs).toBeCloseTo(0, 4);
    expect(r.kind).toBe('PERFECT');
  });
});

describe('Judge — score statistics', () => {
  it('counts & score weights & delta history populate correctly', () => {
    const clock = new MockAudioClock();
    const transport = new Transport(() => clock.now(), 120);
    transport.start(0);
    const judge = new Judge(cfg, transport, 0);
    judge.resetRun();
    const target = makeTapTarget(1);
    const at = transport.beatToAudioTime(1);
    // Four judgements: PERFECT, GREAT, OK, MISS.
    judge.judge(target, at, 'tap');
    judge.judge(makeTapTarget(2), transport.beatToAudioTime(2) + (cfg.perfectWindowMs + 1e-3) / 1000, 'tap');
    judge.judge(makeTapTarget(3), transport.beatToAudioTime(3) + (cfg.greatWindowMs + 1e-3) / 1000, 'tap');
    judge.judge(makeTapTarget(4), transport.beatToAudioTime(4) + (cfg.okWindowMs + 1) / 1000, 'tap');

    expect(judge.currentCounts).toEqual({ PERFECT: 1, GREAT: 1, OK: 1, MISS: 1 });

    const score = judge.finishRun();
    expect(score.total).toBe(4);
    expect(score.score).toBe(300 + 200 + 100 + 0);
    // accuracy = 600/1200 = 0.5
    expect(score.accuracy).toBeCloseTo(0.5, 6);
    expect(score.deltasMs.length).toBe(4);
  });

  it('autoMiss increments MISS count', () => {
    const clock = new MockAudioClock();
    const transport = new Transport(() => clock.now(), 120);
    transport.start(0);
    const judge = new Judge(cfg, transport, 0);
    judge.resetRun();
    const t = makeTapTarget(1);
    // Advance clock 5 seconds past the target.
    clock.advanceSeconds(10);
    const r = judge.autoMiss(t);
    expect(r).not.toBeNull();
    expect(r!.kind).toBe('MISS');
    expect(judge.currentCounts.MISS).toBe(1);
  });
});

describe('Judge — call-and-response echo windows', () => {
  it('matchEchoTap finds nearest unconsumed window and applies judgement', () => {
    const clock = new MockAudioClock();
    const transport = new Transport(() => clock.now(), 120);
    transport.start(0);
    const judge = new Judge(cfg, transport, 0);
    judge.resetRun();
    // Center at beat 4 and beat 8, half-window 0.5 beats.
    judge.pushEchoWindow(4, 0.5);
    judge.pushEchoWindow(8, 0.5);
    // Hit the first one at the center with PERFECT timing.
    const at = transport.beatToAudioTime(4);
    const r = judge.matchEchoTap(at);
    expect(r).not.toBeNull();
    expect(r!.kind).toBe('PERFECT');
    // Second echo, hit on edge of OK window.
    const at2 = transport.beatToAudioTime(8) + cfg.okWindowMs / 1000;
    const r2 = judge.matchEchoTap(at2);
    expect(r2).not.toBeNull();
    expect(r2!.kind).toBe('OK');
    // A random tap with no active window: null.
    const at3 = transport.beatToAudioTime(99);
    const r3 = judge.matchEchoTap(at3);
    expect(r3).toBeNull();
  });
});
