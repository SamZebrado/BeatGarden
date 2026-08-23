import type { ScheduledJudgeTarget } from '../timing/Scheduler';
import type { TimingConfig } from '../timing/config';
import type { Transport } from '../timing/Transport';

const CANDIDATE_EPSILON_SEC = 0.002;

export function targetJudgeWindowSeconds(config: TimingConfig, target: ScheduledJudgeTarget): number {
  return (target.inputKind === 'holdRelease' ? config.holdReleaseOkMs : config.okWindowMs) / 1000;
}

export function maxTargetJudgeWindowSeconds(config: TimingConfig): number {
  return Math.max(config.okWindowMs, config.holdReleaseOkMs) / 1000;
}

/** Beat range used only to find targets eligible to enter the central Judge. */
export function inputCandidateBeatRange(
  transport: Transport,
  inputAudioTime: number,
  config: TimingConfig,
): { fromBeat: number; toBeat: number } {
  const seconds = maxTargetJudgeWindowSeconds(config) + CANDIDATE_EPSILON_SEC;
  return {
    fromBeat: transport.audioTimeToBeat(inputAudioTime - seconds),
    toBeat: transport.audioTimeToBeat(inputAudioTime + seconds),
  };
}
