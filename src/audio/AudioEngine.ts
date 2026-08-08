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

  constructor(opts: AudioEngineOptions = {}) {
    this.musicVolumeStart = opts.musicVolume ?? 0.8;
    this.sfxVolumeStart = opts.sfxVolume ?? 0.9;
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
  async unlockFromUserGesture(): Promise<void> {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended' || ctx.state === 'running') {
      try {
        await ctx.resume();
      } catch {
        // ignore — some browsers throw even when state is running
      }
    }
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
    this._state = 'unlocked';
  }

  /** Manual suspend (e.g., transport pause from menu). */
  async suspend(): Promise<void> {
    const ctx = this.ensureContext();
    try {
      await ctx.suspend();
      this._state = 'suspended';
    } catch {
      // ignore
    }
  }

  /** Manual resume after manual suspend — NOT user-gesture unlock. */
  async resume(): Promise<void> {
    const ctx = this.ensureContext();
    try {
      await ctx.resume();
      this._state = 'unlocked';
    } catch {
      // ignore
    }
  }

  private onVisibility(): void {
    if (typeof document === 'undefined' || !this.ctx) return;
    if (document.hidden) {
      // Best-effort: suspend in background. The Transport is re-anchored on
      // resume, so phase drift cannot happen.
      void this.ctx.suspend();
      this._state = 'suspended';
    } else if (this._state === 'suspended') {
      void this.ctx.resume();
      this._state = 'unlocked';
    }
  }

  private onPageHide(_e: PageTransitionEvent): void {
    if (this.ctx) {
      void this.ctx.suspend();
      this._state = 'suspended';
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
