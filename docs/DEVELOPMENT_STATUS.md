# BeatGarden Development Status

Current phase: **PHASE 1 — Stage 1: Firefly Dock (initial implementation ready)**

Last updated: 2026-08-08

---

## Current HEAD

- Branch: `main`
- Commit: pending commit (post typecheck fixes: tsc 0 errors / vitest 56/56 / vite build PASS)
- Workspace clean: No (working changes staged)

## Last completed gate

— (GATE 0 prepared; Bridge submission: BRIDGE_BLOCKED — 3× locator.fill 10s timeout; retrying with shorter payload later)

## ChatGPT verdict

Pending first contact. Bridge BLOCKED (fill timeout).

---

## Completed

- [x] Workspace folder created: `/Users/samzebrado/Documents/PersonalCodingLocal/BeatGarden`
- [x] Git repository initialized + first commit (df3c9fc)
- [x] Project scaffold: Vite + TypeScript + Vitest
- [x] Vite config: GitHub Pages subpath compatible (`./` base)
- [x] tsconfig strict mode (exactOptionalPropertyTypes, noUncheckedIndexedAccess, strictNullChecks)
- [x] `index.html` entry with touch-safe viewport (no zoom/no select/no tap highlight)
- [x] Core timing modules:
  - `src/timing/config.ts` — central config (judge windows, BPM, lookahead, calibration defaults)
  - `src/audio/AudioEngine.ts` — AudioContext lifecycle, gesture unlock, visibility/suspend handling, master/music/sfx gain buses
  - `src/timing/Transport.ts` — authoritative audio-time transport, beat↔bar↔time, start/pause/seek/setBpm/reset
  - `src/timing/Scheduler.ts` — cursor-based lookahead scheduler, audio+cues+judge events, configurable lookahead/scheduleAhead
  - `src/audio/Synth.ts` — procedural Web Audio synthesis (kick/snare/hatClosed/bass/pluck/bell/lead/uiClick/success/miss)
  - `src/timing/Judge.ts` — PERFECT/GREAT/OK/MISS centralized windows, calibration median offset, hold/release pairs, echo matching, score/accuracy/meanSigned/medianSigned/histogram stats
  - `src/game/InputRouter.ts` — unified touch+mouse routing, preventDefault on game canvas, tap/hold/swipe detection
  - `src/game/GameLoop.ts` — rAF-driven loop decoupled from transport, preUpdate/update/render hooks
- [x] Stage abstraction `src/game/Stage.ts` + StageRuntimeServices shared interface (transport/scheduler/judge/synth/audio/canvas/debug)
- [x] Stage Runner `src/game/StageRunner.ts` — bootstraps engine, handles gesture unlock → countdown → play → ended flow, routes input to stage, calls stage lifecycle (ready/render/onJudge/onRestart/result)
- [x] Render:
  - `src/render/CanvasManager.ts` — 1920×1080 logical, fit-contain scaling, DPR-aware, resize/orientation handlers
  - `src/render/DebugOverlay.ts` — AudioContext clock, transport beat/bar, BPM, FPS, calibration, last delta, judge counts, scheduled queue, transport state
- [x] Shared utilities: `src/util/calibration.ts` (median/outlier-robust calibration), `src/util/stats.ts` (mean/median/std/histogram)
- [x] Stage 1 — Firefly Dock / 萤火码头 **initial implementation**:
  - Original concept: night pier, geometrical dock worker sprite, glowing firefly seeds glide in along water then player taps at beat to launch them into sky
  - Original music data in `src/stages/fireflyDock/data.ts`: C-Major, 120 BPM, 4/4, 16-bar intro+cycle. Drums (kick/snare/hat/bass), pluck melody on pentatonic, bell accents on cue beats.
  - Cue timing: 8 stable targets per cycle, beats B1.1, B1.3, B2.2, B2.4, B3.1, B3.3, B4.2, B4.4 (on-beat + off-beat alternation, no swing)
  - Visuals: procedural gradient sky parallax, procedural deterministic star field, two-layer triangular distant mountains, sine-wave rippling water, dock planks + lamp post, bouncing squash/stretch character
  - Judge reactions: PERFECT → glowing arc + sparkles; GREAT → slight curve; OK → wobble path; MISS → plop into water with splash + missed SFX
  - UI overlays: Tap-to-unlock audio, stage tutorial overlay, result screen with score + counts
  - Input mapping: any tap (touch/pointer) → nearest unjudged Firefly target
