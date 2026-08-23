import type { PointerAction } from '../../game/InputRouter';
import type { PointerPreview, StageDefinition, StageRuntimeServices, StageTutorialStep, JudgeResult, UnmatchedInputContext } from '../../game/Stage';
import type { ScheduledEvent, ScheduledJudgeTarget } from '../../timing/Scheduler';
import type { TransportSnapshot } from '../../timing/Transport';
import { TIMING_CONFIG, type InputKind, type JudgementKind } from '../../timing/config';
import { t } from '../../i18n/strings';
import { rhythmSection } from '../../game/GameFeel';

type StageId = 'bubble-kitchen' | 'cloud-post' | 'sleepy-greenhouse';
type Palette = readonly [string, string, string, string];
type GardenSection = 'INTRO' | 'MAIN_A' | 'VARIATION_B' | 'CLIMAX' | 'OUTRO';
type TargetMeta = { lane: number; direction?: 'left' | 'right'; role?: 'start' | 'release'; section?: GardenSection; durationBeats?: number; phrase?: number };
export type FeedbackKind = JudgementKind | 'WAIT' | 'WRONG_LANE' | 'WRONG_DIRECTION' | 'HOLD_EARLY' | 'HOLD_LATE' | 'TOO_EARLY' | 'TOO_LATE';

type Profile = {
  id: StageId;
  titleKey: 'stage.bubble.title' | 'stage.cloud.title' | 'stage.greenhouse.title';
  taglineKey: 'stage.bubble.tagline' | 'stage.cloud.tagline' | 'stage.greenhouse.tagline';
  bpm: number;
  totalBeats: number;
  palette: Palette;
  mechanic: 'laneTap' | 'swipe' | 'hold';
};
type GardenMechanic = Profile['mechanic'];
type GardenPointerState = { down: boolean; lane: number; startX: number; x: number; y: number };
type GardenSuccessFx = { at: number; lane: number; kind: JudgementKind };

export interface GardenProgressSnapshot {
  byLane: readonly [number, number, number];
  total: number;
  transientFx: number;
}

/** Durable run progression is deliberately independent of short-lived hit FX. */
export class GardenRunProgress {
  private byLane: [number, number, number] = [0, 0, 0];
  private transientSuccessFx: GardenSuccessFx[] = [];

  public reset(): void {
    this.byLane = [0, 0, 0];
    this.transientSuccessFx = [];
  }

  public record(result: JudgeResult, lane: number, at: number, durable = true): void {
    if (result.automatic || result.kind === 'MISS') return;
    const safeLane = Math.max(0, Math.min(2, lane));
    if (durable) this.byLane[safeLane]++;
    this.transientSuccessFx.push({ at, lane: safeLane, kind: result.kind });
  }

  public expireTransient(now: number): readonly GardenSuccessFx[] {
    this.transientSuccessFx = this.transientSuccessFx.filter((fx) => now - fx.at < 1.8);
    return this.transientSuccessFx;
  }

  public snapshot(): GardenProgressSnapshot {
    const byLane: [number, number, number] = [...this.byLane];
    return { byLane, total: byLane[0] + byLane[1] + byLane[2], transientFx: this.transientSuccessFx.length };
  }
}

export function laneFromSurfaceX(x: number, surfaceWidth: number): number {
  return Math.max(0, Math.min(2, Math.floor((x / Math.max(1, surfaceWidth)) * 3)));
}

export function localizedGardenFeedback(kind: JudgementKind): string {
  return t(`feedback.${kind}` as 'feedback.PERFECT');
}

export function classifyGardenUnmatched(
  mechanic: GardenMechanic,
  action: PointerAction,
  expected: ScheduledJudgeTarget | undefined,
  deltaSec: number,
  okWindowSec: number,
): FeedbackKind {
  if (!expected) return 'WAIT';
  if (mechanic === 'hold' && action.type === 'holdEnd') {
    if (deltaSec < -okWindowSec) return 'HOLD_EARLY';
    if (deltaSec > okWindowSec) return 'HOLD_LATE';
    return 'WAIT';
  }
  if (deltaSec < -okWindowSec) return 'TOO_EARLY';
  if (deltaSec > okWindowSec) return 'TOO_LATE';
  if (mechanic === 'laneTap' && action.type === 'tap') {
    const expectedLane = (expected.meta as TargetMeta | undefined)?.lane;
    return expectedLane !== laneFromSurfaceX(action.x, action.surfaceWidth) ? 'WRONG_LANE' : 'WAIT';
  }
  if (mechanic === 'swipe' && action.type === 'swipe') {
    const expectedDirection = (expected.meta as TargetMeta | undefined)?.direction;
    return expectedDirection && action.direction !== expectedDirection ? 'WRONG_DIRECTION' : 'WAIT';
  }
  return 'WAIT';
}

