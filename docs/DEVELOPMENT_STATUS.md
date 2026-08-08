# BeatGarden Development Status

Current phase: **PHASE 0 — Scaffold / Timing Engine (awaiting GATE 0 review)**

Last updated: 2026-08-08

---

## Current HEAD

- Branch: `main`
- Commit: `df3c9fc`
- Workspace clean: Yes

## Last completed gate

— (GATE 0 prepared; Bridge submission in progress)

## ChatGPT verdict

Pending first contact.

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
  - `src/input/InputRouter.ts` — unified touch+mouse routing, preventDefault on game canvas, tap/hold/swipe detection
  - `src/game/GameLoop.ts` — rAF-driven loop decoupled from transport, preUpdate/update/render hooks
- [x] Stage abstraction `src/game/Stage.ts` + StageContext shared interface
- [x] Render:
  - `src/render/CanvasManager.ts` — 1920×1080 logical, fit-contain scaling, DPR-aware, resize/orientation handlers
  - `src/render/DebugOverlay.ts` — AudioContext clock, transport beat/bar, BPM, FPS, calibration, last delta, judge counts, scheduled queue, transport state
- [x] Shared utilities: `src/util/calibration.ts` (median/outlier-robust calibration), `src/util/stats.ts` (mean/median/std/histogram)
- [x] Smoke scene in `src/main.ts`: night garden gradient, parallax stars, bouncing beat orb on downbeats, tap-to-judge integration with SFX, debug overlay toggle via `window.__BEATGARDEN__.toggleDebug()`

## Verified

- [x] `npm install` — completed successfully
- [x] `npm run lint` (tsc --noEmit) — **PASS**, 0 errors
- [x] `npm test` (vitest run, 6 test files) — **56/56 PASS**
  - stats.test.ts (11)
  - calibration.test.ts (5)
  - timing_drift.test.ts (3) — frame-drop / scheduler jitter / pause-resume drift evidence
  - transport.test.ts (15)
  - scheduler.test.ts (6)
  - judge.test.ts (16)
- [x] `npm run build` (tsc -b + vite build) — **PASS**
  - dist/assets/index-plyzhGsG.js 28.19 kB gzip 8.64 kB
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

- Smoke scene only, **no stage select / no real stage yet** (Firefly Dock is Phase 1)
- No Calibration UI page (code util exists, UI menu flow not wired)
- No Settings page, no PWA manifest / service worker (Phase 2)
- Browser real runtime (Chrome Desktop + Android Chrome) NOT YET VERIFIED
- Build output not yet inspected for correct GH-Pages relative URLs in a real deploy

## Bridge state

- ChatGPT Bridge: **BRIDGE_BLOCKED (send fill timeout)**
- Attempts so far: 2 (first df3c9fc, then fb73102)
- Error both times: `locator.fill: Timeout 10000ms` (textarea resolved, fill hangs 10s)
- Last attempt time: now (blocking not permanent; retry scheduled every 3 min up to 3+)
- Blocked reason classification: transient UI/page issue (locator resolved = page loaded, fill content too long / cookie banner / profile page blocked by login prompt suspected)
- Gate pending: GATE 0 (Architecture / Timing Engine)
- Pending review message: staged locally, verbatim copy recorded above in Bridge msg
- Work-around policy: continue local independent tasks; retry Bridge every 3 min.
  - Work does NOT depend on ChatGPT reply: lint/tests/build/browser-smoke/build-subpath/extra-timing-sim
    / Stage 1 data scaffold / Stage interface validation

## Next action

1. Retry ChatGPT Bridge GATE 0 message 1+ more times (3 min interval) per user rule.
2. Local independent work while waiting:
   - Verify GH-Pages subpath relative URL via static server on `dist/`
   - Run a real 60-second timing drift observation (not mocked, real AudioContext)
   - Design Stage 1 (Firefly Dock) music/cue data scaffold files
3. If Bridge still blocked after N retries → append BRIDGE_BLOCKED record + times + error to DEVELOPMENT_STATUS (already documented) and continue PHASE 1.
4. On Bridge recovery → re-submit GATE 0 with latest HEAD before declaring GATE 0 PASS.

## Files changed since init

35 files in initial commit. Key source files:
- `src/timing/{config,Transport,Scheduler,Judge}.ts`
- `src/audio/{AudioEngine,Synth}.ts`
- `src/input/InputRouter.ts`
- `src/game/{Stage,GameLoop}.ts`
- `src/render/{CanvasManager,DebugOverlay}.ts`
- `src/util/{calibration,stats}.ts`
- `src/main.ts` (smoke scene)
- 6 test files under `tests/`
- Package/tooling: package.json, tsconfig.json, vite.config.ts, index.html
- Docs: DEVELOPMENT_STATUS.md, ASSET_PROVENANCE.md
