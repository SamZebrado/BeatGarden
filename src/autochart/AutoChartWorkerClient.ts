import type { AutoChartAnalysis } from './types';

type WorkerReply =
  | { id: number; type: 'progress'; progress: number }
  | { id: number; type: 'complete'; analysis: AutoChartAnalysis }
  | { id: number; type: 'error'; message: string };

export class AutoChartWorkerClient {
  private worker: Worker | null = null;
  private nextId = 1;

  analyze(
    pcm: Float32Array,
    sampleRate: number,
    onProgress?: (progress: number) => void,
  ): Promise<AutoChartAnalysis> {
    this.terminate();
    const worker = new Worker(new URL('./analysis.worker.ts', import.meta.url), { type: 'module' });
    this.worker = worker;
    const id = this.nextId++;
    return new Promise<AutoChartAnalysis>((resolve, reject) => {
      worker.onmessage = (event: MessageEvent<WorkerReply>) => {
        if (event.data.id !== id) return;
        if (event.data.type === 'progress') onProgress?.(event.data.progress);
        else if (event.data.type === 'complete') {
          resolve(event.data.analysis);
          this.terminate();
        } else {
          reject(new Error(event.data.message));
          this.terminate();
        }
      };
      worker.onerror = (event) => {
        reject(new Error(event.message || 'AutoChart Worker failed'));
        this.terminate();
      };
      worker.postMessage({ id, pcm, sampleRate }, [pcm.buffer]);
    });
  }

  terminate(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}

