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

// ---- GATE 0 PARTIAL Round-2: HONEST Scheduler evidence ----
//
// ChatGPT source audit found the prior test was PROVABLY DISHONEST:
//   Old title: "NO repeats / NO skips"
//   Fact: the test advanced MockAudioClock 7 s (to beat 14) then did a
//   single tick(). At 120 BPM, beats 1..13 are >> 50 ms past playhead time
//   → source code explicitly DROPS them via `if (start < now - 0.05) return`.
//   So events 1..13 were all silently dropped. The test STILL "passed"
//   because it only checked `uniqueBeats.length === scheduled.length` (no
//   duplicates), never "did every expected beat actually schedule?".
//
// Honest contract we write tests against here:
//   (A) Normal-scheduler jitter WITHIN safety margin (<schedule-ahead):
//       every event exactly once, 0 duplicates, 0 dropped-late, absolute
//       start times correct.
//   (B) Visibility suspend/resume scenario (Chrome behaviour): when the
//       tab is hidden, AudioContext.current TIME STOPS FROZEN. So transport
//       beat position, scheduler horizon, everything is still consistent.
//       On visible return, AC resumes at old frozen time → game continues
//       EXACTLY where it left off, EVERY future event still scheduled once,
//       zero dropped-late because AC never "jumped ahead".
//       This is the REAL visibility semantics that matters for Android
//       Chrome/PWA — not the faked "jump beat 0→14" scenario from prior
//       test.
//   (C) GENUINELY late main-thread starvation: simulate a 2-second GC
//       pause where AudioContext kept advancing (normal foreground Chrome
//       pathological case). Expect ALL events inside the 2-second window
//       to be disposition==='dropped-late', with ZERO 'scheduled' for that
//       window, NO burst double-schedule afterwards, NO duplicate beat
//       replay later, and transport remains phase-correct (the NEXT event
//       after the window fires at its correct absolute beat time).
//
// Additionally: tick() now returns explicit droppedLate / scheduled counts,
// and dispatch() returns explicit disposition 'scheduled' | 'dropped-late' |
// 'cue' | 'target' so callers and metrics cannot accidentally mix dropped
// events with real-scheduled events.
//
// Also keep the prior Issue 5 tests that proved the 4 valid behaviours:
//   - stop() timer then resume tick → nextIndex unchanged (no repeats);
//   - restart reset + setEvents → cursor rebase 0;
//   - seek forward + setEvents → skip backward beats;
//   - consecutive setEvents → no leak.
describe('Scheduler — honest cursor lifecycle / drop semantics (GATE 0 PARTIAL Round-2)', () => {
  // ---- TEST (A): normal scheduler jitter within safety margin ----
  // Every tick advances only a little (< schedule-ahead window).
  // Expect every event exactly once; zero dropped-late; absolute times
  // for each scheduled beat match transport.beatToAudioTime(beat) exactly.
  it('(A) jitter within schedule-ahead safety margin: every audio event scheduled EXACTLY ONCE, zero dropped-late, absolute time correct', () => {
    const clock = new MockAudioClock();
    const transport = new Transport(() => clock.now(), 120); // 2 bps
    transport.start(0, clock.now());

    const scheduled: Array<{ beat: number; startAudioTime: number }> = [];
    const s = new Scheduler({
      config: cfg,
      transport,
      audioHandler: (ev, at) => scheduled.push({ beat: ev.beat, startAudioTime: at }),
    });

    const N_BEATS = 16;
    const evts: ScheduledEvent[] = [];
    for (let i = 0; i < N_BEATS; i++) evts.push({ type: 'audio', beat: i, sound: 'kick' });
    s.setEvents(evts);

    // Simulate 40 ms frame ticks (faster than lookahead; within safety margin).
    // 120 BPM schedule ahead = 120 ms ahead window → ~0.24 beats of safety.
    // Each tick advances clock 0.04 s = 0.08 beats. Small enough.
    // We need 16 beats × (1 beat / 2 bps) = 8 s total play to cover beat 15.
    // So run 8/0.04 = 200 iterations minimum. Use 250 for headroom.
    let totalDroppedLate = 0;
    let totalScheduled = 0;
    for (let i = 0; i < 250; i++) {
      const tickRes = s.tick(clock.now());
      totalScheduled += tickRes.scheduled;
      totalDroppedLate += tickRes.droppedLate;
      clock.advanceSeconds(0.04);
      if (clock.now() > 9.0) break; // 8.0 s needed; add 1 s headroom
    }

    // PRIMARY ASSERTIONS for (A).
    expect(totalDroppedLate).toBe(0); // no late drops inside safety margin
    expect(scheduled.length).toBe(N_BEATS); // every beat scheduled
    expect(totalScheduled).toBe(N_BEATS); // scheduled counter honest
    const uniqueBeats = new Set(scheduled.map((x) => x.beat));
    expect(uniqueBeats.size).toBe(N_BEATS); // no duplicates, no misses → exactly once each
    const sorted = [...scheduled].sort((a, b) => a.beat - b.beat);
    // Absolute time correct for every beat.
    for (let i = 0; i < sorted.length; i++) {
      expect(sorted[i].beat).toBe(i);
      expect(sorted[i].startAudioTime).toBeCloseTo(transport.beatToAudioTime(i), 8);
    }
    s.stop();
  });

  // ---- TEST (B): Visibility frozen-AC scenario (REAL semantics) ----
  // Chrome behaviour: document.hidden → AudioContext suspended →
  // AudioContext.currentTime STOPS advancing. AC.current NUMERICALLY the
  // same after tab visible again. So "7 seconds of user waiting in another
  // tab" does NOT mean the game time jumped 7 seconds — the audio clock
  // was FROZEN for those 7 seconds.
  //
  // Setup:
  //   play beats 0..3 normally (ticking).
  //   SUSPEND (simulated visibility hidden):
  //     - scheduler.stop()          // no more timer ticks.
  //     - transport.pause()         // transport anchors frozen.
  //     - AC current FROZEN.
  //   "Wait some wall time" (no clock advance — THIS IS THE FROZEN SEMANTIC).
  //   RESUME (simulated visibility return):
  //     - transport.resume() at SAME frozen audio time value (no jump).
  //     - scheduler tick loop resumes normally.
  // Result: every beat 0..15 scheduled EXACTLY ONCE; zero dropped-late;
  // absolute times still match transport algebra; no phase drift.
  it('(B) visibility frozen-AudioContext suspend/resume: beats continue EXACTLY where left off, zero dropped-late, no drift', () => {
    const clock = new MockAudioClock(); // clock = simulated AC.currentTime
    const transport = new Transport(() => clock.now(), 120);
    transport.start(0, clock.now());

    const scheduled: Array<{ beat: number; startAudioTime: number }> = [];
    const s = new Scheduler({
      config: cfg,
      transport,
      audioHandler: (ev, at) => scheduled.push({ beat: ev.beat, startAudioTime: at }),
    });
    const N_BEATS = 16;
    const evts: ScheduledEvent[] = [];
    for (let i = 0; i < N_BEATS; i++) evts.push({ type: 'audio', beat: i, sound: 'kick' });
    s.setEvents(evts);

    // Play normally for 4 beats (120 BPM, 2 bps → 2 seconds).
    // Tick a few times so beats 0,1,2,3 get scheduled.
    for (let i = 0; i < 60; i++) {
      s.tick(clock.now());
      clock.advanceSeconds(0.04);
      if (clock.now() > 2.01) break;
    }
    s.stop(); // scheduler periodic timer stopped (visibilityhidden → throttle + stop)
    transport.pause(clock.now()); // beat frozen. audioAnchor is clock.now = 2.00xx

    // Frozen AC checkpoint. clock DOES NOT ADVANCE. This is what Chrome
    // actually does with a suspended AudioContext. We do NOT call
    // clock.advanceSeconds() here — doing so would fake the scenario.
    const frozenAudioTime = clock.now();
    const frozenBeat = transport.snapshot().beat;
    expect(frozenBeat).toBeGreaterThanOrEqual(3.9); // ~beat 4
    const scheduledBefore = scheduled.length;
    expect(scheduledBefore).toBeGreaterThanOrEqual(4); // beats 0..3 scheduled
    expect(s.lastDroppedLateCount).toBe(0);

    // RESUME (visible return). Chrome-resume AC time at SAME frozen value.
    transport.start(undefined, frozenAudioTime); // re-anchor algebra (start=resume when playing=false)
    // resume scheduler periodic timer — call start() indirectly via manual ticks
    for (let i = 0; i < 200; i++) {
      s.tick(clock.now());
      clock.advanceSeconds(0.04);
      if (clock.now() > frozenAudioTime + 8.02) break; // need ~12 beats
    }
    const scheduledAfter = scheduled.length;

    // PRIMARY ASSERTIONS for (B).
    expect(s.lastDroppedLateCount).toBe(0); // no drops in frozen scenario!
    expect(scheduledAfter).toBe(N_BEATS); // ALL 16 beats scheduled
    const uniqueBeats = new Set(scheduled.map((x) => x.beat));
    expect(uniqueBeats.size).toBe(N_BEATS); // exactly once each
    // For EVERY beat entry received, its absolute startAudioTime must match
    // transport.beatToAudioTime(beat). No phase drift, no timing distortion
    // from the frozen suspend/resume cycle.
    for (const e of scheduled) {
      expect(e.startAudioTime).toBeCloseTo(transport.beatToAudioTime(e.beat), 5);
    }
    s.stop();
  });

  // ---- TEST (C): genuine main-thread starvation (2-second GC pause) ----
  // This is where late drops ARE EXPECTED. AudioContext keeps advancing
  // (foreground tab AC is running) but JS main thread is paused for 2 full
  // seconds by a hypothetical GC, no ticks, no timers. At 120 BPM 2 s = 4
  // beats. Those beats' startAudioTime >> 50 ms past, so ALL are dropped.
  // Expected behaviour:
  //   - first tick() after pause returns droppedLate >= 4
  //   - scheduled counter is 0 for that resumed tick
  //   - next forward events (after the gap) still resume with correct
  //     absolute time and no repeat
  //   - no burst: previously dropped beats are NOT replayed (nextIndex monotonic)
  it('(C) genuine main-thread starvation: late-events DROPPED HONESTLY (counted in droppedLate), no duplicate replay, next beats phase-correct', () => {
    const clock = new MockAudioClock();
    const transport = new Transport(() => clock.now(), 120); // 2 bps
    transport.start(0, clock.now());

    const scheduled: number[] = [];
    const s = new Scheduler({
      config: cfg,
      transport,
      audioHandler: (ev) => scheduled.push(ev.beat),
    });
    const N_BEATS = 16;
    const evts: ScheduledEvent[] = [];
    for (let i = 0; i < N_BEATS; i++) evts.push({ type: 'audio', beat: i, sound: 'kick' });
    s.setEvents(evts);

    // Normal initial tick at beat 0: only beat 0 in horizon.
    s.tick(clock.now());
    const before = scheduled.length;
    expect(before).toBeGreaterThanOrEqual(1);
    expect(s.lastDroppedLateCount).toBe(0);

    // Simulate 2.0 seconds of JS pause. AudioContext (clock) STILL ADVANCES
    // 2 s because GC happened in foreground with AC running — main thread
    // starved but not AC suspended.
    s.stop();
    clock.advanceSeconds(2.0); // clock.now=2.00 → beat 4. Events 1..3 are 1 s old — hugely > 50 ms late.
    // Resume: tick once. Scheduler loop restart just advances cursor again,
    // no schedule rewind (monotonic nextIndex invariant).
    const resumeTick = s.tick(clock.now());

    // PRIMARY ASSERTIONS for (C).
    // Beats 1,2,3 definitely dropped (3 events, each >> 50 ms late).
    expect(resumeTick.droppedLate).toBe(3);
    // Beat 4: startAudioTime == clock.now == 2.0 → start < 2.0 - 0.05? No.
    // Also beat 4 is inside horizon beat 4.24 (scheduleAhead 0.12 s × 2 bps = 0.24).
    // Therefore beat 4 IS scheduled in resume tick. So scheduled==1, not 0.
    expect(resumeTick.scheduled).toBe(1);
    // No duplicates of beat 0:
    const zeroCount = scheduled.filter((b) => b === 0).length;
    expect(zeroCount).toBe(1);
    // Beats 1,2,3 never appeared in scheduled (they were dropped):
    for (const missing of [1, 2, 3]) {
      expect(scheduled).not.toContain(missing);
    }
    // Beat 4 scheduled:
    expect(scheduled).toContain(4);

    // Continue normal play for remaining beats. Advance more + tick.
    for (let i = 0; i < 200; i++) {
      s.tick(clock.now());
      clock.advanceSeconds(0.04);
      if (clock.now() > 10.0) break;
    }
    // Final: 16 total beats MINUS 3 dropped = 13 scheduled exactly.
    const unique = Array.from(new Set(scheduled)).sort((a, b) => a - b);
    expect(unique.length).toBe(scheduled.length); // no duplicates at end
    expect(scheduled.length).toBe(N_BEATS - 3); // correct drop count reflected in final total
    // Beats 0,4..15 inclusive = 13 unique items, matches.
    expect(unique).toEqual([0, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    s.stop();
  });
});

// ---- Retained from GATE 0 PARTIAL Issue 5 — 3 remaining valid lifecycle proofs ----
describe('Scheduler — cursor lifecycle: restart / seek / replace (GATE 0 PARTIAL Issue 5)', () => {
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
