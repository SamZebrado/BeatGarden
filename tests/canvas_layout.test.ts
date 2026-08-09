import { describe, expect, it } from 'vitest';
import { computeCanvasLayout } from '../src/render/CanvasManager';

describe('responsive 16:9 logical canvas layout', () => {
  it('fills an exact 16:9 viewport without letterboxing', () => {
    expect(computeCanvasLayout(1920, 1080, 1920, 1080)).toEqual({
      viewW: 1920, viewH: 1080, offsetX: 0, offsetY: 0, cssScale: 1,
    });
  });

  it('letterboxes a 16:10 tablet vertically without cropping', () => {
    const result = computeCanvasLayout(1280, 800, 1920, 1080);
    expect(result.viewW).toBe(1280);
    expect(result.viewH).toBe(720);
    expect(result.offsetX).toBe(0);
    expect(result.offsetY).toBe(40);
  });

  it('letterboxes a 4:3 tablet vertically without cropping', () => {
    const result = computeCanvasLayout(1024, 768, 1920, 1080);
    expect(result.viewW).toBe(1024);
    expect(result.viewH).toBe(576);
    expect(result.offsetX).toBe(0);
    expect(result.offsetY).toBe(96);
  });
});
