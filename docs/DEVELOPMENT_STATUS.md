# BeatGarden Development Status

Current phase: **GATE 0–4 PASS; FINAL INDEPENDENT ACCEPTANCE PENDING**

Last updated: 2026-08-10

---

## Current repository state

- Branch: `main`
- Codex takeover commit: `1310965` — Gate 0 lifecycle delta.
- Latest committed runtime telemetry baseline: `8381333`.
- Runtime/test candidate `cec5d2f529a55720cd58943f10c0e1810d95c118`: tsc 0,
  121/121 tests in 18 files, production
  `/BeatGarden/` build PASS, online npm audit 0 vulnerabilities.
- Independent Round-4 source review: `GATE 0 SOURCE REVIEW: PASS`.
- Real Chrome A-D evidence: `docs/evidence/gate0_chrome_20260810.json`.
- USER-COMPREHENSION answer: **YES** for desktop mouse and touch PointerEvent smoke.
- Public Pages and real Android closure runtime SHA:
  `cec5d2f529a55720cd58943f10c0e1810d95c118`.
- Canonical public URL
  `https://samzebrado.github.io/BeatGarden/`.
- Real Android matrix: PASS except external WebAPK package delivery / standalone launch,
  which remains explicitly `UNVERIFIED` after Chrome returned response code `-1`.
- Entire Android smoke kept media volume at 0. **auditory calibration validity NOT ASSESSED because media volume was intentionally muted**.

## 2026-08-10 GATE 2 external closure run

- Xiaomi 24091RPADC / Android 16 / Chrome 145.0.7632.159 connected over USB ADB.
- Public production boot and physical touch Firefly/Bubble/portrait gameplay PASS.
- 16-input calibration software flow saved and persisted -50.0 ms; Judge read it after
  Chrome restart. The value is a muted persistence fixture, not an auditory measurement.
- Portrait/landscape mapping and device rotation restoration PASS.
- Playing-stage Home/foreground lifecycle froze the beat across suspend/resume,
  generated no input, resumed transport, and kept `droppedLate=0`.
- Wi-Fi/data disabled, active default network none, Chrome cold restarted to a fresh
  query URL, cached main menu booted, and physical touch loaded Firefly offline.
- Formal BeatGarden install dialog at the public origin was accepted. Chrome logged
  external WebAPK response `-1`; no package appeared, so standalone is `UNVERIFIED`.
- Evidence: `docs/evidence/android_release_20260810.json` and screenshots in
  `docs/evidence/android_20260810/`.

### Official GATE 2 re-verdict — PASS

- Request id `msmra21b-23eyvamr`, message id `zty9qf03p0gvog6uaei9l`.
- Nonce `MSG_codex_gate2_android_f0c3780_20260810a`; nonce ownership PASS and four
  of four attachments acknowledged.
- Independent reviewer accepted the complete real-device matrix and the deliberately
  limited muted-calibration claim.
- External Chrome WebAPK delivery remains recorded as
  `standalone launch: UNVERIFIED`; the reviewer found no app-owned installability,
  manifest, HTTPS, scope, or service-worker blocker and therefore did not block GATE 2.
- GATE 4 re-submission subsequently passed; see the official re-verdict below.

## 2026-08-10 public Pages closure

- Origin/main/runtime SHA matched `cec5d2f529a55720cd58943f10c0e1810d95c118`.
- Pages configured for workflow deployment; run `31355206962` succeeded.
- Root, manifest, service worker, hashed main bundle, and analysis Worker all returned
  HTTPS 200 from `/BeatGarden/`.
- Desktop connected Chrome verified Chinese default, full English replacement, Firefly,
  correct SW scope/controller/cache, and zero console runtime errors.
- Evidence: `docs/evidence/public_pages_20260810.json`.

## Official GATE 4 re-verdict — PASS (2026-08-10)

- Request id `msmrfhi4-l1gjphs2`, message id `7177kcr6o93aasekur2d6u`.
- Nonce `MSG_codex_gate4_release_7725189_20260810a`; nonce ownership PASS and five
  of five attachments acknowledged.