export function nearestUnconsumedGardenTarget(
  mechanic: GardenMechanic,
  action: PointerAction,
  targets: readonly ScheduledJudgeTarget[],
  consumed: ReadonlySet<string>,
  beatToAudioTime: (beat: number) => number,
): ScheduledJudgeTarget | undefined {
  const wantedKind: InputKind | null = action.type === 'tap' ? 'tap'
    : action.type === 'holdStart' ? 'holdStart'
      : action.type === 'holdEnd' ? 'holdRelease'
        : action.type === 'swipe' ? (action.direction === 'left' ? 'swipeLeft' : 'swipeRight') : null;
  return targets
    .filter((target) => {
      if (consumed.has(target.id)) return false;
      if (mechanic === 'swipe') return target.inputKind === 'swipeLeft' || target.inputKind === 'swipeRight';
      return wantedKind === null || target.inputKind === wantedKind;
    })
    .sort((a, b) => Math.abs(beatToAudioTime(a.beat) - action.audioTime)
      - Math.abs(beatToAudioTime(b.beat) - action.audioTime))[0];
}

export function updateGardenPointerPreview(
  mechanic: GardenMechanic,
  current: GardenPointerState | null,
  preview: PointerPreview,
): GardenPointerState | null {
  const scaleX = TIMING_CONFIG.logicalWidth / Math.max(1, preview.surfaceWidth);
  const scaleY = TIMING_CONFIG.logicalHeight / Math.max(1, preview.surfaceHeight);
  const x = preview.x * scaleX;
  const y = preview.y * scaleY;
  const lane = laneFromSurfaceX(preview.x, preview.surfaceWidth);
  if (preview.type === 'down') return { down: true, lane, startX: x, x, y };
  if (preview.type === 'move' && current) return { ...current, lane, x, y };
  if (preview.type === 'up' || preview.type === 'cancel') {
    if (mechanic !== 'hold') return null;
    return current ? { ...current, down: false, lane, x, y } : null;
  }
  return current;
}

const PROFILES: Record<StageId, Profile> = {
  'bubble-kitchen': {
    id: 'bubble-kitchen', titleKey: 'stage.bubble.title', taglineKey: 'stage.bubble.tagline',
    bpm: 108, totalBeats: 56, palette: ['#190b35', '#50205a', '#ffcf62', '#76f7dc'], mechanic: 'laneTap',
  },
  'cloud-post': {
    id: 'cloud-post', titleKey: 'stage.cloud.title', taglineKey: 'stage.cloud.tagline',
    bpm: 126, totalBeats: 64, palette: ['#10244d', '#4b78b8', '#f6f2ca', '#ff8ea1'], mechanic: 'swipe',
  },
  'sleepy-greenhouse': {
    id: 'sleepy-greenhouse', titleKey: 'stage.greenhouse.title', taglineKey: 'stage.greenhouse.tagline',
    bpm: 92, totalBeats: 64, palette: ['#081f25', '#174b46', '#b6f58f', '#71d5ff'], mechanic: 'hold',
  },
};

function music(profile: Profile): ScheduledEvent[] {
  const events: ScheduledEvent[] = [];
  const roots = profile.id === 'bubble-kitchen' ? [220, 261.63, 329.63, 293.66]
    : profile.id === 'cloud-post' ? [196, 246.94, 293.66, 220]
      : [130.81, 164.81, 146.83, 196];
  for (let beat = 0; beat < profile.totalBeats; beat += 0.5) {
    const integer = Number.isInteger(beat);
    const section = rhythmSection(beat, profile.totalBeats);
    if (integer) events.push({ type: 'audio', beat, sound: beat % 4 === 0 ? 'kick' : beat % 2 === 0 ? 'snare' : 'hatClosed', velocity: section === 'CLIMAX' ? 0.68 : section === 'OUTRO' ? 0.38 : 0.55 });
    else if (profile.id !== 'sleepy-greenhouse' && section !== 'OUTRO') events.push({ type: 'audio', beat, sound: 'hatClosed', velocity: section === 'CLIMAX' ? 0.38 : 0.25 });
    if (integer && beat % 2 === 0) {
      const root = roots[Math.floor(beat / 4) % roots.length];
      events.push({ type: 'audio', beat, sound: profile.id === 'cloud-post' ? 'lead' : 'pluck', freqHz: root, durationSec: profile.id === 'sleepy-greenhouse' ? 0.7 : 0.25, velocity: 0.42 });
    }
    if (integer && beat % 4 === 0) events.push({ type: 'audio', beat, sound: 'bass', freqHz: roots[Math.floor(beat / 4) % roots.length] / 2, velocity: 0.42 });
    if (integer && section === 'CLIMAX') {
      if (profile.id === 'bubble-kitchen' && beat % 2 === 0) events.push({ type: 'audio', beat, sound: 'bell', freqHz: roots[Math.floor(beat / 2) % roots.length] * 2, velocity: .34 });
      if (profile.id === 'cloud-post') events.push({ type: 'audio', beat, sound: 'lead', freqHz: roots[Math.floor(beat) % roots.length] * 1.5, durationSec: .18, velocity: .3 });
      if (profile.id === 'sleepy-greenhouse' && beat % 2 === 0) events.push({ type: 'audio', beat, sound: 'bell', freqHz: roots[Math.floor(beat / 2) % roots.length], durationSec: .8, velocity: .28 });
    }
  }
  return events;
}

