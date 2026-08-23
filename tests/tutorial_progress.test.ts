// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { hasCompletedTutorial, markTutorialCompleted, resetTutorialProgress } from '../src/game/tutorialProgress';

describe('Rhythm tutorial progress', () => {
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

  it('persists completion per stage and resets only the tutorial record', () => {
    window.localStorage.setItem('beatgarden.settings.v1', '{"musicVolume":0.4}');
    expect(hasCompletedTutorial('bubble-kitchen')).toBe(false);
    markTutorialCompleted('bubble-kitchen');
    markTutorialCompleted('cloud-post');
    expect(hasCompletedTutorial('bubble-kitchen')).toBe(true);
    expect(hasCompletedTutorial('cloud-post')).toBe(true);
    expect(hasCompletedTutorial('firefly-dock')).toBe(false);
    resetTutorialProgress();
    expect(hasCompletedTutorial('bubble-kitchen')).toBe(false);
    expect(window.localStorage.getItem('beatgarden.settings.v1')).toBe('{"musicVolume":0.4}');
  });

  it('recovers conservatively from malformed dedicated progress', () => {
    window.localStorage.setItem('beatgarden.rhythmTutorials.v1', '{bad');
    expect(hasCompletedTutorial('bubble-kitchen')).toBe(false);
    markTutorialCompleted('bubble-kitchen');
    expect(hasCompletedTutorial('bubble-kitchen')).toBe(true);
  });
});
