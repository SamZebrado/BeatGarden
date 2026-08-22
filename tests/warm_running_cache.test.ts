import { describe, expect, it } from 'vitest';
import { selectRunningCacheUrls } from '../src/pwa/warmRunningCache';

describe('Running PWA cache warming', () => {
  it('selects unique same-origin build assets and rejects unrelated URLs', () => {
    const entries = [
      { name: 'https://example.test/BeatGarden/assets/index-A.js' },
      { name: 'https://example.test/BeatGarden/assets/bootPhd-B.js' },
      { name: 'https://example.test/BeatGarden/assets/bootPhd-B.js' },
      { name: 'https://cdn.test/phaser.js' },
      { name: 'not a url' },
    ];
    expect(selectRunningCacheUrls(entries, { origin: 'https://example.test' } as Location)).toEqual([
      'https://example.test/BeatGarden/assets/index-A.js',
      'https://example.test/BeatGarden/assets/bootPhd-B.js',
    ]);
  });
});
