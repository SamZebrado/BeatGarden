// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { GardenJournal } from '../src/running/GardenJournal';
import { recordSuccessfulJourney } from '../src/running/core/save';

describe('Garden Journal presentation safety', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => void values.set(key, value), removeItem: (key: string) => void values.delete(key), clear: () => values.clear(), key: (index: number) => [...values.keys()][index] ?? null, get length() { return values.size; } };
    Object.defineProperty(window, 'localStorage', { configurable: true, value: storage });
  });

  it('renders imported free text as data instead of executable DOM', () => {
    recordSuccessfulJourney({
      sourceRunId: 'imported-markup', completedAt: '2026-08-23T00:00:00.000Z', world: 'phd', difficulty: 'garden', runDuration: 10,
      finalStage: '<script>bad()</script>', personCode: '<img src=x onerror=bad()>', routeChoices: ['route'], relationship: null,
      build: { orbit: 1, cadence: 0, vitality: 0 }, resources: { energy: 50, focus: 50, spirit: 50 }, milestones: ['phd:complete'],
      storyMarks: [], musicStyle: 'classic',
    });
    const root = document.createElement('div');
    new GardenJournal(root, () => undefined);
    expect(root.querySelector('img')).toBeNull();
    expect(root.querySelector('script')).toBeNull();
    expect(root.textContent).toContain('<img src=x onerror=bad()>');
    expect(root.textContent).toContain('<script>bad()</script>');
  });
});
