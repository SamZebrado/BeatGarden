import { describe, expect, it } from 'vitest';
import { loadBestScore, saveBestScore } from '../src/settings/scores';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

describe('local best scores', () => {
  it('persists a first score and replaces it only with a better result', () => {
    const storage = memoryStorage();
    saveBestScore('garden', { score: 100, accuracy: .5, total: 2 }, storage);
    saveBestScore('garden', { score: 80, accuracy: .9, total: 2 }, storage);
    expect(loadBestScore('garden', storage)?.score).toBe(100);
    saveBestScore('garden', { score: 120, accuracy: .6, total: 2 }, storage);
    expect(loadBestScore('garden', storage)).toEqual({ score: 120, accuracy: .6, total: 2 });
  });

  it('uses accuracy as a deterministic tie breaker', () => {
    const storage = memoryStorage();
    saveBestScore('garden', { score: 100, accuracy: .4, total: 2 }, storage);
    saveBestScore('garden', { score: 100, accuracy: .7, total: 2 }, storage);
    expect(loadBestScore('garden', storage)?.accuracy).toBe(.7);
  });
});
