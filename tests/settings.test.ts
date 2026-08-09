// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, updateSettings } from '../src/settings/settings';

describe('local settings', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
        clear: () => values.clear(),
        key: (index: number) => [...values.keys()][index] ?? null,
        get length() { return values.size; },
      } satisfies Storage,
    });
  });

  it('uses safe defaults and persists updates', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    updateSettings({ musicVolume: 0.25, calibrationOffsetMs: 42, reducedMotion: true });
    expect(loadSettings()).toMatchObject({ musicVolume: 0.25, calibrationOffsetMs: 42, reducedMotion: true });
  });

  it('clamps corrupt or out-of-range values', () => {
    window.localStorage.setItem('beatgarden.settings.v1', JSON.stringify({ musicVolume: 9, sfxVolume: -4, calibrationOffsetMs: 999 }));
    expect(loadSettings()).toMatchObject({ musicVolume: 1, sfxVolume: 0, calibrationOffsetMs: 250 });
  });
});
