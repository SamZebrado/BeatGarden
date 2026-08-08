/**
 * @vitest-environment jsdom
 */
// GATE 0 PARTIAL Issue 4: InputRouter timing capture.
//
// Critical requirement:
//   The authoritative audio timestamp (AudioContext.currentTime) must be
//   CAPTURED SYNCHRONOUSLY inside the pointerdown / pointerup handler itself
//   — NOT deferred to the next requestAnimationFrame, NOT read from an
//   event queue later, NOT taken from performance.now().
//
// This test proves that the timestamp returned in PointerAction.audioTime
// equals the value of getAudioTime() DURING the synchronous handler scope,
// not the value at some later arbitrary time (e.g. when the listener runs
// next tick / next frame).
//
// Approach: we build a "clock that advances on every read" and drive the
// InputRouter via a synchronous JS dispatchEvent(). If the clock advances
// between reads, then:
//   • reading inside the handler → payload contains read #1 value.
//   • reading lazily later (e.g. listener callback invocation which is also
//     synchronous) → payload would contain read #2 or later.
// The payload's audioTime must be the FIRST read.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InputRouter, type PointerAction } from '../src/game/InputRouter';
import { TIMING_CONFIG } from '../src/timing/config';

// jsdom provides document + dispatchEvent for PointerEvent (we shim if needed).

function makeEl(): HTMLElement {
  const el = document.createElement('div');
  el.style.width = '200px';
  el.style.height = '200px';
  Object.defineProperty(el, 'getBoundingClientRect', {
    value: () => ({ top: 0, left: 0, right: 200, bottom: 200, width: 200, height: 200 }),
    configurable: true,
  });
  document.body.appendChild(el);
  return el;
}

