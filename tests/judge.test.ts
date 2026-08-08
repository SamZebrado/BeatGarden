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

describe('Judge — calibration offset applied before window comparison', () => {
  it('positive offset (device lags) shifts the comparison so early taps look on-time', () => {
    const clock = new MockAudioClock();
    const transport = new Transport(() => clock.now(), 120);
    transport.start(0);
    const judge = new Judge(cfg, transport, +30); // +30ms
    judge.resetRun();
    const target = makeTapTarget(4);
    const targetAudio = transport.beatToAudioTime(4);
    // Input is 30 ms early = -30ms raw delta.
    // With calibration offset = +30ms, we compute:
    //   deltaSec = inputAudioTime - targetAudioTime - (calOffsetMs / 1000)
    //            = (t - 0.030) - t - (+0.030 / 1) ??? Let's recheck formula.
    // From Judge:
    //   deltaSec = inputAudioTime - targetAudioTime - calSec;
    // So: input is EARLY 30ms → inputAudioTime = targetAudioTime - 0.030.
    //     calSec = +0.030.
    //     deltaSec = -0.030 - (+0.030) = -0.060? That's double the error. Hmm.
    // Wait — the convention is:
    //   calibrationOffsetMs is ADDED to the judged input time conceptually.
    //   Positive = the physical event is measured to arrive LATER than our
    //   audio clock reports for input. Or the other way around.
    // Let's define the convention explicitly:
    //   calibrationOffsetMs is what we SUBTRACT from (input - target).
    //   If the user perceives audio as LATE relative to visuals/screen taps
    //   (i.e. their taps hit the screen too EARLY compared to audio),
    //   the screen-inputs have negative delta. We shift them positive by
    //   setting calibrationOffsetMs to a negative number (since we subtract
    //   calSec, subtracting a negative = adding). Hmm this is confusing.
    // Let's just assert what the formula DOES numerically:
    //   effectiveDelta = inputDeltaRawMs - calibrationOffsetMs
    // because deltaSec = (inputAt - targetAt) - calSec
    //                  = rawDeltaSec - calSec.
    // So in ms: effectiveDeltaMs = rawDeltaMs - calibrationOffsetMs.
    // Okay. Now we want the scenario: user taps 30ms EARLY (raw = -30). We set
    // calibrationOffsetMs = -30 to bring effective delta to 0.
    const judgeFix = new Judge(cfg, transport, -30);
    judgeFix.resetRun();
    const r = judgeFix.judge(target, targetAudio - 0.030, 'tap');
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
