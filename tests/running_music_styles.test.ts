// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RUNNING_MUSIC_STYLES, RunningAudio, musicIntervalMs } from '../src/running/RunningAudio';
import { DEFAULT_RUNNING_SAVE, RUNNING_STORAGE_KEY, loadRunningSave, updateRunningSave } from '../src/running/core/save';
import { RunningSimulation } from '../src/running/core/simulation';

describe('Running selectable music styles', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', { configurable: true, value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
      removeItem: (key: string) => void values.delete(key),
      clear: () => values.clear(),
      key: (index: number) => [...values.keys()][index] ?? null,
      get length() { return values.size; },
    } satisfies Storage });
  });

  it('ships Classic, long-session restrained chiptune, and Quiet Organic immediately', () => {
    expect(Object.keys(RUNNING_MUSIC_STYLES)).toEqual(['classic', 'chiptune', 'organic']);
    expect(RUNNING_MUSIC_STYLES.chiptune).toMatchObject({ patch: 'lead', spacingScale: .9, baseVelocity: .085 });
    expect(musicIntervalMs('master', 'chiptune')).toBeGreaterThanOrEqual(378);
    expect(musicIntervalMs('phd', 'organic')).toBeGreaterThan(musicIntervalMs('phd', 'classic'));
  });

  it('keeps eight-step Chiptune pressure restrained instead of clicking every step', async () => {
    vi.useFakeTimers();
    updateRunningSave({ musicStyle: 'chiptune', dynamicIntensity: 'full' });
    const play = vi.fn();
    const root = document.createElement('div');
    document.body.appendChild(root);
    const audio = new RunningAudio(root, 'master', { engine: {
      state: 'unlocked', now: () => 0, unlockFromUserGesture: async () => true,
      setMusicVolume: vi.fn(), setSfxVolume: vi.fn(), close: vi.fn(async () => undefined),
    }, synth: { play } });
    audio.setPressure(true);
    root.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(musicIntervalMs('master', 'chiptune') * 7 + 1);

    const calls = play.mock.calls;
    expect(calls.filter(([patch]) => patch === 'uiClick')).toHaveLength(4);
    expect(calls.filter(([patch, , frequency, , velocity]) => patch === 'lead' && frequency === 462.5 && velocity === .04)).toHaveLength(1);
    audio.destroy();
    root.remove();
    vi.useRealTimers();
  });

  it('migrates defaults and persists style, volumes, mute and intensity', () => {
    window.localStorage.setItem(RUNNING_STORAGE_KEY, JSON.stringify(DEFAULT_RUNNING_SAVE));
    expect(loadRunningSave().musicStyle).toBe('classic');
    updateRunningSave({ musicStyle: 'chiptune', runningMusicVolume: .4, runningSfxVolume: .3, dynamicIntensity: 'soft', audioMuted: true });
    expect(loadRunningSave()).toMatchObject({ musicStyle: 'chiptune', runningMusicVolume: .4, runningSfxVolume: .3, dynamicIntensity: 'soft', audioMuted: true });
  });

  it('does not mutate gameplay or consume RNG when preference changes', () => {
    const simulation = new RunningSimulation(44);
    const before = simulation.exportState();
    updateRunningSave({ musicStyle: 'organic', dynamicIntensity: 'off' });
    expect(simulation.exportState()).toEqual(before);
  });
});
