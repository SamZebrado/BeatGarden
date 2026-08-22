# Running Mode Architecture Proposal — Gate A

> Historical authority note: this document records the accepted Gate A proposal.
> Gates A–F remain historical evidence. The current post-Gate architecture is
> summarized below; current source, tests and `RUNNING_MODE_STATUS.md` are authoritative.

## Current post-Gate architecture — 2026-08-23

- `core/people.ts` owns bounded Person profiles. A Person is not a Supervisor,
  Manager, reviewer, Committee member or Boss. Role adapters interpret a stable Person
  without copying a giant role-specific object.
- `core/phdSystems.ts` owns PhD progression, independent-research versus assigned-labor
  semantics, boundary choices and Preparation → Rehearsal → Presentation milestones.
- `core/simulation.ts` owns PhD combat and finite designated rosters. Garden Qualifying
  initializes nine targets once; ambient entities never become designated and no target
  is replenished.
- `core/lifePaths.ts` owns shared academic role adapters plus bounded Work manager,
  offer, market, conversion and promotion policy.
- `core/scenarioSimulation.ts` remains the shared Master/Work gameplay authority while
  exposing different life-path state: Master has three years, Proposal and Defense;
  Work has offers, trial, conversion, employment and promotion.
- Phaser scenes remain presentation/input only. Legends, offscreen source markers,
  localized labels and DEV review seams read snapshots and never decide outcomes.
- Boss Schema v1 remains a strict data-only import boundary. Person profiles never
  become Boss behavior automatically, and the validator remains executable authority.

## Decision

Integrate Running Mode as a lazy-loaded parallel subsystem in the existing BeatGarden
repository. Keep `AppController` and all existing Rhythm directories in place. Add a
small root router above them; do not refactor Rhythm into Phaser.

```text
main.ts
  -> RootController
       -> AppController                 existing Rhythm owner
       -> ModeSelectView                new top-level selector
       -> RunningModeHost (lazy import) new Running owner
            -> WorldSelectView
            -> Phaser 3 scenes          rendering/input/presentation only
            -> pure TypeScript rules    deterministic game authority
```

## Routing contract

Precedence is explicit and testable:

1. Any recognized legacy `?screen=...` boots the existing Rhythm controller.
2. `?mode=rhythm` boots the Rhythm menu.
3. `?mode=running` boots Running world select.
4. `?mode=running&world=phd` boots PhD only after its runtime exists.
5. Unknown values fail safely to a stable top-level screen without mutating storage.

Navigation is bidirectional. `AppController` receives one optional
`onExitToModeSelect` callback and exposes a small “Back to BeatGarden / Modes” action
on the Rhythm home menu only. Stage-level back behavior remains unchanged. Root route
changes use the History API, and `RootController` owns `popstate` so browser Back and
Forward always reconcile rendered mode with the URL.

The default `/BeatGarden/` behavior is the only meaningful product-choice question for
Gate A: immediately introduce Mode Select, or preserve the existing Rhythm menu until
Running has a playable slice. The proposed implementation favors Mode Select because
the takeover prompt explicitly requires a two-mode product shell, while keeping legacy
deep links as the stronger compatibility contract.

## Runtime boundary

- Rhythm authority remains Web Audio time plus `Transport`/`Scheduler`/`Judge`.
- Running uses a fixed-step simulation driven independently from Phaser rendering.
- The pure TypeScript simulation is the single authoritative gameplay state. It owns
  player/enemy/projectile gameplay positions, velocity integration, hitboxes,
  collision/hit resolution, HP/damage, timers, event schedules and seeded gameplay
  RNG.
- Phaser owns keyboard/pointer/touch input adaptation, camera, rendering,
  interpolation, animation, cosmetic tweens/particles, audio presentation and scene
  transitions. Cosmetic state must never feed back into gameplay outcomes.
- Running rules accept plain data and seeded RNG so they can be tested in Node without
  canvas, WebGL, audio or Phaser.
- Phaser is dynamically imported only after entering Running Mode. This protects Rhythm
  startup size and reduces shared-shell regression risk.

## Initial directory boundary

```text
src/app/
  RootController.ts
  ModeSelectView.ts
  AppController.ts                 unchanged unless a narrow callback is necessary

src/running/
  RunningModeHost.ts
  core/
    rng.ts
    simulation.ts
    save.ts
    signalNoise.ts
  config/
    difficulty.ts
    worlds.ts
  systems/
  scenes/
  ui/
    WorldSelectView.ts

tests/running/
```

