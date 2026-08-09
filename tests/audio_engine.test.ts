// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AudioEngine } from '../src/audio/AudioEngine';

type ResumeOutcome = 'running' | 'resolved-suspended' | 'reject';

class FakeAudioContext {
  public state: AudioContextState;
  public currentTime = 0;
  public sampleRate = 48_000;
  public destination = {} as AudioDestinationNode;
  public resumeOutcomes: ResumeOutcome[] = [];
  public resumeCalls = 0;
  public suspendCalls = 0;

  constructor(_opts?: AudioContextOptions) {
    this.state = FakeAudioContext.initialState;
    FakeAudioContext.latest = this;
  }

  static initialState: AudioContextState = 'suspended';
  static latest: FakeAudioContext | null = null;

  createGain(): GainNode {
    return {
      gain: { value: 1, setTargetAtTime: () => undefined },
      connect: () => undefined,
    } as unknown as GainNode;
  }

  createBuffer(): AudioBuffer {
    return {} as AudioBuffer;
  }

  createBufferSource(): AudioBufferSourceNode {
    return {
      buffer: null,
      connect: () => undefined,
      start: () => undefined,
    } as unknown as AudioBufferSourceNode;
  }

  async resume(): Promise<void> {
    this.resumeCalls++;
    const outcome = this.resumeOutcomes.shift() ?? 'running';
    await Promise.resolve();
    if (outcome === 'reject') throw new Error('autoplay blocked');
    this.state = outcome === 'running' ? 'running' : 'suspended';
  }

  async suspend(): Promise<void> {
    this.suspendCalls++;
    this.state = 'suspended';
  }

  async close(): Promise<void> {
    this.state = 'closed';
  }
}

const originalAudioContext = globalThis.AudioContext;

function setDocumentHidden(hidden: boolean): void {
  Object.defineProperty(document, 'hidden', { configurable: true, value: hidden });
}

async function flushAsyncLifecycle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('AudioEngine confirmed-running lifecycle', () => {
  beforeEach(() => {
    FakeAudioContext.initialState = 'suspended';
    FakeAudioContext.latest = null;
    globalThis.AudioContext = FakeAudioContext as unknown as typeof AudioContext;
    setDocumentHidden(false);
  });

  afterEach(() => {
    globalThis.AudioContext = originalAudioContext;
  });

  it('initial unlock rejection stays idle and reports failure', async () => {
    const audio = new AudioEngine();
    const ctx = audio.ensureContext() as unknown as FakeAudioContext;
    ctx.resumeOutcomes.push('reject');

    await expect(audio.unlockFromUserGesture()).resolves.toBe(false);
    expect(audio.state).toBe('idle');
    expect(ctx.state).toBe('suspended');
    await audio.close();
  });

  it('resolved resume is insufficient unless ctx.state is running', async () => {
    const audio = new AudioEngine();
    const ctx = audio.ensureContext() as unknown as FakeAudioContext;
    ctx.resumeOutcomes.push('resolved-suspended');

    await expect(audio.resumeAndConfirmRunning()).resolves.toBe(false);
    expect(audio.state).toBe('idle');
    await audio.close();
  });

  it('visibility rejection then gesture recovery fires onResume exactly once', async () => {
    FakeAudioContext.initialState = 'running';
    const audio = new AudioEngine();
    const ctx = audio.ensureContext() as unknown as FakeAudioContext;
    let resumes = 0;
    audio.setLifecycleHooks({ onResume: () => resumes++ });

    setDocumentHidden(true);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(audio.state).toBe('suspended');
    expect(ctx.suspendCalls).toBe(1);

    ctx.resumeOutcomes.push('reject', 'running');
    setDocumentHidden(false);
    document.dispatchEvent(new Event('visibilitychange'));
    await flushAsyncLifecycle();
    expect(audio.state).toBe('suspended');
    expect(resumes).toBe(0);

    await expect(audio.unlockFromUserGesture()).resolves.toBe(true);
    expect(audio.state).toBe('unlocked');
    expect(resumes).toBe(1);
    await audio.close();
  });

  it('deduplicates concurrent recovery attempts and lifecycle hook', async () => {
    const audio = new AudioEngine();
    const ctx = audio.ensureContext() as unknown as FakeAudioContext;
    await audio.suspend();
    ctx.resumeOutcomes.push('running');
    let resumes = 0;
    audio.setLifecycleHooks({ onResume: () => resumes++ });

    const [a, b] = await Promise.all([
      audio.resumeAndConfirmRunning(),
      audio.unlockFromUserGesture(),
    ]);
    expect([a, b]).toEqual([true, true]);
    expect(ctx.resumeCalls).toBe(1);
    expect(resumes).toBe(1);
    await audio.close();
  });
});
