// GameLoop — requestAnimationFrame driven render loop.
//
// CRITICAL invariant:
//   The visual state of each frame is DERIVED from Transport time, which is
//   itself derived from AudioContext.currentTime. We never do:
//       visualBeat += deltaTime * bpmConversion
//   because any dropped frame or sleep/timer skew would produce a permanent
//   phase drift vs audio.
//
// Instead:
//   const snap = transport.snapshot(); // reads audio ctx time
//   stage.render(ctx, snap);           // stage decides what to draw
//
// Guarantees:
//   - If 5 frames are dropped, the 6th jumps to the correct beat position.
//   - If JS tab is backgrounded and rAF stops, next frame is correct.
//   - Reduced motion setting (when implemented) is respected but doesn't
//     affect timing math.

import type { Transport, TransportSnapshot } from '../timing/Transport';

export type RenderFn = (ctx: CanvasRenderingContext2D, snap: TransportSnapshot) => void;

export interface GameLoopOptions {
  canvas: HTMLCanvasElement;
  transport: Transport;
  render: RenderFn;
  /** Called after render for debug overlay updates. */
  postRender?: (ctx: CanvasRenderingContext2D, snap: TransportSnapshot, fps: number) => void;
}

export class GameLoop {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly transport: Transport;
  private readonly render: RenderFn;
  private readonly postRender:
    | ((ctx: CanvasRenderingContext2D, snap: TransportSnapshot, fps: number) => void)
    | undefined;

  private rafId: number | null = null;
  private lastFrameTime: number = 0;
  private fpsEma: number = 60;
  private _fps: number = 60;
  private frameCount: number = 0;
  private running: boolean = false;

  constructor(opts: GameLoopOptions) {
    const ctx = opts.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D canvas context');
    this.ctx = ctx;
    this.transport = opts.transport;
    this.render = opts.render;
    this.postRender = opts.postRender;
  }

  get fps(): number {
    return this._fps;
  }

  get frame(): number {
    return this.frameCount;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrameTime = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      // FPS estimate (EMA, alpha ~0.1 so it's stable).
      const deltaMs = now - this.lastFrameTime;
      this.lastFrameTime = now;
      if (deltaMs > 0) {
        const instantFps = 1000 / deltaMs;
        this.fpsEma = this.fpsEma * 0.9 + instantFps * 0.1;
        this._fps = this.fpsEma;
      }
      this.frameCount++;
      const snap = this.transport.snapshot(); // authoritative: audio time
      this.render(this.ctx, snap);
      if (this.postRender) this.postRender(this.ctx, snap, this._fps);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