function targets(profile: Profile): ScheduledJudgeTarget[] {
  const out: ScheduledJudgeTarget[] = [];
  if (profile.mechanic === 'hold') {
    const holds = [
      { beat: 4, duration: 2, lane: 0, section: 'INTRO' },
      { beat: 11, duration: 3, lane: 1, section: 'INTRO' },
      { beat: 19, duration: 2, lane: 2, section: 'MAIN_A' },
      { beat: 27, duration: 4, lane: 0, section: 'VARIATION_B' },
      { beat: 37, duration: 3, lane: 2, section: 'VARIATION_B' },
      { beat: 45, duration: 2, lane: 1, section: 'CLIMAX' },
      { beat: 52, duration: 4, lane: 1, section: 'CLIMAX' },
      { beat: 59, duration: 1, lane: 2, section: 'OUTRO' },
    ] as const;
    for (let i = 0; i < holds.length; i++) {
      const { beat, duration, lane, section } = holds[i]!;
      const releaseId = `${profile.id}-release-${i}`;
      out.push({ type: 'judge-target', id: `${profile.id}-start-${i}`, beat, inputKind: 'holdStart', pairedId: releaseId, meta: { lane, role: 'start', section, durationBeats: duration, phrase: i } satisfies TargetMeta });
      out.push({ type: 'judge-target', id: releaseId, beat: beat + duration, inputKind: 'holdRelease', meta: { lane, role: 'release', section, durationBeats: duration, phrase: i } satisfies TargetMeta });
    }
    return out;
  }
  const authored = profile.mechanic === 'laneTap' ? [
    { beat: 4, lane: 0, section: 'INTRO', phrase: 0 }, { beat: 7, lane: 1, section: 'INTRO', phrase: 0 },
    { beat: 10, lane: 2, section: 'INTRO', phrase: 0 }, { beat: 13, lane: 1, section: 'INTRO', phrase: 0 },
    { beat: 16, lane: 0, section: 'MAIN_A', phrase: 1 }, { beat: 18, lane: 1, section: 'MAIN_A', phrase: 1 },
    { beat: 20, lane: 2, section: 'MAIN_A', phrase: 1 }, { beat: 22, lane: 1, section: 'MAIN_A', phrase: 1 },
    { beat: 26, lane: 0, section: 'VARIATION_B', phrase: 2 }, { beat: 28, lane: 0, section: 'VARIATION_B', phrase: 2 },
    { beat: 31, lane: 2, section: 'VARIATION_B', phrase: 2 }, { beat: 33, lane: 2, section: 'VARIATION_B', phrase: 2 },
    { beat: 36, lane: 1, section: 'VARIATION_B', phrase: 2 },
    { beat: 40, lane: 0, section: 'CLIMAX', phrase: 3 }, { beat: 42, lane: 1, section: 'CLIMAX', phrase: 3 },
    { beat: 44, lane: 2, section: 'CLIMAX', phrase: 3 }, { beat: 46, lane: 0, section: 'CLIMAX', phrase: 3 },
    { beat: 48, lane: 2, section: 'CLIMAX', phrase: 3 }, { beat: 50, lane: 1, section: 'CLIMAX', phrase: 3 },
    { beat: 54, lane: 1, section: 'OUTRO', phrase: 4 },
  ] as const : [
    { beat: 4, lane: 0, direction: 'left', section: 'INTRO', phrase: 0 }, { beat: 7, lane: 2, direction: 'right', section: 'INTRO', phrase: 0 },
    { beat: 10, lane: 0, direction: 'left', section: 'INTRO', phrase: 0 }, { beat: 13, lane: 2, direction: 'right', section: 'INTRO', phrase: 0 },
    { beat: 16, lane: 0, direction: 'left', section: 'MAIN_A', phrase: 1 }, { beat: 18, lane: 0, direction: 'left', section: 'MAIN_A', phrase: 1 },
    { beat: 20, lane: 2, direction: 'right', section: 'MAIN_A', phrase: 1 }, { beat: 22, lane: 2, direction: 'right', section: 'MAIN_A', phrase: 1 },
    { beat: 28, lane: 2, direction: 'right', section: 'VARIATION_B', phrase: 2 }, { beat: 30, lane: 0, direction: 'left', section: 'VARIATION_B', phrase: 2 },
    { beat: 32, lane: 2, direction: 'right', section: 'VARIATION_B', phrase: 2 }, { beat: 34, lane: 0, direction: 'left', section: 'VARIATION_B', phrase: 2 },
    { beat: 40, lane: 0, direction: 'left', section: 'CLIMAX', phrase: 3 }, { beat: 42, lane: 2, direction: 'right', section: 'CLIMAX', phrase: 3 },
    { beat: 44, lane: 0, direction: 'left', section: 'CLIMAX', phrase: 3 }, { beat: 46, lane: 2, direction: 'right', section: 'CLIMAX', phrase: 3 },
    { beat: 48, lane: 0, direction: 'left', section: 'CLIMAX', phrase: 3 }, { beat: 50, lane: 2, direction: 'right', section: 'CLIMAX', phrase: 3 },
    { beat: 52, lane: 0, direction: 'left', section: 'CLIMAX', phrase: 3 }, { beat: 54, lane: 2, direction: 'right', section: 'CLIMAX', phrase: 3 },
    { beat: 60, lane: 1, direction: 'left', section: 'OUTRO', phrase: 4 },
  ] as const;
  for (let i = 0; i < authored.length; i++) {
    const item = authored[i]!;
    const direction = 'direction' in item ? item.direction : (i % 2 === 0 ? 'left' : 'right');
    out.push({
      type: 'judge-target', id: `${profile.id}-${i}`, beat: item.beat,
      inputKind: profile.mechanic === 'swipe' ? (direction === 'left' ? 'swipeLeft' : 'swipeRight') : 'tap',
      meta: { lane: item.lane, direction, section: item.section, phrase: item.phrase } satisfies TargetMeta,
    });
  }
  return out;
}

