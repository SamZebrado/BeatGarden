import { describe, it, expect } from 'vitest';
import { Transport } from '../src/timing/Transport';
import { MockAudioClock } from './mockAudioClock';

describe('Transport — BPM / beat / bar ↔ seconds conversion', () => {
  it('120 BPM → 0.5 seconds per beat', () => {
    const clock = new MockAudioClock();
    const t = new Transport(() => clock.now(), 120, [4, 4]);
    expect(t.secondsPerBeat).toBeCloseTo(0.5, 6);
    expect(t.beatsPerSecond).toBeCloseTo(2.0, 6);
  });

  it('150 BPM → 0.4 seconds per beat', () => {
    const clock = new MockAudioClock();
    const t = new Transport(() => clock.now(), 150, [4, 4]);
    expect(t.secondsPerBeat).toBeCloseTo(0.4, 6);
    expect(t.beatsPerSecond).toBeCloseTo(2.5, 6);
  });

  it('beatToSeconds() matches 60/BPM * beat', () => {
    const clock = new MockAudioClock();
    const t = new Transport(() => clock.now(), 100, [4, 4]);
    for (let b = 0; b < 32; b += 0.25) {
      expect(t.beatToSeconds(b)).toBeCloseTo((60 / 100) * b, 8);
    }
  });

  it('barToSeconds() = meter[0] * beatToSeconds(1) * bar', () => {
    const clock = new MockAudioClock();
    const t = new Transport(() => clock.now(), 120, [7, 8]); // 7/8
    expect(t.barToSeconds(3)).toBeCloseTo(3 * 7 * 0.5, 8);
  });

  it('start(0) at audio time 100 → beat 0 corresponds to audio time 100', () => {
    const clock = new MockAudioClock(100);
    const t = new Transport(() => clock.now(), 120);
    t.start(0);
    expect(t.beatToAudioTime(0)).toBeCloseTo(100, 8);
    // beat 1 at 120 BPM = 0.5s later
    expect(t.beatToAudioTime(1)).toBeCloseTo(100.5, 8);
    expect(t.beatToAudioTime(8)).toBeCloseTo(100 + 4, 8);
  });

  it('audioTimeToBeat() is inverse of beatToAudioTime()', () => {
    const clock = new MockAudioClock(12.5);
    const t = new Transport(() => clock.now(), 132, [4, 4]);
    t.start(4); // start at beat 4
    for (let beat = 4; beat < 40; beat += 0.5) {
      const at = t.beatToAudioTime(beat);
      expect(t.audioTimeToBeat(at)).toBeCloseTo(beat, 8);
    }
  });
});

describe('Transport — transport time advances with audio clock only (no drift)', () => {
  it('advances linearly with audio time while playing', () => {
    const clock = new MockAudioClock();
    const t = new Transport(() => clock.now(), 120);
    t.start(0, clock.now());
    for (let s = 0; s <= 10; s += 0.25) {
      clock.set(s);
      const snap = t.snapshot();
      expect(snap.audioTime).toBeCloseTo(s, 8);
      expect(snap.transportTime).toBeCloseTo(s, 8);
      expect(snap.beat).toBeCloseTo(s * 2, 8);
    }
  });

  it('simulated dropped rAF frames: reading after big jump skips straight to correct beat', () => {
    // Key invariant: renderer must not accumulate songTime += deltaTime.
    // Our Transport uses audioTime directly; a 10-second gap means the
    // snapshot jumps by 10 seconds — which is correct.
    const clock = new MockAudioClock();
    const t = new Transport(() => clock.now(), 120);
    t.start(0, clock.now());
    clock.advanceSeconds(10.5);
    const snap = t.snapshot();
    expect(snap.transportTime).toBeCloseTo(10.5, 8);
    expect(snap.beat).toBeCloseTo(21, 8); // 10.5 s * 2 bps = 21 beats
  });

  it('pause freezes transport time; resume continues from that point without drift', () => {
    const clock = new MockAudioClock();
    const t = new Transport(() => clock.now(), 120);
    t.start(0, clock.now());
    clock.advanceSeconds(2);
    const s2 = t.snapshot();
    expect(s2.transportTime).toBeCloseTo(2, 8);
    expect(s2.beat).toBeCloseTo(4, 8);

    t.pause(clock.now());
    // Time passes while paused.
    clock.advanceSeconds(10);
    const sPaused = t.snapshot();
    // Still frozen at 2 seconds.
    expect(sPaused.transportTime).toBeCloseTo(2, 8);
    expect(sPaused.beat).toBeCloseTo(4, 8);
    expect(sPaused.playing).toBe(false);

    // Resume via Transport.start(undefined, audioTime).
    t.start(undefined, clock.now());
    clock.advanceSeconds(1);
    const sResumed = t.snapshot();
    // 2s + 1s = 3s transport time.
    expect(sResumed.transportTime).toBeCloseTo(3, 8);
    expect(sResumed.beat).toBeCloseTo(6, 8);
  });

  it('multiple pause/resume cycles stay coherent', () => {
    const clock = new MockAudioClock();
    const t = new Transport(() => clock.now(), 100);
    t.start(0, clock.now());
    const pulses = [0.3, 0.1, 1.2, 0.05, 2.7];
    let expectedTransport = 0;
    for (const playSec of pulses) {
      clock.advanceSeconds(playSec);
      expectedTransport += playSec;
      expect(t.getTransportTime()).toBeCloseTo(expectedTransport, 8);
      t.pause(clock.now());
      clock.advanceSeconds(999); // long background time
      expect(t.getTransportTime()).toBeCloseTo(expectedTransport, 8);
      t.start(undefined, clock.now());
    }
  });
});

