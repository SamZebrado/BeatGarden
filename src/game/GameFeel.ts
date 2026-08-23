import type { JudgeResult, JudgementKind } from '../timing/config';

export type TimingTendency = 'FAST' | 'SLOW' | null;
export type RhythmSection = 'INTRO' | 'MAIN_A' | 'VARIATION_B' | 'CLIMAX' | 'OUTRO';

export interface GameFeelSnapshot {
  combo: number;
  bestCombo: number;
  groove: number;
  peakGroove: number;
  judgement: JudgementKind | null;
  timing: TimingTendency;
  deltaMs: number | null;
  judgementAudioTime: number | null;
}

const QUALITY: Record<JudgementKind, number> = {
  PERFECT: 100,
  GREAT: 78,
  OK: 52,
  MISS: 0,
};

export const FEEDBACK_DURATION_SEC = 0.52;

export function feedbackScale(ageSec: number, reducedMotion: boolean): number {
  if (reducedMotion) return 1;
  return 1 + Math.sin(Math.min(1, Math.max(0, ageSec) / .1) * Math.PI) * .08;
}

/** Display-only section grammar. It never changes targets, timing, or scoring. */
export function rhythmSection(beat: number, totalBeats: number): RhythmSection {
  const progress = Math.max(0, Math.min(1, beat / Math.max(1, totalBeats)));
  if (progress < 0.12) return 'INTRO';
  if (progress < 0.42) return 'MAIN_A';
  if (progress < 0.68) return 'VARIATION_B';
  if (progress < 0.9) return 'CLIMAX';
  return 'OUTRO';
}

/** Display-only state derived from authoritative Judge results. */
export class GameFeel {
  private state: GameFeelSnapshot = this.initial();

  reset(): void {
    this.state = this.initial();
  }

  consume(result: JudgeResult, audioTime: number): GameFeelSnapshot {
    if (result.kind === 'MISS') {
      this.state.combo = 0;
      this.state.groove = Math.max(0, this.state.groove - 28);
    } else {
      this.state.combo++;
      this.state.bestCombo = Math.max(this.state.bestCombo, this.state.combo);
      this.state.groove = Math.min(100, this.state.groove * 0.72 + QUALITY[result.kind] * 0.28);
    }
    this.state.peakGroove = Math.max(this.state.peakGroove, this.state.groove);
    this.state.judgement = result.kind;
    this.state.deltaMs = result.automatic ? null : result.deltaMs;
    this.state.timing = result.automatic || Math.abs(result.deltaMs) < 4
      ? null
      : result.deltaMs < 0 ? 'FAST' : 'SLOW';
    this.state.judgementAudioTime = audioTime;
    return this.snapshot();
  }

  snapshot(): GameFeelSnapshot {
    return { ...this.state };
  }

  private initial(): GameFeelSnapshot {
    return {
      combo: 0,
      bestCombo: 0,
      groove: 0,
      peakGroove: 0,
      judgement: null,
      timing: null,
      deltaMs: null,
      judgementAudioTime: null,
    };
  }
}
