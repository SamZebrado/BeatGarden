// Stage — abstraction shared by every micro-game.
//
// Stage-specific code owns:
//   - Music data (notes / BPM / meter / sequence of scheduled events)
//   - Visual drawing
//   - Mapping of pointer actions (tap/hold/swipe) to target judgements.
//
// Shared engine owns:
//   - AudioContext (via AudioEngine)
//   - Transport (beat ↔ seconds ↔ audio time)
//   - Scheduler (pre-filling WebAudio queues, cue firing)
//   - Judge (PERFECT/GREAT/OK/MISS, scoring, distribution stats)
//   - InputRouter (pointer -> tap/hold/swipe events with audio timestamps)
//
// Stages NEVER do:
//   - new AudioContext
//   - their own BPM math (use transport.beatToAudioTime etc.)
//   - their own Date.now/performance.now judgement clock
//   - their own setTimeout-based sound scheduling

import type { Transport, TransportSnapshot } from '../timing/Transport';
import type { Scheduler, ScheduledEvent, ScheduledJudgeTarget } from '../timing/Scheduler';
import type { Judge, StageScore } from '../timing/Judge';
import type { InputKind, JudgeResult } from '../timing/config';
import type { PointerAction } from './InputRouter';
import type { StringKey } from '../i18n/strings';

export type { StageScore, JudgeResult, Judge, ScheduledJudgeTarget };

export type StagePhase = 'idle' | 'ready' | 'playing' | 'ended';

export interface StageRuntimeServices {
  transport: Transport;
  scheduler: Scheduler;
  judge: Judge;
}

export interface StageTutorialStep {
  /** Stable within the stage; used only for presentation and smoke evidence. */
  id: string;
  instructionKey: StringKey;
  detailKey: StringKey;
  /** Relative tutorial targets. StageRunner supplies the authoritative clock. */
  targets: readonly ScheduledJudgeTarget[];
}

export interface PointerPreview {
  type: 'down' | 'move' | 'up' | 'cancel';
  x: number;
  y: number;
  surfaceWidth: number;
  surfaceHeight: number;
}

export interface UnmatchedInputContext {
  /** All authored targets for this run; the stage owns consumed-target filtering. */
  targets: readonly ScheduledJudgeTarget[];
  snap: TransportSnapshot;
  windowForTarget: (target: ScheduledJudgeTarget) => number;
}

export interface StageDefinition {
  /** Stable id, used in stage select + localStorage best scores. */
  id: string;
  /** Locale keys used by menus and overlays. */
  titleKey: StringKey;
  taglineKey: StringKey;

  /**
   * Build the immutable event list (audio + cue + judge targets) for one
   * play-through. Called once per play, after services are attached.
   */
  buildEvents(): readonly ScheduledEvent[];

  /**
   * Total length of the stage in beats, used for auto-end.
   * (Events beyond this beat still play; this is the "stop and score" point.)
   */
  totalBeats(): number;

  /** Optional first-play tutorial. Its judgements are reset before formal play. */
  buildTutorialSteps?(): readonly StageTutorialStep[];

  /**
   * Convert a raw pointer action from InputRouter to a specific input kind
   * plus target (or null if the action doesn't hit any live target).
   */
  mapInputToTarget(
    action: PointerAction,
    liveTargets: readonly ScheduledJudgeTarget[],
    snap: TransportSnapshot,
  ): { target: ScheduledJudgeTarget; inputKind: InputKind } | null;

  /**
   * Render one frame. snap is authoritative (derived from audio time).
   */
  render(ctx: CanvasRenderingContext2D, snap: TransportSnapshot): void;

  /**
   * Notify stage that a judgement happened so it can run reaction animations
   * (arc of light, wobble, etc.).
   */
  onJudge?(result: JudgeResult, target: ScheduledJudgeTarget): void;
  /** Immediate causal feedback when a pointer action has no live target. */
  onUnmatchedInput?(action: PointerAction, context: UnmatchedInputContext): void;
  /** Display-only pointer state. It must never be used as a judgement clock. */
  onPointerPreview?(preview: PointerPreview): void;

  /** Lifecycle hooks. */
  onStart?(services: StageRuntimeServices): void;
  onEnd?(score: StageScore): void;
  onPause?(): void;
  onResume?(): void;
  onRestart?(): void;
}
