import type { PointerAction } from '../../game/InputRouter';
import type { StageDefinition, StageRuntimeServices, JudgeResult } from '../../game/Stage';
import type { ScheduledEvent, ScheduledJudgeTarget } from '../../timing/Scheduler';
import type { TransportSnapshot } from '../../timing/Transport';
import type { InputKind, JudgementKind } from '../../timing/config';

type StageId = 'bubble-kitchen' | 'cloud-post' | 'sleepy-greenhouse';
type Palette = readonly [string, string, string, string];
type TargetMeta = { lane: number; direction?: 'left' | 'right'; role?: 'start' | 'release' };

type Profile = {
  id: StageId;
  titleKey: 'stage.bubble.title' | 'stage.cloud.title' | 'stage.greenhouse.title';
  taglineKey: 'stage.bubble.tagline' | 'stage.cloud.tagline' | 'stage.greenhouse.tagline';
  bpm: number;
  totalBeats: number;
  palette: Palette;
  mechanic: 'laneTap' | 'swipe' | 'hold';
};

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
  private feedback: { kind: JudgementKind | 'WAIT'; at: number; lane: number } | null = null;
  private successes: Array<{ at: number; lane: number; kind: JudgementKind }> = [];

  protected constructor(private readonly profile: Profile) {
    this.id = profile.id;
    this.titleKey = profile.titleKey;
    this.taglineKey = profile.taglineKey;
  }

  public buildEvents(): readonly ScheduledEvent[] { return [...music(this.profile), ...targets(this.profile)]; }
  public totalBeats(): number { return this.profile.totalBeats; }

  public onStart(services: StageRuntimeServices): void {
    this.services = services;
    const now = services.transport.snapshot().audioTime;
    if (services.transport.bpm !== this.profile.bpm) services.transport.setBpm(this.profile.bpm, now);
    services.scheduler.setEvents(this.buildEvents());
    this.consumed.clear();
    this.feedback = null;
    this.successes = [];
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
    const actionLane = Math.max(0, Math.min(2, Math.floor((action.x / Math.max(1, window.innerWidth)) * 3)));
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
    this.feedback = { kind: result.kind, at: now, lane };
    if (!result.automatic && result.kind !== 'MISS') this.successes.push({ at: now, lane, kind: result.kind });
  }

  public onUnmatchedInput(): void {
    this.feedback = { kind: 'WAIT', at: this.services?.transport.snapshot().audioTime ?? 0, lane: 1 };
  }

  public render(ctx: CanvasRenderingContext2D, snap: TransportSnapshot): void {
    const W = ctx.canvas.width, H = ctx.canvas.height;
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
      for (let lane = 0; lane < 3; lane++) {
        const x = 420 + lane * 540;
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
    } else {
      ctx.strokeStyle = 'rgba(182,245,143,.32)'; ctx.lineWidth = 18;
      for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(i * 240, 1080); ctx.quadraticCurveTo(i * 240 + 90, 590 - (i % 3) * 90, i * 240 + 180, 500); ctx.stroke(); }
      ctx.fillStyle = 'rgba(113,213,255,.16)'; ctx.fillRect(0, 160, 1920, 16 + pulse * 8);
      ctx.strokeStyle = secondary; ctx.lineWidth = 10; ctx.strokeRect(170, 120, 1580, 840);
    }
  }

  private drawTargets(ctx: CanvasRenderingContext2D, snap: TransportSnapshot, accent: string, secondary: string): void {
    const future = targets(this.profile).filter(t => !this.consumed.has(t.id) && t.beat >= snap.beat - .3 && t.beat <= snap.beat + 4);
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
      ctx.fillStyle = this.feedback.kind === 'MISS' || this.feedback.kind === 'WAIT' ? '#ff8c9e' : '#fff';
      ctx.font = '900 68px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(this.feedback.kind === 'WAIT' ? '…' : this.feedback.kind, 960, 170);
    }
  }
}

export class BubbleKitchenStage extends GardenStage { constructor() { super(PROFILES['bubble-kitchen']); } }
export class CloudPostStage extends GardenStage { constructor() { super(PROFILES['cloud-post']); } }
export class SleepyGreenhouseStage extends GardenStage { constructor() { super(PROFILES['sleepy-greenhouse']); } }
