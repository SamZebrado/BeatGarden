export interface MonoPreparationProgress {
  processedFrames: number;
  totalFrames: number;
}

/**
 * Mix and linearly resample an AudioBuffer into one bounded analysis channel.
 * Yields between chunks so Android UI can paint progress before the Worker FFT.
 */
export async function prepareMonoForAnalysis(
  buffer: AudioBuffer,
  targetSampleRate: number,
  onProgress?: (progress: MonoPreparationProgress) => void,
  shouldCancel?: () => boolean,
): Promise<Float32Array> {
  const outputLength = Math.ceil(buffer.duration * targetSampleRate);
  const output = new Float32Array(outputLength);
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index));
  const ratio = buffer.sampleRate / targetSampleRate;
  const chunkSize = 32_768;
  for (let chunkStart = 0; chunkStart < outputLength; chunkStart += chunkSize) {
    if (shouldCancel?.()) throw new Error('AutoChart analysis cancelled');
    const end = Math.min(outputLength, chunkStart + chunkSize);
    for (let i = chunkStart; i < end; i++) {
      const sourcePosition = i * ratio;
      const before = Math.floor(sourcePosition);
      const after = Math.min(buffer.length - 1, before + 1);
      const fraction = sourcePosition - before;
      let mixed = 0;
      for (const channel of channels) {
        mixed += channel[before] + (channel[after] - channel[before]) * fraction;
      }
      output[i] = mixed / Math.max(1, channels.length);
    }
    onProgress?.({ processedFrames: end, totalFrames: outputLength });
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  }
  return output;
}
