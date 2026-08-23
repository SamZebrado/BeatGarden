# BeatGarden Rhythm Mode V2 Status

## STATUS

Current verified Rhythm state: **R0 Design Gate PASS. R1 Control Gate PASS. R2 Shared Game Feel Gate PASS. R3 Stage Differentiation implementation and exact evidence closure are in progress.**

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

1. R3: the four authored stages need their exact candidate verification and independent bounded Gate review.
2. R4: Result pages still prioritize timing diagnostics over player reward.
3. R5: AutoChart Normal and Hard fixtures both produced all-tap charts; phrase and mixed-gesture playability are not demonstrated.

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
- Exact detached-worktree verification at `549cd28` (runtime source `606d522`): TypeScript lint PASS; 44 files / 288 tests PASS; `VITE_BASE=/BeatGarden/ npm run build` PASS. Rhythm main 230.48 kB / gzip 62.91 kB; AutoChart worker 4.61 kB. The unchanged out-of-scope Running `JourneyResult` warning remains 1.216 MB / gzip 324.98 kB. An earlier 45/292 claim was withdrawn because that command chain accidentally retained the main-worktree cwd and included uncommitted R2 files; ChatGPT received this correction before the bounded verdict was accepted as evidence.
- The earlier delta submission accidentally attached a current working-tree `StageRunner.ts` containing uncommitted R2 display-only HUD work. This second submission must use files only from the isolated R1 commit worktree; no R2 code or claim is part of the R1 Gate packet.

### R1 Second Delta review PARTIAL and expiry closure

- ChatGPT verified all seven exact-worktree attachment cards, accepted consumed-target filtering plus candidate/Judge boundary behavior, and returned one remaining R1 blocker: runtime auto-MISS still used the ordinary input window for every target.
- StageRunner now computes its broad expiry scan with the maximum configured target window and delegates the per-target decision to `hasTargetExpiredForAutoMiss()`. That exact policy uses `targetJudgeWindowSeconds(config, target)` plus the explicit 10 ms expiry grace before `Judge.autoMiss()`.
- One expiry-policy regression now exercises the same function StageRunner calls and proves: hold release at +160 ms is not expired and central Judge returns `OK`; +161 ms is not prematurely auto-consumed and central Judge returns `MISS`; no-input release becomes eligible for auto-MISS only at +170 ms; ordinary tap remains eligible at +140 ms and is not broadened.
- Exact detached-worktree verification at `14abebe`: TypeScript lint PASS; 44 files / 289 tests PASS; Pages-base production build PASS. Rhythm main 230.52 kB / gzip 62.92 kB; AutoChart worker 4.61 kB; unchanged out-of-scope Running warning 1.216 MB / gzip 324.98 kB.

### R1 Control Gate PASS

- ChatGPT returned `RHYTHM V2 CONTROL GATE: PASS` and confirmed the final per-target auto-expiry policy closes the sole remaining R1 blocker without changing timing authority or broadening ordinary tap expiry.
- Attachment transport incident: Bridge request `mt657noy-tlnkinh0` claimed all five attachments confirmed, while real Chrome inspection of the latest `[data-message-author-role="user"]` node found zero attachment cards. ChatGPT explicitly reviewed the pushed repository sources despite the missing attachment and issued the bounded verdict. The false-positive therefore remains a Bridge delivery-status defect, not evidence that the cards existed.
- Per the approved R1→R5 order, work proceeds immediately to R2 Shared Game Feel. R2 was prepared locally during Gate waits but was neither attached nor claimed as part of R1.

### R2 — Shared Game Feel implementation and smoke

- `GameFeel` derives Combo, best Combo, Groove, peak Groove, judgement, signed FAST/SLOW and feedback age only from authoritative `JudgeResult` events. MISS resets Combo and lowers Groove; automatic MISS never fabricates a timing delta or tendency.
- Shared formal-play HUD adds stage/section identity, progress, Combo (only from 2+), Groove meter and display-only atmosphere. Transport progress maps to Intro, Main A, Variation B, Climax and Outro presentation without changing targets, score or Judge windows.
- Shared judgement cards use distinct silhouettes: six-petal PERFECT, four-ray GREAT, open-arc OK and broken-ring MISS. Feedback is capped at 520 ms; reduced motion fixes scale at 1 and removes ambient drift while retaining text, outline and static Groove state.
- A localized 52×52 CSS px pause control is available in formal play. Real desktop and Android touch smoke both proved explicit `playing/running/Transport true → paused/suspended/false → playing/running/true` lifecycle; aria text changed `暂停 → 继续` in Chinese.
- Firefly's duplicate stage-local judgement label was removed, while its player-triggered worker/seed payoff remains. Original-stage unmatched-cause guidance remains separate from the shared Judge card.
- Exact detached-worktree verification at `b23b79e`: TypeScript lint PASS; 45 files / 293 tests PASS; Pages-base production build PASS. Rhythm main 236.08 kB / gzip 64.59 kB; AutoChart worker 4.61 kB; unchanged out-of-scope Running warning 1.216 MB / gzip 324.98 kB. No file under `src/running/` changed.
- Exact Android candidate used detached runtime `a80130a` (the following `b23b79e` changes only the smoke helper and evidence text). Device `bbda35e` / Xiaomi `24091RPADC`, 1163×632 CSS px at DPR 2.75. The unlock retry contract and 52×52 touch pause/resume passed; media remained `STREAM_MUSIC Muted: true`, `streamVolume:0` before and after. No audible sound occurred. `auditory calibration validity NOT ASSESSED because media volume was intentionally muted`.

### R2 Shared Game Feel Gate PASS

- After repeated ChatGPT connection interruptions, nonce-owned recovery request `mt66ubbj-fpukzd5p` settled with `RHYTHM V2 R2 GAME FEEL GATE: PASS` and `No remaining R2 blockers.` The verdict explicitly confirms JudgeResult-only Game Feel state, display-only sections, bounded feedback, reduced motion, localized pause lifecycle and the unchanged timing-authority chain; R3–R5 were not pre-accepted.
- Attachment delivery audit found a concrete Bridge false-positive: the R2 ledger marked eight files confirmed, while the nonce-owned real Chrome bubble exposed only five rendered attachment groups. The uploader had treated the message body's requested `ATTACHMENT_ACK` filename list as rendered-card evidence. A scoped Bridge regression now excludes whole-message text from attachment matching and passes 24/24 reliability tests; the BeatGarden Gate verdict used the model's inspected source/available attachments and exact pushed commits.
- Per the approved R1→R5 sequence, work proceeds immediately to R3 Stage Differentiation.

## PLAN

Next highest-value Rhythm slice:

1. Commit the bounded R3 stage-progression candidate without any R4/R5 or Running changes.
2. Verify authored section identity, distinct target geometry/payoffs and real desktop/narrow plus muted Android touch behavior against the exact R3 candidate.
3. Submit the exact R3 candidate for bounded independent review, then enter R4 automatically on PASS.

Timing invariant for all future slices:

```text
AudioContext.currentTime → Transport → Scheduler → Judge → StageRunner
```

No display or animation feature may become an alternative judgement clock.
