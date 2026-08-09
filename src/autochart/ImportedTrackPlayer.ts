export interface ImportedTrackPlayerOptions {
  context: BaseAudioContext;
  destination: AudioNode;
}

/** One-shot AudioBufferSource lifecycle for imported local music. */
export class ImportedTrackPlayer {
  private source: AudioBufferSourceNode | null = null;
  private generation = 0;

  constructor(private readonly options: ImportedTrackPlayerOptions) {}

  start(buffer: AudioBuffer, songTimeSec = 0, audioTime = this.options.context.currentTime): number {
    this.stop();
    const source = this.options.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.options.destination);
    const generation = ++this.generation;
    source.onended = () => {
      if (this.source === source && this.generation === generation) this.source = null;
    };
    source.start(audioTime, Math.max(0, Math.min(songTimeSec, buffer.duration)));
    this.source = source;
    return generation;
  }

  stop(): void {
    const source = this.source;
    this.source = null;
    if (!source) return;
    try {
      source.stop();
    } catch {
      // A source can already have ended; it is still safe to disconnect it.
    }
    try {
      source.disconnect();
    } catch {
      // Ignore browsers that already disconnected the ended source.
    }
  }

  get isPlaying(): boolean {
    return this.source !== null;
  }
}

