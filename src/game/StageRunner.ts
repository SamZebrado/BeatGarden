/**
 * StageRunner — wires StageDefinition + shared services together into one
 * playable stage. Handles:
 *   - Audio unlock (Tap to enable audio overlay)
 *   - Transport start/end
 *   - InputRouter → stage.mapInputToTarget → judge.judgeTarget()
 *   - Stage ended detection: after transport beat >= stage.totalBeats()
 *     wait a short fade buffer, then call stage.onEnd + render DOM result
 *     overlay with Restart / Back (placeholder) buttons.
 *   - Debug Overlay (toggle via D key, or via window.__BEATGARDEN__.toggleDebug())
 *   - Pause (ESC key) / resume support (minimal).
 */

import type { StageDefinition, StageRuntimeServices, StageScore } from './Stage';
import { Transport } from '../timing/Transport';
import { Scheduler } from '../timing/Scheduler';
import { Judge } from '../timing/Judge';
import { AudioEngine } from '../audio/AudioEngine';
import { Synth } from '../audio/Synth';
import { InputRouter, type PointerAction } from './InputRouter';
import { TIMING_CONFIG, type TimingConfig } from '../timing/config';
import { CanvasManager } from '../render/CanvasManager';
import { DebugOverlay } from '../render/DebugOverlay';

export interface StageRunnerOptions {
  root: HTMLElement;
  stage: StageDefinition;
  config?: TimingConfig;
}

type Phase = 'locked' | 'countdown' | 'playing' | 'ended';

export class StageRunner {
  public readonly stage: StageDefinition;
  public readonly config: TimingConfig;
  public readonly canvasMgr: CanvasManager;
  public readonly audio: AudioEngine;
  public readonly synth: Synth;
  public readonly transport: Transport;
  public readonly scheduler: Scheduler;
  public readonly judge: Judge;
  public readonly input: InputRouter;
  public readonly debug: DebugOverlay;

  private services!: StageRuntimeServices;
  private _raf: number | null = null;
  private phase: Phase = 'locked';
  private countdownStartAudioTime: number = 0;
  private ended: boolean = false;

  private overlays: {
    unlock: HTMLDivElement | null;
    result: HTMLDivElement | null;
  } = { unlock: null, result: null };

  private fpsLastT = performance.now();
  private fpsFrames = 0;
  private fpsDisplay = 0;

  constructor(opts: StageRunnerOptions) {
    this.stage = opts.stage;
    this.config = opts.config ?? TIMING_CONFIG;

    // Build engine / services.
    this.canvasMgr = new CanvasManager({ parent: opts.root, config: this.config });
    this.audio = new AudioEngine({
      musicVolume: this.config.musicVolumeDefault,
      sfxVolume: this.config.sfxVolumeDefault,
    });
    this.synth = new Synth(this.audio);
    this.transport = new Transport(() => this.audio.now(), 120, [4, 4]);
    this.scheduler = new Scheduler({
      transport: this.transport,
      config: this.config,
      synth: this.synth,
    });
    this.judge = new Judge(this.config, this.transport, this.config.calibrationDefaultOffsetMs, {
      onJudge: (res, target) => {
        this.debug.reportJudgement(res);
        const targetAudioTime = this.transport.beatToAudioTime(target.beat);
        this.debug.reportTarget(target.beat, targetAudioTime);
        this.debug.reportCounts(this.judge.statsCounts());
        this.stage.onJudge?.(res, target);
        // Audio SFX reaction.
        const tAfter = this.audio.now() + 0.002;
        if (res.kind === 'PERFECT' || res.kind === 'GREAT') this.synth.play('success', tAfter);
        else if (res.kind === 'OK') this.synth.play('uiClick', tAfter);
        else if (res.kind === 'MISS') this.synth.play('miss', tAfter);
      },
    });
    this.input = new InputRouter({
      config: this.config,
      getAudioTime: () => this.audio.now(),
      el: this.canvasMgr.canvas,
      aggressiveDefaults: true,
    });
    this.debug = new DebugOverlay();

    this.services = {
      transport: this.transport,
      scheduler: this.scheduler,
      judge: this.judge,
    };

    // ---- GATE 0 PARTIAL Issue 2: visibility lifecycle hooks ----
    // AudioEngine calls these synchronously inside its visibility/pagehide
    // handlers. We atomically stop+pause everything so Transport anchors,
    // Scheduler cursor, and AudioContext state cannot drift apart after a
    // background tab → foreground transition on Android Chrome/PWA.
    this.audio.setLifecycleHooks({
      onSuspend: () => {
        // Called when document becomes hidden.
        this.scheduler.stop();
        if (this.phase === 'playing' || this.phase === 'countdown') {
          this.transport.pause(this.audio.now());
        }
      },
      onResume: () => {
        // Called when document comes back to visible and AudioEngine state
        // transitions from 'suspended' → 'unlocked'.
        //
        // IMPORTANT: we do NOT blindly call transport.resume() here. The
        // user may have intentionally paused via ESC before tabbing away.
        // We only resume the countdown/playing phases. Stage phases (locked,
        // ended) stay put. The Transport anchor was updated in onSuspend
        // via pause(), so re-anchoring here just picks up from the same
        // beat position — no phase drift even if audio time advanced.
        if (this.phase === 'playing' || this.phase === 'countdown') {
          // Restart scheduler tick loop so the refill timer runs again.
          this.scheduler.start();
          // Re-anchor transport at the current audio time, carrying forward
          // the beat position it had when we paused.
          this.transport.start(undefined, this.audio.now());
        }
      },
    });

    this.attachInput();
    this.attachKeyShortcuts();
    this.buildUnlockOverlay();

    // Expose debug handles.
    (window as unknown as { __BEATGARDEN__?: unknown }).__BEATGARDEN__ = {
      toggleDebug: () => this.debug.toggle(),
      getCounts: () => this.judge.statsCounts(),
      getSnap: () => this.transport.snapshot(),
      isAudioUnlocked: () => this.audio.state === 'unlocked' || this.audio.state === 'suspended',
      getPhase: () => this.phase,
      restart: () => this.restart(),
    };

    this.startRaf();
  }

