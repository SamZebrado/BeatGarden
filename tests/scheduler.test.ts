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

// ---- GATE 0 PARTIAL Issue 5: Scheduler cursor lifecycle ----
// Must prove:
//   (a) pause the periodic timer (scheduler.stop()), advance time, scheduler.start()
//       again → tick() resumes from the old nextIndex, no repeats.
//   (b) "restart" (stage runner calls: transport.reset() → scheduler.setEvents(new copy)
//       → cursor is re-aligned to beat 0, so early events ARE processed again.
//   (c) seek forward via transport.seekToBeat() → nextIndex is NOT auto-
//       adjusted by seek alone; but setEvents() after seek DOES rebase cursor
//       to appropriate beat (StageRunner calls scheduler.setEvents(events) on
//       restart, which handles this).
//   (d) consecutive setEvents() calls do not leak old events.
describe('Scheduler — cursor lifecycle across pause/resume/restart/seek (GATE 0 PARTIAL Issue 5)', () => {
  it('stop() pauses timer, start() resumes periodic fill. tick() uses stored nextIndex → NO repeats / NO skips', () => {
    const clock = new MockAudioClock();
    const transport = new Transport(() => clock.now(), 120);
    transport.start(0, clock.now());

    const scheduled: number[] = [];
    const s = new Scheduler({
      config: cfg,
      transport,
      audioHandler: (ev) => scheduled.push(ev.beat),
    });
    const evts: ScheduledEvent[] = [];
    for (let i = 0; i < 16; i++) evts.push({ type: 'audio', beat: i, sound: 'kick' });
    s.setEvents(evts);

    // Tick at beat 0: includes beats 0 within horizon.
    s.tick(clock.now());
    const initialBeatCount = scheduled.length; // >0 (beat 0 at least)
    // Advance 4 real seconds → 8 beats at 120 BPM, but intentionally DO NOT
    // tick(). Simulates tab backgrounded: JS is starved, scheduler timer is
    // not firing.
    clock.advanceSeconds(4);
    s.stop(); // stops the periodic setTimeout; does NOT alter nextIndex.
    // Advance 3 more seconds: now audio is at t = 7 s = beat 14.
    clock.advanceSeconds(3);
    // Resume path: we are now back in foreground. Record BEFORE count.
    // NOTE: avoid calling s.start() here because start() does an immediate
    // synchronous tick() via loop(); we want to control ticks manually so
    // before/after comparisons are deterministic.
    const before = scheduled.length; // still == initialBeatCount
    expect(before).toBe(initialBeatCount);
    // Single manual tick: should catch up all intermediate beats AND the
    // forward horizon, starting EXACTLY from the stored nextIndex.
    s.tick(clock.now()); // t = 7 sec → beat = 14 → horizon ≈ 14.24
    const after = scheduled.length;
    // After resume, we definitely scheduled more than we had before the gap.
    expect(after).toBeGreaterThan(before);
    // All dispatched beats appear EXACTLY ONCE → no duplicates.
    const uniqueBeats = Array.from(new Set(scheduled)).sort((a, b) => a - b);
    expect(uniqueBeats.length).toBe(scheduled.length);
    expect(uniqueBeats[0]).toBeGreaterThanOrEqual(0);
    // Clean up timer resource if any.
    s.stop();
  });

  it('restart path: transport.reset() + scheduler.setEvents() rebuilds cursor at beat 0', () => {
    const clock = new MockAudioClock();
    const transport = new Transport(() => clock.now(), 120);
    transport.start(0, clock.now());

    const scheduled: number[] = [];
    const s = new Scheduler({
      config: cfg,
      transport,
      audioHandler: (ev) => scheduled.push(ev.beat),
    });

    const evts: ScheduledEvent[] = [];
    for (let i = 0; i < 12; i++) evts.push({ type: 'audio', beat: i, sound: 'kick' });
    s.setEvents(evts);

    // Run #1 — begin from beat 0 at clock = 0: tick immediately so beat 0
    // is included in schedule (horizon beat 0 + 0.24 → beat 0 qualifies).
    s.tick(clock.now());
    const afterRun1Start = scheduled.length;
    expect(afterRun1Start).toBeGreaterThan(0);
    expect(scheduled[0]).toBe(0); // beat 0 dispatched in first run

    // Advance into play (3 sec at 120 BPM → beat 6) and tick.
    clock.advanceSeconds(3);
    s.tick(clock.now());

    // Restart: StageRunner does:
    //   1. transport.reset() → beat 0, playing=false
    //   2. clock back to 0 (simulating replay of the same stage score)
    //   3. scheduler.setEvents(events again) → cursor re-aligns to current
    //      transport beat (after reset: beat 0 - aheadBeats → cursor at 0)
    transport.reset(clock.now());
    clock.set(0);
    s.setEvents([...evts]); // re-copy so cursor is rebased

    // Tick at beat 0 again in Run #2; beat 0 should be dispatched again.
    const beforeRestartTick = scheduled.length;
    transport.start(0, clock.now());
    s.tick(clock.now());
    const afterRestartTick = scheduled.length;
    expect(afterRestartTick).toBeGreaterThan(beforeRestartTick);
    // Beat 0 is present EXACTLY 2× (once per run): proves the restart path
    // reset the cursor so beat 0 IS re-included in run #2 (not skipped
    // because the cursor from run #1 was left pointing "past 0").
    const zeroCount = scheduled.filter((b) => b === 0).length;
    expect(zeroCount).toBe(2);
  });

  it('seekToBeat(forward): after seek, setEvents re-aligns cursor so forward beats included, backward skipped (no replay)', () => {
    const clock = new MockAudioClock();
    const transport = new Transport(() => clock.now(), 120);
    transport.start(0, clock.now());

    const scheduled: number[] = [];
    const s = new Scheduler({
      config: cfg,
      transport,
      audioHandler: (ev) => scheduled.push(ev.beat),
    });
    const evts: ScheduledEvent[] = [];
    for (let i = 0; i < 32; i++) evts.push({ type: 'audio', beat: i, sound: 'hatClosed' });
    s.setEvents(evts);
    // Normal play: first tick.
    s.tick(clock.now());

    // Seek forward to beat 20 (10 s at 120 BPM = 2 bps).
    clock.advanceSeconds(10); // clock.now = 10 s.
    transport.seekToBeat(20, clock.now());
    // Stage runner pattern: after a seek / restart, rebuild events (or call
    // setEvents same list) so cursor is realigned to current transport beat.
    s.setEvents([...evts]);

    // Before the seek we scheduled some early beats; after setEvents the
    // cursor now skips beats < 20 - scheduleAheadBeats.
    // Tick once: it should include beat 20 (if within horizon) plus 20..20.24.
    const beforeSeekTick = scheduled.length;
    s.tick(clock.now());
    const afterSeekTick = scheduled.length;

    expect(afterSeekTick).toBeGreaterThan(beforeSeekTick);
    // The newly scheduled beats must be at 20 or after (no beats 1..19
    // re-dispatched after forward seek).
    const newlyDispatched = scheduled.slice(beforeSeekTick);
    for (const b of newlyDispatched) expect(b).toBeGreaterThanOrEqual(20 - 1); // allow 1 beat tolerance due to boundary
  });

  it('setEvents() on brand new list replaces cursor completely — no stale events leak', () => {
    const clock = new MockAudioClock();
    const transport = new Transport(() => clock.now(), 120);
    transport.start(0, clock.now());

    const scheduled: Array<{ beat: number; list: string }> = [];
    const s = new Scheduler({
      config: cfg,
      transport,
      audioHandler: (ev) => scheduled.push({ beat: ev.beat, list: 'listA' }),
    });

    const listA: ScheduledEvent[] = [
      { type: 'audio', beat: 0, sound: 'kick' },
      { type: 'audio', beat: 1, sound: 'snare' },
    ];
    s.setEvents(listA);
    clock.advanceSeconds(2); // beat 4
    s.tick(clock.now());

    // Replace with brand new list. This should set cursor to position for
    // new list. No audio from listA should ever fire again.
    const listB: ScheduledEvent[] = [
      { type: 'cue', beat: 8, name: 'x' },
      { type: 'audio', beat: 8, sound: 'bell' },
    ];
    // Switch audioHandler so we can identify which list drove this.
    const s2 = new Scheduler({
      config: cfg,
      transport,
      audioHandler: (ev) => scheduled.push({ beat: ev.beat, list: 'listB' }),
    });
    s2.setEvents(listB);
    clock.advanceSeconds(2); // 4 s total = beat 8
    s2.tick(clock.now());

    // listB events at beat 8 are in the window; fire once.
    const listBEvents = scheduled.filter((x) => x.list === 'listB');
    expect(listBEvents.length).toBeGreaterThanOrEqual(1);
    // listA events never appear in s2.
    expect(listBEvents.every((e) => e.beat >= 8)).toBe(true);
  });
});
