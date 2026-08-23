import { describe, expect, it } from 'vitest';
import { Transport } from '../src/timing/Transport';
import { expiredJudgeBeat, hasJudgeTargetExpired, hasTargetExpiredForAutoMiss, TARGET_EXPIRY_GRACE_SEC } from '../src/game/judgementExpiry';
import type { ScheduledJudgeTarget } from '../src/timing/Scheduler';
import { TIMING_CONFIG } from '../src/timing/config';
import { Judge } from '../src/timing/Judge';

describe('judgement expiry', () => {
  it('does not expire a beat-2 target before its OK window closes', () => {
    let now = 0;
    const transport = new Transport(() => now, 120, [4, 4]);
    transport.start(0, 0);
    now = 0.88; // beat 1.76: the approaching cue is visible, target is still future.

    const latestExpired = expiredJudgeBeat(transport, now, 0.16);
    expect(latestExpired).toBeCloseTo(1.44, 8);
    expect(latestExpired).toBeLessThan(2);
  });

  it('expires the target only after the OK window', () => {
    let now = 0;
    const transport = new Transport(() => now, 120, [4, 4]);
    transport.start(0, 0);
    now = 1.17; // beat 2.34, beyond a 160 ms window around beat 2.

    expect(expiredJudgeBeat(transport, now, 0.16)).toBeGreaterThan(2);
  });
});

describe('semantic hold recognition expiry', () => {
  it('does not expire holdStart before InputRouter can classify the press', () => {
    let now = 0;
    const transport = new Transport(() => now, 120, [4, 4]);
    transport.start(0, 0);
    const hold = { type: 'judge-target', id: 'hold', beat: 4, inputKind: 'holdStart' } as ScheduledJudgeTarget;
    expect(hasJudgeTargetExpired(transport, hold, 2.34, 0.14, 0.22)).toBe(false);
    expect(hasJudgeTargetExpired(transport, hold, 2.361, 0.14, 0.22)).toBe(true);
  });

  it('keeps ordinary taps on the original OK-window expiry', () => {
    let now = 0;
    const transport = new Transport(() => now, 120, [4, 4]);
    transport.start(0, 0);
    const tap = { type: 'judge-target', id: 'tap', beat: 4, inputKind: 'tap' } as ScheduledJudgeTarget;
    expect(hasJudgeTargetExpired(transport, tap, 2.13, 0.14, 0.22)).toBe(false);
    expect(hasJudgeTargetExpired(transport, tap, 2.14, 0.14, 0.22)).toBe(true);
  });

  it('keeps the real release expiry path open through Judge boundaries and preserves tap expiry', () => {
    const transport = new Transport(() => 0, 120, [4, 4]);
    transport.start(0, 0);
    const release = { type: 'judge-target', id: 'release', beat: 4, inputKind: 'holdRelease' } as ScheduledJudgeTarget;
    const judge = new Judge(TIMING_CONFIG, transport);

    expect(TARGET_EXPIRY_GRACE_SEC).toBe(.01);
    expect(hasTargetExpiredForAutoMiss(transport, release, 2.16, TIMING_CONFIG)).toBe(false);
    expect(judge.judge(release, 2.16, 'holdRelease').kind).toBe('OK');
    expect(hasTargetExpiredForAutoMiss(transport, release, 2.161, TIMING_CONFIG)).toBe(false);
    expect(judge.judge(release, 2.161, 'holdRelease').kind).toBe('MISS');
    expect(hasTargetExpiredForAutoMiss(transport, release, 2.169, TIMING_CONFIG)).toBe(false);
    expect(hasTargetExpiredForAutoMiss(transport, release, 2.17, TIMING_CONFIG)).toBe(true);

    const tap = { ...release, id: 'tap-expiry', inputKind: 'tap' } as ScheduledJudgeTarget;
    expect(hasTargetExpiredForAutoMiss(transport, tap, 2.139, TIMING_CONFIG)).toBe(false);
    expect(hasTargetExpiredForAutoMiss(transport, tap, 2.14, TIMING_CONFIG)).toBe(true);
  });
});
