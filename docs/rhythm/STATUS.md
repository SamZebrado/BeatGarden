# BeatGarden Rhythm Mode V2 Status

## STATUS

Current verified Rhythm state: **R0 Design Gate PASS. R1 Control Gate PARTIAL; the second bounded target-selection/window delta is implemented and awaiting exact-commit review.**

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

### R1 Control Gate PARTIAL and bounded delta

- Real Chrome verified all eight submitted R1 attachment cards and ChatGPT returned `RHYTHM V2 CONTROL GATE: PARTIAL` with two feedback-causality blockers only.
- Cloud pointer preview now clears on `pointerup` / `pointercancel`; completed or rejected swipes can no longer leave the contradictory “距离足够 · 松开” instruction on screen.
- Unmatched input now compares the authored nearest target, authoritative target audio time, lane/direction and hold release role. Correct lane/direction at the wrong time reports too early/too late; wrong lane/direction is reported only inside the target timing window; Greenhouse release distinguishes early and late.
- Deterministic coverage includes correct lane early/late, wrong lane, correct direction early/late, wrong direction, early release, late release, pointer-up clear and pointer-cancel clear.
- Delta browser smoke captured a correctly directed early Cloud swipe showing only `时机太早 · 等目标进入判定区`, and an in-window opposite swipe showing only `方向不对 · 跟随箭头`; neither screen retains release guidance.
- Isolated R1 delta regression: 43 files / 283 tests PASS; TypeScript lint PASS; production build PASS. Rhythm main 230.20 kB / gzip 62.79 kB; AutoChart worker 4.61 kB. Existing out-of-scope Running `JourneyResult` warning remains 1.216 MB / gzip 324.98 kB.
- R2 Game Feel work is locally prepared but is not claimed or submitted while R1 remains PARTIAL.

### R1 Delta review PARTIAL and second bounded delta

- ChatGPT's first delta review remained `RHYTHM V2 CONTROL GATE: PARTIAL` with two source-level blockers: unmatched feedback could still select an already-consumed nearest target, and StageRunner candidate retrieval used the generic ±130 ms tap window before the central Judge could apply the Greenhouse release ±160 ms window.
- Unmatched feedback now excludes every target already consumed by success or automatic MISS before nearest-target selection. Sequence regressions make a consumed first Cloud/Bubble target closer than the next target and prove the early action is nevertheless classified against the next target.
- Candidate retrieval now uses the maximum configured target window plus a 2 ms retrieval epsilon. The selected target's exact authoritative window remains type-specific: ±130 ms for taps/swipes/hold start and ±160 ms for hold release. The central Judge remains the sole judgement authority.
- Release boundary integration coverage proves +130 ms and +160 ms enter the candidate range and return `OK`, while +161 ms still enters retrieval but returns `MISS` from the central Judge.
- The earlier delta submission accidentally attached a current working-tree `StageRunner.ts` containing uncommitted R2 display-only HUD work. This second submission must use files only from the isolated R1 commit worktree; no R2 code or claim is part of the R1 Gate packet.

## PLAN

Next highest-value Rhythm slice:

1. Submit the second bounded R1 target-selection/window delta from an isolated commit worktree and verify its real Chrome attachment cards.
2. Obtain `RHYTHM V2 CONTROL GATE: PASS` before committing/submitting R2.
3. Continue automatically through R2 Shared Game Feel after R1 PASS.

Timing invariant for all future slices:

```text
AudioContext.currentTime → Transport → Scheduler → Judge → StageRunner
```

No display or animation feature may become an alternative judgement clock.
