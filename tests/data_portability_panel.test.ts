// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { SAVE_BUNDLE_SCHEMA } from '../src/running/core/portability';
import { DEFAULT_RUNNING_SAVE, RUNNING_STORAGE_KEY } from '../src/running/core/save';
import { DataPortabilityPanel, formatSavePreview } from '../src/settings/DataPortabilityPanel';

describe('Settings Data & Portability panel', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => { values.set(key, value); },
        removeItem: (key: string) => { values.delete(key); },
        clear: () => values.clear(),
        key: (index: number) => [...values.keys()][index] ?? null,
        get length() { return values.size; },
      } satisfies Storage,
    });
    document.body.replaceChildren();
  });

  it('renders whole-save, custom-content, and Person controls without raw storage keys', () => {
    new DataPortabilityPanel(document.body);
    expect(document.querySelector('[data-role="data-portability"]')).not.toBeNull();
    expect(document.querySelector('[data-role="export-save"]')).not.toBeNull();
    expect(document.querySelector('[data-role="import-content"]')).not.toBeNull();
    expect(document.querySelector('[data-role="import-person"]')).not.toBeNull();
    expect(document.body.textContent).not.toContain('beatgarden.running');
  });

  it('previews and cancels before mutation, then applies only after confirmation', async () => {
    window.localStorage.setItem(RUNNING_STORAGE_KEY, JSON.stringify({ ...DEFAULT_RUNNING_SAVE, totalRuns: 2 }));
    window.localStorage.setItem('beatgarden.rhythm.progress.v1', 'preserve');
    new DataPortabilityPanel(document.body);
    const candidate = { schema: SAVE_BUNDLE_SCHEMA, version: 1, exportedAt: '2026-08-23T00:00:00.000Z', meta: { ...DEFAULT_RUNNING_SAVE, totalRuns: 9 }, currentRun: null };
    const input = document.querySelector<HTMLInputElement>('[data-role="import-save"]')!;
    Object.defineProperty(input, 'files', { configurable: true, value: [{ text: async () => JSON.stringify(candidate) }] });
    input.dispatchEvent(new Event('change'));
    await Promise.resolve(); await Promise.resolve();
    const preview = document.querySelector<HTMLElement>('[data-role="preview"]')!;
    expect(preview.hidden).toBe(false);
    expect(preview.textContent).toContain('9');
    document.querySelector<HTMLButtonElement>('[data-role="cancel"]')!.click();
    expect(JSON.parse(window.localStorage.getItem(RUNNING_STORAGE_KEY)!).totalRuns).toBe(2);

    input.dispatchEvent(new Event('change'));
    await Promise.resolve(); await Promise.resolve();
    document.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.click();
    expect(JSON.parse(window.localStorage.getItem(RUNNING_STORAGE_KEY)!).totalRuns).toBe(9);
    expect(window.localStorage.getItem('beatgarden.rhythm.progress.v1')).toBe('preserve');
  });

  it('formats a localized, plain-language unfinished-run preview', () => {
    expect(formatSavePreview({ world: 'phd', difficulty: 'garden', simulationTime: 65.9, totalRuns: 3, people: 1, bosses: 2 })).toMatch(/65s/);
  });
});
