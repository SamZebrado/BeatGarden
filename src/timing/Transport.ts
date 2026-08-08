// Transport — authoritative rhythm clock built on top of AudioContext.currentTime.
//
// KEY RULES (never break these):
// - The SOLE source of transport time is `audioCtx.currentTime` (NOT Date.now,
//   NOT performance.now, NOT requestAnimationFrame delta accumulation).
// - `songTime` NEVER advances by `+= deltaTime`; it is recomputed from
//   `audioCtx.currentTime - anchor` every read.
// - If a render frame is dropped, the next frame jumps to the correct visual
//   state — no permanent phase drift.
// - Pause/resume is implemented by updating the anchor; no silent beat drift
//   from accumulated JS timers.

export interface TransportState {
  playing: boolean;
  bpm: number;
  meter: [number, number]; // e.g. [4, 4]
  transportTime: number;   // seconds on transport timeline (song position)
  audioTime: number;       // AudioContext.currentTime snapshot when read
}

export interface TransportSnapshot extends TransportState {
  beat: number;       // fractional beat index
  bar: number;        // integer bar index
  beatInBar: number;  // 0..meter[0] (fractional)
}

export class Transport {
  private ctxTimeFn: () => number;

  // Anchor: at audio time `audioAnchor`, the transport position is `transportAnchor`.
  // If paused, we update anchors so next read continues from where we froze.
  private audioAnchor: number = 0;
  private transportAnchor: number = 0;
  private _playing: boolean = false;

  // ---- Runtime tempo-change semantics contract ----
  // GATE 0 PARTIAL Issue 1:
  //   Runtime `setBpm()` changes while playing would invalidate AudioNodes
  //   already scheduled into the WebAudio timeline for future beats. Those
  //   nodes do NOT move when our transport anchors change, so the user
  //   would hear the old BPM for ~120 ms after setBpm while subsequent
  //   audio (our JS-side rendering) uses the new BPM → audible misalignment.
  //
  // Resolution chosen for v1: OPTION A + OPTION C combined.
  //   (A) Calling setBpm during the `playing` state THROWS.
  //   (C) The architecture contract is: v1 stages do NOT support runtime
  //       tempo changes. Each stage sets a single BPM via buildEvents()/
  //       onStart() before transport.start(0) is called.
  //
  // If a future stage legitimately needs runtime tempo rubato, we must:
  //   - Cancel / invalidate all future scheduled AudioNodes;
  //   - Then rebuild schedule; or use scheduled-parameter tempo curves.
  // Not implemented in v1. -----------------------------------------------------------------------------------

  public bpm: number;
  public meter: [number, number];

  constructor(
    audioTimeFn: () => number,
    initialBpm: number = 120,
    meter: [number, number] = [4, 4],
  ) {
    this.ctxTimeFn = audioTimeFn;
    this.bpm = initialBpm;
    this.meter = meter;
    this.audioAnchor = audioTimeFn();
    this.transportAnchor = 0;
  }

  /** Seconds per beat based on current BPM. */
  get secondsPerBeat(): number {
    return 60 / this.bpm;
  }

  get beatsPerSecond(): number {
    return this.bpm / 60;
  }

  get playing(): boolean {
    return this._playing;
  }

  /** Raw transport time in seconds. Recomputed from audio clock every call. */
  getTransportTime(audioNow?: number): number {
    const t = audioNow ?? this.ctxTimeFn();
    if (this._playing) {
      return this.transportAnchor + (t - this.audioAnchor);
    }
    return this.transportAnchor;
  }

  /** Read the full snapshot. */
  snapshot(audioNow?: number): TransportSnapshot {
    const audioTime = audioNow ?? this.ctxTimeFn();
    const transportTime = this.getTransportTime(audioTime);
    const beat = transportTime * this.beatsPerSecond;
    const barLen = this.meter[0];
    const bar = Math.floor(beat / barLen);
    const beatInBar = beat - bar * barLen;
    return {
      playing: this._playing,
      bpm: this.bpm,
      meter: this.meter,
      transportTime,
      audioTime,
      beat,
      bar,
      beatInBar,
    };
  }

