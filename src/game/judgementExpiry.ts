import type { Transport } from '../timing/Transport';

/** Latest target beat whose OK window has genuinely expired on the audio clock. */
export function expiredJudgeBeat(
  transport: Transport,
  audioTime: number,
  okWindowSeconds: number,
): number {
  return transport.audioTimeToBeat(audioTime - okWindowSeconds);
}
