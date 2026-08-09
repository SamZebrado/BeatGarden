import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudioEngine } from '../src/audio/AudioEngine';
import { resumeAfterAudioConfirmed } from '../src/game/playbackLifecycle';
import { Scheduler } from '../src/timing/Scheduler';
import { TIMING_CONFIG } from '../src/timing/config';
import { Transport } from '../src/timing/Transport';
import { MockAudioClock } from './mockAudioClock';

class FreezingAudioContext {
  public state: AudioContextState = 'running';
  public currentTime = 0;
  public sampleRate = 48_000;
  public destination = {} as AudioDestinationNode;

  createGain(): GainNode {
    return {
      gain: { value: 1, setTargetAtTime: () => undefined },
      connect: () => undefined,
    } as unknown as GainNode;
  }

  createBuffer(): AudioBuffer { return {} as AudioBuffer; }
  createBufferSource(): AudioBufferSourceNode {
    return {
      buffer: null,
      connect: () => undefined,
      start: () => undefined,
    } as unknown as AudioBufferSourceNode;
  }
  async resume(): Promise<void> { this.state = 'running'; }
  async suspend(): Promise<void> { this.state = 'suspended'; }
  async close(): Promise<void> { this.state = 'closed'; }
  advanceWall(seconds: number): void {
    if (this.state === 'running') this.currentTime += seconds;
  }
}

const originalAudioContext = globalThis.AudioContext;

describe('resume ordering regression', () => {
  afterEach(() => {
    globalThis.AudioContext = originalAudioContext;
    vi.restoreAllMocks();
  });

  it('Scheduler first synchronous tick observes Transport already resumed', () => {
    const clock = new MockAudioClock(1);
    const transport = new Transport(() => clock.now(), 120);
    transport.start(0, clock.now());
    clock.advanceMs(500);
    transport.pause(clock.now());

    const firstTickPlayingStates: boolean[] = [];
    const scheduler = new Scheduler({
      config: TIMING_CONFIG,
      transport,
      audioHandler: () => firstTickPlayingStates.push(transport.playing),
    });
    scheduler.setEvents([{ type: 'audio', beat: 1, sound: 'kick' }]);

    const timeout = vi.spyOn(globalThis, 'setTimeout').mockReturnValue(1 as never);
    resumeAfterAudioConfirmed(transport, scheduler, clock.now());

    expect(transport.playing).toBe(true);
    expect(firstTickPlayingStates).toEqual([true]);
    scheduler.stop();
    timeout.mockRestore();
  });

  it('manual pause freezes WebAudio and resumes next event once with no lookahead hole', async () => {
    globalThis.AudioContext = FreezingAudioContext as unknown as typeof AudioContext;
    const audio = new AudioEngine();
    const ctx = audio.ensureContext() as unknown as FreezingAudioContext;
    const transport = new Transport(() => audio.now(), 120);
    transport.start(0, audio.now());

    const scheduledBeats: number[] = [];
    const scheduler = new Scheduler({
      config: TIMING_CONFIG,
      transport,
      audioHandler: (event) => scheduledBeats.push(event.beat),
    });
    scheduler.setEvents([
      { type: 'audio', beat: 0.2, sound: 'kick' },
      { type: 'audio', beat: 1, sound: 'snare' },
    ]);
    vi.spyOn(globalThis, 'setTimeout').mockReturnValue(1 as never);
    scheduler.start();
    expect(scheduledBeats).toEqual([0.2]);

    scheduler.stop();
    await expect(audio.suspend()).resolves.toBe(true);
    transport.pause(audio.now());
    const frozen = transport.snapshot();
    ctx.advanceWall(5);
    expect(audio.now()).toBe(frozen.audioTime);
    expect(transport.snapshot().beat).toBe(frozen.beat);

    await expect(audio.resume()).resolves.toBe(true);
    resumeAfterAudioConfirmed(transport, scheduler, audio.now());
    ctx.advanceWall(0.4);
    const resumedTick = scheduler.tick(audio.now());

    expect(resumedTick.droppedLate).toBe(0);
    expect(scheduledBeats).toEqual([0.2, 1]);
    expect(scheduledBeats.filter((beat) => beat === 1)).toHaveLength(1);
    scheduler.stop();
    await audio.close();
  });
});
