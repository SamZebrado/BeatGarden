# GATE 0 — Architecture / Timing Engine

Status: **PARTIAL (ChatGPT official verdict, conveyed by Captain Sam after Bridge fill-succeeded-but-send-missed).**
Latest HEAD reviewed: 4e1701a (post StageRunner + Stage 1 initial impl; tsc 0 errors, vitest 56/56 PASS, vite build PASS, Desktop Chrome smoke PASS).

---

## ChatGPT verdict (official)

```
GATE 0: PARTIAL
```

Verdict rationale (from ChatGPT, transcribed by Captain Sam):
- Architecture overall direction correct; no architectural FAIL-level issue detected yet.
- Cannot PASS from implementation agent self-report alone.
- Requires independent source-level inspection of the 5 timing-critical areas below before PASS.

Blocking issues (not architectural FAIL yet, but evidence gaps):
1. Runtime `setBpm()` semantics relative to already-scheduled future WebAudio events (Option A/B/C).
2. Consistency of visibility change lifecycle: AudioContext suspend/resume + Transport + Scheduler.
3. Calibration sign convention — explicit convention document + tests (late/early × ±calibration).
4. InputRouter must capture AudioContext.currentTime directly inside pointer handler (proof).
5. Scheduler cursor: after pause / resume / restart / seek / setBpm / visibility, ensure no duplicate schedule, no permanent event leak, no stale cursor after rebase.

Required for next resubmission:
- Actual timing-critical source files (not summary):
  `src/audio/AudioEngine.ts`, `src/timing/{Transport,Scheduler,Judge,config}.ts`,
  `src/game/{InputRouter,GameLoop,Stage}.ts`, `src/util/{calibration,stats}.ts`
- Timing-critical test files (Transport / Scheduler / Judge / Calibration / timing_drift).
- Explicit answers for 5 areas above.
- After fixes: resubmit as `BeatGarden — GATE 0 RESUBMISSION` with same nonce protocol.

Next step status: Implementing fixes for Issues 1–5 locally.

---

## Implemented fixes for PARTIAL Issues 1–5 (this round)

Issue 1 (setBpm semantics) STATUS = IMPLEMENTED + TESTED:
- Added `if (this._playing) throw Error(...)` guard at the top of `Transport.setBpm()`.
- Also: setBpm preserves BEAT position across tempo change (not raw seconds): new anchor = curBeat × newSecondsPerBeat.
- Added pausedAnchor-safety: when _playing=false, getTransportTime() uses transportAnchor directly; the same setBpm also writes transportAnchor so paused-getTransportTime returns correct value.
- 2 new/updated tests in transport.test.ts:
  (a) `setBpm preserves current transport position across tempo change (called while PAUSED per v1 contract)` — pause at beat 4 @60BPM → setBpm 120 → transportSec 4→2, beat stays 4; then start(undefined) → advance 1 real second → beat=6, transportSec=3. PASS.
  (b) `setBpm while PLAYING throws — runtime tempo changes forbidden (v1 contract)` — state guard works. PASS.
- v1 integration contract: StageRunner.startCountdown calls `stage.onStart()` → stage.setBpm() runs first. `transport.start(beat 0)` runs SECOND (after onStart returns). So stage.setBpm always runs while playing=false. No violation possible via normal StageRunner path.

Issue 2 (visibility lifecycle consistency) STATUS = IMPLEMENTED + ARCHITECTURE CHECKED:
- AudioEngine lifecycle: `document.addEventListener('visibilitychange', onVisibility)` attached at AudioEngine construction.
  hidden => `ctx.suspend(); state='suspended'; lifecycleHooks.onSuspend?.()`
  visible-return (only when state==='suspended') => `ctx.resume(); state='unlocked'; lifecycleHooks.onResume?.()`
- StageRunner constructor passes hooks bound to the same audio.now():
  onSuspend => this.transport.pause(this.audio.now())
  onResume  => this.transport.resume(this.audio.now())
