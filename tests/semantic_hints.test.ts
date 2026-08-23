// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SemanticHints, resetSemanticHints } from '../src/running/SemanticHints';

describe('Running semantic hints', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
      key: (index: number) => [...values.keys()][index] ?? null,
      get length() { return values.size; },
    };
    Object.defineProperty(window, 'localStorage', { configurable: true, value: storage });
    resetSemanticHints();
  });

  it('keeps the normal first-seen explanation readable for about four seconds', () => {
    let duration = 0;
    const finished = new Promise<void>(() => undefined);
    const animate = vi.fn((_frames: Keyframe[], options?: number | KeyframeAnimationOptions) => {
      duration = typeof options === 'number' ? options : Number(options?.duration ?? 0);
      return { finished, cancel: vi.fn() } as unknown as Animation;
    });
    Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: animate });
    const root = document.createElement('div');
    const hints = new SemanticHints(root, false);
    hints.show('orbit', 'running.hint.orbit');
    expect(duration).toBe(4000);
    expect(root.querySelector('[data-role="running-semantic-hint"]')?.textContent).toContain('◎');
    hints.destroy();
  });

  it('keeps textOff as a no-text mode', () => {
    const root = document.createElement('div');
    const hints = new SemanticHints(root, true);
    hints.show('orbit', 'running.hint.orbit');
    expect(root.childElementCount).toBe(0);
    hints.destroy();
  });

  it('persists the portrait guidance as a one-time hint', () => {
    const finished = new Promise<void>(() => undefined);
    const animate = vi.fn(() => ({ finished, cancel: vi.fn() } as unknown as Animation));
    Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: animate });
    const first = new SemanticHints(document.createElement('div'), false);
    first.show('portrait', 'running.hint.portrait');
    first.destroy();

    const second = new SemanticHints(document.createElement('div'), false);
    second.show('portrait', 'running.hint.portrait');
    expect(animate).toHaveBeenCalledTimes(1);
    second.destroy();
  });
});
