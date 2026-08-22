OpenAI Codex working on BeatGarden Running Mode, not Captain Sam.

Request: `BEATGARDEN_RUNNING_ARCHITECTURE_REVIEW`

Please classify this Gate A state as exactly **PASS / PARTIAL / FAIL**, identify
blocking corrections, and distinguish blocking from non-blocking advice. Do not review
future implementation as if it already exists.

## Repository authority and current state

- Sole repository: `https://github.com/SamZebrado/BeatGarden`.
- Local branch/HEAD: clean `main` at `b671fa8` before Phase 0 documentation.
- Recent relevant history: `cec5d2f` is the tested prior Rhythm runtime/release
  baseline; subsequent commits through `b671fa8` are release evidence/docs
  canonicalization.
- Phase 0 changes only: byte-identical research archive plus derived STATUS/LOG/PLAN
  and architecture documents. No runtime source, tests, dependencies or PWA files have
  been changed.

## Baseline evidence run now

- `npm ci`: PASS.
- `npm run lint`: PASS.
- `npm test -- --run`: PASS, 121/121 in 18 files.
- `VITE_BASE=/BeatGarden/ npm run build`: PASS.
- live `npm audit --json`: 0 vulnerabilities.
- Desktop browser smoke: current default Rhythm menu, `?screen=autochart`, and
  `?screen=firefly` all boot without console warnings/errors.
- At 390x844, the current pre-Running menu has a real pre-existing layout defect:
  `overflow:hidden` plus vertical centering clips the language button above the
  viewport and makes lower utility buttons unreachable.

## Existing architecture

- `src/main.ts` directly creates `AppController`, then registers the service worker.
- `AppController` owns Rhythm menu, four stages, AutoChart, calibration, audio test,
  settings and provenance.
- Recognized legacy routes are `?screen=autochart|firefly|bubble|cloud|greenhouse`.
- Rhythm timing authority is `AudioContext.currentTime` through the existing
  Transport/Scheduler/Judge/StageRunner stack.
- Current storage keys are `beatgarden.settings.v1` and `beatgarden.best.<stageId>`.
- Service worker caches same-origin GET/static shell; local imported audio does not go
  through fetch and remains uncached/unuploaded.
- Vite and the existing Pages workflow already support `/BeatGarden/`.

## Proposed minimal Running integration

1. Add a small `RootController` and `ModeSelectView` above the existing
   `AppController`; do not move or reorganize Rhythm folders.
2. Routing precedence: recognized legacy `?screen=` always boots Rhythm;
   `?mode=rhythm` boots Rhythm; `?mode=running` opens Running world select;
   `?mode=running&world=phd` opens PhD when implemented. Default `/` shows Mode Select.
3. Add pinned compatible Phaser 3.x only for Running and dynamically import it after
   Running launch so Rhythm startup does not pay Phaser bundle cost.
4. Keep durable game rules as plain deterministic TypeScript with seeded RNG and a
   fixed-step Running simulation. Phaser owns rendering/input adaptation/camera/
   collisions presentation/particles/scenes, not save authority or business rules.
5. Add an isolated versioned `beatgarden.running.v1` key. Preserve existing Rhythm
   keys byte-for-byte. Reserve but do not create/balance `beatgarden.shared.v1` until
   cross-world work is approved.
6. Initial Running shell shows PhD playable/in development; Master, Work and
   Cultivation are locked silhouettes only.
7. Create only phase-needed `src/running/` modules and `tests/running/`; do not add
   empty architecture scaffolding.
8. First integration test gate covers shell routing, corrupt/missing Running save,
   unchanged Rhythm keys, existing deep links, both locales, narrow screen, all current
   tests, lint and `/BeatGarden/` build.

## Expected first shared-file changes

- `src/main.ts`: boot RootController; highest route risk.
- `src/i18n/strings.ts`: complete zh-CN/en shell strings; mixed-language risk.
- `package.json` and lock: pinned Phaser dependency; bundle/license risk.
- `public/sw.js`: only deliberate cache-identity update when deploy inputs change;
  offline-staleness risk.
- `README.md` and `ASSET_PROVENANCE.md`: two-mode boundary and Phaser code-license
  record.

`AppController.ts` should remain untouched if it can be launched as-is.

## Deliberate differences from Deep Research sketch

1. Do not implement the example monolithic SaveEnvelope with `rhythm: unknown`.
   Actual Rhythm state already has stable independent keys; wrapping it creates a
   destructive migration risk.
2. Lazy-load Phaser to protect Rhythm startup and PWA shell size.
3. Create systems incrementally rather than generating every proposed empty folder.
4. Treat the observed 390x844 clipping defect as a shell acceptance constraint.

## Planned order after Gate A

- Shell/routing/save tests and minimal two-mode world select.
- Pure action slice: movement, keyboard/touch, automatic offense, enemies, damage,
  pickups, XP, upgrades, heterogeneous Portfolio Orbit, readable telegraphs and one
  periodic group-meeting event.
- Actual play and Gate B before adding Signal/Noise, Calendar, projects or milestones.
- PhD systems/milestones, no-text QA, then Gate E expansion decision.
- No Master/Work/Cultivation depth before Gate E.

Questions for this review:

1. Is the default `/` Mode Select now acceptable, given all recognized legacy
   `?screen=` URLs preserve direct Rhythm boot?
2. Is lazy Phaser plus pure fixed-step rules the correct boundary?
3. Is additive `beatgarden.running.v1` preferable to the research SaveEnvelope?
4. Are any proposed shared-file changes too broad before the pure-gameplay slice?

Return:

`BEATGARDEN_RUNNING_ARCHITECTURE_REVIEW: PASS|PARTIAL|FAIL`

Then list blocking corrections first.

