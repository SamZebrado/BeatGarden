# BeatGarden Rhythm Mode V2 Status

## STATUS

Current verified Rhythm state: **R0 Design Gate PASS. R1 Control Clarity is implemented and in browser/Android verification.**

Branch: `codex/rhythm-v2-product-polish`

Baseline HEAD: `27739e7d6c621c661edfc3b55df981d9e3438f46`

### Baseline verification

- `npm ci` — PASS
- `npm run lint` — PASS
- `npm test -- --run` — PASS, 42 files / 276 tests
- `VITE_BASE=/BeatGarden/ npm run build` — PASS
- Rhythm main bundle — 220.65 kB / gzip 60.42 kB
- AutoChart worker — 4.61 kB
- Existing Running `JourneyResult` chunk — 1.216 MB / gzip 324.98 kB, existing Vite size warning; recorded only, not pulled into Rhythm scope
- Browser console after R0 traversal — no warning/error entries

### R0 verified surfaces

- Shared shell: Mode Select, Rhythm Home, Stage Select
- Four built-in stages: instruction, countdown/first target, hit/miss samples, mid/dense traversal, pause, result
- AutoChart: selection, analyzing, result, difficulty/seed, Pulse start/play/result
- Legacy links: `firefly`, `bubble`, `cloud`, `greenhouse`, `autochart`, `mode=rhythm`
- Tools: Calibration, Audio Test, Settings, Stream Safe / Provenance
- Viewports: 1440×810, 1280×800, 1024×768, 390×844
- Android: portrait shell, touch to Stage Select, auto landscape Stage launch, AudioContext unlock, one real hit-zone touch; `STREAM_MUSIC Muted: true` before/after
- Running boundary: `?mode=running` launches and preserves visible unfinished-journey prompt; no Running action or source change

### Current product blockers

1. R2: shared judgement, Combo/Groove and motion grammar are not yet productized.
2. R3: Bubble/Cloud/Greenhouse still need deeper section and geometry differentiation beyond R1 controls.
3. R4: Result pages still prioritize timing diagnostics over player reward.
4. R5: AutoChart Normal and Hard fixtures both produced all-tap charts; phrase and mixed-gesture playability are not demonstrated.

## LOG

### R0 — read-only product and visual audit

- Synced `origin/main` and branched without modifying the baseline.
- Ran baseline install, lint, 276 tests, production build and legacy route checks.
- Traversed every requested Rhythm surface in a real browser and stored representative evidence under `docs/rhythm/evidence/r0/`.
- Connected Android tablet and kept the effective media stream explicitly muted throughout. No auditory calibration was performed or claimed.
- Confirmed Running launch only; preserved its existing local journey state.
- Created `PRODUCT_AUDIT.md` and `DESIGN.md`; no runtime code changed.

### R0 Design Gate

- Commit `313042587842784d7c463bde6bec1d19c31cc225` pushed to `codex/rhythm-v2-product-polish`.
- ChatGPT verdict: `RHYTHM V2 DESIGN GATE: PASS`; no blocking document corrections.
- Verdict explicitly preserved R1→R5 order, the timing-authority chain, and the hard Running no-refactor boundary.
- Bridge incident: request `mt61cfiq-um1y2msd` reported four attachments as confirmed, but its own composer snapshot recorded `attachmentCount: 0`, and the real Chrome conversation contains no original R0 user bubble or visible attachment cards. Network navigation also produced `ERR_NETWORK_CHANGED`. The later verdict accurately cited the packet and exposed source buttons, so model access occurred, but Bridge attachment-delivery status is classified as a false-positive UI confirmation. Future Gate sends require real Chrome message-bubble/card verification.

### R1 — Control Clarity implementation and smoke

- Rhythm Home and Stage Select now use a scrollable `100dvh` shell. At 390×844 the app container reports `clientHeight 844`, `scrollHeight 1106`, `overflow-y: auto`; all utility actions are reachable after a real wheel scroll.
- All four original stages define four first-play tutorial steps. Tutorial targets use the existing Transport/Scheduler/Judge chain; failed steps repeat and `judge.resetRun()` removes tutorial outcomes before formal play.
- Completed tutorials persist per stage in `beatgarden.rhythmTutorials.v1`; Settings can reset only this record to re-enable tutorials without touching Rhythm settings or Running data.
- Bubble: three full-width labelled zones, current-lane highlight, wrong-lane guidance, wide mouse/touch mapping.
- Cloud: explicit direction instruction, dashed start→end trail, arrow, minimum-distance progress, wrong-direction guidance.
- Greenhouse: explicit PRESS/HOLDING/RELEASE presentation, hold meter, early-release guidance, paired authoritative hold targets.
- Firefly: one compact instruction card, much stronger seed→ring path, player-triggered worker lever; legacy multi-line formal-chart tutorial text removed.
- Desktop real-browser smoke: intentional no-input MISS repeated the same tutorial step with counts reset; correctly timed Bubble mouse click recorded GREAT; correctly directed Cloud mouse drag recorded OK; Firefly first cue is readable without README.
- Android tablet smoke: device `bbda35e` / Xiaomi `24091RPADC`; real touch unlock plus an ADB touch hold of 1300 ms aligned to authoritative beat advanced Greenhouse tutorial `step 1/4 → step 2/4`, with `pointerType: touch` and counts reset afterward.
- Android media remained `STREAM_MUSIC Muted: true`, `streamVolume: 0` before and after. No audible sound occurred. `auditory calibration validity NOT ASSESSED because media volume was intentionally muted`.
- R1 focused tests: 4 files / 22 tests PASS; TypeScript lint PASS.
- Full regression: 43 files / 280 tests PASS. `VITE_BASE=/BeatGarden/ npm run build` PASS; Rhythm main 228.96 kB / gzip 62.42 kB, AutoChart worker 4.61 kB. The pre-existing out-of-scope Running JourneyResult warning remains 1.216 MB / gzip 324.98 kB.
- Legacy `firefly`, `bubble`, `cloud`, `greenhouse`, `autochart` links boot without errors. Running launch still exposes the existing unfinished journey (`博士花园 · 花园 · 12s`); no Running action, storage clear, or source edit occurred. Browser warning/error log is empty.

## PLAN

Next highest-value Rhythm slice:

1. Submit the stored desktop/Android R1 evidence to the R1 Control Gate.
2. Verify every submitted attachment card in the real Chrome user bubble; Bridge ledger state alone is insufficient.
3. On PASS, proceed automatically to R2 Shared Game Feel. On PARTIAL/FAIL, repair the bounded R1 blocker and resubmit.

Timing invariant for all future slices:

```text
AudioContext.currentTime → Transport → Scheduler → Judge → StageRunner
```

No display or animation feature may become an alternative judgement clock.
