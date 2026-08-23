/**
 * Stage 1 — Firefly Dock / 萤火码头
 *
 * ORIGINAL visual concept (NOT derivative):
 *   - Night pier scene with two jagged wooden posts (geometric rectangles with
 *     bevels) standing in calm water.
 *   - A small glowing firefly-seed orb travels horizontally toward the centre
 *     post on each cue beat; when it perfectly overlaps the centre target,
 *     player taps to launch it skyward.
 *   - The dock worker is an original abstract geometric circle sprite wearing
 *     a cap (two stacked circles + cap arc) that bobbles gently.
 *
 * Judgement visual reactions (ORIGINAL):
 *   - PERFECT: steady cyan→white glow firefly travels a clean quadratic arc
 *     toward the stars, leaving a stable light trail.
 *   - GREAT: slight magenta tint + minor sinusoidal drift on the arc.
 *   - OK: yellow wobble with large-amplitude sinusoidal shake along the arc.
 *   - MISS: firefly splashes into water, producing concentric water rings
 *     plus a tiny angry cartoon "!" bubble that floats up (original comedy
 *     reaction — NOT a ripped sprite).
 *
 * Tutorial: first 2 targets show a pulsing text overlay
 *   "Tap when the GLOWING SEED reaches the CENTRE RING".
 *
 * Result screen: counts breakdown, score, accuracy, Restart button and
 *   (placeholder) Back to Stage Select button rendered via DOM overlay.
 */

import type {
  StageDefinition,
  StageRuntimeServices,
  StageScore,
  StageTutorialStep,
  JudgeResult,
} from '../../game/Stage';
import type {
  ScheduledEvent,
  ScheduledJudgeTarget,
} from '../../timing/Scheduler';
import type { PointerAction } from '../../game/InputRouter';
import type { TransportSnapshot } from '../../timing/Transport';
import { JudgementKind, TIMING_CONFIG } from '../../timing/config';
import { t } from '../../i18n/strings';
import { rhythmSection, type RhythmSection } from '../../game/GameFeel';
import {
  FIREFLY_BPM,
  FIREFLY_METER,
  FIREFLY_TOTAL_BARS,
  FIREFLY_CUE_BEATS_IN_CYCLE,
  buildFireflyDockMusicEvents,
} from './data';

/** Visual layout (logical 1920×1080 canvas). */
const LAYOUT = {
  // Dock posts stand on the bottom 1/3 of the screen.
  waterTopY: 720,
  postX: 960, // centre post
  postY: 720,
  postW: 140,
  postH: 160,
  targetR: 72, // centre target ring where the seed lands
  // Seed orb travels from LEFT approach point to the centre post.
  approachFromX: 300,
  approachY: 640, // before post
  // Where to launch UP after a tap (sky target).
  skyTargetX: 1620,
  skyTargetY: 180,
} as const;

/** Active reaction animation record for a post-tap launch or miss splash. */
type LaunchFx = {
  kind: 'launch';
  judge: Exclude<JudgementKind, 'MISS'>;
  startX: number;
  startY: number;
  /** Audio time when the tap happened. */
  t0: number;
  /** Duration of launch animation (seconds). */
  dur: number;
};
type SplashFx = {
  kind: 'splash';
  x: number;
  y: number;
  t0: number;
  dur: number;
};
type ActiveFx = LaunchFx | SplashFx;

function fireflySection(beat: number): RhythmSection {
  return rhythmSection(beat, FIREFLY_TOTAL_BARS * FIREFLY_METER[0] + 2);
}

export class FireflyDockStage implements StageDefinition {
  public readonly id = 'firefly-dock';
  public readonly titleKey = 'stage.firefly.title' as const;
  public readonly taglineKey = 'stage.firefly.tagline' as const;

  // Runtime refs set via onStart.
  private services: StageRuntimeServices | null = null;

  // Animation state (reset on restart).
  private fx: ActiveFx[] = [];
  private consumed = new Set<string>(); // target ids consumed by judge
  private lastMissBubbleText: { x: number; y: number; t0: number; text: string } | null = null;
  private feedback: { kind: JudgementKind | 'WAIT'; t0: number } | null = null;
  private workerActionT0: number | null = null;
  private constellation: Array<{ x: number; y: number }> = [];

