# BeatGarden Development Status

Current phase: **GATE 0 PASS; USER-COMPREHENSION YES; AUTOCHART FOUNDATION IN PROGRESS**

Last updated: 2026-08-10

---

## Current repository state

- Branch: `main`
- Codex takeover commit: `1310965` — Gate 0 lifecycle delta.
- Latest committed runtime telemetry baseline: `8381333`.
- Current verified working tree: tsc 0, 99/99 tests, production build PASS.
- Independent Round-4 source review: `GATE 0 SOURCE REVIEW: PASS`.
- Real Chrome A-D evidence: `docs/evidence/gate0_chrome_20260810.json`.
- USER-COMPREHENSION answer: **YES** for desktop mouse and touch PointerEvent smoke.

## Official GATE 0 verdict — PASS (2026-08-10)

```
GATE 0: PASS
Nonce ownership: PASS
Blocking issues: None.
Required fixes: None for GATE 0.
```

- Bridge request id: `msm1u6pf-yyfvbk3u`
- Message id: `2vwbsojs64ipcszqqcg8hh`
- Nonce: `MSG_codex_gate0_runtime_47cfe6c_20260810a`
- Attachments: six of six acknowledged and independently reviewed.
- This is not final acceptance. Development continues automatically into AutoChart,
  complete product flow, content, PWA, performance, and GATE 1–4.

## 2026-08-10 runtime closeout

- [x] Fresh-origin initial state is locked/idle/suspended with Transport stopped.
- [x] Real mouse gesture unlock starts only after AudioContext is confirmed running.
- [x] Autoplay-blocked/pending resume is bounded at 1500 ms; the UI remains locked and
  the next real gesture recovers successfully.
- [x] Manual pause held beat `16.7514` and audio time `9.4273` unchanged for 3.2 s.
- [x] Manual resume restored AudioContext first, then Transport, then Scheduler;
  `droppedLate=0`.
- [x] Visibility recovery rejection fault injection froze beat/audio time for 2.1 s;
  exactly one recovery gesture resumed the lifecycle and was not judged.
- [x] Runtime mouse input at beat `2.0143` produced immediate `GREAT` feedback.
- [x] Runtime touch PointerEvent at beat `2.0143` produced the same `GREAT` feedback.
- [x] English replacement page contains no Chinese UI text.
- [x] Fixed a browser-discovered early-auto-MISS bug: expiry no longer includes a
  future `+1 beat` lookahead. Added two regression tests.
- [x] First-time player can understand within 10 seconds without README: **YES**.
- [x] Main menu -> original stage select -> Firefly Dock -> result -> restart -> result
  -> stage select completed in real Chrome; both runs had `droppedLate=0`.
- [x] Exit cleanup left zero canvases and zero runtime telemetry nodes; StageRunner
  cancels rAF, stops Scheduler, detaches InputRouter/resize listener, and closes audio.

## AutoChart foundation (in progress)

- [x] No third-party DSP/runtime CDN; deterministic local TypeScript FFT and features.
- [x] Frame features: RMS, centroid, rolloff, four energy bands, global/low/mid/high
  positive spectral flux, and local dynamic range.
- [x] Rolling median/MAD onset normalization, local maxima, refractory interval.
- [x] Tempo autocorrelation, phase search, confidence, and onset-timed fallback.
- [x] Difficulty density/minimum-gap/gesture profiles plus seeded deterministic variation.
- [x] Imported targets carry authoritative `songTimeSec`; beat remains annotation.
- [x] Shared Judge accepts an injected songTime-to-AudioContext resolver; no second Judge.
- [x] Imported timeline pause/resume/seek/restart mapping tests.
- [x] AudioBuffer mono/downsample preparation yields between chunks.
- [x] FFT analysis runs in a transferable Web Worker with progress and termination.
- [x] Local analysis UI shows privacy/rights warning, waveform, envelopes/markers, tempo,
  confidence, timing mode, difficulty, seed, and note count.
- [x] Real Chrome in-memory WAV smoke: expected 120 BPM, detected 119.0 BPM, confidence
  68%, 20 onsets, 14 normal notes, no observed console error.
- [ ] Native file-picker upload smoke: NOT RUN because the connected browser API has no
  file-upload operation and Chrome rejected programmatic path assignment.
- [x] Imported-track one-shot AudioBufferSource start/restart/seek lifecycle with tests.
- [x] Playable original Pulse Garden: two-second approach lead-in, tap/swipe/hold targets,
  shared InputRouter/Judge/Stats, immediate feedback, procedural garden growth, pause,
  restart, and result overlay.