  // -------- Input & shortcuts --------

  private attachInput(): void {
    this.input.addListener((action: PointerAction) => {
      this.debug.reportInput(null, this.audio.now());
      if (this.phase !== 'playing') return;
      const snap = this.transport.snapshot();
      // Collect pending judge targets (within ± ok+window).
      const audioNow = action.audioTime;
      const okSec = this.config.okWindowMs / 1000;
      const fromBeat = this.transport.audioTimeToBeat(audioNow - okSec);
      const toBeat = this.transport.audioTimeToBeat(audioNow + okSec + 0.1);
      const targets = this.scheduler.getJudgeTargetsInWindow(fromBeat, toBeat);
      const mapped = this.stage.mapInputToTarget(action, targets, snap);
      if (mapped) {
        this.judge.judgeTarget(mapped.target, action.audioTime, mapped.inputKind);
      }
    });
  }

  private attachKeyShortcuts(): void {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'd' || e.key === 'D') this.debug.toggle();
      if (e.key === 'Escape') {
        if (this.phase === 'playing') this.pauseLocal();
      }
      if (e.key === 'r' || e.key === 'R') {
        this.restart();
      }
    });
  }

  // -------- DOM overlays --------

  private buildUnlockOverlay(): void {
    const d = document.createElement('div');
    d.style.cssText = `
position: fixed; inset: 0; background: #0a0c20;
display: flex; align-items: center; justify-content: center;
flex-direction: column; z-index: 50; color: #fff;
font-family: system-ui, -apple-system, sans-serif; cursor: pointer;
`;
    const title = document.createElement('div');
    title.textContent = this.stage.title;
    title.style.cssText = 'font-size: 44px; font-weight: 700; margin-bottom: 12px;';
    d.appendChild(title);
    const tag = document.createElement('div');
    tag.textContent = this.stage.tagline;
    tag.style.cssText = 'font-size: 20px; color: #c9d3ff; margin-bottom: 36px;';
    d.appendChild(tag);
    const tap = document.createElement('div');
    tap.textContent = 'Tap anywhere to enable audio';
    tap.style.cssText = `
font-size: 22px; padding: 18px 34px; border-radius: 999px;
background: linear-gradient(180deg, #3d63ff, #5b3dff);
box-shadow: 0 10px 30px rgba(80,60,200,0.4);
`;
    d.appendChild(tap);
    const hint = document.createElement('div');
    hint.textContent = 'Shortcuts: R = Restart, D = Toggle Debug, ESC = Pause';
    hint.style.cssText = 'margin-top: 40px; color: #7a84a8; font-size: 14px;';
    d.appendChild(hint);
    d.addEventListener('pointerdown', () => this.onUnlock());
    document.body.appendChild(d);
    this.overlays.unlock = d;
  }

  private buildResultOverlay(score: StageScore): void {
    const d = document.createElement('div');
    d.style.cssText = `
position: fixed; inset: 0; background: rgba(4, 6, 18, 0.88);
display: flex; align-items: center; justify-content: center;
flex-direction: column; z-index: 40; color: #fff;
font-family: system-ui, -apple-system, sans-serif; padding: 32px;
backdrop-filter: blur(4px);
`;
    const title = document.createElement('div');
    title.textContent = 'Result';
    title.style.cssText = 'font-size: 40px; font-weight: 700; margin-bottom: 18px;';
    d.appendChild(title);
    const s = document.createElement('div');
    const max = score.total * 300;
    s.textContent = `Score: ${score.score} / ${max}   ·   Accuracy: ${(score.accuracy * 100).toFixed(2)}%`;
    s.style.cssText = 'font-size: 28px; margin-bottom: 24px; color: #d0e0ff;';
    d.appendChild(s);
    const counts = document.createElement('div');
    counts.style.cssText = 'font-size: 22px; margin-bottom: 40px; color: #b9c7ee; line-height: 1.8;';
    counts.innerHTML = `
Perfect: ${score.counts.PERFECT}<br/>
Great: ${score.counts.GREAT}<br/>
OK: ${score.counts.OK}<br/>
Miss: ${score.counts.MISS}<br/>
Mean signed error: ${score.meanSignedErrorMs.toFixed(1)} ms<br/>
Median signed error: ${score.medianSignedErrorMs.toFixed(1)} ms
`;
    d.appendChild(counts);
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; gap: 18px; flex-wrap: wrap; justify-content: center;';
    const bRestart = document.createElement('button');
    bRestart.textContent = 'Restart';
    bRestart.style.cssText = `
font-size: 20px; padding: 14px 26px; border-radius: 999px; border: 0;
background: linear-gradient(180deg, #3d63ff, #5b3dff); color: white;
cursor: pointer; box-shadow: 0 8px 24px rgba(80,60,200,0.35);
`;
    bRestart.addEventListener('click', () => {
      this.removeResultOverlay();
      this.restart();
    });
    row.appendChild(bRestart);
    const bBack = document.createElement('button');
    bBack.textContent = 'Back to Stage Select (placeholder)';
    bBack.style.cssText = `
font-size: 18px; padding: 14px 24px; border-radius: 999px;
background: rgba(255,255,255,0.08); color: #c9d3ff; border: 1px solid rgba(255,255,255,0.15);
cursor: pointer;
`;
    bBack.addEventListener('click', () => {
      this.removeResultOverlay();
      this.buildUnlockOverlay();
      this.phase = 'locked';
    });
    row.appendChild(bBack);
    d.appendChild(row);
    document.body.appendChild(d);
    this.overlays.result = d;
  }

  private removeResultOverlay(): void {
    if (this.overlays.result) {
      this.overlays.result.remove();
      this.overlays.result = null;
    }
  }

  // -------- Phase transitions --------

  private onUnlock(): void {
    void this.audio.unlockFromUserGesture();
    if (this.overlays.unlock) {
      this.overlays.unlock.remove();
      this.overlays.unlock = null;
    }
    this.startCountdown();
  }

  private startCountdown(): void {
    // Stage onStart: sets BPM to stage's BPM, calls reset(), builds events & passes to scheduler.
    // ---- Restart clean-up: beat MUST return to 0 so restart() starts from the
    // beginning (GATE 0 PARTIAL Issue 5 — restart cursor reset consistency).
    // reset() puts transport._playing = false → this also satisfies
    // Transport.setBpm's "not during playing" guard for the stage.onStart
    // setBpm call below.
    this.transport.reset(this.audio.now());
    this.judge.resetRun();
    this.stage.onStart?.(this.services);
    const now = this.audio.now();
    this.countdownStartAudioTime = now + 0.04;
    this.phase = 'countdown';
    this.ended = false;
    // Schedule 2 countdown ticks ahead of beat 0.
    // Transport beat 0 aligns to 2 secPerBeat after countdownStartAudioTime.
    const secPerBeat = 60 / this.transport.bpm;
    const audioBeatZero = this.countdownStartAudioTime + secPerBeat * 2;
    this.transport.start(0, audioBeatZero);
    // Countdown ticks manually scheduled on WebAudio timeline.
    for (let i = 0; i < 2; i++) {
      const at = audioBeatZero - secPerBeat * (2 - i); // audioBeatZero - 2*sec, audioBeatZero - 1*sec.
      this.synth.play('uiClick', at + 0.002);
    }
    this.scheduler.start();
    this.debug.reportCounts(this.judge.statsCounts());
    this.debug.reportCalibration(this.judge.getCalibrationOffsetMs());
  }

  private phasePlayingCheck(): void {
    if (this.phase !== 'playing') return;
    const snap = this.transport.snapshot();
    const total = this.stage.totalBeats();
    // When beat passes totalBeats, end the stage after fade buffer.
    if (!this.ended && snap.beat >= total) {
      this.ended = true;
      const endAt = snap.audioTime + 1.5;
      const delayMs = Math.max(0, (endAt - this.audio.now()) * 1000);
      window.setTimeout(() => this.finishRun(), delayMs as unknown as number);
    }
    // Auto-miss expired targets (past OK window).
    const okSec = this.config.okWindowMs / 1000 + 0.01;
    const maxBeatToCheck = this.transport.audioTimeToBeat(snap.audioTime - okSec);
    const expired = this.scheduler.getJudgeTargetsInWindow(-1e9, maxBeatToCheck + 1);
    for (const t of expired) {
      this.judge.autoMiss(t);
    }
  }

  private finishRun(): void {
    if (this.phase === 'ended') return;
    this.scheduler.stop();
    this.transport.pause(this.audio.now());
    const score = this.judge.finalScore();
    this.phase = 'ended';
    this.stage.onEnd?.(score);
    this.buildResultOverlay(score);
  }

  public restart(): void {
    this.removeResultOverlay();
    this.scheduler.stop();
    if (this.transport.snapshot().playing) {
      this.transport.pause(this.audio.now());
    }
    this.stage.onRestart?.();
    this.startCountdown();
  }

  private pauseLocal(): void {
    // Soft pause: stop scheduler advance, pause transport, audible ping.
    this.scheduler.stop();
    this.transport.pause(this.audio.now());
    this.synth.play('miss', this.audio.now() + 0.002);
  }

  // -------- Render loop --------

  private startRaf(): void {
    const loop = () => {
      this.tick();
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
    // ensure TS sees `_raf` as read (kept for potential cleanup)
    void this._raf;
  }

  private tick(): void {
    // Phase transition countdown → playing when beat >= 0.
    if (this.phase === 'countdown') {
      const snap = this.transport.snapshot();
      if (snap.beat >= 0) {
        this.phase = 'playing';
      }
    }
    if (this.phase === 'playing') {
      this.scheduler.advanceIfNeeded();
      this.phasePlayingCheck();
    }
    // Render.
    const ctx = this.canvasMgr.ctx;
    this.canvasMgr.beginFrame();
    ctx.fillStyle = '#07081a';
    ctx.fillRect(0, 0, this.canvasMgr.logicalW, this.canvasMgr.logicalH);
    if (this.phase === 'playing' || this.phase === 'countdown' || this.phase === 'ended') {
      const snap = this.transport.snapshot();
      this.stage.render(ctx, snap);
      this.drawCountdownOverlay(ctx);
      this.debug.render(ctx);
    } else {
      this.drawIdleBackground(ctx);
    }
    this.canvasMgr.endFrame();
    // FPS update.
    this.fpsFrames++;
    const now = performance.now();
    if (now - this.fpsLastT >= 500) {
      this.fpsDisplay = (this.fpsFrames * 1000) / (now - this.fpsLastT);
      this.fpsFrames = 0;
      this.fpsLastT = now;
      if (this.phase !== 'locked') {
        this.debug.reportTransport(this.transport.snapshot(), this.fpsDisplay);
        this.debug.reportSchedulerQueue(this.scheduler.lastScheduledQueueLength);
        this.debug.reportCounts(this.judge.statsCounts());
      }
    }
  }

  private drawCountdownOverlay(ctx: CanvasRenderingContext2D): void {
    if (this.phase !== 'countdown') return;
    const snap = this.transport.snapshot();
    const beatsLeft = Math.max(0, 0 - snap.beat);
    const which = Math.ceil(beatsLeft);
    if (which <= 0) return;
    const cx = this.canvasMgr.logicalW / 2;
    const cy = this.canvasMgr.logicalH / 2;
    const tfrac = 1 - (beatsLeft - Math.floor(beatsLeft));
    ctx.save();
    const scale = 1 + Math.sin(tfrac * Math.PI) * 0.2;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 220px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(which), 0, 0);
    ctx.restore();
  }

  private drawIdleBackground(ctx: CanvasRenderingContext2D): void {
    const W = this.canvasMgr.logicalW;
    const H = this.canvasMgr.logicalH;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0a0c20');
    g.addColorStop(1, '#050614');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const t = performance.now() / 1000;
    for (let i = 0; i < 90; i++) {
      const x = (i * 211.3) % W;
      const y = (i * 307.7) % H;
      const tw = 0.5 + 0.5 * Math.sin(t * 0.9 + i * 0.23);
      ctx.fillStyle = `rgba(220,230,255,${0.1 + 0.5 * tw})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}
