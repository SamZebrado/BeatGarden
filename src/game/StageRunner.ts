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
import { resumeAfterAudioConfirmed } from './playbackLifecycle';
import { expiredJudgeBeat } from './judgementExpiry';
import { getLocale, t, toggleLocale } from '../i18n/strings';

export interface StageRunnerOptions {
  root: HTMLElement;
  stage: StageDefinition;
  config?: TimingConfig;
  onExit?: () => void;
}

type Phase = 'locked' | 'countdown' | 'playing' | 'paused' | 'ended';

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
  private unlocking: boolean = false;
  private pauseInFlight: Promise<boolean> | null = null;
  private runtimeStatus!: HTMLOutputElement;
  private readonly onExit: (() => void) | undefined;
  private destroyed = false;
  private lifecycleTelemetry = {
    suspends: 0,
    resumes: 0,
    lastSuspend: null as null | { beat: number; audioTime: number },
    lastResume: null as null | { beat: number; audioTime: number },
  };

  private overlays: {
    unlock: HTMLDivElement | null;
    result: HTMLDivElement | null;
  } = { unlock: null, result: null };

  private fpsLastT = performance.now();
  private fpsFrames = 0;
  private fpsDisplay = 0;

  constructor(opts: StageRunnerOptions) {
    this.stage = opts.stage;
    this.onExit = opts.onExit;
    this.config = opts.config ?? TIMING_CONFIG;

    // Build engine / services.
    this.canvasMgr = new CanvasManager({ parent: opts.root, config: this.config });
    const runtimeSmoke = new URLSearchParams(window.location.search).get('runtimeSmoke');
    let resumeAttemptCount = 0;
    this.audio = new AudioEngine({
      musicVolume: this.config.musicVolumeDefault,
      sfxVolume: this.config.sfxVolumeDefault,
      ...(runtimeSmoke === 'visibility-reject'
        ? { resumeAttempt: async (ctx: AudioContext) => {
            resumeAttemptCount++;
            if (resumeAttemptCount === 2) throw new Error('runtime smoke: reject visibility resume');
            await ctx.resume();
          } }
        : {}),
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
        const snap = this.transport.snapshot();
        this.lifecycleTelemetry.suspends++;
        this.lifecycleTelemetry.lastSuspend = {
          beat: Number(snap.beat.toFixed(4)),
          audioTime: Number(snap.audioTime.toFixed(4)),
        };
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
          // Scheduler.start() ticks synchronously, so Transport MUST be
          // re-anchored first. Otherwise the first tick observes playing=false.
          resumeAfterAudioConfirmed(this.transport, this.scheduler, this.audio.now());
        }
        const snap = this.transport.snapshot();
        this.lifecycleTelemetry.resumes++;
        this.lifecycleTelemetry.lastResume = {
          beat: Number(snap.beat.toFixed(4)),
          audioTime: Number(snap.audioTime.toFixed(4)),
        };
      },
    });

    this.attachInput();
    this.attachKeyShortcuts();
    this.buildUnlockOverlay();
    this.buildRuntimeStatus();

    // Runtime smoke seam: deliberately attempt unlock outside a user gesture.
    // Real Chrome should reject or remain suspended, proving the locked UI path.
    if (runtimeSmoke === 'auto-unlock') {
      queueMicrotask(() => void this.onUnlock());
    }
    if (runtimeSmoke === 'touch-pointer') {
      this.buildTouchPointerSmokeControl();
    }
    if (runtimeSmoke === 'visibility-reject') {
      this.buildVisibilityRejectSmokeControl();
    }

    // Expose debug handles.
    (window as unknown as { __BEATGARDEN__?: unknown }).__BEATGARDEN__ = {
      toggleDebug: () => this.debug.toggle(),
      getCounts: () => this.judge.statsCounts(),
      getSnap: () => this.transport.snapshot(),
      isAudioUnlocked: () => this.audio.state === 'unlocked' || this.audio.state === 'suspended',
      getPhase: () => this.phase,
      getLocale: () => getLocale(),
      restart: () => this.restart(),
    };

    this.startRaf();
  }

  // -------- Input & shortcuts --------

  private attachInput(): void {
    this.input.addListener((action: PointerAction) => {
      this.debug.reportInput(null, this.audio.now());
      if (this.audio.state === 'suspended' && this.phase !== 'paused') {
        // A visibility resume can be rejected by autoplay policy. The next
        // canvas gesture retries the unified resume contract; onResume then
        // re-anchors Transport before restarting Scheduler. Do not also judge
        // this recovery gesture against a frozen timeline.
        void this.audio.unlockFromUserGesture();
        return;
      }
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
      } else {
        this.synth.play('uiClick', this.audio.now() + 0.002, undefined, 0.05, 0.25);
        this.stage.onUnmatchedInput?.(action);
      }
    });
  }

  private attachKeyShortcuts(): void {
    window.addEventListener('keydown', this.onKeyDown);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'd' || e.key === 'D') this.debug.toggle();
      if (e.key === 'Escape') {
        // ---- GATE 0 PARTIAL Round-2 manual-pause phase toggle ----
        // Old bug: pauseLocal() was called from playing state but phase
        // remained 'playing'. Consequently: manual ESC pause → hidden →
        // visible → onResume saw phase==='playing' → auto-resumed,
        // violating the player's intentional pause (the exact opposite of
        // StageRunner.ts's own comment at lines 122–127 that said "we do
        // NOT blindly resume; player might have intentionally paused").
        //
        // Fix: introduce 'paused' phase distinct from 'playing'. ESC
        // toggles between playing ↔ paused; onResume only auto-resumes
        // when phase was 'playing' or 'countdown' (auto-running gameplay
        // that was interrupted by background tab), NOT when 'paused'
        // (player explicitly said "stop").
        if (this.phase === 'playing') void this.pauseLocal();
        else if (this.phase === 'paused') void this.resumeLocal();
      }
      if (e.key === 'r' || e.key === 'R') {
        this.restart();
      }
  };

  // -------- DOM overlays --------

  private buildUnlockOverlay(): void {
    this.overlays.unlock?.remove();
    const d = document.createElement('div');
    d.style.cssText = `
position: fixed; inset: 0; background: #0a0c20;
display: flex; align-items: center; justify-content: center;
flex-direction: column; z-index: 50; color: #fff;
font-family: system-ui, -apple-system, sans-serif; cursor: pointer;
    `;
    const title = document.createElement('div');
    title.textContent = t(this.stage.titleKey);
    title.style.cssText = 'font-size: 44px; font-weight: 700; margin-bottom: 12px;';
    d.appendChild(title);
    const tag = document.createElement('div');
    tag.textContent = t(this.stage.taglineKey);
    tag.style.cssText = 'font-size: 20px; color: #c9d3ff; margin-bottom: 36px;';
    d.appendChild(tag);
    const tap = document.createElement('div');
    tap.dataset.role = 'unlock-action';
    tap.textContent = t('audio.enable');
    tap.style.cssText = `
font-size: 22px; padding: 18px 34px; border-radius: 999px;
background: linear-gradient(180deg, #3d63ff, #5b3dff);
box-shadow: 0 10px 30px rgba(80,60,200,0.4);
    `;
    d.appendChild(tap);
    const inputHint = document.createElement('div');
    inputHint.textContent = t('input.howTo');
    inputHint.style.cssText = 'margin-top: 22px; color: #d9e3ff; font-size: 18px;';
    d.appendChild(inputHint);
    const hint = document.createElement('div');
    hint.textContent = t('shortcuts');
    hint.style.cssText = 'margin-top: 18px; color: #7a84a8; font-size: 14px;';
    d.appendChild(hint);
    const language = document.createElement('button');
    language.type = 'button';
    language.textContent = t('language.switch');
    language.setAttribute('aria-label', t('language.switch'));
    language.style.cssText = `
margin-top: 28px; padding: 10px 18px; border-radius: 999px;
border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.08);
color: #d9e3ff; font-size: 15px; cursor: pointer;
`;
    language.addEventListener('pointerdown', (event) => event.stopPropagation());
    language.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleLocale();
      this.buildUnlockOverlay();
    });
    d.appendChild(language);
    d.addEventListener('pointerdown', () => void this.onUnlock());
    document.body.appendChild(d);
    this.overlays.unlock = d;
  }

  private buildRuntimeStatus(): void {
    const output = document.createElement('output');
    output.id = 'beatgarden-runtime-status';
    output.setAttribute('aria-label', 'BeatGarden runtime status');
    output.style.cssText = `
position: fixed; left: -10000px; top: 0; width: 1px; height: 1px;
overflow: hidden; white-space: pre;
`;
    document.body.appendChild(output);
    this.runtimeStatus = output;
    this.updateRuntimeStatus();
  }

  private updateRuntimeStatus(): void {
    if (!this.runtimeStatus) return;
    const snap = this.transport.snapshot();
    const contextState = this.audio.getContext().state;
    const counts = this.judge.statsCounts();
    const state = {
      phase: this.phase,
      audioEngineState: this.audio.state,
      audioContextState: contextState,
      documentHidden: document.hidden,
      transportPlaying: snap.playing,
      beat: Number(snap.beat.toFixed(4)),
      audioTime: Number(snap.audioTime.toFixed(4)),
      droppedLate: this.scheduler.lastDroppedLateCount,
      lifecycle: this.lifecycleTelemetry,
      input: {
        pointerType: this.input.lastPointerType,
        audioTime: Number(this.input.lastInputAudioTime.toFixed(4)),
      },
      counts,
    };
    this.runtimeStatus.dataset.phase = this.phase;
    this.runtimeStatus.dataset.audioContextState = contextState;
    this.runtimeStatus.textContent = JSON.stringify(state);
  }

  private buildTouchPointerSmokeControl(): void {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.role = 'touch-pointer-smoke';
    button.textContent = t('smoke.touchPointer');
    button.style.cssText = `
position: fixed; right: 16px; bottom: 16px; z-index: 60; padding: 12px 16px;
border: 1px solid rgba(255,255,255,0.35); border-radius: 12px;
background: #17244a; color: #fff; font: 600 14px system-ui; cursor: pointer;
`;
    button.addEventListener('pointerdown', (event) => event.stopPropagation());
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const rect = this.canvasMgr.canvas.getBoundingClientRect();
      const init: PointerEventInit = {
        bubbles: true,
        cancelable: true,
        pointerId: 77,
        pointerType: 'touch',
        isPrimary: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      };
      this.canvasMgr.canvas.dispatchEvent(new PointerEvent('pointerdown', init));
      this.canvasMgr.canvas.dispatchEvent(new PointerEvent('pointerup', init));
    });
    document.body.appendChild(button);
  }

  private buildVisibilityRejectSmokeControl(): void {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.role = 'visibility-reject-smoke';
    button.textContent = t('smoke.visibilityReject');
    button.style.cssText = `
position: fixed; right: 16px; bottom: 16px; z-index: 60; padding: 12px 16px;
border: 1px solid rgba(255,255,255,0.35); border-radius: 12px;
background: #4a172f; color: #fff; font: 600 14px system-ui; cursor: pointer;
`;
    button.addEventListener('pointerdown', (event) => event.stopPropagation());
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      window.dispatchEvent(new PageTransitionEvent('pagehide'));
      window.setTimeout(() => document.dispatchEvent(new Event('visibilitychange')), 60);
    });
    document.body.appendChild(button);
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
    title.textContent = t('result.title');
    title.style.cssText = 'font-size: 40px; font-weight: 700; margin-bottom: 18px;';
    d.appendChild(title);
    const s = document.createElement('div');
    const max = score.total * 300;
    s.textContent = `${t('result.score')}: ${score.score} / ${max}   ·   ${t('result.accuracy')}: ${(score.accuracy * 100).toFixed(2)}%`;
    s.style.cssText = 'font-size: 28px; margin-bottom: 24px; color: #d0e0ff;';
    d.appendChild(s);
    const counts = document.createElement('div');
    counts.style.cssText = 'font-size: 22px; margin-bottom: 40px; color: #b9c7ee; line-height: 1.8;';
    const countLines = [
      `${t('result.perfect')}: ${score.counts.PERFECT}`,
      `${t('result.great')}: ${score.counts.GREAT}`,
      `${t('result.ok')}: ${score.counts.OK}`,
      `${t('result.miss')}: ${score.counts.MISS}`,
      `${t('result.meanError')}: ${score.meanSignedErrorMs.toFixed(1)} ms`,
      `${t('result.medianError')}: ${score.medianSignedErrorMs.toFixed(1)} ms`,
    ];
    counts.replaceChildren(...countLines.flatMap((line, index) => {
      const nodes: Node[] = [document.createTextNode(line)];
      if (index < countLines.length - 1) nodes.push(document.createElement('br'));
      return nodes;
    }));
    d.appendChild(counts);
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; gap: 18px; flex-wrap: wrap; justify-content: center;';
    const bRestart = document.createElement('button');
    bRestart.textContent = t('action.restart');
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
    bBack.textContent = t('action.back');
    bBack.style.cssText = `
font-size: 18px; padding: 14px 24px; border-radius: 999px;
background: rgba(255,255,255,0.08); color: #c9d3ff; border: 1px solid rgba(255,255,255,0.15);
cursor: pointer;
`;
    bBack.addEventListener('click', () => {
      if (this.onExit) {
        void this.destroy().then(this.onExit);
      } else {
        this.removeResultOverlay();
        this.buildUnlockOverlay();
        this.phase = 'locked';
      }
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

  private async onUnlock(): Promise<void> {
    if (this.unlocking) return;
    this.unlocking = true;
    const success = await this.audio.unlockFromUserGesture();
    this.unlocking = false;
    if (!success) {
      const action = this.overlays.unlock?.querySelector<HTMLElement>('[data-role="unlock-action"]');
      if (action) action.textContent = t('audio.enableFailed');
      return;
    }
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
    const maxBeatToCheck = expiredJudgeBeat(this.transport, snap.audioTime, okSec);
    // Do not add scheduler look-ahead here: judgement expiry follows the
    // authoritative audio clock only. The previous +1 beat marked a target
    // MISS roughly half a second before the player was supposed to act.
    const expired = this.scheduler.getJudgeTargetsInWindow(-1e9, maxBeatToCheck);
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

  private async pauseLocal(): Promise<void> {
    // ---- GATE 0 PARTIAL Round-2: phase='paused' prevents auto-resume ----
    // Soft pause: stop scheduler advance, pause transport, audible ping.
    // Phase MUST change to 'paused' here (was omitted before). Otherwise
    // manual ESC pause → hidden tab → visible return would auto-resume
    // because onResume() matches phase==='playing'.
    this.phase = 'paused';
    this.scheduler.stop();
    this.stage.onPause?.();

    const attempt = this.audio.suspend();
    this.pauseInFlight = attempt;
    const suspended = await attempt;
    if (this.pauseInFlight === attempt) this.pauseInFlight = null;
    if (this.phase !== 'paused') return;
    if (!suspended) {
      // Keep gameplay coherent if the browser rejects suspend: Transport was
      // never frozen, so restore the scheduler instead of leaving a half-pause.
      this.phase = 'playing';
      this.scheduler.start();
      return;
    }
    // AudioContext.currentTime is now frozen. Anchor Transport at that exact
    // suspended time so wall-clock delay cannot change musical position.
    this.transport.pause(this.audio.now());
  }

  private async resumeLocal(): Promise<void> {
    if (this.phase !== 'paused') return;
    if (this.pauseInFlight) await this.pauseInFlight;
    if (this.phase !== 'paused') return;

    const running = await this.audio.resume();
    if (!running || this.phase !== 'paused') return;

    // Required order: confirmed running -> Transport re-anchor -> Scheduler
    // start (whose first tick is synchronous) -> playing phase.
    resumeAfterAudioConfirmed(this.transport, this.scheduler, this.audio.now());
    this.phase = 'playing';
    this.stage.onResume?.();
  }

  // -------- Render loop --------

  private startRaf(): void {
    const loop = () => {
      if (this.destroyed) return;
      this.tick();
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
    // ensure TS sees `_raf` as read (kept for potential cleanup)
    void this._raf;
  }

  async destroy(): Promise<void> {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this._raf !== null) cancelAnimationFrame(this._raf);
    this.scheduler.stop();
    this.input.detach();
    window.removeEventListener('keydown', this.onKeyDown);
    this.removeResultOverlay();
    this.overlays.unlock?.remove();
    this.runtimeStatus?.remove();
    this.canvasMgr.destroy();
    await this.audio.close();
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
    this.updateRuntimeStatus();
    // Render.
    const ctx = this.canvasMgr.ctx;
    this.canvasMgr.beginFrame();
    ctx.fillStyle = '#07081a';
    ctx.fillRect(0, 0, this.canvasMgr.logicalW, this.canvasMgr.logicalH);
    if (
      this.phase === 'playing' ||
      this.phase === 'countdown' ||
      this.phase === 'paused' ||
      this.phase === 'ended'
    ) {
      const snap = this.transport.snapshot();
      this.stage.render(ctx, snap);
      this.drawCountdownOverlay(ctx);
      this.drawPausedOverlay(ctx);
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

  private drawPausedOverlay(ctx: CanvasRenderingContext2D): void {
    if (this.phase !== 'paused') return;
    ctx.save();
    ctx.fillStyle = 'rgba(5, 7, 24, 0.72)';
    ctx.fillRect(0, 0, this.canvasMgr.logicalW, this.canvasMgr.logicalH);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 68px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t('status.paused'), this.canvasMgr.logicalW / 2, this.canvasMgr.logicalH / 2);
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