  /** Convert beat offset to absolute audio time (seconds on ctx timeline). */
  beatToAudioTime(beat: number): number {
    // audioTime = audioAnchor + (transportTime - transportAnchor)
    const transportTime = beat / this.beatsPerSecond;
    return this.audioAnchor + (transportTime - this.transportAnchor);
  }

  /** Convert absolute audio time back to transport beat index. */
  audioTimeToBeat(audioTime: number): number {
    const transportTime = this.transportAnchor + (audioTime - this.audioAnchor);
    return transportTime * this.beatsPerSecond;
  }

  beatToSeconds(beat: number): number {
    return beat * this.secondsPerBeat;
  }

  barToSeconds(bar: number): number {
    return bar * this.meter[0] * this.secondsPerBeat;
  }

  /**
   * Start transport from given beat position (default: current position).
   * Uses the current audio time as anchor — NOT Date.now / setTimeout.
   */
  start(atBeat?: number, audioNow?: number): void {
    const t = audioNow ?? this.ctxTimeFn();
    if (atBeat !== undefined) {
      this.transportAnchor = atBeat * this.secondsPerBeat;
    } else {
      this.transportAnchor = this.getTransportTime(t);
    }
    this.audioAnchor = t;
    this._playing = true;
  }

  /** Freeze transport at current position. */
  pause(audioNow?: number): void {
    const t = audioNow ?? this.ctxTimeFn();
    this.transportAnchor = this.getTransportTime(t);
    this.audioAnchor = t;
    this._playing = false;
  }

  /** Toggle play/pause. */
  toggle(audioNow?: number): void {
    if (this._playing) this.pause(audioNow);
    else this.start(undefined, audioNow);
  }

  /**
   * Hard reset to beat 0 at given audio time. Resets playing state to false.
   */
  reset(audioNow?: number): void {
    const t = audioNow ?? this.ctxTimeFn();
    this.audioAnchor = t;
    this.transportAnchor = 0;
    this._playing = false;
  }

  /** Seek to a beat. Preserves playing flag but updates anchor. */
  seekToBeat(beat: number, audioNow?: number): void {
    const t = audioNow ?? this.ctxTimeFn();
    this.transportAnchor = beat * this.secondsPerBeat;
    this.audioAnchor = t;
  }

  setBpm(bpm: number, audioNow?: number): void {
    if (bpm <= 0) throw new Error('BPM must be positive');
    // ---- GATE 0 PARTIAL Issue 1: state guard ----
    // AudioNodes scheduled into the WebAudio future queue (≈120 ms window)
    // cannot be re-timed retroactively. Therefore setBpm() is ONLY permitted
    // when the transport is NOT playing. In v1, stages set BPM during
    // onStart() BEFORE transport.start(beat 0).
    if (this._playing) {
      throw new Error(
        'Transport.setBpm: runtime tempo changes are not allowed while playing. ' +
          'Scheduled AudioNodes cannot be re-timed once submitted to WebAudio. ' +
          'Call setBpm before start(), or while paused/stopped/reset.',
      );
    }
    // Preserve current BEAT position across tempo change (not raw seconds).
    const t = audioNow ?? this.ctxTimeFn();
    const curBeat = this.audioTimeToBeat(t);
    this.bpm = bpm;
    this.audioAnchor = t;
    // With new bpm: transportSec = beat * newSecondsPerBeat.
    // NOTE: when _playing=false, getTransportTime() uses transportAnchor
    // directly, so assigning transportAnchor here also guarantees that
    // getTransportTime() → getBeat() gives the same (preserved) curBeat.
    this.transportAnchor = curBeat * this.secondsPerBeat;
  }

  setMeter(meter: [number, number]): void {
    if (meter[0] <= 0 || meter[1] <= 0) throw new Error('Invalid meter');
    this.meter = meter;
  }
}
