// CanvasManager — logical resolution + DPR scaling.
//
// Uses a fixed logical resolution (from TIMING_CONFIG) that is independent
// of physical screen. This keeps drawing math identical across devices.
// DPR is capped at dprMax to avoid burning fill-rate on 4K phone displays.

import type { TimingConfig } from '../timing/config';

export interface CanvasManagerOptions {
  canvas: HTMLCanvasElement;
  config: TimingConfig;
}

export class CanvasManager {
  private readonly canvas: HTMLCanvasElement;
  private readonly config: TimingConfig;

  constructor(opts: CanvasManagerOptions) {
    this.canvas = opts.canvas;
    this.config = opts.config;
  }

  get logicalWidth(): number {
    return this.config.logicalWidth;
  }
  get logicalHeight(): number {
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

    return {
      ctx,
      dpr,
      scale,
      offsetX: offsetXCss,
      offsetY: offsetYCss,
      viewW: cssViewW,
      viewH: cssViewH,
    };
  }
}
