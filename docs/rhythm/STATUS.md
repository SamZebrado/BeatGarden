# BeatGarden Rhythm Mode V2 Status

## STATUS

Current verified Rhythm state: **R0 audit complete locally; Design Gate not yet submitted/received. Runtime implementation remains intentionally unchanged.**

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

1. 390×844 Rhythm Home is vertically clipped and cannot scroll.
2. Bubble lanes are not unambiguously three operation zones.
3. Cloud has no swipe start/end/distance feedback.
4. Greenhouse has no persistent PRESS/HOLDING/RELEASE state.
5. Bubble/Cloud/Greenhouse share an overly similar ring/line template.
6. Result pages prioritize timing diagnostics over player reward.
7. AutoChart Normal and Hard fixtures both produced all-tap charts; phrase and mixed-gesture playability are not demonstrated.

## LOG

### R0 — read-only product and visual audit

- Synced `origin/main` and branched without modifying the baseline.
- Ran baseline install, lint, 276 tests, production build and legacy route checks.
- Traversed every requested Rhythm surface in a real browser and stored representative evidence under `docs/rhythm/evidence/r0/`.
- Connected Android tablet and kept the effective media stream explicitly muted throughout. No auditory calibration was performed or claimed.
- Confirmed Running launch only; preserved its existing local journey state.
- Created `PRODUCT_AUDIT.md` and `DESIGN.md`; no runtime code changed.

## PLAN

Next highest-value Rhythm slice:

1. Commit and push the R0 docs/evidence.
2. Submit exact HEAD, baseline, contact sheet, audit, design, implementation slices, shared files and Running boundary to the existing ChatGPT Bridge conversation.
3. Require first-line verdict `RHYTHM V2 DESIGN GATE: PASS / PARTIAL / FAIL`.
4. On PASS, implement R1 shell scrolling plus shared onboarding/control clarity before visual expansion.
5. On PARTIAL/FAIL, revise audit/design only, resubmit, and keep runtime rewrite paused.

Timing invariant for all future slices:

```text
AudioContext.currentTime → Transport → Scheduler → Judge → StageRunner
```

No display or animation feature may become an alternative judgement clock.
