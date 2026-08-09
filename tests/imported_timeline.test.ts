import { describe, expect, it } from 'vitest';
import { ImportedTrackTimeline } from '../src/autochart/ImportedTrackTimeline';
import { targetExpirySongTime, targetOkWindowSec, transitionToImportedPause } from '../src/autochart/PulseGardenRunner';
import { Judge } from '../src/timing/Judge';
import { Transport } from '../src/timing/Transport';
import { TIMING_CONFIG } from '../src/timing/config';
import type { ScheduledJudgeTarget } from '../src/timing/Scheduler';

describe('ImportedTrackTimeline songTimeSec authority', () => {
  it('preserves song phase across long pause, resume, seek, and restart', () => {
    let now = 10;
    const timeline = new ImportedTrackTimeline(() => now);
    timeline.start(5, now);
    now = 12.25;
    expect(timeline.snapshot().songTimeSec).toBeCloseTo(7.25, 9);
    timeline.pause();
    now = 112.25;
    expect(timeline.snapshot().songTimeSec).toBeCloseTo(7.25, 9);
    timeline.resume();
    now = 113.25;
    expect(timeline.snapshot().songTimeSec).toBeCloseTo(8.25, 9);
    timeline.seek(31.5);
    expect(timeline.songTimeToAudioTime(32)).toBeCloseTo(113.75, 9);
    timeline.reset();
    expect(timeline.snapshot().songTimeSec).toBe(0);
    expect(timeline.snapshot().playing).toBe(false);
  });

  it('uses songTimeSec rather than a forced constant-BPM beat for judgement', () => {
    let now = 20;
    const timeline = new ImportedTrackTimeline(() => now);
    timeline.start(10, now);
    const transport = new Transport(() => now, 120, [4, 4]);
    transport.start(0, now);
    const judge = new Judge(TIMING_CONFIG, transport, 0, {
      targetAudioTime: (target) => timeline.songTimeToAudioTime(target.songTimeSec!),
    });
    judge.resetRun();
    const target: ScheduledJudgeTarget = {
      type: 'judge-target', id: 'rubato-note', beat: 999, songTimeSec: 10.5, inputKind: 'tap',
    };
    now = 20.5;
    expect(judge.judgeTarget(target, now, 'tap')?.kind).toBe('PERFECT');
  });
});

describe('Pulse Garden target expiry semantics', () => {
  it('keeps holdStart alive through the shared recognition threshold', () => {
    const hold = { type: 'judge-target', id: 'h', beat: 1, songTimeSec: 2, inputKind: 'holdStart' } as ScheduledJudgeTarget;
    expect(targetExpirySongTime(hold)).toBeCloseTo(2.36, 8);
  });

  it('uses the wider release window only for holdRelease', () => {
    const tap = { type: 'judge-target', id: 't', beat: 1, songTimeSec: 2, inputKind: 'tap' } as ScheduledJudgeTarget;
    const release = { ...tap, id: 'r', inputKind: 'holdRelease' } as ScheduledJudgeTarget;
    expect(targetOkWindowSec(tap)).toBe(.13);
    expect(targetOkWindowSec(release)).toBe(.16);
  });
});

describe('Pulse Garden confirmed pause transition', () => {
  it('rolls back to playing and never pauses timeline when suspend fails', async () => {
    const phases: string[] = [];
    let timelinePauses = 0;
    const ok = await transitionToImportedPause({
      suspend: async () => false,
      pauseTimeline: () => { timelinePauses++; },
      setPhase: (phase) => { phases.push(phase); },
    });
    expect(ok).toBe(false);
    expect(phases).toEqual(['pausing', 'playing']);
    expect(timelinePauses).toBe(0);
  });

  it('enters paused only after confirmed suspend and timeline freeze', async () => {
    const order: string[] = [];
    const ok = await transitionToImportedPause({
      suspend: async () => { order.push('suspend-confirmed'); return true; },
      pauseTimeline: () => { order.push('timeline-paused'); },
      setPhase: (phase) => { order.push(phase); },
    });
    expect(ok).toBe(true);
    expect(order).toEqual(['pausing', 'suspend-confirmed', 'timeline-paused', 'paused']);
  });
});
