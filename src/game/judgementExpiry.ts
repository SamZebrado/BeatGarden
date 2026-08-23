import type { Transport } from '../timing/Transport';
import type { ScheduledJudgeTarget } from '../timing/Scheduler';
import type { TimingConfig } from '../timing/config';
import { targetJudgeWindowSeconds } from './targetWindows';

export const TARGET_EXPIRY_GRACE_SEC = 0.01;

/** Latest target beat whose OK window has genuinely expired on the audio clock. */
export function expiredJudgeBeat(
  transport: Transport,
  audioTime: number,
  okWindowSeconds: number,
): number {
  return transport.audioTimeToBeat(audioTime - okWindowSeconds);
}

/** Per-target expiry, including the semantic recognition delay for holds. */
export function hasJudgeTargetExpired(
  transport: Transport,
  target: ScheduledJudgeTarget,
  audioTime: number,
  okWindowSeconds: number,
  holdThresholdSeconds: number,
): boolean {
  const recognitionDelay = target.inputKind === 'holdStart' ? holdThresholdSeconds : 0;
  return audioTime >= transport.beatToAudioTime(target.beat) + okWindowSeconds + recognitionDelay;
}

/** Exact per-target policy used by StageRunner before calling Judge.autoMiss(). */
export function hasTargetExpiredForAutoMiss(
  transport: Transport,
  target: ScheduledJudgeTarget,
  audioTime: number,
  config: TimingConfig,
): boolean {
  return hasJudgeTargetExpired(
    transport,
    target,
    audioTime,
    targetJudgeWindowSeconds(config, target) + TARGET_EXPIRY_GRACE_SEC,
    config.holdThresholdMs / 1000,
  );
}