abstract class GardenStage implements StageDefinition {
  public readonly id: string;
  public readonly titleKey: Profile['titleKey'];
  public readonly taglineKey: Profile['taglineKey'];
  private services: StageRuntimeServices | null = null;
  private readonly consumed = new Set<string>();
  private feedback: { kind: FeedbackKind; at: number; lane: number } | null = null;
  private readonly progress = new GardenRunProgress();
  private pointerPreview: GardenPointerState | null = null;

  protected constructor(private readonly profile: Profile) {
    this.id = profile.id;
    this.titleKey = profile.titleKey;
    this.taglineKey = profile.taglineKey;
  }

  public buildEvents(): readonly ScheduledEvent[] { return [...music(this.profile), ...targets(this.profile)]; }
  public totalBeats(): number { return this.profile.totalBeats; }

  public buildTutorialSteps(): readonly StageTutorialStep[] {
    if (this.profile.mechanic === 'hold') {
      return [0, 1, 2, 1].map((lane, index) => {
        const releaseId = `tutorial-${this.id}-${index}-release`;
        return {
          id: `hold-${index}`,
          instructionKey: 'tutorial.greenhouse.action',
          detailKey: 'tutorial.greenhouse.detail',
          targets: [
            { type: 'judge-target', id: `tutorial-${this.id}-${index}-start`, beat: 3, inputKind: 'holdStart', pairedId: releaseId, meta: { lane, role: 'start' } satisfies TargetMeta },
            { type: 'judge-target', id: releaseId, beat: 5, inputKind: 'holdRelease', meta: { lane, role: 'release' } satisfies TargetMeta },
          ],
        } satisfies StageTutorialStep;
      });
    }
    if (this.profile.mechanic === 'swipe') {
      return (['left', 'right', 'left', 'right'] as const).map((direction, index) => ({
        id: `swipe-${index}`,
        instructionKey: direction === 'left' ? 'tutorial.cloud.left' : 'tutorial.cloud.right',
        detailKey: 'tutorial.cloud.detail',
        targets: [{
          type: 'judge-target', id: `tutorial-${this.id}-${index}`, beat: 3,
          inputKind: direction === 'left' ? 'swipeLeft' : 'swipeRight',
          meta: { lane: 1, direction } satisfies TargetMeta,
        }],
      }));
    }
    return [0, 1, 2, 1].map((lane, index) => ({
      id: `lane-${index}`,
      instructionKey: 'tutorial.bubble.action',
      detailKey: 'tutorial.bubble.detail',
      targets: [{
        type: 'judge-target', id: `tutorial-${this.id}-${index}`, beat: 3, inputKind: 'tap',
        meta: { lane } satisfies TargetMeta,
      }],
    }));
  }

