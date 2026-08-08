# BeatGarden Development Status

Current phase: **PHASE 0 — GATE 0 RESUBMISSION (addressing PARTIAL feedback)**

Last updated: 2026-08-08

---

## Current HEAD

- Branch: `main`
- Commit: 4e1701ae1aaef86f0e63f4a889579cadb5100da7 (pending new commit with this doc + resubmission fixes)
- Workspace clean: No — GATE 0 PARTIAL fixes staged for commit.

## Last completed gate

```
GATE 0: PARTIAL
  Received via: Captain Sam relay (formal Bridge verdict 2026-08-08)
  Reasons: Architecture direction correct, but no source-level independent
    audit yet. ChatGPT requested timing-critical source + tests + explicit
    answers to 5 architectural questions.
  Blocking issues: No architectural blocker yet; need source-level evidence.
  Next step: GATE 0 RESUBMISSION with:
    1. Runtime setBpm scheduling semantics (now state-guarded THROW)
    2. Calibration sign convention: effectiveDelta = rawDelta - calib (+ 4-case tests)
    3. Proof: InputRouter reads AudioContext.currentTime synchronously inside pointer handlers
    4. Scheduler lifecycle evidence for pause/resume/restart/seek (no duplicates, no stale cursor)
    5. Visibility suspend/resume: AudioEngine onVisibility() hooks → transport.pause/resume callbacks coordinated
```

## ChatGPT verdict

```
GATE 0: PARTIAL
  Verdict received: Yes (via Captain Sam relay, 2026-08-08)
  Details: docs/reviews/gate_0_timing.md
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

## Verified

- [x] `npm run lint` (tsc --noEmit) — **PASS**, 0 errors
- [x] `npm test` (vitest run) — **71/71 PASS** (7 test files):
  - tests/stats.test.ts            11/11
  - tests/calibration.test.ts       5/5
  - tests/timing_drift.test.ts      3/3   (frame-drop / jitter / pause-resume drift evidence)
  - tests/transport.test.ts        18/18   (incl. setBpm state guard, beat preservation + pause/resume)
  - tests/scheduler.test.ts        10/10   (incl. cursor lifecycle)
  - tests/judge.test.ts            21/21   (incl. calibration 4-case matrix)
  - tests/input_router.test.ts      3/3    (synchronous audioTime capture proof)
- [x] `npm run build` (tsc -b + vite build) — **PASS**
  - dist/assets/index-E_38S9eB.js 45.77 kB / gzip 13.58 kB
- [ ] Browser smoke test (real Chrome) — NOT YET RUN (pending Gate 0 PASS)
- [ ] Timing drift long simulation (≥10 min) — NOT YET RUN

## Known issues

- Still no Calibration / Settings / PWA UI (Phase 2)
- Stage 1 Firefly Dock visuals not eye-tested in a real browser
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
   - exact test counts 71/71 tsc 0 build PASS
   - zip attachment with src/ + tests/
   - bridge_nonce
3. Wait for ChatGPT reply and implement requested fixes if PARTIAL / FAIL.
4. Only after GATE 0 PASS: officially enter PHASE 1 Stage 1 Firefly polish + browser smoke.
