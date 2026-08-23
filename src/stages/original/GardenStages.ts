import type { PointerAction } from '../../game/InputRouter';
import type { PointerPreview, StageDefinition, StageRuntimeServices, StageTutorialStep, JudgeResult, UnmatchedInputContext } from '../../game/Stage';
import type { ScheduledEvent, ScheduledJudgeTarget } from '../../timing/Scheduler';
import type { TransportSnapshot } from '../../timing/Transport';
import { TIMING_CONFIG, type InputKind, type JudgementKind } from '../../timing/config';
import { t } from '../../i18n/strings';

type StageId = 'bubble-kitchen' | 'cloud-post' | 'sleepy-greenhouse';
type Palette = readonly [string, string, string, string];
type TargetMeta = { lane: number; direction?: 'left' | 'right'; role?: 'start' | 'release' };
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
    if (integer) events.push({ type: 'audio', beat, sound: beat % 4 === 0 ? 'kick' : beat % 2 === 0 ? 'snare' : 'hatClosed', velocity: 0.55 });
    else if (profile.id !== 'sleepy-greenhouse') events.push({ type: 'audio', beat, sound: 'hatClosed', velocity: 0.25 });
    if (integer && beat % 2 === 0) {
      const root = roots[Math.floor(beat / 4) % roots.length];
      events.push({ type: 'audio', beat, sound: profile.id === 'cloud-post' ? 'lead' : 'pluck', freqHz: root, durationSec: profile.id === 'sleepy-greenhouse' ? 0.7 : 0.25, velocity: 0.42 });
    }
    if (integer && beat % 4 === 0) events.push({ type: 'audio', beat, sound: 'bass', freqHz: roots[Math.floor(beat / 4) % roots.length] / 2, velocity: 0.42 });
  }
  return events;
}

