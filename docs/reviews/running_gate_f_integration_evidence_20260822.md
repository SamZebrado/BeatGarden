# Running Mode Gate F integration evidence — 2026-08-22

## Reviewed tree

- Tested implementation commit: `e47c0ccd05ecf610ff3ee0483e9403092c67a3ad`.
- Separate licensing commit: `2beebeb7800b66793ebd463ec8e9b605273c2e55`.
- Baseline before takeover: `b671fa8`.
- Checkout was clean at takeover. The two commits above contain the complete Running
  implementation and the requested separately auditable Apache-2.0 relicensing.

## Frozen Gate E scope delivered

- PhD retained and closed through an explicit Year-nine ended terminal and a distinct
  graduated terminal. Raw time can no longer remain indefinitely at capped Year Nine.
- Master bounded vertical slice: compressed coursework/deadline ecology, two hazards,
  term-rush event, four-way real track choice, Exam arena, natural completion.
- Work bounded vertical slice: interruption/priority ecology, two hazards, daily and
  weekly spatial events, two-way real priority choice, Delivery arena, natural
  completion.
- Cultivation stays visible and locked. Cross-world progression and
  `beatgarden.shared.v1` were not created.
- One deterministic scenario engine plus small world strategies serves Master/Work;
  PhD retains its richer world-owned systems.
- Sprout/Garden/Storm difficulty profiles affect enemy speed, damage, spawn cadence
  and warning duration. Garden is default; unit and production UI evidence pass.

## Static and dependency gates

| Gate | Command/evidence | Result |
|---|---|---|
| TypeScript | `npm run lint` | PASS |
| Deterministic/unit regression | `npm test -- --run` | PASS, 157/157 in 24 files |
| Production build | `npm run build` | PASS |
| Dependency audit | `npm audit --json`, live npm registry | PASS, 0 vulnerabilities |
| Diff hygiene | generated `tsconfig.tsbuildinfo` restored; bridge source clean | PASS |

Production chunk output:

- entry/Rhythm shell: 139.71 kB, 40.87 kB gzip;
- Master/Work renderer: 19.42 kB, 6.78 kB gzip;
- PhD renderer: 19.55 kB, 6.90 kB gzip;
- Phaser/shared simulation: 1,215.54 kB, 324.35 kB gzip.

The >500 kB warning is retained honestly. Rhythm-only production startup requested
only `assets/index-BOaf8Ns5.js`; no Phaser/Running chunk loaded before Running entry.

## Production browser integration

Against the built `/BeatGarden/` subpath, a clean Playwright context verified:

- `?mode=rhythm`: Rhythm menu rendered;
- `?screen=firefly`: existing stage rendered with canvas and audio-enable state;
- `?screen=autochart`: existing local-file analysis UI rendered;
- `?mode=running&world=phd|master|work&textOff=1`: each rendered one canvas;
- world-select Sprout click produced
  `?mode=running&difficulty=sprout` and `aria-pressed=true`;
- console and page errors: none.

The runtime storage fixture seeded:

- `beatgarden.settings.v1={"musicVolume":0.4,"sfxVolume":0.7,"calibrationOffsetMs":12}`;
- `beatgarden.best.firefly-dock={"score":99}`.

After launching all three Running worlds those two strings remained byte-identical.
`beatgarden.running.v1` was independently written as
`{"version":1,"lastWorld":"work","totalRuns":3}`.

## PWA / actual server-stop offline evidence

This was not inferred from build output or CDP network emulation. The QA:

1. launched a persistent browser against a temporary production server;
2. registered/controlled the service worker;
3. closed the browser;
4. stopped the origin server;
5. restarted the browser with the same profile.

Observed result:

- fresh shell, first-ever offline PhD: localized recoverable cloud/fallback, no blank
  screen, zero canvas;
- online PhD once: Running canvas;
- cache `beatgarden-shell-v4` contained the hashed entry, PhD renderer, scenario
  renderer and shared simulation/Phaser chunks;