  public buildEvents(): readonly ScheduledEvent[] {
    const musicEvents = buildFireflyDockMusicEvents();
    const cuesAndTargets: ScheduledEvent[] = [];
    // Convert cue beats → 1 visual cue (seed arrives) + 1 judge tap target.
    // Add a cue 2 beats before each tap for the stage to start moving the seed
    // from left toward the post, plus a separate cue at beat 0 for intro.
    const intro: ScheduledEvent = {
      type: 'cue', beat: -0.01, name: 'tutorial-intro',
    };
    cuesAndTargets.push(intro);
    for (const c of FIREFLY_CUE_BEATS_IN_CYCLE) {
      const targetBeat = c.bar * 4 + c.beatInBar;
      // Cue event 2 beats BEFORE target so a first-time player can track it.
      cuesAndTargets.push({
        type: 'cue', beat: targetBeat - 2, name: 'seed-approach',
        payload: { id: c.id, targetBeat },
      });
      // Cue event exactly at target beat (centre arrival).
      cuesAndTargets.push({
        type: 'cue', beat: targetBeat, name: 'seed-arrive',
        payload: { id: c.id },
      });
      // Judge tap target exactly at target beat.
      const target: ScheduledJudgeTarget = {
        type: 'judge-target',
        id: 'target-' + c.id,
        beat: targetBeat,
        inputKind: 'tap',
        meta: { section: fireflySection(targetBeat), phrase: Math.floor(c.bar / 3) },
      };
      cuesAndTargets.push(target);
    }
    return [...musicEvents, ...cuesAndTargets];
  }

  public totalBeats(): number {
    // Final bar end + 2 bars buffer for last launch animations before score.
    return FIREFLY_TOTAL_BARS * FIREFLY_METER[0] + 2;
  }

  public buildTutorialSteps(): readonly StageTutorialStep[] {
    return [0, 1, 2, 3].map((index) => ({
      id: `tap-${index}`,
      instructionKey: 'tutorial.firefly.action',
      detailKey: 'tutorial.firefly.detail',
      targets: [{
        type: 'judge-target', id: `tutorial-firefly-${index}`, beat: 3, inputKind: 'tap',
      }],
    }));
  }

  public onStart(services: StageRuntimeServices): void {
    this.services = services;
    services.judge.resetRun();
    // Note: StageRunner sets transport anchors (beat 0 → audioBeatZero) & handles
    // BPM initialization. We only set BPM here if the stage has a different tempo.
    const audioNow = services.transport.snapshot().audioTime;
    if (services.transport.bpm !== FIREFLY_BPM) {
      services.transport.setBpm(FIREFLY_BPM, audioNow);
    }
    // Set events into scheduler.
    const evts = this.buildEvents();
    services.scheduler.setEvents(evts);
    // Reset state
    this.consumed.clear();
    this.fx = [];
    this.lastMissBubbleText = null;
    this.feedback = null;
    this.workerActionT0 = null;
    this.constellation = [];
  }

  public onEnd(_score: StageScore): void {
    // Score DOM overlay is rendered by StageRunner; we just stop internal.
  }

  public onRestart(): void {
    if (!this.services) return;
    this.onStart(this.services);
  }

  /**
   * For tap: pick the live (unconsumed) judge target whose beat is closest to
   * the current audio time, regardless of pointer x/y (stage 1 is simple:
   * "anywhere tap" on rhythm = OK. No lane mapping needed for Stage 1).
   */
  public mapInputToTarget(
    action: PointerAction,
    liveTargets: readonly ScheduledJudgeTarget[],
  ): { target: ScheduledJudgeTarget; inputKind: 'tap' } | null {
    if (action.type !== 'tap') return null;
    if (!this.services) return null;
    const audioNow = action.audioTime;
    let best: ScheduledJudgeTarget | null = null;
    let bestDelta = Infinity;
    for (const t of liveTargets) {
      if (this.consumed.has(t.id)) continue;
      if (t.inputKind !== 'tap') continue;
      const tAt = this.services.transport.beatToAudioTime(t.beat);
      const d = Math.abs(tAt - audioNow);
      if (d < bestDelta) {
        bestDelta = d;
        best = t;
      }
    }
    return best ? { target: best, inputKind: 'tap' } : null;
  }