- Blocking issues: none; required fixes: none for GATE 4.
- Independent reviewer verified GitHub main `7725189f2a7cac1d490ff5aa9b13e40aaf31dddc`,
  Pages run `31357050467` and both build/deploy jobs successful, and confirmed the
  runtime-to-documentation diff contains no runtime/test/dependency/build-input change.
- Established chain: GATE 0 PASS / GATE 1 PASS / GATE 2 PASS / GATE 3 PASS /
  GATE 4 PASS. A separate final independent acceptance submission follows immediately.

## Historical / superseded Gate records

Everything below this heading is retained as an audit trail. It does not describe the
current release state; current canonical status is the PASS chain above.

### Superseded GATE 2 verdict — PARTIAL (2026-08-10)

- Service-worker cache lifecycle blocker fixed and server-off regression rerun PASS.
- `adb devices -l` reports no connected device, so the remaining real Android tablet
  blocker is explicitly external and `ANDROID UNVERIFIED` remains the honest status.
- Development continues through GATE 3/4 and all work independent of that device.

## Official GATE 3 verdict — PASS (2026-08-10)

- Delta request id `msm58d7v-pywqhko2`, message id `4nqa2bv5v86sokgecq64ws`,
  nonce `MSG_codex_gate3_fix_1007325_20260810a`.
- Seven of seven attachments acknowledged; independent reviewer reported no blockers.
- Android hardware remains an external GATE 2 proof and did not block GATE 3.
- This is not final acceptance; GATE 4 is already submitted and development continues.

### Superseded PARTIAL and fixes

- Bridge request id `msm4st0h-6yrlp85y`, message id `zpupehtc6dk5rexrgoe7z8`,
  nonce `MSG_codex_gate3_autochart_c4caa4b_20260810a`.
- Imported playback now exposes `pausing` and pauses its timeline only after
  `AudioContext.suspend()` is confirmed; failed suspension rolls back to `playing`.
- Original-stage judgement feedback is fully localized; connected Chinese Chrome
  visibly rendered `错过！`, and zh-CN/en regression tests cover all four labels.
- Pointer actions now carry local surface dimensions; Bubble lane selection no longer
  depends on `window.innerWidth`. All three lanes scored PERFECT in touch smoke with
  `droppedLate=0`.
- Exact-SHA delta at `1007325` was independently accepted.

## Superseded GATE 4 submission — PARTIAL (2026-08-10)

- Request id `msm5bks4-9xgt95kb`, message id `dxut5vd7vwljfg7pktu6`,
  nonce `MSG_codex_gate4_rc_91744e2_20260810a`.
- Ten of ten release-package attachments were confirmed in the ChatGPT thread.
- Official verdict: `GATE 4: PARTIAL`.
- Concrete blockers only: real Android release proof and public GitHub Pages origin.
- Fresh sandbox-external ADB check returned an empty device list. GitHub `/new`
  redirected the available browser session to sign-in; no connected repository or
  valid local credential is available.
- No new code/content/AutoChart/provenance/test/build blocker was reported.

## Official GATE 1 verdict — PASS (2026-08-10)

```
GATE 1: PASS
Nonce ownership: PASS
Blocking issues: None.
```

- Bridge request id: `msm3d2zt-by80o397`
- Message id: `83w326i5pao7do8t8hotc6`
- Nonce: `MSG_codex_gate1_fix_07a6fb2_20260810a`
- Six of six delta attachments acknowledged.
- The reviewer confirmed debug-handle cleanup, player-only lever causality, and
  exact-HEAD evidence at `07a6fb2`.
- This is not final acceptance. Development continues automatically.

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
- [x] GATE 1 PARTIAL fix: destroyed Runner deletes its owned global debug handle;
  real Chrome reports `debugHandlePresent=false` after exit.
- [x] GATE 1 PARTIAL fix: automatic expiry MISS no longer moves the player lever;
  explicit regression distinguishes automatic and player-caused MISS.

## AutoChart foundation — COMPLETE

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
- [x] Native file-picker automation limitation documented: the connected browser API
  has no file-upload operation; the same `analyzeFile(File)` path is exercised with an
  original in-memory WAV and is not a release blocker.
- [x] Imported-track one-shot AudioBufferSource start/restart/seek lifecycle with tests.
- [x] Playable original Pulse Garden: two-second approach lead-in, tap/swipe/hold targets,
  shared InputRouter/Judge/Stats, immediate feedback, procedural garden growth, pause,
  restart, and result overlay.
