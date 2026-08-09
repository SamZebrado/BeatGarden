export interface AutoChartConfig {
  analysisSampleRate: number;
  frameSize: number;
  hopSize: number;
  minBpm: number;
  maxBpm: number;
  onsetWindowFrames: number;
  onsetThresholdMad: number;
  onsetMinimumGapSec: number;
  beatSnapToleranceSec: number;
}

export const AUTOCHART_CONFIG: Readonly<AutoChartConfig> = {
  analysisSampleRate: 22_050,
  frameSize: 1024,
  hopSize: 256,
  minBpm: 70,
  maxBpm: 190,
  onsetWindowFrames: 31,
  onsetThresholdMad: 2.4,
  onsetMinimumGapSec: 0.075,
  beatSnapToleranceSec: 0.08,
};

