// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RunningModeHost } from '../src/running/RunningModeHost';
import { CURRENT_RUN_STORAGE_KEY, saveCurrentRun } from '../src/running/core/currentRun';
import { RunningSimulation } from '../src/running/core/simulation';

describe('Running resume entry UX', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', { configurable: true, value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key), clear: () => values.clear(),
      key: (index: number) => [...values.keys()][index] ?? null,
      get length() { return values.size; },
    } });
  });

  it('offers explicit Continue Run / Start New Run with stored context', () => {
    const simulation = new RunningSimulation(42, { difficulty: 'storm' });
    saveCurrentRun({ version: 1, status: 'active', savedAt: Date.now(), seed: 42, world: 'phd', difficulty: 'storm', simulation: simulation.exportState() });
    const root = document.createElement('div');
    const host = new RunningModeHost(root, { initialWorld: null, difficulty: 'garden', onBack: vi.fn(), onWorldChanged: vi.fn(), onDifficultyChanged: vi.fn() });
    host.start();
    expect(root.querySelector('[data-role="running-resume-choice"]')).not.toBeNull();
    expect(root.querySelector('[data-role="continue-run"]')?.textContent).toMatch(/Continue Run|继续游戏/);
    expect(root.textContent).toMatch(/Storm|风暴/);
    host.destroy();
  });

  it('Start New Run clears only current-run data and returns to world selection', () => {
    localStorage.setItem('beatgarden.settings.v1', '{"musicVolume":0.4}');
    localStorage.setItem('beatgarden.running.v2', '{"version":2,"totalRuns":8}');
    const simulation = new RunningSimulation(42);
    saveCurrentRun({ version: 1, status: 'active', savedAt: Date.now(), seed: 42, world: 'phd', difficulty: 'garden', simulation: simulation.exportState() });
    const root = document.createElement('div');
    const host = new RunningModeHost(root, { initialWorld: null, difficulty: 'garden', onBack: vi.fn(), onWorldChanged: vi.fn(), onDifficultyChanged: vi.fn() });
    host.start();
    root.querySelector<HTMLButtonElement>('[data-role="start-new-run"]')!.click();
    expect(localStorage.getItem(CURRENT_RUN_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem('beatgarden.settings.v1')).toBe('{"musicVolume":0.4}');
    expect(root.querySelector('[data-role="running-world-select"]')).not.toBeNull();
    host.destroy();
  });
});
