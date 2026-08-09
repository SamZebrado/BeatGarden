import { describe, expect, it } from 'vitest';
import { ImportedTrackPlayer } from '../src/autochart/ImportedTrackPlayer';

class FakeSource {
  buffer: AudioBuffer | null = null;
  onended: (() => void) | null = null;
  starts: Array<{ when: number; offset: number }> = [];
  stops = 0;
  disconnects = 0;
  connect(): void {}
  start(when = 0, offset = 0): void { this.starts.push({ when, offset }); }
  stop(): void { this.stops++; }
  disconnect(): void { this.disconnects++; }
}

class FakeContext {
  currentTime = 10;
  sources: FakeSource[] = [];
  createBufferSource(): AudioBufferSourceNode {
    const source = new FakeSource();
    this.sources.push(source);
    return source as unknown as AudioBufferSourceNode;
  }
}

describe('ImportedTrackPlayer one-shot source lifecycle', () => {
  it('creates a new source for restart and seek and stops the old source', () => {
    const context = new FakeContext();
    const player = new ImportedTrackPlayer({
      context: context as unknown as BaseAudioContext,
      destination: {} as AudioNode,
    });
    const buffer = { duration: 180 } as AudioBuffer;
    player.start(buffer, 0, 10.05);
    player.start(buffer, 32.5, 12);
    expect(context.sources).toHaveLength(2);
    expect(context.sources[0].starts).toEqual([{ when: 10.05, offset: 0 }]);
    expect(context.sources[0].stops).toBe(1);
    expect(context.sources[0].disconnects).toBe(1);
    expect(context.sources[1].starts).toEqual([{ when: 12, offset: 32.5 }]);
  });

  it('ignores an old source onended after a replacement source starts', () => {
    const context = new FakeContext();
    const player = new ImportedTrackPlayer({ context: context as unknown as BaseAudioContext, destination: {} as AudioNode });
    const buffer = { duration: 10 } as AudioBuffer;
    player.start(buffer);
    const first = context.sources[0];
    player.start(buffer);
    first.onended?.();
    expect(player.isPlaying).toBe(true);
    context.sources[1].onended?.();
    expect(player.isPlaying).toBe(false);
  });
});