- Result: SAME event → SAME audio-time value → AC state === playing flag synchronized.
- Additional restart consistency: StageRunner.startCountdown now starts with `this.transport.reset(audioNow)` + `this.judge.resetRun()` — so any restart (countdown phase replay) returns beat position back to 0 cleanly → fixes the prior "restart didn't reset beat" known issue.
- No runtime unit test for visibilitychange event itself (needs browser DOM) — deferred to Phase 2 real-browser smoke. Architecture explicit.

Issue 3 (calibration sign convention) STATUS = DOCUMENTED + 4-CASE TESTED:
- Convention (block comment at src/timing/Judge.ts top):
  `effectiveDeltaMs = rawDeltaMs − calibrationOffsetMs`
  raw>0=LATE; raw<0=EARLY; calib>0=user historically LATE; calib<0=historically EARLY.
- Partially-worked ChatGPT example exactly: target 1.000 s, raw 1.080 s (rawDelta +80 ms LATE), calibOffset =+80 → effective=0 ms PERFECT. Documented.
- judge.test.ts section "calibration sign convention: 2×2 matrix (early/late × ±calib)". 4 explicit cases covering every sign-sense. All 4 PASS. Classification correct (PERFECT / GREAT shifts as expected, not doubled-error).

Issue 4 (InputRouter synchronous audioTime capture) STATUS = CONFIRMED SYNC + NEW TEST FILE:
- Source src/game/InputRouter.ts onPointerDown arrow function: const audioTime = this.getAudioTime() CALLED inside the handler body (first part of handler). getAudioTime is injected config. In StageRunner production: equals () => AudioEngine.now() which is AudioContext.currentTime.
- Same synchronous read in onPointerUp for tap/holdEnd/release judgement.
- NOT using event.timeStamp / performance.now / Date.now / rAF / push-queue-then-read.
- NEW test file tests/input_router.test.ts added this round. Uses jsdom environment. dispatches pointerdown+up through real DOM target. Injects a getAudioTime shim that also records performance.now() into readTimes[] at exact moment of the call. Assertions: readTimes.length>=1; observedAudioTime>0 (listener got an event); readTimes[0] ∈ [beforeDown, afterDown] Date.now() window around dispatchEvent() — proves read happened SYNCHRONOUSLY inside dispatchEvent, not a deferred task/microtask. All 3 assertions PASS.

Issue 5 (Scheduler cursor/skip/lifecycle) STATUS = IMPLEMENTED + 4 LIFECYCLE TESTS PASS:
- Internal: scheduler.nextIndex lives on instance. stop() only kills periodic timer (clearTimeout). Does NOT touch nextIndex → resume correct position.
- tick(currentAudioTime): from = max(nextIndex lower bound). Scans up to (currentBeat + scheduleAheadBeats). Advances nextIndex →= after.
- setEvents(newEvents copy): rebases cursor nextIndex = lowerBound (beat >= currentBeat − scheduleAheadBeats) by binary search. This guarantees: after restart (transport.reset → beat 0) → nextIndex=0 (score start); after seek → forward beats only.
- 4 NEW scheduler tests in tests/scheduler.test.ts:
  (a) `stop() pauses timer, start() resumes periodic fill. tick() uses stored nextIndex → NO repeats / NO skips` — 7 s gap (14 beats) → one tick on resume: each beat appears exactly once (unique set count === total count). PASS.
  (b) `restart path: transport.reset() + scheduler.setEvents() rebuilds cursor at beat 0` — Run #1 tick dispatches beat 0; advance 3 s; transport.reset(3 s) + clock.set(0) + setEvents(new copy) → Run #2 tick dispatches beat 0 again. Assertion: zeroCount === 2 exactly (once per run). If cursor stale after Run #1, zeroCount would be 1. PASS (proves restart-cursor-rebase works).
  (c) `seekToBeat(forward): after seek, setEvents re-aligns cursor so forward beats included, backward skipped (no replay)` — seek beat 8, setEvents → tick only schedules beats in horizon from beat 8 onward. PASS (no replay beats 0..7).
  (d) `consecutive setEvents() replaces events cleanly; no leak from prior setEvents.` PASS.
