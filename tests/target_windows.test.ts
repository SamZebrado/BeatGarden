import { describe, expect, it } from 'vitest';
import { Judge } from '../src/timing/Judge';
import { Transport } from '../src/timing/Transport';
import { TIMING_CONFIG } from '../src/timing/config';
import type { ScheduledJudgeTarget } from '../src/timing/Scheduler';
import { inputCandidateBeatRange, targetJudgeWindowSeconds } from '../src/game/targetWindows';

const releaseTarget: ScheduledJudgeTarget = {
  type: 'judge-target', id: 'release', beat: 8, inputKind: 'holdRelease',
};

describe('input candidate and authoritative target windows', () => {
  it('uses the target input kind instead of the generic tap window', () => {
    expect(targetJudgeWindowSeconds(TIMING_CONFIG, releaseTarget)).toBe(.16);
    expect(targetJudgeWindowSeconds(TIMING_CONFIG, { ...releaseTarget, inputKind: 'tap' })).toBe(.13);
  });

  it.each([
    [130, 'OK'],
    [160, 'OK'],
    [161, 'MISS'],
  ] as const)('retrieves a release at +%d ms before the central Judge returns %s', (deltaMs, expectedKind) => {
    const transport = new Transport(() => 10, 120);
    transport.start(0, 10);
    const targetAudioTime = transport.beatToAudioTime(releaseTarget.beat);
    const inputAudioTime = targetAudioTime + deltaMs / 1000;
    const range = inputCandidateBeatRange(transport, inputAudioTime, TIMING_CONFIG);

    expect(releaseTarget.beat).toBeGreaterThanOrEqual(range.fromBeat);
    expect(releaseTarget.beat).toBeLessThanOrEqual(range.toBeat);

    const judge = new Judge(TIMING_CONFIG, transport);
    expect(judge.judge(releaseTarget, inputAudioTime, 'holdRelease').kind).toBe(expectedKind);
  });
});
