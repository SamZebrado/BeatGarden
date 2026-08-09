import { describe, expect, it } from 'vitest';
import { ImportedTrackTimeline } from '../src/autochart/ImportedTrackTimeline';
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

