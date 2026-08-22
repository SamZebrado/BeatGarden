import { describe, expect, it } from 'vitest';
import { DEFAULT_RUNNING_SAVE, loadRunningSave, RUNNING_STORAGE_KEY, saveRunningData } from '../src/running/core/save';

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
    expect(loadRunningSave(memoryStorage({ [RUNNING_STORAGE_KEY]: '{"version":2}' }))).toEqual(DEFAULT_RUNNING_SAVE);
  });

  it('clamps invalid fields without touching Rhythm keys', () => {
    const storage = memoryStorage({
      'beatgarden.settings.v1': '{"musicVolume":0.4}',
      'beatgarden.best.firefly-dock': '{"score":99}',
      [RUNNING_STORAGE_KEY]: '{"version":1,"lastWorld":"work","totalRuns":-5}',
    });
    expect(loadRunningSave(storage)).toEqual({ version: 1, lastWorld: 'work', totalRuns: 0 });
    saveRunningData({ version: 1, lastWorld: 'master', totalRuns: 1 }, storage);
    expect(storage.values.get('beatgarden.settings.v1')).toBe('{"musicVolume":0.4}');
    expect(storage.values.get('beatgarden.best.firefly-dock')).toBe('{"score":99}');
  });
});
