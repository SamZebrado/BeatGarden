// Integration test: renderer frame drops / scheduler timer jitter
// must NEVER produce permanent song-time ↔ audio-time drift.

import { describe, it, expect } from 'vitest';
import { Transport } from '../src/timing/Transport';
import { Scheduler, type ScheduledEvent } from '../src/timing/Scheduler';
import { TIMING_CONFIG } from '../src/timing/config';
import { MockAudioClock } from './mockAudioClock';

const cfg = TIMING_CONFIG;

describe('Timing drift — renderer frame drops do not shift music phase', () => {
  it('long simulated stall + many simulated dropped frames produce 0 permanent drift', () => {
    const clock = new MockAudioClock();
    const transport = new Transport(() => clock.now(), 120);
    transport.start(0, clock.now());

    const advance = 1 / 60;
    // Play normally for 30 beats (15 s at 120 BPM = 2 bps).
    for (let f = 0; f < 900; f++) {
      clock.advanceSeconds(advance);
      void transport.snapshot();
    }
    const snapA = transport.snapshot();
    expect(snapA.beat).toBeCloseTo(30, 4);

    // Simulate a 5-second stall (GC / tab in background).
    clock.advanceSeconds(5);
    const snapStalled = transport.snapshot();
    expect(snapStalled.beat).toBeCloseTo(40, 4);

    // Continue rendering with dropped frames.
    for (let f = 0; f < 900; f++) {
      clock.advanceSeconds(advance);
      if (f % 7 === 0) void transport.snapshot();
    }
    const finalSnap = transport.snapshot();
    // Another 15 s → 70 beats total.
    expect(finalSnap.beat).toBeCloseTo(70, 4);
  });

  it('ten-minute mixed-frame simulation stays locked to the audio clock', () => {
    const clock = new MockAudioClock();
    const transport = new Transport(() => clock.now(), 137);
    transport.start(0, clock.now());

    const framePattern = [1 / 60, 1 / 30, 1 / 120, .075, 1 / 60];
    let elapsed = 0;
    let frame = 0;
    while (elapsed < 600) {
      const step = Math.min(framePattern[frame % framePattern.length], 600 - elapsed);
      clock.advanceSeconds(step);
      elapsed += step;
      if (frame % 9 !== 0) void transport.snapshot();
      frame++;
    }

    const snapshot = transport.snapshot();
    expect(snapshot.transportTime).toBeCloseTo(600, 8);
    expect(snapshot.beat).toBeCloseTo(600 * 137 / 60, 8);
  });
});

describe('Timing drift — JS scheduler tick jitter does not make note onsets jitter', () => {
  it('late / irregular scheduler ticks do not shift audioHandler absolute times', () => {
    const clock = new MockAudioClock();
    const transport = new Transport(() => clock.now(), 120);
    transport.start(0, clock.now());

    const pairs: Array<[number, number]> = [];
    const s = new Scheduler({
      config: cfg,
      transport,
      audioHandler: (ev, at) => pairs.push([ev.beat, at]),
    });
    const evts: ScheduledEvent[] = [];
    for (let i = 0; i < 16; i++) evts.push({ type: 'audio', beat: i, sound: 'kick' });
    s.setEvents(evts);

    s.tick(clock.now());
    clock.set(0.2);
    s.tick(clock.now());
    clock.set(0.201);
    s.tick(clock.now());
    clock.set(1.201);
    s.tick(clock.now());
    clock.set(1.202);
    s.tick(clock.now());
    clock.set(8);
    s.tick(clock.now());

    expect(pairs.length).toBeGreaterThan(0);
    for (const [beat, at] of pairs) {
      expect(at).toBeCloseTo(transport.beatToAudioTime(beat), 9);
    }
  });
});

describe('Timing drift — pause/resume multiple times (simulated focus loss)', () => {
  it('10 focus-loss cycles each with 100 s background stall produce net 0 phase error', () => {
    const clock = new MockAudioClock();
    const transport = new Transport(() => clock.now(), 96); // 1.6 beats per second
    transport.start(0, clock.now());

    let activeSecondsTotal = 0;
    for (let i = 0; i < 10; i++) {
      // Play for 0.5 s of active song time.
      clock.advanceSeconds(0.5);
      activeSecondsTotal += 0.5;
      // Pause, then simulate backgrounded for 100 seconds.
      transport.pause(clock.now());
      clock.advanceSeconds(100);
      // Resume.
      transport.start(undefined, clock.now());
    }
    // Another 0.5 s active.
    clock.advanceSeconds(0.5);
    activeSecondsTotal += 0.5;

    const snap = transport.snapshot();
    // Expected transport time = activeSecondsTotal = 10 * 0.5 + 0.5 = 5.5 s.
    expect(snap.transportTime).toBeCloseTo(activeSecondsTotal, 8);
    // Beats = 5.5 * (96/60) = 5.5 * 1.6 = 8.8
    expect(snap.beat).toBeCloseTo(8.8, 8);
  });
});