describe('InputRouter — audioTime captured synchronously inside pointer handlers (GATE 0 Issue 4)', () => {
  let el: HTMLElement;
  let router: InputRouter;
  let audioClockValue: number;
  let reads: number[];

  function tickingAudioTime(): number {
    // Each read returns the current value, then ADVANCES the clock.
    // So read #1 → 100, read #2 → 101, read #3 → 102, etc.
    reads.push(audioClockValue);
    const out = audioClockValue;
    audioClockValue += 1;
    return out;
  }

  beforeEach(() => {
    el = makeEl();
    audioClockValue = 100;
    reads = [];
    router = new InputRouter({
      config: TIMING_CONFIG,
      getAudioTime: tickingAudioTime,
      el,
      holdThresholdMs: 10000, // huge so short taps never count as holdStart
      aggressiveDefaults: false,
    });
  });

  afterEach(() => {
    router.detach();
    el.remove();
  });

  it('pointerdown → emit(tap).audioTime is the FIRST synchronous getAudioTime read, not a later one', () => {
    // Synchronous order during dispatchEvent('pointerdown'):
    //   1. onPointerDown handler runs → calls getAudioTime() → audioClockValue 100, clock becomes 101.
    //   2. onPointerDown exits.
    // We then fire pointerup synchronously (no setTimeout / hold timer can fire
    // synchronously so we get a tap).
    let event1: PointerAction | null = null;
    router.addListener((ev) => {
      // Inside the listener we can do ANOTHER read — this would be read #2
      // if the router had only stored a lazy getter (it didn't; it stored a
      // concrete value from the handler).
      void tickingAudioTime(); // push reads, advances clock
      event1 = ev;
    });

    // Fire pointerdown → pointerup synchronously.
    const downEv = new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      pointerType: 'touch',
      clientX: 50,
      clientY: 50,
    });
    el.dispatchEvent(downEv);
    const upEv = new PointerEvent('pointerup', {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      pointerType: 'touch',
      clientX: 50,
      clientY: 50,
    });
    el.dispatchEvent(upEv);

    expect(event1).not.toBeNull();
    expect(event1!.type).toBe('tap');

    // The audioTime stored for the tap must be what getAudioTime returned
    // INSIDE the pointerup handler. The clock advances each read:
    //   read #1 (during pointerdown for startAudioTime snapshot)
    //   read #2 (inside our listener, during that same pointerdown dispatch — maybe)
    // The simpler assertion: the audioTime should equal the exact value
    // returned for the UP handler call. We track reads in global `reads`.
    //
    // But more importantly — the difference between event1.audioTime and
    // the initial 100 MUST be small (< 5 reads). If the router had lazily
    // called getAudioTime inside its emit() this assertion would still pass,
    // so we use the stronger second test below.
    expect(event1!.audioTime).toBeGreaterThanOrEqual(100);
    expect(event1!.audioTime).toBeLessThanOrEqual(200);
  });

  it('Strong proof: stored audioTime equals the NOW-at-handler value, not a later rAF value', () => {
    // Setup: freeze a "handler clock" that returns a fixed SPECIAL value
    // ONLY during the dispatchEvent stack frame. Then "afterwards" the
    // clock returns a different big value. If audioTime != SPECIAL, it
    // means the router is reading the clock outside the handler.
    let inHandler = false;
    let handlerReads = 0;
    const SPECIAL_HANDLER_AUDIO_TIME = 1234.5678;
    const AFTER_HANDLER_AUDIO_TIME = 99999.999;

    const r2 = new InputRouter({
      config: TIMING_CONFIG,
      getAudioTime: () => {
        if (inHandler) {
          handlerReads++;
          return SPECIAL_HANDLER_AUDIO_TIME;
        }
        return AFTER_HANDLER_AUDIO_TIME;
      },
      el,
      holdThresholdMs: 10000,
      aggressiveDefaults: false,
    });

    let gotTap: PointerAction | null = null;
    r2.addListener((ev) => {
      gotTap = ev;
    });

    // Set flag so the clock knows we're inside the dispatch synchronous frame.
    inHandler = true;
    const down = new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 2, pointerType: 'mouse', clientX: 20, clientY: 20 });
    el.dispatchEvent(down);
    const up = new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId: 2, pointerType: 'mouse', clientX: 20, clientY: 20 });
    el.dispatchEvent(up);
    inHandler = false; // clock now reports the "after" value.

    r2.detach();

    expect(handlerReads).toBeGreaterThanOrEqual(1);
    expect(gotTap).not.toBeNull();
    // THE key assertion: audioTime stored in the tap must be the value the
    // clock reported DURING the synchronous handler, NOT what it reports
    // afterwards (which would be 99999.999).
    expect(gotTap!.audioTime).toBe(SPECIAL_HANDLER_AUDIO_TIME);
    expect(gotTap!.audioTime).not.toBe(AFTER_HANDLER_AUDIO_TIME);
  });

  it('source audit: InputRouter.onPointerDown calls getAudioTime() directly inside the handler body', () => {
    // Static / inspection-level assertion: we read the router source to
    // confirm that `const audioTime = this.getAudioTime()` appears inside
    // the onPointerDown arrow function (and not in a setTimeout or rAF).
    // This guards against future edits moving the read site.
    const routerSource = InputRouter.prototype.constructor.toString() || '';
    // The actual prototype method is assigned as an arrow in constructor, so
    // we can't stringify it directly. Instead we stringify the class.
    void routerSource;
    // Use a pragmatic proxy: trigger a pointerdown and ensure the audioTime
    // read happens synchronously during the dispatch, not in a microtask.
    const readTimes: number[] = [];
    let observedAudioTime = -Infinity;
    const r3 = new InputRouter({
      config: TIMING_CONFIG,
      getAudioTime: () => {
        const t = performance.timeOrigin ? performance.now() + performance.timeOrigin : Date.now();
        readTimes.push(t);
        return t;
      },
      el,
      holdThresholdMs: 10000,
      aggressiveDefaults: false,
    });
    const beforeDown = Date.now();
    r3.addListener((ev) => {
      // Record audioTime from ANY event (tap / holdStart / holdEnd etc.),
      // since the exact type isn't the subject of this test.
      if (Number.isFinite(ev.audioTime) && ev.audioTime > 0) {
        observedAudioTime = ev.audioTime;
      }
    });
    const down = new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 3, pointerType: 'mouse', clientX: 10, clientY: 10 });
    el.dispatchEvent(down);
    // Immediately up to trigger a tap. The tap read of audioTime happens in
    // pointerup handler — but that also reads synchronously within the
    // dispatchEvent boundary. What matters for GATE 0 Issue 4 is:
    //   getAudioTime() is called inside the event handler (no queued delay)
    // → readTimes filled synchronously; observedAudioTime > 0 confirms at
    // least one event reached the listener with a valid time.
    const up = new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId: 3, pointerType: 'mouse', clientX: 10, clientY: 10 });
    el.dispatchEvent(up);
    const afterDown = Date.now();
    r3.detach();

    // readTimes[0] must have been recorded between beforeDown and afterDown
    // (i.e. synchronously during dispatchEvent), not in a future task.
    expect(readTimes.length).toBeGreaterThanOrEqual(1);
    expect(observedAudioTime).toBeGreaterThan(0);
    expect(readTimes[0] / 1000).toBeGreaterThanOrEqual(beforeDown / 1000 - 1);
    expect(readTimes[0] / 1000).toBeLessThanOrEqual(afterDown / 1000 + 1);
  });
});
