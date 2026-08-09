# BeatGarden Development Status

Current phase: **PHASE 0 — GATE 0 LIFECYCLE DELTA READY FOR INDEPENDENT REVIEW**

Last updated: 2026-08-09

---

## Current HEAD

- Branch: `main`
- Base commit: `198eda0`
- Workspace: Codex takeover Gate 0 lifecycle delta ready for first Codex commit.

## Last completed gate

```
GATE 0: PARTIAL × 2
  First PARTIAL (2026-08-08): No source-level independent audit yet.
    → Source-level evidence submitted. Bridge attempt #1 (before main merge):
    → stale attachment chip (composer reset failed 3×). BRIDGE_BLOCKED.
    → After Codex Bridge main merge + request_nonce dedup protocol loaded:
    → MSG_5jpr8y0h_2kqvc7 RESUBMISSION SUCCESS (request_nonce, MESSAGE_CONFIRMED_IN_THREAD,
      thread_has_nonce true, attachment delivery confirmed).
  Second PARTIAL (2026-08-09, ChatGPT independent source audit of 19 attached files):
    → Architecture direction still basically correct. Q3, Q4, anchor algebra, stage
    architecture, Bridge nonce = PASS.
    → 5 NEW blocking items found by source inspection:
    1. setBpm paused-gap bug: curBeat = audioTimeToBeat(t) ignores playing=false freeze.
       Scenario: pause beat 4 → wait 5 s audio clock → setBpm(120) → curBeat=9 (wrong!
       should stay 4). Existing test passed because it called setBpm() immediately after
       pause() with no audio clock advance.
    2. StageRunner manual ESC pause phase gap: phase stays 'playing' after pauseLocal().
       Then manual-pause → hidden → visible triggers onResume because phase==='playing',
       which cancels user's intentional pause. Exactly opposite of StageRunner.ts:122–127
       comment ("don't resume intentional pause").
    3. AudioEngine.onVisible: void ctx.resume() doesn't wait for promise. If resume is
       rejected by the browser, state still becomes 'unlocked' and onResume fires →
       Transport/Scheduler start against a still-suspended AudioContext.
       Contract should be: ctx.resume() resolves AND ctx.state==='running' → unlocked +
       onResume. Else remain suspended.
    4. Scheduler dispatch semantics + "NO skips" test evidence actually FALSE:
       Scheduler.ts:209 if (startAudioTime < audioNow - 0.05) return;   → drops late > 50ms.
       Existing stop()/gap/tick "NO skips" test jumps audio clock to beat 14 then ticks.
       Beats 1–13 are ALL >> 50ms late → source drops them.
       Test still PASS because it only counts uniqueBeats === scheduled.length (no repeat)
       but never verifies "no missing". "No skips" claim in the test name was wrong.
       Also: Scheduler increments scheduled counter unconditionally BEFORE checking the
       >50ms drop guard. So dropped events are still counted as scheduled in stats.
    5. Attachment completeness: claimed 19 files, actual unzip had 17. Missing:
       calibration.ts, stats.ts. Also missing Synth.ts (needed to independently verify
       that Synth.play(soundName, startAudioTime, …) truly passes absolute time down to
       OscillatorNode.start(absoluteAudioTime) rather than an internal clock).

  → Resubmission goal: fix 5 issues + add honest Scheduler evidence; resubmit delta with
    zip that includes at minimum Synth.ts/calibration.ts/stats.ts (≥19 files verified).
```

## ChatGPT verdict (current official: Round 2 PARTIAL)

```
GATE 0: PARTIAL (Round 2 — source-level independent audit, 198eda0 reviewed)
  Verdict received: Yes, via Bridge final_state=MESSAGE_CONFIRMED_IN_THREAD, 2026-08-09
  Bridge evidence:
    request_nonce: MSG_5jpr8y0h_2kqvc7
    thread_has_nonce: true  (verified by Bridge)
    nonce_match_count: 1
    all_attachments_confirmed: true
    send_status: MESSAGE_CONFIRMED
    reply_status: settled
  Details: docs/reviews/gate_0_timing.md § Round 2 PARTIAL verdict
  Next gate expected answer: GATE 0: PASS / PARTIAL / FAIL
```

