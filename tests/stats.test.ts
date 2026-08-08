import { describe, it, expect } from 'vitest';
import { mean, median, stdDev, removeOutliers } from '../src/utils/stats';

describe('stats — median', () => {
  it('odd-length picks the middle element', () => {
    expect(median([1, 2, 3, 4, 5])).toBe(3);
    expect(median([7])).toBe(7);
  });
  it('even-length averages the two middle elements', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([-10, 0, 10, 20])).toBe(5);
  });
  it('empty → 0', () => {
    expect(median([])).toBe(0);
  });
  it('does not mutate its input', () => {
    const a = [5, 1, 3];
    median(a);
    expect(a).toEqual([5, 1, 3]);
  });
});

describe('stats — mean', () => {
  it('basic', () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
  });
  it('empty → 0', () => {
    expect(mean([])).toBe(0);
  });
});

describe('stats — stdDev', () => {
  it('constant array → 0', () => {
    expect(stdDev([3, 3, 3, 3, 3])).toBe(0);
  });
  it('n<2 → 0', () => {
    expect(stdDev([])).toBe(0);
    expect(stdDev([1])).toBe(0);
  });
  it('matches sample std dev for [1,2,3,4,5]', () => {
    // Variance = sum((x-m)^2) / (n-1) = 2.5, std = sqrt(2.5) ≈ 1.5811
    expect(stdDev([1, 2, 3, 4, 5])).toBeCloseTo(Math.sqrt(2.5), 6);
  });
});

describe('stats — removeOutliers via stdDev multiplier', () => {
  it('keeps the cluster, drops the obvious outlier', () => {
    // Cluster around 50 with one big outlier 500.
    const values = [48, 50, 51, 49, 52, 500, 47, 53, 50, 51];
    const { kept, mask } = removeOutliers(values, 2.0);
    expect(kept.length).toBe(9);
    expect(kept.includes(500)).toBe(false);
    // Mask length matches input.
    expect(mask.length).toBe(values.length);
    expect(mask[5]).toBe(false); // 500 at index 5
  });

  it('wide multiplier keeps everything', () => {
    const values = [1, 2, 3, 4, 1000];
    const { kept } = removeOutliers(values, 100);
    expect(kept.length).toBe(5);
  });
});