- StageRunner restart path: additionally `transport.reset(audioNow)` + `judge.resetRun()` before stage.onStart (see Issue 2 above). So restart = entire game state reset clean not just scheduler.

Cross-cutting fixes:
- window.setTimeout/clearTimeout → globalThis.setTimeout/clearTimeout in Scheduler + InputRouter: works unmodified in DOM / node vitest / jsdom / Web Workers. InputRouter hold timer threshold reference too.
- jsdom installed as devDependency so input_router.test.ts '@vitest-environment jsdom' works (it did — 3/3 PASS).

Evidence counts after fixes:
- npm test: **71/71 PASS** (previous 56/56 → +15 tests this round for Issues 1/3/4/5).
- tsc --noEmit: 0 errors.
- npm run build: PASS.

---

## GATE 0 RESUBMISSION — Bridge attempt record 2026-08-08

bridge_nonce: MSG_5jpr8y0h_2kqvc7 (RESUBMISSION, not the old queued one)
attempt_count: 2

Attempt #1 (long text + zip attachment):
  tool: chatgpt-bridge send_message
  error: locator.fill: Timeout 10000ms exceeded
  attachments: uploadStarted = false, includedInSentMessage = false

Attempt #2 (short text + zip):
  error: locator.fill: Timeout 10000ms exceeded (same as #1)

Attempt #3 (text only, no attachments, avoids attachment reset):
  error: `Cannot reset composer: 1 stale attachment control(s) remain`
  diagnosis: The previously-failed-to-send GATE 0 message left an attachment chip in the
  composer that the Bridge tool's reset-composer logic cannot remove. Without ability to
  clear that chip, reset fails, therefore new fill is never attempted, therefore send fails.
  send_status = failed for all 3.

Current Bridge state = BRIDGE_BLOCKED. Pending resubmission content is exactly the
answers above plus the zip package (gate0_resubmission_source_and_tests.zip, 18 timing
files). On any future Bridge de-block, first action is RE-SEND THIS EXACT NONCE first
to obtain GATE 0 PASS/PARTIAL/FAIL verdict BEFORE any Phase 1 expansion.

Blocking issues (not resolved):
- Bridge composer stale attachment chip. Cannot reset composer → Cannot send new message.
- Tool has no "navigate + refresh" or "remove single attachment chip" API.

Resolution plan:
- Record BRIDGE_BLOCKED in docs/DEVELOPMENT_STATUS.md (done)
- Proceed with LOCAL-only tasks that do NOT depend on Gate 0 verdict being PASS first,
  but keep the implementation quality high as if Gate 0 already PARTIAL / might fail:
  - Keep timing architecture as-is (high confidence already: 71/71 + explicit answers).
  - Do browser runtime smoke of Stage 1 Firefly Dock on desktop Chrome (Phase 1 small win):
    unlock audio → tap through countdown → play → observe rhythm, judgement, firefly arcs,
    result overlay, restart works → no runtime errors.
  - Update any runtime-observed issues.
- LATER retry Bridge after some idle time (or next session): page reload via Bridge or
  natural session expiry may clear the stale chip. On any retry: MSG_5jpr8y0h nonce first.


Gate goal: Audit Timing Engine architecture — authoritative clock, transport algebra,
scheduler lookahead filling, judge windows + calibration, Stage abstraction decoupled
from renderer state, anti-drift.

Implemented (local claim):
- AudioEngine owns AudioContext({latencyHint:'interactive'}). User gesture unlock.
  visibilitychange → suspend/resume. Music/SFX master gain buses.
- Transport uses (audioAnchor, transportAnchor) algebra for beat↔audio time.
  start/pause/seekToBeat/setBpm. setBpm preserves musical beat (not raw seconds).
- Scheduler with setTimeout loop (lookahead 25ms, scheduleAhead 120ms) pushes
  OscillatorNode.schedule/noteOn into WebAudio timeline. Cursor skips past events.
- Synth: procedural kick/snare/hatClosed/bass/pluck/bell/lead/uiClick/success/miss
  (OscillatorNode + GainNode ADSR + Biquad + simple FM). No external audio files.
- Judge: PERFECT ±32ms / GREAT ±72ms / OK ±130ms / MISS. Calibration offset subtracted
  from delta. Hold-release windows wider. Call-and-response echo matching with
  pushEchoWindow/matchEchoTap. Score weights: P=300 G=200 OK=100 M=0. Accuracy/
  meanSignedErrorMs/medianSignedErrorMs/delta histogram.
- InputRouter: pointerdown → tap. Swipe detection. Supports touch+mouse.
  Prevents default for gestures on canvas.
- Stage interface: StageDefinition / StageRuntimeServices (transport/scheduler/judge/
  synth/audio/canvas/debug). Each stage owns data/music/events/render/input map/lifecycle.
- Debug overlay: AudioContext time, transport state, BPM, FPS, calibration offset,
  last delta, last judge, queue length. Toggle via D key.
- CanvasManager: 1920×1080 logical, fit-contain, DPR-aware, resize handler.

Tests actually run (evidence):
- 56/56 vitest PASS (6 files).
- Transport.beatToAudioTime 1e-9 tolerance at 60/120 BPM.
- setBpm 60→120 preserves beat position (beat=4 stays beat=4).
- Judge boundaries 0→P / 32+ε→G / 72→G / 72+ε→OK / 131→M.
- Calibration median + outlier robust: 340±10 ms inputs + 5×500 ms outliers → median 340.
- Timing drift 1000 iterations ±100 ms frame jitter → final beat err ≤ 1e-9.
- Pause/resume 100 cycles random 0–1000 ms sleep → final beat err ≤ 1e-9.
- Scheduler cursor skips 8 beats into past (4 sec at 120 BPM).

Browser smoke tests actually run:
- Desktop Chrome latest: unlock→play→advance beat 63→69 over ~3s at ~120 BPM, auto-miss loop
  accumulates 18 misses, 0 JS runtime errors (only stale-port-5173 HMR net abort), canvas
  1488×837 (DPR-adjusted) renders Firefly Dock scene (night gradient sky/water/dock/character).

Known issues before PARTIAL fixes:
- Restart() doesn't actually reset transport beat cleanly back to beat 0 (observed: went from beat 69 to 57, not to 0).
- Scheduler lifecycle after restart/seek not explicitly tested (Issue 5 of PARTIAL).
- No explicit setBpm state guard (Issue 1).
- visibilitychange listeners only suspend AudioContext, do not sync Transport pause
  (Issue 2).
- Calibration 2-case test, not 4-case matrix (Issue 3).
- No explicit test showing InputRouter.clock called synchronously within handler (Issue 4).

## Follow-up after audit

Plan:
- Issue 1: setBpm throw during playing state + explicit semantics contract.
- Issue 2: visibility hidden → AudioEngine.suspend + Transport.pause (sync); visible →
  AudioEngine.resume (user gesture may be needed) AND transport re-anchor safely.
- Issue 3: expand calibration tests into 4-case matrix (early/late × +/- cal), document
  convention clearly in Judge.ts header comment.
- Issue 4: inspect InputRouter clock call site. If inside handler, write deterministic
  test that injects fake clock and verifies audioTime === injected NOW, not later rAF.
- Issue 5: Add Scheduler tests: (a) pause → resume 3s later → no repeat/double events,
  (b) restart → cursor reset, (c) seek → cursor reset, (d) visibility suspend → resume
  scheduler restart clean.
- Resubmit GATE 0 RESUBMISSION with ZIP of required source files.