  public onJudge(result: JudgeResult, target: ScheduledJudgeTarget): void {
    this.consumed.add(target.id);
    if (!this.services) return;
    const t0 = this.services.transport.snapshot().audioTime;
    // Expiry without a player input may drop the seed and show disappointment,
    // but it must never make the lever look self-operated.
    if (!result.automatic) this.workerActionT0 = t0;
    if (result.kind === 'MISS') {
      // Splashes at bottom of the post near water.
      const splashX = LAYOUT.postX + (Math.random() - 0.5) * 40;
      const splashY = LAYOUT.waterTopY + 30;
      this.fx.push({ kind: 'splash', x: splashX, y: splashY, t0, dur: 1.2 });
      // Comedy bubble text (!)
      this.lastMissBubbleText = {
        x: LAYOUT.postX - 8, y: LAYOUT.postY - 130, t0,
        text: Math.random() < 0.5 ? '!' : '?!',
      };
    } else {
      if (!result.automatic) {
        const index = this.constellation.length;
        this.constellation.push({
          x: 1320 + (index % 5) * 88 + Math.sin(index * 1.7) * 24,
          y: 130 + Math.floor(index / 5) * 72 + Math.cos(index * 1.3) * 18,
        });
      }
      // Launch arc from centre post.
      this.fx.push({
        kind: 'launch',
        judge: result.kind as Exclude<JudgementKind, 'MISS'>,
        startX: LAYOUT.postX,
        startY: LAYOUT.postY - 60,
        t0,
        dur: 1.5,
      });
    }
  }

  public onUnmatchedInput(_action: PointerAction): void {
    if (!this.services) return;
    const t0 = this.services.transport.snapshot().audioTime;
    this.feedback = { kind: 'WAIT', t0 };
    this.workerActionT0 = t0;
  }

  // -------- Rendering --------

  public render(ctx: CanvasRenderingContext2D, snap: TransportSnapshot): void {
    const W = TIMING_CONFIG.logicalWidth;
    const H = TIMING_CONFIG.logicalHeight;
    this.drawSky(ctx, W, H, snap);
    this.drawStars(ctx, W, H, snap);
    this.drawDistantMountains(ctx, W, H);
    this.drawWater(ctx, W, H, snap);
    this.drawApproachGuide(ctx, snap);
    this.drawDockPost(ctx, snap);
    this.drawDockWorker(ctx, snap);
    this.drawSeedsAndTargets(ctx, snap);
    this.drawFx(ctx, snap);
    this.drawImmediateFeedback(ctx, snap);
  }

