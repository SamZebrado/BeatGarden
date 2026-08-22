// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { RunningLegend } from '../src/running/RunningLegend';

describe('Running Legend', () => {
  it('opens through the adjacent control and drives the authoritative pause callback until closed', () => {
    const root = document.createElement('main');
    const changes: boolean[] = [];
    const legend = new RunningLegend(root, {
      world: 'phd', textOff: false,
      getEntries: () => [{ symbol: '◆', name: 'Supervisor / PI', detail: 'Provides feedback.' }],
      onOpenChange: (open) => changes.push(open),
    });
    root.querySelector<HTMLButtonElement>('[data-role="legend-control"]')!.click();
    expect(root.dataset.legendOpen).toBe('true');
    expect(root.querySelector('[data-role="running-legend"]')).not.toBeNull();
    expect(changes).toEqual([true]);
    root.querySelector<HTMLButtonElement>('[data-role="legend-close"]')!.click();
    expect(root.dataset.legendOpen).toBeUndefined();
    expect(changes).toEqual([true, false]);
    legend.destroy();
  });

  it('creates no control or explanatory overlay in textOff mode', () => {
    const root = document.createElement('main');
    const onOpenChange = vi.fn();
    const legend = new RunningLegend(root, { world: 'work', textOff: true, getEntries: () => [], onOpenChange });
    expect(root.childElementCount).toBe(0);
    expect(onOpenChange).not.toHaveBeenCalled();
    legend.destroy();
  });
});