- after browser close + server stop, cold offline PhD, Master and Work each rendered
  one canvas.

This proves the architecture contract: Rhythm shell remains light; one successful
online Running launch warms every currently shipped Running world.

## Performance

Production build, 1280x720, 15-second active gameplay window per world, keyboard
choice handling, browser errors collected:

| World | Frames | p50 frame | p95 frame | Max frame | Long tasks | Errors |
|---|---:|---:|---:|---:|---:|---|
| PhD | 893 | 16.7 ms | 18.4 ms | 101.8 ms | 1 / 109 ms | 0 |
| Master | 889 | 16.7 ms | 18.4 ms | 101.5 ms | 2 / 163 ms | 0 |
| Work | 896 | 16.7 ms | 18.5 ms | 50.0 ms | 1 / 56 ms | 0 |

The isolated long tasks and maximum intervals are not hidden; the p95 and error-free
window are the bounded acceptance evidence, not a claim about all low-end hardware.

## Runtime/visual/touch evidence

- 52 committed screenshots cover Gate B through Gate F.
- PhD: first-player loop, dense state, meeting warning, phone danger, four Thesis
  stages, seasons, Defense Gate, Committee boss, Year-nine end and graduation.
- Master/Work: early, event, choice, climax, static completion, natural completion,
  portrait/text-off differentiation.
- Natural completion is additionally deterministic-test-backed; climaxes clear the
  ambient arena and stop ambient spawning so the boss is actually targetable.
- Physical Android tablet model `24091RPADC`, Chrome over `adb reverse`: Master
  and Work rendered in landscape, gameplay counters/resources changed, and real touch
  swipes were exercised. This is hardware functional evidence, not a thermal benchmark.

Key final frames:

- `assets/running_gate_f_difficulty_select_20260822.png`
- `assets/running_gate_f_phd_year9_terminal_textoff_20260822.jpg`
- `assets/running_gate_f_phd_graduated_textoff_20260822.jpg`
- `assets/running_gate_e_master_climax_textoff_20260822.jpg`
- `assets/running_gate_f_master_natural_completion_textoff_20260822.jpg`
- `assets/running_gate_e_work_climax_textoff_20260822.jpg`
- `assets/running_gate_f_work_natural_completion_textoff_20260822.jpg`
- `assets/running_gate_f_android_master_20260822.png`
- `assets/running_gate_f_android_work_20260822.png`
- `assets/running_gate_f_rhythm_regression_20260822.png`

## Shared-file protection matrix

| Shared file | Why touched | Main risk | Verification |
|---|---|---|---|
| `src/main.ts` | boot root router | every route | production Rhythm/Running/deep-link browser pass |
| `src/app/AppController.ts` | narrow back-to-modes callback | Rhythm navigation | menu, Firefly, AutoChart, route tests |
| `src/i18n/strings.ts` | complete two-locale shell/game strings | mixed/missing UI | TypeScript + runtime UI |
| `package*.json` | pinned Phaser; license metadata | dependency drift | clean install baseline, build, audit |
| `public/sw.js` | evidence-driven cold-start fix | stale/blank offline | actual server-stop cold starts |
| `README.md` / provenance | truthful scope/license | stale claims | reconciled to tested tree |

## Licensing and provenance

- Apache-2.0 full license text, NOTICE and package metadata are in the second commit.
- Phaser 3.90.0 is MIT and recorded as a code dependency.
- No third-party creative assets, copied UI, music, fonts, sprites or samples were
  introduced.

## Unresolved/deferred items

- Cultivation, cross-world economy/profile and custom per-axis assist sliders are
  deferred by the approved Gate E scope.
- Formal BeatGarden name/trademark clearance remains a pre-commercial-launch blocker.
- The lazy Phaser/shared chunk is large despite measured desktop performance.
- No long-duration Android thermal/battery test was performed.

No static-only result is represented here as runtime proof.
