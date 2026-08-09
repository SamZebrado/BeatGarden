// InputRouter — unified pointer input.
//
// Goals:
// - Touch-first (Android tablet), mouse works for desktop debug.
// - Unified events: Tap, HoldStart/HoldEnd, SwipeLeft/SwipeRight.
// - Every emitted event carries the authoritatve AudioContext time AND a
//   high-resolution DOM timestamp (which we cross-check, but audio time wins).
// - Prevent default browser behaviors that would interfere (scroll, zoom,
//   double-tap zoom, long-press menu, text selection) while still being
//   broadly accessible — not a shotgun `preventDefault` on everything.

import type { TimingConfig } from '../timing/config';

export type PointerAction =
  | { type: 'tap'; x: number; y: number; surfaceWidth: number; surfaceHeight: number; audioTime: number; domTimeMs: number }
  | {
      type: 'holdStart';
      x: number;
      y: number;
      surfaceWidth: number;
      surfaceHeight: number;
      pointerId: number;
      audioTime: number;
      domTimeMs: number;
    }
  | {
      type: 'holdEnd';
      x: number;
      y: number;
      surfaceWidth: number;
      surfaceHeight: number;
      pointerId: number;
      audioTime: number;
      domTimeMs: number;
    }
  | {
      type: 'swipe';
      direction: 'left' | 'right' | 'up' | 'down';
      x: number;
      y: number;
      surfaceWidth: number;
      surfaceHeight: number;
      dx: number;
      dy: number;
      audioTime: number;
      domTimeMs: number;
    };

export type InputListener = (ev: PointerAction) => void;

export interface InputRouterOptions {
  config: TimingConfig;
  /** Return the current authoritative AudioContext time when input fires. */
  getAudioTime: () => number;
  /** Element to attach to (usually canvas). */
  el: HTMLElement;
  /** If true, call preventDefault on pointerdown to block long-press menu etc. */
  aggressiveDefaults?: boolean;
  /** How long a pointer down+up must be held to count as holdStart/holdEnd instead of tap. ms. */
  holdThresholdMs?: number;
}

interface ActivePointer {
  pointerId: number;
  startX: number;
  startY: number;
  startAudioTime: number;
  startDomTimeMs: number;
  holdTimer: number | null;
  firedHold: boolean;
  lastX: number;
  lastY: number;
  surfaceWidth: number;
  surfaceHeight: number;
}

export class InputRouter {
  private readonly config: TimingConfig;
  private readonly getAudioTime: () => number;
  private readonly el: HTMLElement;
  private readonly holdThresholdMs: number;
  private readonly aggressive: boolean;

  private listeners: Set<InputListener> = new Set();
  private active: Map<number, ActivePointer> = new Map();

  // Snapshots for debug overlay.
  public lastInputAudioTime: number = 0;
  public lastInputDomTimeMs: number = 0;
  public lastPointerType: string = 'none';

  // For debug.
  public readonly eventsInFlight: number = 0;

  constructor(opts: InputRouterOptions) {
    this.config = opts.config;
    this.getAudioTime = opts.getAudioTime;
    this.el = opts.el;
    this.holdThresholdMs = opts.holdThresholdMs ?? opts.config.holdThresholdMs;
    this.aggressive = opts.aggressiveDefaults ?? true;
    this.attach();
  }

