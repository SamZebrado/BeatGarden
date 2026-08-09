export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function mad(values: readonly number[], center = median(values)): number {
  return median(values.map((value) => Math.abs(value - center)));
}

export function robustZ(value: number, values: readonly number[]): number {
  const center = median(values);
  const scale = mad(values, center) * 1.4826;
  if (scale < 1e-10) return value > center ? 8 : 0;
  return (value - center) / scale;
}

