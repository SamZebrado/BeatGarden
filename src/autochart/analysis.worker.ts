/// <reference lib="webworker" />

import { analyzeMonoPcm } from './analyzer';
import { AUTOCHART_CONFIG } from './config';

interface AnalyzeRequest {
  id: number;
  pcm: Float32Array;
  sampleRate: number;
}

const workerScope = self as DedicatedWorkerGlobalScope;

workerScope.onmessage = (event: MessageEvent<AnalyzeRequest>) => {
  const { id, pcm, sampleRate } = event.data;
  try {
    const analysis = analyzeMonoPcm(pcm, sampleRate, AUTOCHART_CONFIG, (progress) => {
      workerScope.postMessage({ id, type: 'progress', progress });
    });
    workerScope.postMessage({ id, type: 'complete', analysis });
  } catch (error) {
    workerScope.postMessage({
      id,
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

export {};

