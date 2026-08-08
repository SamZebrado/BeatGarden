import { describe, it, expect, beforeEach } from 'vitest';
import { Transport } from '../src/timing/Transport';
import { Scheduler, type ScheduledEvent } from '../src/timing/Scheduler';
import { TIMING_CONFIG } from '../src/timing/config';
import { MockAudioClock } from './mockAudioClock';

const cfg = { ...TIMING_CONFIG, scheduleAheadMs: 120, lookaheadMs: 25 };

describe('Scheduler — event sorting + cursor', () => {
  let clock: MockAudioClock;
  let transport: Transport;

  beforeEach(() => {
    clock = new MockAudioClock();
    transport = new Transport(() => clock.now(), 120, [4, 4]);
  });

  it('setEvents sorts by beat ascending', () => {
    const s = new Scheduler({ config: cfg, transport });
    const evts: ScheduledEvent[] = [
      { type: 'audio', beat: 8, sound: 'snare' },
      { type: 'audio', beat: 0, sound: 'kick' },
      { type: 'audio', beat: 4, sound: 'kick' },
    ];
    s.setEvents(evts);
    const got = s.getEvents();
    expect(got.map((e) => e.beat)).toEqual([0, 4, 8]);
  });

  it('cursor skips past events already behind current beat', () => {
    transport.start(0, clock.now());
    clock.advanceSeconds(4); // 120 BPM = 2 beats per second → wait 4 s → 8 beats played
    const s = new Scheduler({ config: cfg, transport });
    const evts: ScheduledEvent[] = [];
    for (let i = 0; i < 32; i++) {
      evts.push({ type: 'audio', beat: i, sound: i % 2 === 0 ? 'kick' : 'snare' });
    }
    s.setEvents(evts);
    // Current beat = 8. Events at beats < 8 minus scheduleAheadBeats are skipped.
    // scheduleAheadBeats = 120ms * 2bps = 0.24 beats.
    // So cutoff beat is roughly 8 - 0.24 ≈ 7.76. We skip beats strictly less than that.
    // Beats 0..7 are skipped (8 beats total? 0..7 = 8 items at integers).
    // Wait: "< cutoffBeat" where cutoffBeat ≈ 7.76, so we skip i=0..7 → 8 events.
    // After setEvents the next audio tick should dispatch 8.. until horizon.
    let dispatched = 0;
    const s2 = new Scheduler({
      config: cfg,
      transport,
      audioHandler: () => {
        dispatched++;
      },
    });
    s2.setEvents(evts);
    // One manual tick.
    const res = s2.tick(clock.now());
    // Horizon: current beat + scheduleAheadBeats = 8 + 0.24 = 8.24 beats.
    // So events with beat <= 8.24 should be dispatched. Beats 8 qualifies, beat 9 doesn't.
    // So we dispatch exactly 1 event (beat 8).
    expect(res.scheduled).toBe(1);
    expect(dispatched).toBe(1);
  });

  it('scheduled events dispatching audioHandler receives correct audio time', () => {
    transport.start(0, clock.now());
    const evts: ScheduledEvent[] = [
      { type: 'audio', beat: 0, sound: 'kick' },
      { type: 'audio', beat: 1, sound: 'hatClosed' },
    ];
    const receivedAt: number[] = [];
    const s = new Scheduler({
      config: cfg,
      transport,
      audioHandler: (_ev, at) => receivedAt.push(at),
    });
    s.setEvents(evts);
    s.tick(clock.now());
    // With scheduleAheadBeats = 0.24, the horizon is 0.24. beat=0 and beat=1?
    // beat=1 > 0.24, so not yet scheduled.
    expect(receivedAt.length).toBe(1);
    // beat 0 at audio time = transport.beatToAudioTime(0) = clock.now() (≈ 0)
    expect(receivedAt[0]).toBeCloseTo(transport.beatToAudioTime(0), 8);
    // Advance 0.4s: beat becomes 0.8, horizon ≈ 1.04. beat=1 qualifies.
    clock.advanceSeconds(0.4);
    s.tick(clock.now());
    expect(receivedAt.length).toBe(2);
    expect(receivedAt[1]).toBeCloseTo(transport.beatToAudioTime(1), 8);
  });
});

describe('Scheduler — judge targets exposure', () => {
  let clock: MockAudioClock;
  let transport: Transport;

  beforeEach(() => {
    clock = new MockAudioClock();
    transport = new Transport(() => clock.now(), 120);
    transport.start(0);
  });

  it('getJudgeTargets returns only judge-target events, sorted', () => {
    const s = new Scheduler({ config: cfg, transport });
    const evts: ScheduledEvent[] = [
      { type: 'audio', beat: 0, sound: 'kick' },
      {
        type: 'judge-target',
        beat: 4,
        id: 't4',
        inputKind: 'tap',
      },
      { type: 'cue', beat: 2, name: 'x' },
      {
        type: 'judge-target',
        beat: 1,
        id: 't1',
        inputKind: 'swipeLeft',
      },
    ];
    s.setEvents(evts);
    const ts = s.getJudgeTargets();
    expect(ts.length).toBe(2);
    expect(ts[0].id).toBe('t1');
    expect(ts[0].inputKind).toBe('swipeLeft');
    expect(ts[1].id).toBe('t4');
  });

  it('getJudgeTargetsInWindow filters beat range', () => {
    const s = new Scheduler({ config: cfg, transport });
    const evts: ScheduledEvent[] = [];
    for (let i = 0; i < 32; i++) {
      evts.push({
        type: 'judge-target',
        beat: i,
        id: 't' + i,
        inputKind: 'tap',
      });
    }
    s.setEvents(evts);
    const inWindow = s.getJudgeTargetsInWindow(5, 12);
    // Inclusive on start, exclusive on end: beats 5,6,7,8,9,10,11 → 7 items.
    expect(inWindow.map((t) => t.beat)).toEqual([5, 6, 7, 8, 9, 10, 11]);
  });
});

describe('Scheduler — tick does not drop late events when called ahead of time', () => {
  it('multiple ticks do not re-schedule already-scheduled events (cursor advances)', () => {
    const clock = new MockAudioClock();
    const transport = new Transport(() => clock.now(), 120);
    transport.start(0, clock.now());
    const scheduledAtBeat: number[] = [];
    const s = new Scheduler({
      config: cfg,
      transport,
      audioHandler: (ev) => scheduledAtBeat.push(ev.beat),
    });
    const evts: ScheduledEvent[] = [];
    for (let i = 0; i < 8; i++) evts.push({ type: 'audio', beat: i, sound: 'kick' });
    s.setEvents(evts);
    // Tick once, advance clock very little, tick again.
    s.tick(clock.now());
    const after1 = scheduledAtBeat.length;
    clock.advanceSeconds(0.001);
    s.tick(clock.now());
    const after2 = scheduledAtBeat.length;
    // No double-scheduling.
    expect(after2).toBe(after1);
    // Now advance more.
    clock.advanceSeconds(0.5); // 1 beat at 120 BPM.
    s.tick(clock.now());
    // After advancing, we now include beat 1 as well, so more scheduled.
    expect(scheduledAtBeat.length).toBeGreaterThan(after2);
  });
});
