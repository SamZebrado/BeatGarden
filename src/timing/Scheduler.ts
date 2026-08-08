// Scheduler — periodic JS timer that fills WebAudio scheduling queue.
//
// DESIGN RULE:
//   JS timers (setInterval / setTimeout) ONLY tell the scheduler WHEN TO
//   RE-FILL the queue. They NEVER decide when a sound actually plays.
//
// Real sound onset is scheduled at an ABSOLUTE AudioContext time, provided
// by the transport. If the JS timer is jittery by a few ms, the sounds still
// come out on time because WebAudio's internal clock is authoritative.
//
// Configuration (from TIMING_CONFIG):
//   scheduleAheadMs = 100-150ms — how far into the future we pre-fill events.
//   lookaheadMs     = 20-30ms  — how often the JS timer fires.

import type { Transport } from '../timing/Transport';
import type { Synth, SoundName } from '../audio/Synth';
import type { TimingConfig } from '../timing/config';

/** An event scheduled on the transport. `type === 'audio'` is handled by the
 *  scheduler. Other types (e.g. gameplay cue) are handed to a callback so
 *  stages can drive visuals without creating notes per stage.
 */
export type ScheduledEventType = 'audio' | 'cue' | 'judge-target';

export interface ScheduledAudioEvent {
  type: 'audio';
  /** Beat index (on transport timeline) when this event fires. */
  beat: number;
  sound: SoundName;
  /** Optional frequency override, for pitched sounds. */
  freqHz?: number;
  /** Optional duration override. */
  durationSec?: number;
  /** 0..1, defaults vary per patch. */
  velocity?: number;
}

export interface ScheduledCueEvent {
  type: 'cue';
  beat: number;
  /** Gameplay-defined identifier, e.g. 'firefly-arrive' for visual cue. */
  name: string;
  payload?: unknown;
}

/** A gameplay target that will later be judged on input. The scheduler does
 *  not play audio for these; it just ensures they're in the timeline and
 *  exposes them for the Judge + Stage. `beat` is the target beat.
 */
export interface ScheduledJudgeTarget {
  type: 'judge-target';
  beat: number;
  /** Unique id within one stage play. Stable across scheduler ticks. */
  id: string;
  /** tap / holdStart / holdRelease / swipeLeft / swipeRight / callEcho */
  inputKind: 'tap' | 'holdStart' | 'holdRelease' | 'swipeLeft' | 'swipeRight' | 'callEcho';
  /** For hold: reference to the holdStart target id that pairs with this release. */
  pairedId?: string;
  /** Stage-defined metadata (e.g. which visual lane, sprite id). */
  meta?: unknown;
}

export type ScheduledEvent = ScheduledAudioEvent | ScheduledCueEvent | ScheduledJudgeTarget;

export type CueHandler = (ev: ScheduledCueEvent, audioTime: number, beat: number) => void;
export type AudioHandler = (ev: ScheduledAudioEvent, audioTime: number) => void;

export interface SchedulerOptions {
  config: TimingConfig;
  transport: Transport;
  synth?: Synth;
  /** Override how audio events fire. Default: use Synth. */
  audioHandler?: AudioHandler;
  /** Callback for gameplay cues as they reach (or pass) their audio time. */
  cueHandler?: CueHandler;
}

export class Scheduler {
  private readonly config: TimingConfig;
  private readonly transport: Transport;
  private readonly synth: Synth | undefined;
  private readonly audioHandler: AudioHandler | undefined;
  private readonly cueHandler: CueHandler | undefined;

  private timerId: number | null = null;

  // Immutable sorted event list. Sorted by `.beat` once in setEvents().
  private events: ScheduledEvent[] = [];

  // Cursor index into events: events at i < nextIndex are either already
  // scheduled into WebAudio or fired past, so we don't re-process them.
  private nextIndex: number = 0;

  // Judge targets: we hand them out on demand. Sorted copy.
  private judgeTargets: ScheduledJudgeTarget[] = [];

  // For metrics: length of audio queue at last tick.
  public lastScheduledQueueLength: number = 0;