- [x] Stage 1 wiring: `src/main.ts` boots `StageRunner` with `FireflyDockStage`
- [x] Bridge status: BRIDGE_BLOCKED at GATE 0 — 3× ChatGPT send_message attempts returned `locator.fill: Timeout 10000ms`. Will retry with shorter message after this commit.

## Verified

- [x] `npm install` — completed successfully
- [x] `npm run lint` (tsc --noEmit) — **PASS**, 0 errors (2026-08-08)
- [x] `npm test` (vitest run, 6 test files) — **56/56 PASS** (2026-08-08)
  - stats.test.ts (11)
  - calibration.test.ts (5)
  - timing_drift.test.ts (3) — frame-drop / scheduler jitter / pause-resume drift evidence
  - transport.test.ts (15)
  - scheduler.test.ts (6)
  - judge.test.ts (16)
- [x] `npm run build` (tsc -b + vite build) — **PASS** (2026-08-08)
  - dist/assets/index-Db7MJiYD.js 44.96 kB / gzip 13.33 kB
- [ ] Browser smoke test (real Chrome) — NOT YET RUN
- [ ] Timing drift long simulation (≥10 min) — NOT YET RUN

## Timing evidence (from test suite)

- `Transport.beatToAudioTime` vs direct calc at 60 and 120 BPM — matches to 1e-9 tolerance
- Scheduler cursor correctly skips past events before `cutoff = currentBeat - scheduleAheadBeats`
- `setBpm()` preserves beat position (not raw seconds): curBeat=4, 60→120 BPM → still beat=4 (transportSec scales 4→2), +1 real sec → beat=6
- `Judge` boundary: 0ms → PERFECT, 32+ε ms → GREAT, 72ms → GREAT (boundary), 72+ε ms → OK, 131ms → MISS
- Calibration 16 taps: 340ms±10ms with 5 outliers at 500ms → median 340ms, mean 348ms, within ±1 ms tolerance
- Timing drift simulation: 1000 iterations with ±100ms frame jitter → final beat error ≤ 1e-9 (0.0 ns drift, anchor-based)
- Pause/resume cycle 100 times with random sleep 0–1000ms in pause → final beat error ≤ 1e-9

## Known issues

- **Firefly Dock Stage 1 is not yet smoke-tested in actual Chrome runtime** — no browser run done yet. TypeScript + unit tests pass, rendering & audio not eyeballed.
- Reactions still basic: PERFECT/GREAT/OK firefly arcs are planned but current animation only draws static arc path; no particle burst or sky glow yet.
- No Calibration UI page (code util exists, UI menu flow not wired).
- No Settings page, no PWA manifest / service worker (Phase 2).
- Browser real runtime (Chrome Desktop + Android Chrome) NOT YET VERIFIED.
- Bridge status: BRIDGE_BLOCKED — previous attempts `locator.fill: Timeout 10000ms`. Will retry with ~600-char short messages.
- No back to stage select / pause menu (result screen has restart button only; ESC pause shortcut wired but no pause UI rendered).
- Build output not yet inspected for correct GH-Pages relative URLs in a real deploy.

## Bridge state

```
BRIDGE_BLOCKED
  - time: 2026-08-08 (attempts: 3)
  - error: locator.fill: Timeout 10000ms exceeded
  - retry plan: resubmit GATE 0 with much shorter message (~600 chars) after this commit
```

- Likely root cause (speculative):
  - Dedicated Chrome profile may need manual login / cookie consent dismiss / CAPTCHA solve
  - Or very long submit message made fill() slow
- Policy now: proceed INDEPENDENTLY with Phase 1 work while keeping GATE 0 submission queued.
  On ANY Bridge recovery the FIRST action is RE-SUBMIT GATE 0 FIRST with updated HEAD.
  Phase 1 work NOW does NOT constitute Gate 0 audit PASS; it is only a Bridge-blocked workaround.
  If GATE 0 PARTIAL/FAIL on Bridge recovery, immediately rework timing/architecture per feedback.

## Next action

1. Commit this phase changes (Firefly Dock stage runner + stage 1 + fixes)
2. Browser smoke test: start local server, do runtime check on Canvas/SFX
3. Retry ChatGPT Bridge GATE 0 with short message (≤800 chars)
4. Per response: PASS → continue Stage 1 polish / PARTIAL or FAIL → fix Gate 0 issues first
5. GATE 1 submission when Stage 1 fully smoke-tested