---

## Completed (GATE 0 PARTIAL fixes round)

- [x] **Issue 1 fix — Transport.setBpm() state guard + beat-preserving semantics**:
  - Source: `src/timing/Transport.ts` `setBpm()` lines 179–203
  - When `_playing === true` setBpm() now throws `Error('Transport.setBpm: runtime tempo changes are not allowed while playing…')`.
  - At BPM change `curBeat` (not raw transportSec) is preserved via new anchor: `transportAnchor = curBeat * newSecondsPerBeat`.
  - v1 contract: StageRunner calls `stage.onStart()` BEFORE `transport.start(0, audioBeatZero)` → stage.setBpm runs while playing=false.
- [x] **Issue 2 fix — visibility lifecycle coordination (AudioEngine ↔ Transport ↔ Scheduler)**:
  - Source: `src/audio/AudioEngine.ts` lines 96–115 (`onVisibility()` with `onSuspend?: () => void` / `onResume?: () => void` hooks).
  - StageRunner creates audio engine with lifecycle hooks → when page hidden → both AudioContext suspended AND Transport paused (so playing flag matches audio state).
  - StageRunner.startCountdown() line: `this.transport.reset(this.audio.now())` ensures restart resets beat position back to 0 + reset cursor for scheduler/transport.
- [x] **Issue 3 fix — Judge calibration sign convention + 4-case tests**:
  - Convention documented in `src/timing/Judge.ts` comment block:
    ```
    effectiveDeltaMs = rawDeltaMs − calibrationOffsetMs
      rawDeltaMs > 0 → user tapped LATE
      rawDeltaMs < 0 → user tapped EARLY
      calibrationOffsetMs > 0 → user historically taps LATE
      calibrationOffsetMs < 0 → user historically taps EARLY
    Example: target=1.000s, raw input=1.080s (+80 ms late), calibrationOffsetMs=+80 → effective = 0 ms.
    ```
  - Tests: tests/judge.test.ts section `"calibration sign convention: 2×2 matrix (early/late × ±calib)"` — all 4 cases explicit.
- [x] **Issue 4 fix — InputRouter synchronous audioTime capture**:
  - Source: `src/game/InputRouter.ts` `onPointerDown` (arrow function on class) body — line 159 reads `const audioTime = this.getAudioTime()` — this is called INSIDE the event handler synchronously, not queued for later.
  - Similarly: `onPointerUp` line 214 reads audioTime inside handler.
  - Test: tests/input_router.test.ts — dispatches pointerdown/up, records time inside getAudioTime() and asserts getAudioTime call happens between beforeDown/afterDown of dispatchEvent().
- [x] **Issue 5 fix — Scheduler cursor lifecycle (pause/resume/restart/seek)**:
  - Source: `src/timing/Scheduler.ts`:
    - `nextIndex` stored on scheduler instance. `tick()` only advances; `stop()` ONLY kills timer, does NOT mutate nextIndex → resume = no repeats.
    - `setEvents()` (caller always calls with new copy on restart/seek) resets nextIndex = minBinary to appropriate beat that should be processed first (proved in tests).
  - StageRunner restart fix: `startCountdown()` now begins with `this.transport.reset(audioNow)` + `this.judge.resetRun()` — beat back to 0 before stage.onStart().
  - Tests: `tests/scheduler.test.ts` section `"Scheduler — cursor lifecycle across pause/resume/restart/seek (GATE 0 PARTIAL Issue 5)"`:
    1. stop timer → gap → tick() resumes from old nextIndex → no duplicates.
    2. restart path: transport.reset() → setEvents(copy) → beat 0 dispatched EXACTLY twice (once per run).
    3. seek + setEvents → only forward beats in horizon included, no replay of already-passed backward beats.
    4. consecutive setEvents → no leak.
