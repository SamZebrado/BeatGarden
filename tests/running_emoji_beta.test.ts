// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmojiBeta, reactionFor } from '../src/running/EmojiBeta';
import { RunningSimulation } from '../src/running/core/simulation';

describe('Running Emoji Beta', () => {
  beforeEach(() => {
    const finished = new Promise<void>(() => undefined);
    Object.defineProperty(HTMLElement.prototype, 'animate', {
      configurable: true,
      value: vi.fn(() => ({ finished, cancel: vi.fn() } as unknown as Animation)),
    });
  });

  it('defaults off, stays session-only, and emits one transition reaction when enabled', () => {
    const root = document.createElement('div');
    const beta = new EmojiBeta(root, false);
    const button = root.querySelector<HTMLButtonElement>('[data-role="running-emoji-toggle"]')!;
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.textContent).toContain('Emoji');

    const prior = new RunningSimulation(91).snapshot();
    const current = structuredClone(prior);
    current.time = 20;
    current.phd.lifestyle = { id: 'mindfulness', remaining: 28 };
    beta.update(current, prior, { x: 180, y: 420 });
    expect(root.querySelector('[data-role="running-player-emoji"]')).toBeNull();

    button.click();
    beta.update(current, prior, { x: 180, y: 420 });
    expect(root.querySelector('[data-role="running-player-emoji"]')?.textContent).toBe('😌');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    beta.destroy();
  });

  it('maps milestone success and keeps Text Off to an icon-only control', () => {
    const prior = new RunningSimulation(92).snapshot();
    const current = structuredClone(prior);
    current.phd.qualifying = 'passed';
    expect(reactionFor(current, prior)).toBe('🎓');

    const root = document.createElement('div');
    const beta = new EmojiBeta(root, true);
    const button = root.querySelector<HTMLButtonElement>('[data-role="running-emoji-toggle"]')!;
    expect(button.textContent).toBe('🙂');
    expect(button.getAttribute('aria-label')).toContain('Emoji');
    beta.destroy();
  });
});