  private drawSky(ctx: CanvasRenderingContext2D, W: number, _H: number, snap: TransportSnapshot) {
    const g = ctx.createLinearGradient(0, 0, 0, LAYOUT.waterTopY);
    // Original night palette: deep royal → plum → wine
    const pulse = 0.5 + 0.5 * Math.sin(snap.beatInBar * Math.PI * 0.5);
    g.addColorStop(0, `rgb(${10 + pulse * 4}, ${12 + pulse * 4}, ${38})`);
    g.addColorStop(0.6, `rgb(${30 + pulse * 8}, ${20 + pulse * 4}, ${60})`);
    g.addColorStop(1, 'rgb(23, 15, 44)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, LAYOUT.waterTopY);

    // Distant moon.
    ctx.save();
    ctx.globalAlpha = 0.75;
    const mx = 1700;
    const my = 200;
    const mg = ctx.createRadialGradient(mx, my, 10, mx, my, 180);
    mg.addColorStop(0, 'rgba(255, 240, 200, 0.95)');
    mg.addColorStop(0.2, 'rgba(255, 230, 180, 0.35)');
    mg.addColorStop(1, 'rgba(255, 230, 180, 0)');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(mx, my, 180, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3d0';
    ctx.beginPath();
    ctx.arc(mx, my, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawStars(ctx: CanvasRenderingContext2D, W: number, _H: number, snap: TransportSnapshot) {
    // Procedural deterministic star field (no external image).
    for (let i = 0; i < 120; i++) {
      const x = (i * 137.1) % W;
      const y = (i * 241.7) % (LAYOUT.waterTopY - 20);
      const phase = ((snap.transportTime * 0.9) + i * 0.23) % 1;
      const tw = 0.4 + 0.6 * Math.sin(phase * Math.PI * 2);
      ctx.fillStyle = `rgba(220,230,255,${0.15 + 0.6 * tw})`;
      const size = (i % 3 === 0) ? 2 : 1;
      ctx.fillRect(x, y, size, size);
    }
    if (this.constellation.length > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(168,255,232,.48)'; ctx.lineWidth = 4;
      ctx.beginPath();
      this.constellation.forEach((point, index) => index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y));
      ctx.stroke();
      for (const point of this.constellation) {
        ctx.fillStyle = '#dffff5'; ctx.shadowColor = '#8df2d7'; ctx.shadowBlur = 22;
        ctx.beginPath(); ctx.arc(point.x, point.y, 6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawDistantMountains(ctx: CanvasRenderingContext2D, W: number, _H: number) {
    // Two layers of triangle silhouettes: parallax depth faked by color only.
    ctx.fillStyle = 'rgb(24, 20, 52)';
    ctx.beginPath();
    ctx.moveTo(0, LAYOUT.waterTopY);
    for (let x = 0; x <= W; x += 160) {
      const seed = Math.sin(x * 0.007) * 0.5 + 0.5;
      const peak = LAYOUT.waterTopY - 80 - seed * 90;
      ctx.lineTo(x, peak);
      ctx.lineTo(x + 80, LAYOUT.waterTopY - 20);
    }
    ctx.lineTo(W, LAYOUT.waterTopY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgb(34, 28, 66)';
    ctx.beginPath();
    ctx.moveTo(0, LAYOUT.waterTopY);
    for (let x = 0; x <= W; x += 240) {
      const seed = Math.sin(x * 0.011 + 1.5) * 0.5 + 0.5;
      const peak = LAYOUT.waterTopY - 30 - seed * 60;
      ctx.lineTo(x, peak);
      ctx.lineTo(x + 120, LAYOUT.waterTopY - 10);
    }
    ctx.lineTo(W, LAYOUT.waterTopY);
    ctx.closePath();
    ctx.fill();
  }

  private drawWater(ctx: CanvasRenderingContext2D, W: number, H: number, snap: TransportSnapshot) {
    // Gradient water + subtle sine wave ripples.
    const g = ctx.createLinearGradient(0, LAYOUT.waterTopY, 0, H);
    g.addColorStop(0, 'rgb(12, 10, 34)');
    g.addColorStop(1, 'rgb(4, 3, 14)');
    ctx.fillStyle = g;
    ctx.fillRect(0, LAYOUT.waterTopY, W, H - LAYOUT.waterTopY);

    // Ripples.
    ctx.strokeStyle = 'rgba(120, 150, 220, 0.15)';
    ctx.lineWidth = 2;
    for (let r = 0; r < 6; r++) {
      const base = LAYOUT.waterTopY + 30 + r * 50;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 8) {
        const wave = Math.sin(x * 0.012 + snap.transportTime * (0.8 + r * 0.1)) * 4;
        if (x === 0) ctx.moveTo(x, base + wave);
        else ctx.lineTo(x, base + wave);
      }
      ctx.stroke();
    }
  }

  private drawDockPost(ctx: CanvasRenderingContext2D, snap: TransportSnapshot) {
    // Centre post: trapezoid wooden plank with bevel top.
    const x = LAYOUT.postX - LAYOUT.postW / 2;
    const y = LAYOUT.postY;
    ctx.save();
    // Shadow under water.
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(x + 10, y + LAYOUT.postH - 6, LAYOUT.postW - 20, 40);

    // Main post body.
    const bodyGrad = ctx.createLinearGradient(x, y, x + LAYOUT.postW, y);
    bodyGrad.addColorStop(0, '#4b3a2a');
    bodyGrad.addColorStop(0.5, '#6b5237');
    bodyGrad.addColorStop(1, '#3f3022');
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(x, y, LAYOUT.postW, LAYOUT.postH);

    // Wood grain lines.
    ctx.strokeStyle = 'rgba(20, 12, 6, 0.4)';
    ctx.lineWidth = 2;
    for (let i = 1; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(x + 6, y + (LAYOUT.postH / 5) * i);
      ctx.lineTo(x + LAYOUT.postW - 6, y + (LAYOUT.postH / 5) * i + 3);
      ctx.stroke();
    }

    // Top "cap" wider bevel.
    ctx.fillStyle = '#7a5e41';
    ctx.beginPath();
    ctx.moveTo(x - 14, y);
    ctx.lineTo(x + LAYOUT.postW + 14, y);
    ctx.lineTo(x + LAYOUT.postW + 4, y - 16);
    ctx.lineTo(x - 4, y - 16);
    ctx.closePath();
    ctx.fill();

    // Target ring on the cap.
    ctx.translate(LAYOUT.postX, y - 60);
    const distance = this.nearestTargetDistanceBeats(snap.beat);
    const approachStrength = Math.max(0, 1 - distance / 2);
    const timingPulse = 0.55 + approachStrength * 0.45;
    // Outer glow
    const rg = ctx.createRadialGradient(0, 0, 8, 0, 0, LAYOUT.targetR + 24);
    rg.addColorStop(0, 'rgba(180, 255, 220, 0.35)');
    rg.addColorStop(1, 'rgba(180, 255, 220, 0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(0, 0, LAYOUT.targetR + 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = approachStrength > 0.82 ? '#ffffff' : `rgba(200, 255, 230, ${timingPulse})`;
    ctx.lineWidth = 4 + approachStrength * 8;
    ctx.beginPath();
    ctx.arc(0, 0, LAYOUT.targetR + distance * 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(200, 255, 230, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, LAYOUT.targetR * 0.62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(220, 255, 240, 0.9)';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    if (distance < 0.28) {
      ctx.font = 'bold 28px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(t('tutorial.action'), 0, -LAYOUT.targetR - 34);
    }

    ctx.restore();
  }

  private drawDockWorker(ctx: CanvasRenderingContext2D, snap: TransportSnapshot) {
    // Small original geometric sprite: body circle + cap half-circle, no
    // eyes drawn on purpose; the figure stays abstract and geometric.
    const beat = snap.beatInBar;
    const bob = Math.abs(Math.sin(beat * Math.PI * 0.5)) * 6;
    const cx = LAYOUT.postX;
    const cy = LAYOUT.postY + 18 - bob;
    const actionAge = this.workerActionT0 === null ? Infinity : snap.audioTime - this.workerActionT0;
    const action = actionAge >= 0 && actionAge < 0.32
      ? Math.sin((actionAge / 0.32) * Math.PI)
      : 0;
    ctx.save();
    // Body.
    ctx.fillStyle = '#e08855';
    ctx.beginPath();
    ctx.arc(cx, cy + 22, 28, 0, Math.PI * 2);
    ctx.fill();
    // Head.
    ctx.fillStyle = '#ffd2a8';
    ctx.beginPath();
    ctx.arc(cx, cy - 8, 22, 0, Math.PI * 2);
    ctx.fill();
    // Cap.
    ctx.fillStyle = '#2d608a';
    ctx.beginPath();
    ctx.arc(cx, cy - 18, 24, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(cx - 34, cy - 18, 68, 6);
    // Little scarf / collar.
    ctx.fillStyle = '#a23f3f';
    ctx.fillRect(cx - 22, cy + 6, 44, 8);
    // The lever and arm only swing after player input, making cause/effect explicit.
    ctx.save();
    ctx.translate(cx + 28, cy + 10);
    ctx.rotate(-0.55 + action * 1.15);
    ctx.strokeStyle = '#ffd2a8';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(48, -22);
    ctx.stroke();
    ctx.strokeStyle = '#8ad8ff';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(44, -20);
    ctx.lineTo(74, -58);
    ctx.stroke();
    ctx.restore();
    ctx.restore();
  }

  private drawApproachGuide(ctx: CanvasRenderingContext2D, snap: TransportSnapshot): void {
    const targetY = LAYOUT.postY - 60;
    const strength = Math.max(0.25, 1 - this.nearestTargetDistanceBeats(snap.beat) / 2);
    ctx.save();
    ctx.strokeStyle = `rgba(130, 235, 220, ${0.28 + strength * 0.42})`;
    ctx.lineWidth = 12;
    ctx.setLineDash([28, 22]);
    ctx.beginPath();
    ctx.moveTo(LAYOUT.approachFromX, LAYOUT.approachY);
    ctx.lineTo(LAYOUT.postX, targetY);
    ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 1; i <= 4; i++) {
      const p = i / 5;
      const x = LAYOUT.approachFromX + (LAYOUT.postX - LAYOUT.approachFromX) * p;
      const y = LAYOUT.approachY + (targetY - LAYOUT.approachY) * p;
      ctx.fillStyle = `rgba(205,255,240,${0.25 + strength * 0.55})`;
      ctx.beginPath();
      ctx.moveTo(x + 18, y);
      ctx.lineTo(x - 14, y - 14);
      ctx.lineTo(x - 14, y + 14);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private drawSeedsAndTargets(ctx: CanvasRenderingContext2D, snap: TransportSnapshot) {
    if (!this.services) return;
    const currentBeat = snap.beat;
    for (const target of this.services.scheduler.getJudgeTargets()) {
      if (target.inputKind !== 'tap') continue;
      const targetBeat = target.beat;
      if (targetBeat < currentBeat - 1 || targetBeat > currentBeat + 12) continue;
      const targetId = target.id;
      if (this.consumed.has(targetId)) continue;
      // progress: 0 two beats early, 1 exactly at the hit zone.
      const progFromApproach = (currentBeat - (targetBeat - 2)) / 2;
      const prog = Math.max(0, Math.min(1.5, progFromApproach));
      if (prog > 1.25) continue; // already past (scheduled as miss later)
      // Linear approach approachX -> postX at post cap level.
      const lerpX = LAYOUT.approachFromX + (LAYOUT.postX - LAYOUT.approachFromX) * Math.min(1, prog);
      const lerpY = LAYOUT.approachY + (LAYOUT.postY - 60 - LAYOUT.approachY) * Math.min(1, prog);
      // After target beat it starts to fall (miss visual if still unconsumed).
      let y = lerpY;
      if (prog > 1) {
        const over = prog - 1;
        y = lerpY + over * over * 500; // accelerate down (miss)
      }
      this.drawSeed(ctx, lerpX, y, 1);
      if (prog >= 0.72 && prog <= 1.08) {
        ctx.save();
        ctx.strokeStyle = `rgba(255,255,255,${0.35 + Math.max(0, 1 - Math.abs(1 - prog) * 3) * 0.65})`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(lerpX, y, 42 + Math.abs(1 - prog) * 70, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  private drawSeed(ctx: CanvasRenderingContext2D, x: number, y: number, alpha: number) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const r = 26;
    const g = ctx.createRadialGradient(x, y, 2, x, y, r * 2.8);
    g.addColorStop(0, 'rgba(220, 255, 200, 0.95)');
    g.addColorStop(0.5, 'rgba(150, 255, 200, 0.4)');
    g.addColorStop(1, 'rgba(100, 240, 180, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2ffe3';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(120, 255, 200, 0.6)';
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawFx(ctx: CanvasRenderingContext2D, snap: TransportSnapshot) {
    const now = snap.audioTime;
    this.fx = this.fx.filter((f) => now - f.t0 < f.dur);
    for (const f of this.fx) {
      const t = Math.max(0, Math.min(1, (now - f.t0) / f.dur));
      if (f.kind === 'launch') {
        this.drawLaunch(ctx, f, t);
      } else {
        this.drawSplash(ctx, f, t);
      }
    }
    // Miss text bubble (lasts 2.5 seconds).
    if (this.lastMissBubbleText) {
      const t = Math.max(0, Math.min(1, (now - this.lastMissBubbleText.t0) / 2.5));
      const b = this.lastMissBubbleText;
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.translate(b.x, b.y - t * 80);
      // Bubble.
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#c12';
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.text, 0, 2);
      ctx.restore();
    }
  }

  private drawLaunch(ctx: CanvasRenderingContext2D, fx: LaunchFx, t: number) {
    // Quadratic Bezier from start point (post cap) to sky target.
    const x0 = fx.startX;
    const y0 = fx.startY;
    const x3 = LAYOUT.skyTargetX;
    const y3 = LAYOUT.skyTargetY;
    const cx = (x0 + x3) * 0.5;
    const cy = y0 - 320; // control above
    const mt = t;
    const x = (1 - mt) * (1 - mt) * x0 + 2 * (1 - mt) * mt * cx + mt * mt * x3;
    const y = (1 - mt) * (1 - mt) * y0 + 2 * (1 - mt) * mt * cy + mt * mt * y3;

    // Wobble offsets based on judgement.
    let shakeAmp = 0;
    let tint: { r: number; g: number; b: number };
    let trailAlpha = 1;
    if (fx.judge === 'PERFECT') {
      tint = { r: 200, g: 255, b: 240 };
      shakeAmp = 0;
    } else if (fx.judge === 'GREAT') {
      tint = { r: 220, g: 200, b: 255 };
      shakeAmp = 10;
    } else { // OK
      tint = { r: 255, g: 240, b: 160 };
      shakeAmp = 30;
    }
    const wob = Math.sin(t * Math.PI * 8) * shakeAmmoWarn(shakeAmp, t);

    // Draw trail (series of previous points along the arc).
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 1; i <= 14; i++) {
      const ti = Math.max(0, t - i * 0.02);
      const tx = (1 - ti) * (1 - ti) * x0 + 2 * (1 - ti) * ti * cx + ti * ti * x3;
      const ty = (1 - ti) * (1 - ti) * y0 + 2 * (1 - ti) * ti * cy + ti * ti * y3;
      const tw = Math.sin(ti * Math.PI) * 16;
      const alpha = (1 - i / 14) * trailAlpha * 0.55;
      ctx.fillStyle = `rgba(${tint.r},${tint.g},${tint.b},${alpha})`;
      ctx.beginPath();
      ctx.arc(tx, ty + (i === 0 ? wob : Math.sin(ti * Math.PI * 8) * shakeAmp * ti), tw, 0, Math.PI * 2);
      ctx.fill();
    }
    // Seed head.
    this.drawSeed(ctx, x + wob, y, 0.9);
    // Target sky marker at end (fades in when close).
    if (t > 0.7) {
      const fa = (t - 0.7) / 0.3;
      ctx.globalAlpha = fa;
      ctx.strokeStyle = `rgba(${tint.r},${tint.g},${tint.b},0.7)`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x3, y3, 20 + (1 - fa) * 40, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawSplash(ctx: CanvasRenderingContext2D, fx: SplashFx, t: number) {
    // Concentric expanding rings.
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const rt = Math.max(0, Math.min(1, t - i * 0.1));
      const radius = 10 + rt * 110;
      const alpha = (1 - rt) * 0.4;
      ctx.strokeStyle = `rgba(160, 200, 255, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(fx.x, fx.y, radius, radius * 0.35, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Droplets going up.
    for (let i = 0; i < 6; i++) {
      const ang = (-Math.PI / 2) + (i - 2.5) * 0.25;
      const speed = 90 + i * 10;
      const x = fx.x + Math.cos(ang) * speed * t;
      const y = fx.y + Math.sin(ang) * speed * t + 0.5 * 400 * t * t;
      ctx.fillStyle = `rgba(180, 210, 255, ${0.9 * (1 - t)})`;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawImmediateFeedback(ctx: CanvasRenderingContext2D, snap: TransportSnapshot): void {
    if (!this.feedback) return;
    const age = snap.audioTime - this.feedback.t0;
    if (age < 0 || age > 0.9) return;
    const alpha = Math.min(1, age * 10) * (1 - age / 0.9);
    const key = this.feedback.kind === 'WAIT'
      ? 'tutorial.wait'
      : `feedback.${this.feedback.kind}` as const;
    const color = this.feedback.kind === 'MISS' || this.feedback.kind === 'WAIT'
      ? '#ffd27a'
      : '#d9fff2';
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 66px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(8,10,30,0.7)';
    ctx.fillRect(520, 120, 880, 112);
    ctx.fillStyle = color;
    ctx.fillText(t(key), LAYOUT.postX, 176 - age * 18);
    ctx.restore();
  }

  private nearestTargetDistanceBeats(currentBeat: number): number {
    let nearest = 2;
    for (const target of this.services?.scheduler.getJudgeTargets() ?? []) {
      if (this.consumed.has(target.id)) continue;
      nearest = Math.min(nearest, Math.abs(target.beat - currentBeat));
    }
    return nearest;
  }
}

// Helper to avoid unused warning when shakeAmp unused.
function shakeAmmoWarn(amp: number, t: number): number {
  // Fade shake amplitude as we approach end so arc terminates cleanly.
  return amp * (1 - t * 0.5);
}
