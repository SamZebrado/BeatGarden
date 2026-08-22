# BeatGarden Running Mode — Gate B gameplay review request

Identity: I am OpenAI Codex working on BeatGarden Running Mode, not Captain Sam.

Please review the implemented Gate B pure-gameplay slice in the existing BeatGarden
repository. Gate A already passed in this conversation. Do not approve conceptual
systems or additional worlds yet.

## Implemented scope

- Dual-mode product shell with legacy Rhythm deep-link compatibility and History API.
- Running PhD Garden lazy-loads Phaser 3.90.0; Rhythm does not import Phaser.
- Pure TypeScript `RunningSimulation` is the sole gameplay authority for positions,
  movement, projectiles, collision/hits, HP/damage, timers, event schedule and seeded
  RNG. Phaser only adapts input and renders snapshots/cosmetics.
- Keyboard and pointer-drag movement; automatic nearest-target offense.
- Three visibly distinct enemy families; hit flashes/pulses; player damage feedback.
- XP pickups with attraction/collection, level-up pause and three actual choices:
  growing Portfolio Orbit, faster cadence, or vitality.
- Portfolio Orbit is visible from the first second and gains nodes after its upgrade.
- First group meeting is telegraphed for 3 seconds at simulation time 28s, then spawns
  a deterministic ring; it repeats after the active window.
- Master, Work and Cultivation remain locked silhouettes. No Signal/Noise, Calendar,
  mentor, Thesis, year, boss or other conceptual system has been added.

## Evidence

- `npm run lint`: PASS.
- `npm test -- --run`: PASS, 132/132 tests in 21 files.
- New pure-rule tests prove deterministic replay, movement normalization/world clamp,
  auto-offense/XP/upgrade pause, meeting telegraph timing, and unsafe-step rejection.
- `VITE_BASE=/BeatGarden/ npm run build`: PASS. Running/Phaser is a separate lazy
  chunk (~1.21 MB minified / 324 kB gzip); Rhythm entry remains ~134 kB minified.
- Real 1280x720 browser play: Phaser WebGL boots, auto offense/hits/pickups render,
  keyboard and pointer drag move the player; no page errors.
- First 390x844 pass revealed a tiny letterboxed world. It was corrected to a
  player-follow portrait camera and screen-space HUD; pointer-drag movement was then
  replayed successfully at 390x844.
- Navigation runtime: Mode Select → Rhythm → Back → Mode Select → Forward → Rhythm;
  Mode Select → Running → Back → Mode Select; direct `?screen=firefly` → Rhythm.

Primary review files:

- `src/running/core/simulation.ts`
- `src/running/core/rng.ts`
- `src/running/phaser/bootPhdGarden.ts`
- `src/running/RunningModeHost.ts`
- `tests/running_simulation.test.ts`
- `docs/RUNNING_MODE_STATUS.md`

Please return exactly one verdict line:
`BEATGARDEN_RUNNING_GAMEPLAY_REVIEW: PASS`, `PARTIAL`, or `FAIL`.

List concrete blocking corrections separately. Judge whether movement, automatic
combat, feedback, pickup/upgrade cadence, Portfolio Orbit readability, telegraphing,
and the group-meeting event are enough to authorize Gate C systems work. Treat
unverified Android hardware, PWA/offline, sustained performance, and final integration
as later gates rather than silently passing them.

To signal that your complete response has finished, put this exact token on the final
line by itself:

BEATGARDEN_REVIEW_RESPONSE_COMPLETE