  public onStart(services: StageRuntimeServices): void {
    this.services = services;
    const now = services.transport.snapshot().audioTime;
    if (services.transport.bpm !== this.profile.bpm) services.transport.setBpm(this.profile.bpm, now);
    services.scheduler.setEvents(this.buildEvents());
    this.consumed.clear();
    this.feedback = null;
    this.progress.reset();
    this.pointerPreview = null;
  }

  public onRestart(): void { if (this.services) this.onStart(this.services); }

  public progressSnapshot(): GardenProgressSnapshot { return this.progress.snapshot(); }

  public mapInputToTarget(action: PointerAction, live: readonly ScheduledJudgeTarget[]): { target: ScheduledJudgeTarget; inputKind: InputKind } | null {
    if (!this.services) return null;
    const actual: InputKind | null = action.type === 'tap' ? 'tap'
      : action.type === 'holdStart' ? 'holdStart'
        : action.type === 'holdEnd' ? 'holdRelease'
          : action.direction === 'left' ? 'swipeLeft'
            : action.direction === 'right' ? 'swipeRight' : null;
    if (!actual) return null;
    const actionLane = laneFromSurfaceX(action.x, action.surfaceWidth);
    let best: ScheduledJudgeTarget | null = null;
    let distance = Infinity;
    for (const target of live) {
      if (this.consumed.has(target.id) || target.inputKind !== actual) continue;
      const meta = target.meta as TargetMeta | undefined;
      if (this.profile.mechanic === 'laneTap' && meta?.lane !== actionLane) continue;
      const d = Math.abs(this.services.transport.beatToAudioTime(target.beat) - action.audioTime);
      if (d < distance) { best = target; distance = d; }
    }
    return best ? { target: best, inputKind: actual } : null;
  }

  public onJudge(result: JudgeResult, target: ScheduledJudgeTarget): void {
    this.consumed.add(target.id);
    const now = this.services?.transport.snapshot().audioTime ?? 0;
    const lane = (target.meta as TargetMeta | undefined)?.lane ?? 1;
    const durable = this.profile.id === 'bubble-kitchen'
      || (this.profile.id === 'sleepy-greenhouse' && target.inputKind === 'holdRelease');
    this.progress.record(result, lane, now, durable);
  }

  public onUnmatchedInput(action: PointerAction, context: UnmatchedInputContext): void {
    const expected = nearestUnconsumedGardenTarget(
      this.profile.mechanic,
      action,
      context.targets,
      this.consumed,
      (beat) => this.services?.transport.beatToAudioTime(beat) ?? action.audioTime,
    );
    const targetAudioTime = expected && this.services ? this.services.transport.beatToAudioTime(expected.beat) : action.audioTime;
    const kind = classifyGardenUnmatched(
      this.profile.mechanic,
      action,
      expected,
      action.audioTime - targetAudioTime,
      expected ? context.windowForTarget(expected) : 0,
    );
    this.feedback = { kind, at: this.services?.transport.snapshot().audioTime ?? 0, lane: 1 };
  }

  public onPointerPreview(preview: PointerPreview): void {
    this.pointerPreview = updateGardenPointerPreview(this.profile.mechanic, this.pointerPreview, preview);
  }

