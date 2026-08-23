// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppController } from '../src/app/AppController';
import {
  animateRhythmReveal,
  RHYTHM_REVEAL_DURATION_MS,
  shouldReduceRhythmMotion,
} from '../src/app/revealTransition';
import { updateSettings } from '../src/settings/settings';

describe('Rhythm shell reveal transition', () => {
  const values = new Map<string, string>();
  const finish = vi.fn();
  const animate = vi.fn(() => ({ finish }) as unknown as Animation);

  beforeEach(() => {
    values.clear();
    finish.mockClear();
    animate.mockClear();
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
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: false })),
    });
    Object.defineProperty(HTMLElement.prototype, 'animate', {
      configurable: true,
      value: animate,
    });
  });

  it('disables shell reveal when BeatGarden reduced motion is saved', () => {
    updateSettings({ reducedMotion: true });
    const root = document.createElement('div');
    new AppController(root).showMenu();
    expect(shouldReduceRhythmMotion()).toBe(true);
    expect(animate).not.toHaveBeenCalled();
  });

  it('disables shell reveal when the OS requests reduced motion', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: true })),
    });
    const root = document.createElement('div');
    new AppController(root).showMenu();
    expect(shouldReduceRhythmMotion()).toBe(true);
    expect(animate).not.toHaveBeenCalled();
  });

  it('uses the exact 220 ms normal reveal and first pointer finishes it', () => {
    const panel = document.createElement('section');
    animateRhythmReveal(panel, [{ opacity: 0 }, { opacity: 1 }]);
    expect(animate).toHaveBeenCalledWith(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: RHYTHM_REVEAL_DURATION_MS, easing: 'cubic-bezier(.2,.8,.2,1)' },
    );
    expect(RHYTHM_REVEAL_DURATION_MS).toBe(220);
    panel.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(finish).toHaveBeenCalledTimes(1);
  });

  it('does not delay an immediate result Retry click while reveal is active', () => {
    const panel = document.createElement('section');
    const retry = document.createElement('button');
    retry.dataset.role = 'retry';
    panel.appendChild(retry);
    const onRetry = vi.fn();
    retry.addEventListener('click', onRetry);

    animateRhythmReveal(panel, [{ opacity: 0 }, { opacity: 1 }]);
    retry.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(finish).not.toHaveBeenCalled();
  });
});
