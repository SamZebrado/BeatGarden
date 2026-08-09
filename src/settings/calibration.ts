import { TIMING_CONFIG } from '../timing/config';
import { median, removeOutliers } from '../utils/stats';

export function calculateCalibrationOffset(rawTapDeltasMs: readonly number[]): number | null {
  if (rawTapDeltasMs.length < TIMING_CONFIG.calibrationMinSamples) return null;
  const { kept } = removeOutliers([...rawTapDeltasMs], TIMING_CONFIG.calibrationOutlierStdDevMul);
  if (kept.length < Math.max(8, Math.floor(TIMING_CONFIG.calibrationMinSamples * 0.6))) return null;
  return median(kept);
}

