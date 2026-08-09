// AudioEngine — owns the AudioContext lifecycle.
//
// Responsibilities:
// - Create a single AudioContext with latencyHint='interactive'.
// - Handle user-gesture unlock (resume).
// - Handle visibilitychange / blur/focus: suspend on hidden, resume on visible.
// - Expose master buses for music + SFX with independent gain.
// - Expose a stable `now()` (audioCtx.currentTime) for the authoritative clock.

export interface AudioEngineOptions {
  musicVolume?: number;
  sfxVolume?: number;
}

export type AudioEngineState =
  | 'idle'         // created, never unlocked / resumed
  | 'unlocked'     // user gesture unlock done, ctx running
  | 'suspended'    // context suspended (background / manual pause)
  | 'closed';      // ctx closed (terminal state)

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private _state: AudioEngineState = 'idle';

  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;

  private readonly musicVolumeStart: number;
  private readonly sfxVolumeStart: number;

  private boundVisibility: (() => void) | null = null;
  private boundPageHide: ((e: PageTransitionEvent) => void) | null = null;
  private resumeInFlight: Promise<boolean> | null = null;
  private suspensionCause: 'manual' | 'visibility' | null = null;

  // ---- GATE 0 PARTIAL Issue 2: visibility lifecycle coordination ----
  // AudioEngine.onVisibility/pagehide previously only suspended/resumed the
  // AudioContext itself. That left Transport + Scheduler in an inconsistent
  // state: transport.playing = true but audio was frozen, so on restore the
  // two clocks diverged.
  //
  // Fix: expose lifecycle hooks that the StageRunner (or any owner) plugs in
  // to atomically suspend/resume the Transport + Scheduler alongside the
  // AudioContext. Hooks fire AFTER we've updated AudioEngine._state but
  // BEFORE any async ctx.resume() settles — the StageRunner uses synchronous
  // Transport.pause/resume which is purely arithmetic (no audio graph ops).
  private lifecycleHooks: {
    onSuspend?: () => void;
    onResume?: () => void;
  } = {};

  constructor(opts: AudioEngineOptions = {}) {
    this.musicVolumeStart = opts.musicVolume ?? 0.8;
    this.sfxVolumeStart = opts.sfxVolume ?? 0.9;
  }

  /**
   * Register synchronous hooks fired when AudioEngine performs a visibility-
   * driven suspend/resume. Called immediately (synchronously) inside
   * onVisibility/pagehide so Transport/Scheduler can re-anchor in the same
   * JS task — before setTimeout / rAF can add jitter.
   */
  setLifecycleHooks(hooks: { onSuspend?: () => void; onResume?: () => void }): void {
    this.lifecycleHooks = { ...hooks };
  }

  /** Create context if not yet created. Idempotent. */
  ensureContext(): AudioContext {
    if (this.ctx) return this.ctx;
    // Note: AudioContext constructor is provided by the browser. Tests can
    // inject a fake via constructor shim; we don't pull in heavy libs here.
    const Ctor: typeof AudioContext =
      (globalThis as unknown as { AudioContext: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ??
      (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!;
    if (!Ctor) {
      throw new Error('AudioContext not available in this environment');
    }
    const ctx = new Ctor({ latencyHint: 'interactive' });
    this.ctx = ctx;

    const musicGain = ctx.createGain();
    musicGain.gain.value = this.musicVolumeStart;
    musicGain.connect(ctx.destination);
    this.musicBus = musicGain;

    const sfxGain = ctx.createGain();
    sfxGain.gain.value = this.sfxVolumeStart;
    sfxGain.connect(ctx.destination);
    this.sfxBus = sfxGain;

    this._state = ctx.state === 'running' ? 'unlocked' : 'idle';

    if (typeof document !== 'undefined') {
      this.boundVisibility = () => this.onVisibility();
      document.addEventListener('visibilitychange', this.boundVisibility);
      this.boundPageHide = (e) => this.onPageHide(e);
      window.addEventListener('pagehide', this.boundPageHide);
    }
    return ctx;
  }

  get state(): AudioEngineState {
    return this._state;
  }

  /** Authoritative audio clock. */
  now(): number {
    return this.ensureContext().currentTime;
  }

  get baseLatency(): number {
    return (this.ensureContext() as AudioContext & { baseLatency?: number }).baseLatency ?? 0;
  }

  get outputLatency(): number {
    return (this.ensureContext() as AudioContext & { outputLatency?: number }).outputLatency ?? 0;
  }

  /** Music master gain node (for synth to connect to). */
  getMusicBus(): GainNode {
    this.ensureContext();
    return this.musicBus!;
  }

  /** SFX master gain node. */
  getSfxBus(): GainNode {
    this.ensureContext();
    return this.sfxBus!;
  }

  getContext(): AudioContext {
    return this.ensureContext();
  }

  get musicVolume(): number {
    return this.musicBus?.gain.value ?? this.musicVolumeStart;
  }

  setMusicVolume(v: number, audioTime?: number): void {
    if (!this.musicBus) {
      this.ensureContext();
    }
    const t = audioTime ?? this.now();
    this.musicBus!.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), t, 0.01);
  }

  get sfxVolume(): number {
    return this.sfxBus?.gain.value ?? this.sfxVolumeStart;
  }

  setSfxVolume(v: number, audioTime?: number): void {
    if (!this.sfxBus) {
      this.ensureContext();
    }
    const t = audioTime ?? this.now();
    this.sfxBus!.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), t, 0.01);
  }

  /**
   * MUST be called from a user gesture handler. Resumes AudioContext so audio
   * actually plays in all browsers (Chrome, Safari, Firefox mobile).
   */
  async unlockFromUserGesture(): Promise<boolean> {
    const ctx = this.ensureContext();
    const running = await this.resumeAndConfirmRunning();
    if (!running) return false;

    // Also schedule a tiny silent buffer so iOS really unlocks.
    try {
      const silent = ctx.createBuffer(1, 128, ctx.sampleRate);
      const src = ctx.createBufferSource();
      src.buffer = silent;
      src.connect(ctx.destination);
      src.start(0);
    } catch {
      // ignore failures here; not critical
    }
    return true;
  }

  /** Manual suspend (e.g., transport pause from menu). */
  async suspend(): Promise<boolean> {
    const ctx = this.ensureContext();
    try {
      await ctx.suspend();
      if (ctx.state !== 'suspended') return false;
      this._state = 'suspended';
      this.suspensionCause = 'manual';
      return true;
    } catch {
      return false;
    }
  }

  /** Manual resume after manual suspend. Uses the same confirmed-running contract. */
  async resume(): Promise<boolean> {
    return this.resumeAndConfirmRunning();
  }

  /**
   * The single resume/unlock contract used by initial gestures, manual resume,
   * visibility recovery, and gesture recovery after an autoplay rejection.
   * Concurrent callers share one attempt, so a suspended -> unlocked lifecycle
   * transition can fire at most one onResume hook.
   */
  async resumeAndConfirmRunning(): Promise<boolean> {
    if (this.resumeInFlight) return this.resumeInFlight;

    const ctx = this.ensureContext();
    const wasSuspended = this._state === 'suspended';
    const attempt = (async (): Promise<boolean> => {
      try {
        await ctx.resume();
      } catch {
        return false;
      }
      if (ctx.state !== 'running') return false;

      this._state = 'unlocked';
      this.suspensionCause = null;
      if (wasSuspended) this.lifecycleHooks.onResume?.();
      return true;
    })();
    this.resumeInFlight = attempt;
    try {
      return await attempt;
    } finally {
      if (this.resumeInFlight === attempt) this.resumeInFlight = null;
    }
  }

  private onVisibility(): void {
    if (typeof document === 'undefined' || !this.ctx) return;
    if (document.hidden && this._state === 'unlocked') {
      // ---- GATE 0 PARTIAL Issue 2 fix ----
      // Synchronously notify owner so they can pause Transport + stop
      // Scheduler in the same task. We still fire ctx.suspend() as best-
      // effort async; the Transport anchor is what actually preserves time.
      void this.ctx.suspend();
      this._state = 'suspended';
      this.suspensionCause = 'visibility';
      this.lifecycleHooks.onSuspend?.();
    } else if (
      !document.hidden &&
      this._state === 'suspended' &&
      this.suspensionCause === 'visibility'
    ) {
      void this.resumeAndConfirmRunning();
    }
  }

  private onPageHide(_e: PageTransitionEvent): void {
    if (this.ctx && this._state === 'unlocked') {
      void this.ctx.suspend();
      this._state = 'suspended';
      this.suspensionCause = 'visibility';
      this.lifecycleHooks.onSuspend?.();
    }
  }

  /**
   * Tear down. Primarily for test cleanup; production games rarely close.
   */
  async close(): Promise<void> {
    if (this.boundVisibility && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.boundVisibility);
      this.boundVisibility = null;
    }
    if (this.boundPageHide && typeof window !== 'undefined') {
      window.removeEventListener('pagehide', this.boundPageHide);
      this.boundPageHide = null;
    }
    if (this.ctx) {
      try {
        await this.ctx.close();
      } catch {
        // ignore
      }
      this._state = 'closed';
      this.ctx = null;
      this.musicBus = null;
      this.sfxBus = null;
    }
  }
}