  public render(ctx: CanvasRenderingContext2D, snap: TransportSnapshot): void {
    const W = TIMING_CONFIG.logicalWidth, H = TIMING_CONFIG.logicalHeight;
    const [top, bottom, accent, secondary] = this.profile.palette;
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, top); gradient.addColorStop(1, bottom);
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H);
    this.drawScene(ctx, snap, accent, secondary);
    this.drawTargets(ctx, snap, accent, secondary);
    this.drawFeedback(ctx, snap, accent);
  }

  private drawScene(ctx: CanvasRenderingContext2D, snap: TransportSnapshot, accent: string, secondary: string): void {
    const pulse = 0.5 + 0.5 * Math.sin(snap.beat * Math.PI);
    const section = rhythmSection(snap.beat, this.profile.totalBeats);
    if (this.profile.id === 'bubble-kitchen') {
      ctx.fillStyle = '#351d36'; ctx.fillRect(0, 760, 1920, 320);
      if (section === 'CLIMAX') {
        ctx.fillStyle = `rgba(255,207,98,${(.04 + pulse * .05).toFixed(3)})`;
        for (let x = 0; x < 1920; x += 120) ctx.fillRect(x, 0, 58, 760);
      }
      const recipes: Record<GardenSection, readonly number[]> = {
        INTRO: [0, 1, 2], MAIN_A: [0, 1, 2, 1], VARIATION_B: [0, 0, 2, 2, 1], CLIMAX: [0, 1, 2, 0, 2, 1], OUTRO: [1],
      };
      const tutorialActive = (this.services?.scheduler.getJudgeTargets() ?? []).some((target) => target.id.startsWith('tutorial-'));
      if (!tutorialActive) {
        ctx.fillStyle = 'rgba(255,250,225,.9)'; ctx.beginPath(); ctx.roundRect(700, 120, 520, 120, 24); ctx.fill();
        ctx.fillStyle = '#44233e'; ctx.font = '900 34px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(recipes[section].map((lane) => ['●', '◆', '▲'][lane]).join('  '), 960, 190);
      }
      const activeLane = this.nearestPendingTarget(snap)?.meta as TargetMeta | undefined;
      for (let lane = 0; lane < 3; lane++) {
        const x = 420 + lane * 540;
        ctx.fillStyle = activeLane?.lane === lane ? 'rgba(255,207,98,.22)' : 'rgba(255,255,255,.035)';
        ctx.fillRect(150 + lane * 540, 230, 540, 730);
        ctx.fillStyle = activeLane?.lane === lane ? '#fff4bd' : 'rgba(255,255,255,.58)';
        ctx.font = '800 30px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(t((['lane.left', 'lane.center', 'lane.right'] as const)[lane]!), x, 300);
        ctx.fillStyle = '#4a2b39'; ctx.beginPath(); ctx.ellipse(x, 790, 205, 62, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = accent; ctx.lineWidth = 12; ctx.stroke();
        const cooked = this.progress.snapshot().byLane[lane]!;
        if (cooked > 0) {
          ctx.fillStyle = `rgba(255,207,98,${Math.min(.72, .16 + cooked * .08).toFixed(3)})`;
          ctx.beginPath(); ctx.ellipse(x, 790, 178, 44, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = secondary;
        for (let b = 0; b < 5; b++) { const phase = (snap.beat * .23 + b * .2 + lane * .11) % 1; ctx.globalAlpha = 1 - phase; ctx.beginPath(); ctx.arc(x - 120 + b * 55, 730 - phase * 260, 12 + phase * 19, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
    } else if (this.profile.id === 'cloud-post') {
      const wind = section === 'CLIMAX' ? 44 : section === 'VARIATION_B' ? -28 : 22;
      ctx.fillStyle = 'rgba(255,255,255,.15)';
      for (let i = 0; i < 9; i++) { const x = ((i * 265 - snap.beat * wind) % 2300) - 160; const y = 130 + (i % 4) * 150; ctx.beginPath(); ctx.ellipse(x, y, 150, 60, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#5b3a35'; ctx.fillRect(890, 470, 140, 430); ctx.fillStyle = accent; ctx.fillRect(850, 440, 220, 70);
      ctx.strokeStyle = secondary; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(960, 470); ctx.lineTo(960 + Math.sin(snap.beat * .5) * 210, 260); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.32)'; ctx.lineWidth = 7; ctx.setLineDash([22, 18]);
      ctx.beginPath(); ctx.moveTo(900, 500); ctx.quadraticCurveTo(540, 260, 180, 330); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(1020, 500); ctx.quadraticCurveTo(1380, 260, 1740, 330); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,246,205,.9)'; ctx.font = '72px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('⌂', 180, 330); ctx.fillText('⌂', 1740, 330);
      if (this.pointerPreview) {
        const p = this.pointerPreview;
        const dx = p.x - p.startX;
        const progress = Math.min(1, Math.abs(dx) / 180);
        ctx.save();
        ctx.strokeStyle = p.down ? '#ffffff' : 'rgba(255,255,255,.38)';
        ctx.lineWidth = 18; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p.startX, p.y); ctx.lineTo(p.x, p.y); ctx.stroke();
        ctx.fillStyle = progress >= 1 ? '#9ff5d8' : '#ffd48a';
        ctx.font = '800 30px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(progress >= 1 ? t('tutorial.cloud.ready') : t('tutorial.cloud.more'), 960, 820);
        ctx.restore();
      }
    } else {
      ctx.strokeStyle = 'rgba(182,245,143,.32)'; ctx.lineWidth = 18;
      for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(i * 240, 1080); ctx.quadraticCurveTo(i * 240 + 90, 590 - (i % 3) * 90, i * 240 + 180, 500); ctx.stroke(); }
      ctx.fillStyle = 'rgba(113,213,255,.16)'; ctx.fillRect(0, 160, 1920, 16 + pulse * 8);
      ctx.strokeStyle = secondary; ctx.lineWidth = 10; ctx.strokeRect(170, 120, 1580, 840);
      const laneSuccess = this.progress.snapshot().byLane;
      for (let lane = 0; lane < 3; lane++) {
        const x = 420 + lane * 540;
        const growth = Math.min(1, laneSuccess[lane]! / 3 + (section === 'CLIMAX' ? .25 : 0));
        ctx.strokeStyle = '#7aca79'; ctx.lineWidth = 22; ctx.beginPath(); ctx.moveTo(x, 820); ctx.quadraticCurveTo(x - 60, 650, x, 520 - growth * 140); ctx.stroke();
        ctx.fillStyle = `rgba(182,245,143,${(.18 + growth * .7).toFixed(3)})`;
        const petals = growth > .55 ? 6 : 3;
        for (let p = 0; p < petals; p++) {
          const a = p / petals * Math.PI * 2;
          ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 54, 510 - growth * 140 + Math.sin(a) * 42, 42, 18, a, 0, Math.PI * 2); ctx.fill();
        }
      }
      const held = this.pointerPreview?.down === true;
      const released = this.pointerPreview?.down === false;
      ctx.fillStyle = held ? '#dfffc8' : '#ffffff';
      ctx.font = '900 38px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(t(held ? 'tutorial.greenhouse.holding' : released ? 'tutorial.greenhouse.released' : 'tutorial.greenhouse.press'), 960, 300);
      ctx.strokeStyle = held ? accent : 'rgba(255,255,255,.42)'; ctx.lineWidth = 16;
      ctx.strokeRect(560, 340, 800, 40);
      if (held) {
        const release = (this.services?.scheduler.getJudgeTargets() ?? []).find((target) => {
          const meta = target.meta as TargetMeta | undefined;
          return !this.consumed.has(target.id) && target.inputKind === 'holdRelease' && meta?.lane === this.pointerPreview?.lane;
        });
        const meta = release?.meta as TargetMeta | undefined;
        const duration = meta?.durationBeats ?? 2;
        const progress = release ? Math.max(0, Math.min(1, (snap.beat - (release.beat - duration)) / duration)) : 1;
        ctx.fillStyle = accent; ctx.fillRect(568, 348, 784 * progress, 24);
      }
    }
  }

  private drawTargets(ctx: CanvasRenderingContext2D, snap: TransportSnapshot, accent: string, secondary: string): void {
    const future = (this.services?.scheduler.getJudgeTargets() ?? []).filter(t => !this.consumed.has(t.id) && t.beat >= snap.beat - .3 && t.beat <= snap.beat + 4);
    for (const target of future) {
      const meta = target.meta as TargetMeta;
      const laneX = 420 + meta.lane * 540;
      const d = target.beat - snap.beat;
      const approach = Math.max(0, Math.min(1, 1 - d / 3));
      const r = 48 + (1 - approach) * 45;
      ctx.save(); ctx.globalAlpha = .28 + approach * .72; ctx.lineWidth = 10;
      if (this.profile.id === 'bubble-kitchen') {
        const y = 350 + approach * 310;
        ctx.strokeStyle = d <= .15 ? '#fff' : accent;
        ctx.beginPath(); ctx.arc(laneX, y, r, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = secondary; ctx.globalAlpha = .55 + approach * .4;
        ctx.beginPath(); ctx.arc(laneX, y, 20 + approach * 10, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.font = '800 34px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(['●', '◆', '▲'][meta.lane]!, laneX, y);
      } else if (this.profile.id === 'cloud-post') {
        const dir = target.inputKind === 'swipeLeft' ? -1 : 1;
        const x = 960 - dir * (80 + (1 - approach) * 320);
        const y = 540 - (1 - approach) * 80;
        ctx.fillStyle = '#fff4c8'; ctx.strokeStyle = d <= .15 ? '#fff' : secondary; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.roundRect(x - 70, y - 44, 140, 88, 14); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#8d6d70'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x - 62, y - 36); ctx.lineTo(x, y + 4); ctx.lineTo(x + 62, y - 36); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.72)'; ctx.lineWidth = 12; ctx.setLineDash([20, 14]);
        ctx.beginPath(); ctx.moveTo(960 - dir * 260, y + 130); ctx.lineTo(960 + dir * 260, y + 130); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(960 + dir * 290, y + 130); ctx.lineTo(960 + dir * 235, y + 98); ctx.lineTo(960 + dir * 235, y + 162); ctx.closePath(); ctx.fill();
        ctx.font = '900 54px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(dir < 0 ? '←' : '→', 960, y + 130);
      } else {
        const isRelease = target.inputKind === 'holdRelease';
        const y = isRelease ? 450 : 665;
        ctx.strokeStyle = d <= .15 ? '#fff' : isRelease ? secondary : accent;
        ctx.beginPath(); ctx.arc(laneX, y, r, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(182,245,143,.55)'; ctx.lineWidth = 14;
        ctx.beginPath(); ctx.moveTo(laneX, 760); ctx.lineTo(laneX, y + (isRelease ? 54 : 0)); ctx.stroke();
        ctx.fillStyle = isRelease ? '#dfffc8' : '#71d5ff'; ctx.globalAlpha = .6 + approach * .4;
        const petals = isRelease ? 6 : 1;
        for (let p = 0; p < petals; p++) {
          const a = p / petals * Math.PI * 2;
          ctx.beginPath(); ctx.ellipse(laneX + Math.cos(a) * 30, y + Math.sin(a) * 30, isRelease ? 26 : 22, isRelease ? 12 : 22, a, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.font = '800 42px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(isRelease ? '↥' : '↧', laneX, y);
      }
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 6; ctx.setLineDash([18, 14]);
    if (this.profile.id === 'bubble-kitchen') {
      ctx.beginPath(); ctx.moveTo(220, 660); ctx.lineTo(1700, 660); ctx.stroke();
    } else if (this.profile.id === 'cloud-post') {
      ctx.beginPath(); ctx.moveTo(700, 540); ctx.lineTo(1220, 540); ctx.stroke();
    } else {
      for (const x of [420, 960, 1500]) { ctx.beginPath(); ctx.moveTo(x - 90, 665); ctx.lineTo(x + 90, 665); ctx.stroke(); }
    }
    ctx.setLineDash([]);
  }

  private drawFeedback(ctx: CanvasRenderingContext2D, snap: TransportSnapshot, accent: string): void {
    const now = snap.audioTime;
    for (const fx of this.progress.expireTransient(now)) {
      const p = Math.max(0, Math.min(1, (now - fx.at) / 1.8)); const x = 420 + fx.lane * 540;
      ctx.globalAlpha = 1 - p; ctx.fillStyle = accent;
      if (this.profile.id === 'bubble-kitchen') { ctx.beginPath(); ctx.arc(x, 510 - p * 390, 36 + p * 70, 0, Math.PI * 2); ctx.fill(); }
      else if (this.profile.id === 'cloud-post') { ctx.font = '100px system-ui'; ctx.textAlign = 'center'; ctx.fillText('✉', x + (fx.lane - 1) * p * 400, 470 - p * 320); }
      else { ctx.strokeStyle = accent; ctx.lineWidth = 20; ctx.beginPath(); ctx.moveTo(x, 780); ctx.quadraticCurveTo(x - 120, 550, x + Math.sin(p * 8) * 70, 320); ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
    if (this.feedback && now - this.feedback.at < .85) {
      const guidance = this.feedback.kind === 'WAIT' || this.feedback.kind === 'WRONG_LANE' || this.feedback.kind === 'WRONG_DIRECTION' || this.feedback.kind === 'HOLD_EARLY' || this.feedback.kind === 'HOLD_LATE' || this.feedback.kind === 'TOO_EARLY' || this.feedback.kind === 'TOO_LATE';
      const label = this.feedback.kind === 'WAIT' ? t('tutorial.waitForTarget')
        : this.feedback.kind === 'WRONG_LANE' ? t('tutorial.wrongLane')
          : this.feedback.kind === 'WRONG_DIRECTION' ? t('tutorial.wrongDirection')
            : this.feedback.kind === 'HOLD_EARLY' ? t('tutorial.holdEarly')
              : this.feedback.kind === 'HOLD_LATE' ? t('tutorial.holdLate')
                : this.feedback.kind === 'TOO_EARLY' ? t('tutorial.tooEarly')
                  : this.feedback.kind === 'TOO_LATE' ? t('tutorial.tooLate')
                    : localizedGardenFeedback(this.feedback.kind);
      ctx.fillStyle = 'rgba(5,8,28,.76)';
      ctx.beginPath(); ctx.roundRect(500, 875, 920, 112, 28); ctx.fill();
      ctx.fillStyle = this.feedback.kind === 'MISS' || guidance ? '#ffb3a9' : '#fff';
      ctx.font = '900 56px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, 960, 932);
    }
  }

  private nearestPendingTarget(snap: TransportSnapshot): ScheduledJudgeTarget | undefined {
    return (this.services?.scheduler.getJudgeTargets() ?? [])
      .filter((target) => !this.consumed.has(target.id) && target.beat >= snap.beat - 0.3)
      .sort((a, b) => Math.abs(a.beat - snap.beat) - Math.abs(b.beat - snap.beat))[0];
  }
}

export class BubbleKitchenStage extends GardenStage { constructor() { super(PROFILES['bubble-kitchen']); } }
export class CloudPostStage extends GardenStage { constructor() { super(PROFILES['cloud-post']); } }
export class SleepyGreenhouseStage extends GardenStage { constructor() { super(PROFILES['sleepy-greenhouse']); } }