- [x] **Environment compatibility fixes**: `window.setTimeout` → `globalThis.setTimeout` in Scheduler and InputRouter (works in DOM/node-vitest/jsdom/Web Workers).
- [x] **New test file**: tests/input_router.test.ts (previously missing)
- [x] **Unified confirmed-running lifecycle contract**:
  - `unlockFromUserGesture()`, manual `resume()`, visibility recovery, and gesture
    recovery all delegate to `resumeAndConfirmRunning()`.
  - A resolved `ctx.resume()` is insufficient unless `ctx.state === 'running'`.
  - Concurrent recovery attempts share one promise; lifecycle `onResume` fires once.
  - Initial unlock failure leaves phase/UI locked and does not start Transport/Scheduler.
- [x] **Manual pause freezes WebAudio**:
  - phase becomes `paused` and Scheduler stops before awaiting `ctx.suspend()`.
  - Transport freezes only after suspend is confirmed, at the actual frozen audio time.
  - Manual resume order is confirmed-running -> Transport re-anchor -> Scheduler start.
- [x] **Resume first-tick ordering regression**:
  - Shared `resumeAfterAudioConfirmed()` makes Transport resume before the Scheduler's
    synchronous first tick for visibility and manual resume paths.

## Verified

- [x] `npm run lint` (tsc --noEmit) — **PASS**, 0 errors
- [x] `npm test` (vitest run) — **79/79 PASS** (9 test files):
  - tests/stats.test.ts            11/11
  - tests/calibration.test.ts       5/5
  - tests/timing_drift.test.ts      3/3   (frame-drop / jitter / pause-resume drift evidence)
  - tests/transport.test.ts        18/18   (incl. setBpm state guard, beat preservation + pause/resume)
  - tests/scheduler.test.ts        12/12   (incl. honest dropped-late + cursor lifecycle)
  - tests/judge.test.ts            21/21   (incl. calibration 4-case matrix)
  - tests/input_router.test.ts      3/3    (synchronous audioTime capture proof)
  - tests/audio_engine.test.ts      4/4    (rejection, state confirmation, recovery, hook dedup)
  - tests/playback_lifecycle.test.ts 2/2   (first-tick order + 5-second manual-pause lifecycle)
- [x] `npm run build` (tsc -b + vite build) — **PASS**
  - dist/assets/index-CldvJIO-.js 47.29 kB / gzip 13.99 kB
- [ ] Browser smoke test (real Chrome) — **BLOCKED: Chrome extension not connected**
- [ ] Timing drift long simulation (≥10 min) — NOT YET RUN

## Known issues

- Still no Calibration / Settings / PWA UI (Phase 2)
- Stage 1 Firefly Dock visuals not eye-tested in a real browser
- USER-COMPREHENSION GATE not yet implemented or browser-verified; no additional
  stages or AutoChart product UI may proceed until desktop mouse + touch/pointer
  smoke both answer first-player comprehension with an explicit YES.
- Android实机测试尚未启动
- Bridge first contact not independently confirmed

## Bridge state

```
PENDING RESUBMISSION
  - Pre-requisite fixes: COMPLETE (Issues 1–5 addressed above)
  - Evidence files packaged: timing src + tests (see resubmission zip)
  - Plan: send resubmission message + attachment zip
          Wait 3 min × 3 poll for reply
          Record verdict in docs/reviews/gate_0_timing.md
```

## Next action

1. Zip all timing-critical src + tests files into single archive.
2. Send GATE 0 RESUBMISSION via Bridge with explicit answers to 5 Questions; include:
   - exact HEAD SHA / git status
   - exact test counts 79/79 tsc 0 build PASS
   - zip attachment with src/ + tests/
   - bridge_nonce
3. Wait for ChatGPT reply and implement requested fixes if PARTIAL / FAIL.
4. Continue non-dependent work while Bridge review is pending.
5. After GATE 0 PASS, complete USER-COMPREHENSION GATE + i18n, then run desktop
   mouse and touch/pointer browser smoke before any additional Stage expansion.
