import { describe, expect, it } from 'vitest';
import { DEFAULT_RUNNING_SAVE, loadRunningSave, markHintSeen, markWorldCompleted, RUNNING_STORAGE_KEY, RUNNING_STORAGE_KEY_V1, saveRunningData } from '../src/running/core/save';

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    values,
  };
}

describe('Running save namespace', () => {
  it('uses safe defaults for missing, corrupt, or unknown versions', () => {
    expect(loadRunningSave(memoryStorage())).toEqual(DEFAULT_RUNNING_SAVE);
    expect(loadRunningSave(memoryStorage({ [RUNNING_STORAGE_KEY]: '{bad' }))).toEqual(DEFAULT_RUNNING_SAVE);
    expect(loadRunningSave(memoryStorage({ [RUNNING_STORAGE_KEY]: '{"version":3}' }))).toEqual(DEFAULT_RUNNING_SAVE);
  });

  it('clamps invalid fields without touching Rhythm keys', () => {
    const storage = memoryStorage({
      'beatgarden.settings.v1': '{"musicVolume":0.4}',
      'beatgarden.best.firefly-dock': '{"score":99}',
      [RUNNING_STORAGE_KEY_V1]: '{"version":1,"lastWorld":"work","totalRuns":-5}',
    });
    expect(loadRunningSave(storage)).toMatchObject({ version: 2, lastWorld: 'work', totalRuns: 0 });
    expect(storage.values.has(RUNNING_STORAGE_KEY)).toBe(true);
    saveRunningData({ ...DEFAULT_RUNNING_SAVE, version: 2, lastWorld: 'master', totalRuns: 1 }, storage);
    expect(storage.values.get('beatgarden.settings.v1')).toBe('{"musicVolume":0.4}');
    expect(storage.values.get('beatgarden.best.firefly-dock')).toBe('{"score":99}');
  });

  it('persists additive meta progression, hint state, and difficulty records', () => {
    const storage = memoryStorage();
    markHintSeen('phone', storage);
    markHintSeen('phone', storage);
    markWorldCompleted('work', 'storm', storage);
    const save = loadRunningSave(storage);
    expect(save.seenHints).toEqual(['phone']);
    expect(save.worldCompletions.work).toBe(1);
    expect(save.difficultyRecords.work).toBe('storm');
    expect(save.unlockedContent).toContain('boss-studio');
  });

  it('still performs the pure v1 migration when a corrupt v2 value is present', () => {
    const storage = memoryStorage({ [RUNNING_STORAGE_KEY]: '{bad', [RUNNING_STORAGE_KEY_V1]: '{"version":1,"lastWorld":"phd","totalRuns":4}' });
    expect(loadRunningSave(storage)).toMatchObject({ version: 2, lastWorld: 'phd', totalRuns: 4 });
  });

  it('revalidates persisted Boss payloads instead of trusting the metadata envelope', () => {
    const storage = memoryStorage({ [RUNNING_STORAGE_KEY]: JSON.stringify({ ...DEFAULT_RUNNING_SAVE, customBosses: [{ id: 'looks-safe', displayName: 'Unsafe', origin: 'custom', worlds: ['phd'], updatedAt: '2026-08-22T00:00:00Z', data: { schema: 'beatgarden-boss.v1', id: 'looks-safe', script: 'bad' } }] }) });
    expect(loadRunningSave(storage).customBosses).toEqual([]);
  });
});