  constructor(opts: SchedulerOptions) {
    this.config = opts.config;
    this.transport = opts.transport;
    this.synth = opts.synth;
    this.audioHandler = opts.audioHandler;
    this.cueHandler = opts.cueHandler;
  }

  /**
   * Set (and overwrite) the event list. Sorts by beat; resets cursor to
   * current transport beat position. Safe to call again on stage change.
   */
  setEvents(events: readonly ScheduledEvent[]): void {
    const sorted = [...events].sort((a, b) => a.beat - b.beat);
    this.events = sorted;
    this.judgeTargets = sorted.filter(
      (e): e is ScheduledJudgeTarget => e.type === 'judge-target',
    );
    // Align cursor: skip events that are already behind the current beat,
    // but still include events within look-ahead.
    const snap = this.transport.snapshot();
    const ahead = (this.config.scheduleAheadMs / 1000) * this.transport.beatsPerSecond;
    const cutoffBeat = snap.beat - ahead;
    let i = 0;
    while (i < sorted.length && sorted[i].beat < cutoffBeat) i++;
    this.nextIndex = i;
  }

  getEvents(): readonly ScheduledEvent[] {
    return this.events;
  }

  getJudgeTargets(): readonly ScheduledJudgeTarget[] {
    return this.judgeTargets;
  }

  /**
   * Events scheduled at or after beat `from` and strictly before beat `to`.
   * Useful for stages that want to render only a visible window.
   */
  getJudgeTargetsInWindow(fromBeat: number, toBeat: number): readonly ScheduledJudgeTarget[] {
    // Linear scan — N is small (e.g. <300 targets per stage). Replace with
    // binary search if/when stages get bigger.
    return this.judgeTargets.filter((t) => t.beat >= fromBeat && t.beat < toBeat);
  }

  /** Start the periodic fill timer. Idempotent. */
  start(): void {
    if (this.timerId !== null) return;
    const tickMs = this.config.lookaheadMs;
    const loop = () => {
      this.tick();
      this.timerId = window.setTimeout(loop, tickMs) as unknown as number;
    };
    loop();
  }

  /** Stop the timer. Idempotent. */
  stop(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * One scheduler tick — exposed publicly so tests can drive it deterministically
   * instead of sleeping.
   */
  tick(nowAudioOverride?: number): { scheduled: number; firedCues: number } {
    const audioNow = nowAudioOverride ?? this.transport.snapshot().audioTime;
    const bps = this.transport.beatsPerSecond;
    const scheduleAheadBeats = (this.config.scheduleAheadMs / 1000) * bps;

    let scheduled = 0;
    let firedCues = 0;
    const snap = this.transport.snapshot(audioNow);
    const horizonBeat = snap.beat + scheduleAheadBeats;

    while (this.nextIndex < this.events.length) {
      const ev = this.events[this.nextIndex];
      if (ev.beat > horizonBeat) break; // will pick up on future tick
      this.dispatch(ev, audioNow);
      if (ev.type === 'audio') scheduled++;
      else if (ev.type === 'cue') firedCues++;
      this.nextIndex++;
    }
    this.lastScheduledQueueLength = scheduled;
    return { scheduled, firedCues };
  }

  private dispatch(ev: ScheduledEvent, audioNow: number): void {
    switch (ev.type) {
      case 'audio': {
        const startAudioTime = this.transport.beatToAudioTime(ev.beat);
        if (startAudioTime < audioNow - 0.05) return; // late drop — should not happen in normal play
        if (this.audioHandler) {
          this.audioHandler(ev, startAudioTime);
        } else if (this.synth) {
          this.synth.play(ev.sound, startAudioTime, ev.freqHz, ev.durationSec, ev.velocity);
        }
        return;
      }
      case 'cue': {
        // Cues fire at or after their target audio time. Stage callback does
        // visual prep; no setTimeout here — stage reads transport time each frame.
        const at = this.transport.beatToAudioTime(ev.beat);
        if (this.cueHandler) this.cueHandler(ev, at, ev.beat);
        return;
      }
      case 'judge-target': {
        // Nothing to schedule for audio; target lives in the list for Judge.
        return;
      }
    }
  }
}