Only directories needed by the active phase will be created; this is a boundary, not a
request to create empty scaffolding.

## Save contract

- Preserve `beatgarden.settings.v1` and `beatgarden.best.*` exactly.
- Add only `beatgarden.running.v1` for the first PhD slice.
- Reserve `beatgarden.shared.v1` in the schema documentation but do not create or
  balance it until cross-world work is approved.
- Parse defensively, initialize missing/corrupt Running data with safe defaults, and
  never enumerate-delete or bulk-migrate localStorage.
- Save migrations are pure functions with fixtures proving existing Rhythm key/value
  pairs are unchanged.

## PWA and deployment contract

- Reuse Vite and the existing Pages workflow.
- Keep local user audio outside fetch/cache paths.
- Validate production chunks under `VITE_BASE=/BeatGarden/`.
- Phase 2 offline contract: Running becomes offline-capable only after one successful
  online Running launch has fetched its lazy Phaser/Running chunks into the existing
  same-origin runtime cache. A fresh installation that has used only Rhythm is not yet
  promised a first-ever offline Running launch.
- The host must catch a first-offline dynamic-import failure and show a localized,
  recoverable explanation with a return-to-modes action instead of a blank screen.
- Phase 2 browser evidence must cover both sides of the contract: fresh shell + offline
  first Running launch gives the documented fallback; successful online Running launch
  followed by offline reload boots Running.
- Do not edit `public/sw.js` or mechanically bump its cache identity unless evidence
  shows that the existing same-origin runtime-cache strategy cannot satisfy this
  contract. Do not infer any offline PASS from build success.

## Shared-file change budget

| File | Expected reason | Primary risk | Required verification |
|---|---|---|---|
| `src/main.ts` | Boot `RootController` | All entry routes | Default, history and legacy deep-link browser smoke |
| `src/app/AppController.ts` | Optional parent-mode exit hook on Rhythm home only | Rhythm navigation | Stage/menu regression and mode-return smoke |
| `src/i18n/strings.ts` | Complete zh-CN/en shell strings | Mixed-language UI | Locale tests plus both-language runtime inspection |
| `package.json` / lock | Pin Phaser 3.x | Bundle/dependency drift | Audit, lint, tests, production chunk inspection |
| `public/sw.js` | Change only if evidenced cache behavior requires it | Stale or broken offline shell | Fresh-offline fallback and warmed-offline navigation |
| `README.md` | Document two-mode product and verification boundary | Stale release claims | Documentation audit against tested SHA |
| `ASSET_PROVENANCE.md` | Record Phaser as code dependency | Incomplete provenance | Dependency/license check |

`AppController.ts` receives only the narrow optional exit hook required for coherent
installed-PWA navigation; its existing stage and utility ownership remains intact.

## Deliberate differences from the research sketch

1. Do not create a monolithic `SaveEnvelope` containing `rhythm: unknown`. Actual
   Rhythm state already lives in independent stable keys; wrapping it would create a
   destructive migration risk without current user value.
2. Lazy-load Phaser. The research correctly recommends Phaser for Running, but a
   static import would impose its cost on every Rhythm launch.
3. Build systems incrementally instead of creating every proposed directory at once.
   Empty architecture theater would make status harder to audit.
4. Treat the existing 390x844 root-menu clipping as an integration constraint. The new
   shell needs vertical scrolling/safe-area handling even though this is not discussed
   in the research architecture.
5. Make the pure TypeScript fixed-step layer authoritative for gameplay collisions and
   positions. Phaser physics will not become a second source of truth.
6. Define lazy-Running offline availability honestly as warmed-after-one-online-launch
   for Phase 2, with tested first-offline fallback and warmed-offline success.

## Gate sequence

- Gate A: this architecture and takeover evidence.
- Gate B: only after movement, enemies, automatic offense, pickups, upgrades, Orbit and
  one periodic event are actually playable.
- Gate C: Signal/Noise, Calendar, projects, meetings, mentors, pollution, milestones.
- Gate D: text-minimized first-minute through boss visual evidence.
- Gate E: decision on expansion scope.
- Gate F: final integrated runtime, Rhythm regression, saves, PWA/offline, performance
  and unresolved-issue evidence.