describe('Transport — bar / beat-in-bar structure', () => {
  it('4/4, beat 0..3 → bar 0, beatInBar 0..4 (not clamped)', () => {
    const clock = new MockAudioClock(0);
    const t = new Transport(() => clock.now(), 120, [4, 4]);
    t.start(0);
    for (let i = 0; i < 100; i++) {
      const beat = i;
      const at = t.beatToAudioTime(beat);
      const snap = t.snapshot(at);
      expect(snap.bar).toBe(Math.floor(i / 4));
      expect(snap.beatInBar).toBeCloseTo(i % 4, 8);
    }
  });

  it('7/8 meter: bar length = 7', () => {
    const clock = new MockAudioClock();
    const t = new Transport(() => clock.now(), 112, [7, 8]);
    t.start(0);
    for (let i = 0; i < 20; i++) {
      const at = t.beatToAudioTime(i);
      const snap = t.snapshot(at);
      expect(snap.bar).toBe(Math.floor(i / 7));
      expect(snap.beatInBar).toBeCloseTo(i % 7, 8);
    }
  });
});

describe('Transport — seek / setBpm / reset keep anchor consistent', () => {
  it('seekToBeat jumps position without touching playing flag', () => {
    const clock = new MockAudioClock();
    const t = new Transport(() => clock.now(), 120);
    t.start(0, clock.now());
    clock.advanceSeconds(1); // beat 2
    t.seekToBeat(100, clock.now());
    clock.advanceSeconds(1); // another beat 2
    const snap = t.snapshot();
    expect(snap.beat).toBeCloseTo(102, 8);
  });

  it('setBpm preserves current transport position across tempo change (called while PAUSED per v1 contract)', () => {
    const clock = new MockAudioClock();
    const t = new Transport(() => clock.now(), 60); // 1 beat per second
    t.start(0, clock.now());
    clock.advanceSeconds(4);
    const before = t.getTransportTime();
    expect(before).toBeCloseTo(4, 8);
    expect(t.snapshot().beat).toBeCloseTo(4, 8);

    // GATE 0 PARTIAL Issue 1: setBpm is NOT allowed while playing. Caller
    // must pause first. This ensures already-scheduled ~120 ms WebAudio
    // queue cannot get out of sync with new transport math.
    t.pause(clock.now());
    expect(t.playing).toBe(false);

    // Switch to 120 BPM (2 beats per second).
    t.setBpm(120, clock.now());
    const afterSet = t.snapshot();
    // Beat position preserved across tempo change.
    // transportTime (seconds) now scales with new BPM: 4 beats / 2 bps = 2 s.
    expect(afterSet.beat).toBeCloseTo(4, 8);
    expect(afterSet.transportTime).toBeCloseTo(2, 8);

    // Resume playback (from current beat 4, i.e. transport 2 s).
    t.start(undefined, clock.now());
    expect(t.playing).toBe(true);
    // 1 more real second = 2 beats now.
    clock.advanceSeconds(1);
    const s = t.snapshot();
    expect(s.transportTime).toBeCloseTo(3, 8);  // 2 + 1
    expect(s.beat).toBeCloseTo(6, 8);  // 4 + 2 = 6 beats
  });

  it('reset() goes to beat 0, playing=false', () => {
    const clock = new MockAudioClock();
    const t = new Transport(() => clock.now(), 120);
    t.start(0);
    clock.advanceSeconds(5);
    t.reset(clock.now());
    expect(t.playing).toBe(false);
    expect(t.getTransportTime()).toBeCloseTo(0, 8);
    expect(t.snapshot().beat).toBeCloseTo(0, 8);
  });

  // ---- GATE 0 PARTIAL Issue 1: runtime setBpm state guard ----
  it('setBpm while PLAYING throws — runtime tempo changes forbidden (v1 contract)', () => {
    const clock = new MockAudioClock();
    const t = new Transport(() => clock.now(), 120);
    t.start(0, clock.now()); // -> playing = true
    expect(t.playing).toBe(true);
    expect(() => t.setBpm(140, clock.now())).toThrow(/runtime tempo changes are not allowed/i);
    // BPM unchanged after throw.
    expect(t.bpm).toBe(120);
  });

  it('setBpm while PAUSED works, beat preserved (AC advances during pause → beat STILL frozen at 4)', () => {
    // ---- GATE 0 PARTIAL Round-2 setBpm paused-gap regression test ----
    // Scenario exactly specified by source audit:
    //   60 BPM, start beat 0, play 4 s → beat 4
    //   PAUSE
    //   AudioContext advances ANOTHER 5 s (simulating user thought time,
    //   system idle, menu navigation — things where AC clock keeps ticking
    //   but our logical transport must NOT advance because playing=false).
    //   setBpm(120)
    //   EXPECT beat STILL exactly 4 (no 5-s gap jump to 9).
    //   Then resume + 1 active second → beat 6.
    const clock = new MockAudioClock();
    const t = new Transport(() => clock.now(), 60);
    t.start(0, clock.now());
    clock.advanceSeconds(4); // active play 4 s, 60 BPM → beat 4
    expect(t.snapshot().beat).toBeCloseTo(4, 8);
    t.pause(clock.now()); // playing = false at t_audio = 4.0, beat 4
    expect(t.playing).toBe(false);
    // CRITICAL: AudioContext clock advances another 5 s while PAUSED.
    // This is the exact case the old `curBeat = audioTimeToBeat(t)` got
    // wrong: audioTimeToBeat would compute transportAnchor + (9-4) * 1 bps
    // = 4 + 5 = beat 9 (a jump the player never actually played).
    clock.advanceSeconds(5);
    // Verify snapshot frozen: audioTime is now 9.0 but beat still 4.0.
    expect(t.snapshot(9).beat).toBeCloseTo(4, 8);
    // setBpm now. NEW code uses snapshot().beat → stays 4.0 after setBpm.
    t.setBpm(120, clock.now());
    expect(t.bpm).toBe(120);
    // PRIMARY ASSERTION for this bug fix:
    expect(t.snapshot().beat).toBeCloseTo(4, 8); // STILL 4, not 9!
    // Also raw transportSec matches new BPM: beat 4 @ 120 BPM = 2.0 s.
    expect(t.snapshot().transportTime).toBeCloseTo(2.0, 8);
    // Resume play for 1 wall-clock second → 2 beats at new 120 BPM.
    t.start(undefined, clock.now());
    clock.advanceSeconds(1);
    // Final: 4 (frozen) + 2 (new play) = 6 beats.
    expect(t.snapshot().beat).toBeCloseTo(6, 8);
  });

  it('setBpm before start() works (normal stage onStart path)', () => {
    const clock = new MockAudioClock();
    const t = new Transport(() => clock.now(), 120);
    // Default BPM: 120. Not playing yet.
    expect(t.playing).toBe(false);
    t.setBpm(96, clock.now());
    expect(t.bpm).toBe(96);
    t.start(0, clock.now());
    clock.advanceSeconds(5);
    // 96 BPM = 1.6 beats per second → 8 beats after 5 s.
    expect(t.snapshot().beat).toBeCloseTo(8, 8);
  });
});
