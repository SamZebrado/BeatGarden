// Statistics utilities for calibration and judgement summaries.
// Small, dependency-free, deterministic implementations.

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  let s = 0;
  for (const v of values) s += v;
  return s / values.length;
}

export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  let s = 0;
  for (const v of values) {
    const d = v - m;
    s += d * d;
  }
  return Math.sqrt(s / (values.length - 1));
}

export function meanSignedError(values: number[]): number {
  return mean(values);
}

export function medianSignedError(values: number[]): number {
  return median(values);
}

/**
 * Robust outlier removal based on stdDev multiplier.
 * Returns the filtered list and an array of booleans matching
 * the original indices (true = kept, false = outlier).
 */
export function removeOutliers(
  values: number[],
  stdDevMul: number,
): { kept: number[]; mask: boolean[] } {
  if (values.length === 0) return { kept: [], mask: [] };
  const m = median(values);
  const sd = stdDev(values);
  const mask: boolean[] = [];
  const kept: number[] = [];
  const threshold = Math.max(1e-6, sd * stdDevMul);
  for (const v of values) {
    if (Math.abs(v - m) <= threshold) {
      kept.push(v);
      mask.push(true);
    } else {
      mask.push(false);
    }
  }
  return { kept, mask };
}

/** Simple histogram for timing distribution debug (in ms). */
export function buildTimingHistogram(
  deltasMs: number[],
  bucketSizeMs: number = 10,
): Map<number, number> {
  const map = new Map<number, number>();
  for (const d of deltasMs) {
    const bucket = Math.floor(d / bucketSizeMs) * bucketSizeMs;
    map.set(bucket, (map.get(bucket) ?? 0) + 1);
  }
  return map;
}