  addListener(l: InputListener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private emit(ev: PointerAction): void {
    this.lastInputAudioTime = ev.audioTime;
    this.lastInputDomTimeMs = ev.domTimeMs;
    for (const l of this.listeners) l(ev);
  }

  private attach(): void {
    const el = this.el;
    // Touch-action: none is set via CSS on the canvas/body; but we also
    // suppress long-press context menu explicitly:
    el.addEventListener('contextmenu', this.onContextMenu);
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointermove', this.onPointerMove, { passive: true });
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('pointercancel', this.onPointerCancel);
    el.addEventListener('lostpointercapture', this.onPointerCancel);
    // Disable text-selection and double-tap zoom in some browsers by handling
    // these (only on the target element; no global document listeners).
    el.addEventListener('selectstart', this.onSelectStart);
  }

  detach(): void {
    const el = this.el;
    el.removeEventListener('contextmenu', this.onContextMenu);
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerup', this.onPointerUp);
    el.removeEventListener('pointercancel', this.onPointerCancel);
    el.removeEventListener('lostpointercapture', this.onPointerCancel);
    el.removeEventListener('selectstart', this.onSelectStart);
    // Cancel any pending hold timers.
    const gs = globalThis as unknown as { clearTimeout: typeof clearTimeout };
    for (const ap of this.active.values()) {
      if (ap.holdTimer !== null) gs.clearTimeout(ap.holdTimer);
    }
    this.active.clear();
  }

  private onContextMenu = (e: Event): void => {
    e.preventDefault();
  };

  private onSelectStart = (e: Event): void => {
    e.preventDefault();
  };

  private onPointerDown = (e: PointerEvent): void => {
    this.lastPointerType = e.pointerType || 'unknown';
    if (this.aggressive) {
      // Prevent double-tap-to-zoom + long-press menu on Android Chrome.
      // This is per-element (not document-wide), which keeps accessibility fine.
      e.preventDefault();
    }
    const el = this.el;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // Some browsers throw for already-captured pointers; ignore.
    }
    const rect = el.getBoundingClientRect();
    const audioTime = this.getAudioTime();
    const domTimeMs = e.timeStamp;
    const ap: ActivePointer = {
      pointerId: e.pointerId,
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
      startAudioTime: audioTime,
      startDomTimeMs: domTimeMs,
      holdTimer: null,
      firedHold: false,
      lastX: e.clientX - rect.left,
      lastY: e.clientY - rect.top,
      surfaceWidth: rect.width,
      surfaceHeight: rect.height,
    };
    // Arm hold timer. If it fires before pointerup, we treat as holdStart
    // (and subsequent up as holdEnd). Otherwise it's a tap or swipe.
    // Use globalThis so tests in Node (no window) or jsdom both work.
    const gs = globalThis as unknown as {
      setTimeout: typeof setTimeout;
      performance: { now: () => number };
    };
    ap.holdTimer = gs.setTimeout(() => {
      if (!this.active.has(ap.pointerId)) return;
      ap.firedHold = true;
      this.emit({
        type: 'holdStart',
        x: ap.lastX,
        y: ap.lastY,
        surfaceWidth: ap.surfaceWidth,
        surfaceHeight: ap.surfaceHeight,
        pointerId: ap.pointerId,
        // Judge the start at the authoritative pointer-down time, not when
        // the hold threshold timer happens to fire on a busy main thread.
        audioTime: ap.startAudioTime,
        domTimeMs: gs.performance.now(),
      });
    }, this.holdThresholdMs);
    this.active.set(e.pointerId, ap);
  };

  private onPointerMove = (e: PointerEvent): void => {
    const ap = this.active.get(e.pointerId);
    if (!ap) return;
    const rect = this.el.getBoundingClientRect();
    ap.lastX = e.clientX - rect.left;
    ap.lastY = e.clientY - rect.top;
  };

  private onPointerUp = (e: PointerEvent): void => {
    const ap = this.active.get(e.pointerId);
    if (!ap) return;
    if (ap.holdTimer !== null) {
      clearTimeout(ap.holdTimer);
      ap.holdTimer = null;
    }
    this.active.delete(e.pointerId);

    const rect = this.el.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;
    const audioTime = this.getAudioTime();
    const domTimeMs = e.timeStamp;

    const dx = endX - ap.startX;
    const dy = endY - ap.startY;
    const dist = Math.hypot(dx, dy);
    const durationMs = domTimeMs - ap.startDomTimeMs;

    // Swipe: fast enough + long enough. Takes precedence over tap.
    if (
      dist >= this.config.swipeMinDistancePx &&
      durationMs <= this.config.swipeMaxDurationMs
    ) {
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      let dir: 'left' | 'right' | 'up' | 'down';
      if (absDx >= absDy) dir = dx >= 0 ? 'right' : 'left';
      else dir = dy >= 0 ? 'down' : 'up';
      this.emit({
        type: 'swipe',
        direction: dir,
        x: endX,
        y: endY,
        surfaceWidth: rect.width,
        surfaceHeight: rect.height,
        dx,
        dy,
        audioTime,
        domTimeMs,
      });
      return;
    }

    // Hold end: only if holdStart already fired (via the timer).
    if (ap.firedHold) {
      this.emit({
        type: 'holdEnd',
        x: endX,
        y: endY,
        surfaceWidth: rect.width,
        surfaceHeight: rect.height,
        pointerId: ap.pointerId,
        audioTime,
        domTimeMs,
      });
      return;
    }

    // Otherwise: Tap.
    this.emit({ type: 'tap', x: endX, y: endY, surfaceWidth: rect.width, surfaceHeight: rect.height, audioTime, domTimeMs });
  };

  private onPointerCancel = (e: PointerEvent): void => {
    const ap = this.active.get(e.pointerId);
    if (!ap) return;
    if (ap.holdTimer !== null) {
      clearTimeout(ap.holdTimer);
      ap.holdTimer = null;
    }
    this.active.delete(e.pointerId);
    // No synthetic emit on cancel — treat as lost input, best-effort.
  };
}