- [x] Real Chrome Pulse Garden smoke: target song time 0.499229 s, mouse input song
  time 0.502 s -> PERFECT; pause froze song time exactly for 1.3 s.
- [x] AutoChart release scope accepted by GATE 3/GATE 4; no imported user audio is
  included in the repository or represented as stream safe.

## Original stage content

- [x] Four built-in original stages now exist: Firefly Dock, Bubble Kitchen,
  Cloud Post, and Sleepy Greenhouse.
- [x] The additional stages use distinct mechanics rather than palette swaps:
  three-lane taps, directional swipes, and paired hold/release.
- [x] Each has an original procedural score, a distinct visual scene, approaching
  target rings, explicit operation symbols, judgement feedback, result/restart/exit,
  and the shared timing/audio lifecycle.
- [x] Connected Chrome touch PointerEvent smoke: Bubble `PERFECT`, Cloud `PERFECT`,
  Greenhouse holdStart + holdRelease both `PERFECT`; all `droppedLate=0`.
- [x] Browser-discovered hold expiry conflict fixed: the 220 ms hold-recognition
  threshold is centralized and added only to holdStart automatic expiry.
- [x] All three new stages reached their full-length result screen in connected Chrome
  with `droppedLate=0`; Bubble restart reset counts, while Cloud and Greenhouse exit
  cleanup left no canvas/runtime/smoke nodes and no debug handle.

## Calibration / Settings / PWA — COMPLETE

- [x] Real product calibration page schedules WebAudio ticks and captures InputRouter
  audio timestamps; 16 valid Chrome clicks saved `+6.3 ms`.
- [x] Calibration offset is loaded into built-in and imported-song Judge instances.
- [x] Music/SFX volume, calibration, and reduced-motion preference persist locally.
- [x] Manifest, original maskable SVG icon, service worker, offline shell, and runtime
  same-origin asset caching implemented without a CDN.
- [x] `/BeatGarden/` static mount returned correct HTTP 200/MIME for index, hashed JS,
  Worker, manifest, and service worker.
- [x] Connected Chrome production service-worker registration: controlled scope,
  `beatgarden-shell-v3`, no registration error.
- [x] Server was stopped before navigating to a new query URL; the cached production
  app booted to the full main menu with no navigation error.
- [x] Browser-discovered stale canonical index bug fixed and the offline reload rerun.
- [x] 192×192 and 512×512 maskable PNG icons plus the original SVG are packaged.
- [x] Canvas double-letterbox offset/cropping bug fixed; exact 16:9, 16:10, and 4:3
  layout tests pass, with a corrected live 1440×687 Chrome screenshot inspected.
- [x] Real Android portrait/landscape orientation matrix PASS; device rotation settings
  restored after testing.
- [x] Public GitHub Pages deployment PASS at
  `https://samzebrado.github.io/BeatGarden/` with exact-SHA workflow evidence.
- [x] Android tablet real-device runtime PASS for production boot, physical touch,
  lifecycle, muted calibration software flow, orientation, and cold offline relaunch.

## Streaming / provenance / local product data

- [x] Main menu includes Audio & Streaming Test and Asset / License / Stream Safe Info.
- [x] Music and SFX can be auditioned separately after a user-gesture audio unlock.
- [x] Built-in procedural content is separated from user-imported rights-unverified
  local audio in complete Chinese and English pages.
- [x] Imported files are not uploaded or service-worker cached and are never labelled
  stream safe.
- [x] Per-stage local best score and accuracy persist with deterministic tie-breaking.
- [x] `ASSET_PROVENANCE.md` moved creative categories from PLANNED to COMPLETE and
  records exact direct development dependency versions/licenses.
- [x] Full online `npm audit` initially found 5 development-tool advisories; Vite,
  Vitest, TypeScript, and jsdom were upgraded, then 113/113 tests/build passed and
  the repeat audit reported 0 vulnerabilities.

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
- [x] Timing drift long simulation (10 min) — deterministic mixed-frame simulation
  remains exactly locked to the authoritative audio clock at 137 BPM.

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
