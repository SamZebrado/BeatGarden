// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { musicIntervalMs, RUNNING_CUES, RUNNING_MUSIC_IDENTITIES, RunningAudio } from '../src/running/RunningAudio';

describe('Running procedural audio vocabulary', () => {
  it('gives all three worlds distinct patches, tempos, and pitch sets', () => {
    const identities = Object.values(RUNNING_MUSIC_IDENTITIES);
    expect(new Set(identities.map((identity) => identity.patch)).size).toBe(3);
    expect(new Set(identities.map((identity) => identity.spacing)).size).toBe(3);
    expect(new Set(identities.map((identity) => identity.notes.join(','))).size).toBe(3);
    expect(musicIntervalMs('master')).toBeLessThan(musicIntervalMs('work'));
    expect(musicIntervalMs('work')).toBeLessThan(musicIntervalMs('phd'));
  });

  it('uses separate, recognizable warning and active Lab Meeting cues', () => {
    expect(RUNNING_CUES['meeting-warning']).toEqual(['bell', 392, .3, .3]);
    expect(RUNNING_CUES['meeting-start']).toEqual(['snare', 180, .15, .36]);
    expect(RUNNING_CUES['meeting-warning']).not.toEqual(RUNNING_CUES['meeting-start']);
  });

  it('covers the bounded high-value feedback vocabulary', () => {
    for (const event of ['defeat', 'pickup', 'orbit', 'project', 'choice', 'signal', 'noise', 'phone', 'milestone-warning', 'boss', 'complete', 'damage', 'game-over']) {
      expect(RUNNING_CUES[event as keyof typeof RUNNING_CUES]).toBeDefined();
    }
  });

  it('does not start or reschedule music when delayed gesture unlock resolves after destroy', async () => {
    let resolveUnlock!: (value: boolean) => void;
    const unlock = new Promise<boolean>((resolve) => { resolveUnlock = resolve; });
    const close = vi.fn(async () => undefined);
    const play = vi.fn();
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
    const storage = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', { configurable: true, value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } });
    const root = document.createElement('div');
    document.body.appendChild(root);
    const audio = new RunningAudio(root, 'phd', { engine: {
      state: 'idle', now: () => 0, unlockFromUserGesture: () => unlock,
      setMusicVolume: vi.fn(), setSfxVolume: vi.fn(), close,
    }, synth: { play } });
    root.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    audio.destroy();
    resolveUnlock(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(play).not.toHaveBeenCalled();
    expect(setTimeoutSpy).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledOnce();
    expect(root.querySelector('[data-role="running-audio-toggle"]')).toBeNull();
    setTimeoutSpy.mockRestore();
    root.remove();
  });
});
