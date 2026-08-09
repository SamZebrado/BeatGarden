import type { Scheduler } from '../timing/Scheduler';
import type { Transport } from '../timing/Transport';

/**
 * Resume the musical timeline after AudioContext has been confirmed running.
 * Scheduler.start() performs an immediate tick, so this order is contractual.
 */
export function resumeAfterAudioConfirmed(
  transport: Transport,
  scheduler: Scheduler,
  audioNow: number,
): void {
  transport.start(undefined, audioNow);
  scheduler.start();
}
