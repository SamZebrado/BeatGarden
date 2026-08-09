// CanvasManager — logical resolution + DPR scaling.
//
// Uses a fixed logical resolution (from TIMING_CONFIG) that is independent
// of physical screen. This keeps drawing math identical across devices.
// DPR is capped at dprMax to avoid burning fill-rate on 4K phone displays.

import type { TimingConfig } from '../timing/config';

export interface CanvasManagerOptions {
  canvas?: HTMLCanvasElement;
  parent?: HTMLElement;
  config: TimingConfig;
}

export class CanvasManager {
  public readonly canvas: HTMLCanvasElement;
  private readonly config: TimingConfig;
  private lastResizeInfo: {
    ctx: CanvasRenderingContext2D;
    dpr: number;
    scale: number;
    offsetX: number;
    offsetY: number;
    viewW: number;
    viewH: number;
  } | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private readonly onWindowResize = (): void => { this.resize(); };

  constructor(opts: CanvasManagerOptions) {
    if (opts.canvas) {
      this.canvas = opts.canvas;
    } else if (opts.parent) {
      const c = document.createElement('canvas');
      c.style.cssText = 'display: block; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; outline: none;';
      opts.parent.appendChild(c);
      this.canvas = c;
    } else {
      throw new Error('CanvasManagerOptions requires canvas or parent');
    }
    this.config = opts.config;
    // Auto-attach resize observer if window exists.
    if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      // Observe either canvas direct parent or body.
      const target = this.canvas.parentElement ?? document.body;
      this.resizeObserver.observe(target);
      window.addEventListener('resize', this.onWindowResize);
    }
  }

  get ctx(): CanvasRenderingContext2D {
    if (!this.lastResizeInfo) this.resize();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.lastResizeInfo!.ctx;
  }

  get logicalWidth(): number {
    return this.config.logicalWidth;
  }
  get logicalHeight(): number {
    return this.config.logicalHeight;
  }
  /** Aliases used by rendering code. */
  get logicalW(): number {
    return this.config.logicalWidth;
  }
  get logicalH(): number {
    return this.config.logicalHeight;
  }

  /**
   * Applies sizing. Returns the 2D context configured with a transform that
   * maps logical coords to physical pixels.
   *
   * The canvas physical pixel buffer is: screenPxWidth * dpr, screenPxHeight * dpr.
   * CSS size is set to match the element's layout, using letterbox to fit the
   * logical aspect (16:9 by default).
   *
   * Then context2D.setTransform(dprScaleX, 0, 0, dprScaleY, letterboxX, letterboxY)
   * maps logical drawing coords to screen.
   */
  resize(): { ctx: CanvasRenderingContext2D; dpr: number; scale: number; offsetX: number; offsetY: number; viewW: number; viewH: number } {
    const canvas = this.canvas;
    const parent = canvas.parentElement ?? document.body;
    const parentW = parent.clientWidth || window.innerWidth;
    const parentH = parent.clientHeight || window.innerHeight;

    const rawDpr = typeof window !== 'undefined' ? window.devicePixelRatio ?? 1 : 1;
    const dpr = Math.min(this.config.dprMax, Math.max(1, rawDpr));

    const logicalW = this.config.logicalWidth;
    const logicalH = this.config.logicalHeight;
    const logicalAspect = logicalW / logicalH;
    const parentAspect = parentW / Math.max(1, parentH);

    let cssViewW: number;
    let cssViewH: number;
    if (parentAspect >= logicalAspect) {
      // Parent is wider: fit height, letterbox left+right.
      cssViewH = parentH;
      cssViewW = parentH * logicalAspect;
    } else {
      // Parent is taller: fit width, letterbox top+bottom.
      cssViewW = parentW;
      cssViewH = parentW / logicalAspect;
    }
    const offsetXCss = (parentW - cssViewW) / 2;
    const offsetYCss = (parentH - cssViewH) / 2;

    // CSS size.
    canvas.style.width = cssViewW + 'px';
    canvas.style.height = cssViewH + 'px';
    canvas.style.marginLeft = offsetXCss + 'px';
    canvas.style.marginTop = offsetYCss + 'px';
    canvas.style.display = 'block';

    // Physical pixel buffer.
    const physW = Math.max(1, Math.floor(cssViewW * dpr));
    const physH = Math.max(1, Math.floor(cssViewH * dpr));
    if (canvas.width !== physW || canvas.height !== physH) {
      canvas.width = physW;
      canvas.height = physH;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    // Logical -> physical transform.
    const scale = (cssViewW * dpr) / logicalW;
    ctx.setTransform(scale, 0, 0, scale, offsetXCss * dpr, offsetYCss * dpr);
    ctx.imageSmoothingEnabled = true;

    this.lastResizeInfo = {
      ctx,
      dpr,
      scale,
      offsetX: offsetXCss,
      offsetY: offsetYCss,
      viewW: cssViewW,
      viewH: cssViewH,
    };
    return this.lastResizeInfo;
  }

  /**
   * Called before drawing a frame: ensure canvas is sized & transform is
   * applied, and reset the viewport clip if letterbox area exists.
   */
  beginFrame(): void {
    const info = this.resize();
    // Clear physical pixels to a safe border color (letterbox outside game area).
    // Reset transform to full pixel buffer, clear full buffer to black.
    const canvas = this.canvas;
    info.ctx.save();
    info.ctx.setTransform(1, 0, 0, 1, 0, 0);
    info.ctx.fillStyle = '#000';
    info.ctx.fillRect(0, 0, canvas.width, canvas.height);
    info.ctx.restore();
    // Re-apply logical transform (saved above restores back by endFrame).
  }

  /** End of frame hook (placeholder for future post-processing). */
  endFrame(): void {
    // no-op for now
  }

  destroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (typeof window !== 'undefined') window.removeEventListener('resize', this.onWindowResize);
    this.canvas.remove();
  }
}