- [x] Real Chrome Pulse Garden smoke: target song time 0.499229 s, mouse input song
  time 0.502 s -> PERFECT; pause froze song time exactly for 1.3 s.
- [ ] Native file-picker smoke and a complete real-song manual play remain pending.

## Historical independent verdict (Round 3, superseded by source PASS)

```
GATE 0: PARTIAL
  Bridge request_id: msls2az0-dw4molc0
  request_nonce: MSG_codex_gate0_1310965_20260809a
  Ownership: PASS (nonce confirmed in immediately preceding user bubble)
  Remaining blockers:
    1. Source/test delta could not be independently read because the security
       reviewer rejected external upload of the private ZIP.
    2. Real Chrome lifecycle smoke A-D remains blocked because the Codex Chrome
       extension is not connected.
  Accepted/unchanged: prior Q1/Q3/Q4, Scheduler, and Synth findings.
```

## Historical verdict trail

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

## Historical ChatGPT verdict (Round 2 PARTIAL)

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
- [x] `npm test` (vitest run) — **88/88 PASS** (11 test files):
  - tests/stats.test.ts            11/11
  - tests/calibration.test.ts       5/5
  - tests/timing_drift.test.ts      3/3   (frame-drop / jitter / pause-resume drift evidence)
  - tests/transport.test.ts        18/18   (incl. setBpm state guard, beat preservation + pause/resume)
  - tests/scheduler.test.ts        12/12   (incl. honest dropped-late + cursor lifecycle)
  - tests/judge.test.ts            21/21   (incl. calibration 4-case matrix)
  - tests/input_router.test.ts      5/5    (synchronous capture + mouse/touch tap equivalence)
  - tests/audio_engine.test.ts      5/5    (including pending-resume timeout recovery)
  - tests/playback_lifecycle.test.ts 2/2   (first-tick order + 5-second manual-pause lifecycle)
  - tests/firefly_readability.test.ts 4/4  (beats 2/4/6/8 tutorial + i18n feedback)
  - tests/judgement_expiry.test.ts   2/2   (no early MISS; expiry after OK window)
- [x] `npm run build` (tsc -b + vite build) — **PASS**
  - dist/assets/index-8k5riOXg.js 55.03 kB / gzip 16.66 kB
- [x] Browser smoke test (real Chrome) — **PASS A-D**, evidence file above
- [ ] Timing drift long simulation (≥10 min) — NOT YET RUN

## Known issues

- Still no Calibration / Settings / PWA UI (Phase 2)
- AutoChart worker/UI/playback and the remaining original stages are still incomplete.

## USER-COMPREHENSION implementation (browser verdict still pending)

- [x] First four guided targets occur at beats 2, 4, 6, and 8.
- [x] Approaching seed begins two beats early on an explicit dashed cue path.
- [x] Hit zone pulse derives from authoritative Transport beat distance.
- [x] Player input visibly swings the worker's lever; no random autonomous firing.
- [x] Immediate localized PERFECT/GREAT/OK/MISS feedback.
- [x] Early/unmatched input produces localized wait feedback plus quiet click SFX.
- [x] Default Simplified Chinese i18n; complete English replacement strings.
- [x] Unlock, result, score, restart, back, shortcuts, tutorial, pause, and debug
  labels migrated to locale strings.
- [x] Unlock screen explicitly states desktop left-click and Android touch controls.
- [x] Desktop mouse real-browser smoke — GREAT at beat 2.0143.
- [x] Touch/pointer real-browser smoke — pointerType=touch, GREAT at beat 2.0143.
- [x] First-player comprehension answer — **YES**.
- Android实机测试尚未启动
- Bridge Round-3 reply fetched and recorded; verdict remains PARTIAL.

## Bridge state

```
ROUND 4 SOURCE REVIEW PASS RECEIVED
  - five exact source/test attachments: MESSAGE_CONFIRMED_IN_THREAD
  - attachment ACK: PASS
  - nonce ownership: PASS
  - source blockers: none
  - real Chrome A-D runtime evidence: independently accepted
  - overall verdict: GATE 0 PASS
```

## Next action

1. Implement AutoChart DSP, worker analysis, imported-song playback, and analysis UI.
2. Keep `songTimeSec` authoritative and share Judge/calibration/InputRouter/Stats.
3. Complete Firefly result/restart/stage-select flow and then additional stages.
4. Continue through GATE 1–4 and FINAL_ACCEPTANCE without stopping at phase boundaries.