function targets(profile: Profile): ScheduledJudgeTarget[] {
  const out: ScheduledJudgeTarget[] = [];
  if (profile.mechanic === 'hold') {
    for (let beat = 4, i = 0; beat < profile.totalBeats - 4; beat += 7, i++) {
      const releaseId = `${profile.id}-release-${i}`;
      out.push({ type: 'judge-target', id: `${profile.id}-start-${i}`, beat, inputKind: 'holdStart', pairedId: releaseId, meta: { lane: i % 3, role: 'start' } satisfies TargetMeta });
      out.push({ type: 'judge-target', id: releaseId, beat: beat + 2, inputKind: 'holdRelease', meta: { lane: i % 3, role: 'release' } satisfies TargetMeta });
    }
    return out;
  }
  for (let beat = 4, i = 0; beat < profile.totalBeats - 2; beat += i < 4 ? 3 : 2, i++) {
    const direction = i % 2 === 0 ? 'left' : 'right';
    out.push({
      type: 'judge-target', id: `${profile.id}-${i}`, beat,
      inputKind: profile.mechanic === 'swipe' ? (direction === 'left' ? 'swipeLeft' : 'swipeRight') : 'tap',
      meta: { lane: i % 3, direction } satisfies TargetMeta,
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
  private successes: Array<{ at: number; lane: number; kind: JudgementKind }> = [];
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
    this.successes = [];
    this.pointerPreview = null;
  }

  public onRestart(): void { if (this.services) this.onStart(this.services); }

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
    if (!result.automatic && result.kind !== 'MISS') this.successes.push({ at: now, lane, kind: result.kind });
  }

  public onUnmatchedInput(action: PointerAction, context: UnmatchedInputContext): void {
    const wantedKind: InputKind | null = action.type === 'tap' ? 'tap'
      : action.type === 'holdStart' ? 'holdStart'
        : action.type === 'holdEnd' ? 'holdRelease'
          : action.type === 'swipe' ? (action.direction === 'left' ? 'swipeLeft' : 'swipeRight') : null;
    const candidates = context.targets.filter((target) => {
      if (this.profile.mechanic === 'swipe') return target.inputKind === 'swipeLeft' || target.inputKind === 'swipeRight';
      return wantedKind === null || target.inputKind === wantedKind;
    });
    const expected = candidates.sort((a, b) => {
      const da = Math.abs((this.services?.transport.beatToAudioTime(a.beat) ?? action.audioTime) - action.audioTime);
      const db = Math.abs((this.services?.transport.beatToAudioTime(b.beat) ?? action.audioTime) - action.audioTime);
      return da - db;
    })[0];
    const targetAudioTime = expected && this.services ? this.services.transport.beatToAudioTime(expected.beat) : action.audioTime;
    const kind = classifyGardenUnmatched(
      this.profile.mechanic,
      action,
      expected,
      action.audioTime - targetAudioTime,
      context.okWindowSec,
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
    if (this.profile.id === 'bubble-kitchen') {
      ctx.fillStyle = '#351d36'; ctx.fillRect(0, 760, 1920, 320);
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
        ctx.fillStyle = secondary;
        for (let b = 0; b < 5; b++) { const phase = (snap.beat * .23 + b * .2 + lane * .11) % 1; ctx.globalAlpha = 1 - phase; ctx.beginPath(); ctx.arc(x - 120 + b * 55, 730 - phase * 260, 12 + phase * 19, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
    } else if (this.profile.id === 'cloud-post') {
      ctx.fillStyle = 'rgba(255,255,255,.15)';
      for (let i = 0; i < 9; i++) { const x = ((i * 265 - snap.beat * 22) % 2300) - 160; const y = 130 + (i % 4) * 150; ctx.beginPath(); ctx.ellipse(x, y, 150, 60, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#5b3a35'; ctx.fillRect(890, 470, 140, 430); ctx.fillStyle = accent; ctx.fillRect(850, 440, 220, 70);
      ctx.strokeStyle = secondary; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(960, 470); ctx.lineTo(960 + Math.sin(snap.beat * .5) * 210, 260); ctx.stroke();
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
      const held = this.pointerPreview?.down === true;
      const released = this.pointerPreview?.down === false;
      ctx.fillStyle = held ? '#dfffc8' : '#ffffff';
      ctx.font = '900 38px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(t(held ? 'tutorial.greenhouse.holding' : released ? 'tutorial.greenhouse.released' : 'tutorial.greenhouse.press'), 960, 300);
      ctx.strokeStyle = held ? accent : 'rgba(255,255,255,.42)'; ctx.lineWidth = 16;
      ctx.strokeRect(560, 340, 800, 40);
      if (held) { ctx.fillStyle = accent; ctx.fillRect(568, 348, 784, 24); }
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
      const y = this.profile.id === 'bubble-kitchen' ? 610 - approach * 75 : 520;
      ctx.save(); ctx.globalAlpha = .28 + approach * .72; ctx.strokeStyle = d <= .15 ? '#fff' : accent; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.arc(laneX, y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = secondary; ctx.globalAlpha = .45 + approach * .5; ctx.beginPath(); ctx.arc(laneX, y, 22, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.font = '700 46px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const symbol = target.inputKind === 'tap' ? '●' : target.inputKind === 'swipeLeft' ? '←' : target.inputKind === 'swipeRight' ? '→' : target.inputKind === 'holdStart' ? '↧' : '↥';
      ctx.fillText(symbol, laneX, y);
      if (this.profile.id === 'cloud-post') {
        const dir = target.inputKind === 'swipeLeft' ? -1 : 1;
        ctx.strokeStyle = 'rgba(255,255,255,.72)'; ctx.lineWidth = 12; ctx.setLineDash([20, 14]);
        ctx.beginPath(); ctx.moveTo(laneX - dir * 240, y + 150); ctx.lineTo(laneX + dir * 240, y + 150); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(laneX + dir * 270, y + 150); ctx.lineTo(laneX + dir * 220, y + 120); ctx.lineTo(laneX + dir * 220, y + 180); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 6; ctx.setLineDash([18, 14]);
    ctx.beginPath(); ctx.moveTo(220, 520); ctx.lineTo(1700, 520); ctx.stroke(); ctx.setLineDash([]);
  }

  private drawFeedback(ctx: CanvasRenderingContext2D, snap: TransportSnapshot, accent: string): void {
    const now = snap.audioTime;
    this.successes = this.successes.filter(fx => now - fx.at < 1.8);
    for (const fx of this.successes) {
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
