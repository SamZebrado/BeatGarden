# BeatGarden Rhythm Mode V2 Status

## STATUS

Current verified Rhythm state: **R0 Design Gate PASS. R1 Control Gate PASS. R2 Shared Game Feel Gate PASS. R3 Stage Differentiation PASS after the bounded persistence delta at `6b778bf`. R4 Product Shell / Result Loop is PARTIAL with its sole reduced-motion/test blocker fixed and exact-verified at `e502df2`; R5 AutoChart is implemented and exact-verified locally without pre-claiming its Gate.**

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

1. R4: submit the bounded reduced-motion/test delta at `e502df2` for independent closure review.
2. R5: implementation and exact verification at `af97fae` are complete; independent bounded review must remain ordered after R4.

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

### R3 — Stage Differentiation implementation and smoke

- Firefly Dock now authors call-and-response phrases, a deliberate six-beat Variation B rest, a readable nine-target climax stream and two-star outro. Successful nonautomatic launches persist as deterministic constellation nodes and links; the player-triggered launch arc remains the immediate causal payoff.
- Bubble Kitchen now uses authored recipe/order phrases instead of a shared interval loop. Full-width lanes lead falling ingredient shapes into pot hit zones, current lanes remain explicit, accumulated successes visibly fill each pot and the climax adds kitchen-specific lighting without adding a memory-game requirement.
- Cloud Post now has separate left/right destination routes, repeated-direction and alternating phrases, authored breathing rests, section-specific wind direction/speed, envelope approach geometry and a predictable climax mail stream.
- Sleepy Greenhouse now uses hold durations `[2,3,2,4,3,2,4,1]`, paired press/release target geometry, lane-specific persistent plant growth, a duration-authoritative hold meter and sequential climax blooms.
- Deterministic regressions prove all four stages span Intro/Main A/Variation B/Climax/Outro, preserve their specific pattern/rest/duration identities, keep targets before stage end and continue to use Scheduler/Transport/Judge authority.
- Real desktop mouse evidence records a Firefly `PERFECT` with Combo 1, launch arc and the first persistent constellation node. Bubble, Cloud and Greenhouse rendered evidence shows distinct target trajectories and payoff geometry. A 390×844 narrow browser smoke kept instructions and controls reachable with no browser warnings/errors; the default viewport was restored afterward.
- Exact detached verification at `ef87dff`: TypeScript lint PASS; 45 files / 294 tests PASS; Pages-base production build PASS. Rhythm main 243.37 kB / gzip 66.25 kB; AutoChart worker 4.61 kB; unchanged out-of-scope Running warning 1.216 MB / gzip 324.98 kB. No file under `src/running/` changed.
- Exact Android runtime `ef87dff` on device `bbda35e` / Xiaomi `24091RPADC`: a real touch aligned to Bubble's authored first formal target recorded `pointerType: touch`, `GREAT`, Combo 1 and Groove 21.84 at 1163×632 CSS px / DPR 2.75. `STREAM_MUSIC` remained `Muted:true`, `streamVolume:0` before and after; no audible sound occurred. `auditory calibration validity NOT ASSESSED because media volume was intentionally muted`.

### R3 Stage Differentiation Gate PARTIAL and bounded persistence delta

- After the user refreshed the incomplete ChatGPT page, Bridge request `mt68rgss-2ljbfw9w` confirmed the nonce-owned R3 message bubble exactly once. Independent review returned `RHYTHM V2 R3 STAGE DIFFERENTIATION GATE: PARTIAL` with one blocker: Bubble pot fill and Greenhouse growth read from the 1.8-second transient FX array and therefore disappeared. The verdict explicitly kept target patterns, five-section coverage, approach geometry, Firefly, Cloud, timing authority, Android touch and Running boundary closed.
- `GardenRunProgress` now separates durable per-lane totals from transient hit FX. Bubble progresses on successful nonautomatic taps. Greenhouse progresses only on a successful authoritative `holdRelease`; hold start, manual MISS and automatic MISS cannot grow a plant. `onStart()` / restart clears both state classes.
- Deterministic regressions prove durable retention after transient expiry, accumulation across multiple successes, restart reset, automatic-MISS exclusion and no Greenhouse growth before successful release.
- Real desktop formal Bubble smoke accumulated four authoritative successes; the late-run retained-fill frame was captured more than seven seconds after the latest success. Muted real Android Greenhouse smoke completed five authored holds with 10 PERFECT start/release judgements; at Climax beat 44, retained lane growth remained more than 2.6 seconds after the prior release.
- Android reused the existing single tab and returned to `CheapLive Black Screen` afterward. `STREAM_MUSIC` remained `Muted:true`, `streamVolume:0`; no audible sound occurred. `auditory calibration validity NOT ASSESSED because media volume was intentionally muted`.
- Exact detached verification at `6b778bf`: `npm ci` PASS; TypeScript lint PASS; 46 files / 302 tests PASS; Pages-base production build PASS. Rhythm main 252.38 kB / gzip 69.40 kB; AutoChart worker 4.61 kB; unchanged out-of-scope Running warning 1.216 MB / gzip 324.98 kB. No Running source was edited.

### R3 Stage Differentiation Gate PASS

- Independent delta review returned `RHYTHM V2 R3 STAGE DIFFERENTIATION GATE: PASS` and confirmed the sole persistence blocker is closed. The verdict accepted durable/transient separation, hold-release-only Greenhouse growth, MISS exclusion, restart reset, deterministic coverage and both retained-progression frames.
- R3 is closed. The verdict preserves the approved order to R4 then R5 and reiterates the hard Running no-refactor/gameplay/persistence boundary.

### R4 — Product Shell / Result Loop implementation and smoke

- Rhythm Home keeps Original Stages and Your Music as the two primary choices; calibration, audio/streaming test, settings and provenance remain lower-priority utilities in the scrollable shell.
- Stage Select cards now expose a procedural mechanic preview, concise promise, mechanic/input badge, approximate difficulty, local best grade and local best accuracy. Cards become a reachable single column in a 390×844 viewport.
- Result presentation now prioritizes Grade, Score, Accuracy, New Best/local best, Best Combo and player-facing early/balanced/late timing tendency. P/G/O/M, mean, median and timing histogram moved into a secondary expandable detail surface.
- Retry is immediate and primary. Next Stage advances through the authored order without returning to Stage Select; Stage Select remains the tertiary exit. The final stage omits Next Stage rather than wrapping unexpectedly.
- Menu, stage-instruction and result reveals use a 220 ms non-blocking transition. The first pointer immediately finishes it, reduced-motion disables it, and no transition delays Retry.
- Result grading, timing-tendency dead zone and New Best comparison are pure deterministic helpers with boundary regression coverage. Simplified Chinese and complete English replacement UI were checked separately.
- Exact detached verification at `2459de0`: `npm ci` PASS (87 packages, 0 vulnerabilities); TypeScript lint PASS; 46 files / 297 tests PASS; Pages-base production build PASS. Rhythm main 248.36 kB / gzip 68.07 kB; AutoChart worker 4.61 kB; unchanged out-of-scope Running warning 1.216 MB / gzip 324.98 kB. No Running source was edited.
- Exact Android runtime `2459de0` on device `bbda35e` / Xiaomi `24091RPADC`: real CDP `touchStart` / `touchEnd` opened the result detail surface at 1163×632 CSS px / DPR 2.75 and exposed all secondary metrics. `STREAM_MUSIC` remained `Muted:true`, `streamVolume:0` before and after; no audible sound occurred. `auditory calibration validity NOT ASSESSED because media volume was intentionally muted`.

### R4 Product Loop Gate PARTIAL and bounded reduced-motion delta

- Independent review returned `RHYTHM V2 R4 PRODUCT LOOP GATE: PARTIAL` with one bounded source-and-coverage blocker: the shell consulted only the OS media query, not BeatGarden's persisted `settings.reducedMotion`, and the exact R4 candidate lacked deterministic transition tests. The verdict explicitly kept the menu hierarchy, stage cards, result hierarchy/details, Next Stage/final-stage behavior, locale replacement, Android touch smoke and Running boundary closed.
- `animateRhythmReveal()` is now the shared Rhythm reveal helper. Shell calls consult both persisted BeatGarden reduced-motion and the OS preference; StageRunner passes its already-combined reduced-motion decision. Normal motion remains exactly 220 ms and the first pointer finishes the animation.
- Four deterministic tests cover saved BeatGarden reduced-motion suppression, OS reduced-motion suppression, exact 220 ms duration, first-pointer completion and an immediate result Retry click while the reveal is active.
- Exact detached verification at `e502df2`: `npm ci` PASS (87 packages); TypeScript lint PASS; 47 files / 306 tests PASS; Pages-base production build PASS. Rhythm main 252.22 kB / gzip 69.34 kB; AutoChart worker 4.61 kB; unchanged out-of-scope Running warning 1.216 MB / gzip 324.98 kB. No Running source was edited.

### R5 — AutoChart phrase / playability implementation and smoke

- Generated notes now carry an envelope-derived section, four-beat phrase index, accent flag and authored swipe direction. Phrase filtering adds deliberate 0.8 s rests and bounds uninterrupted action streaks by difficulty.
- Easy remains tap-only. Normal and Hard produce section-aware high-frequency swipes and sustained, gap-safe mid-energy holds. The final ergonomic pass rejects quick reverse-swipe traps, excessive swipe streaks, impossible note proximity and active-hold overlap.
- Deterministic quality metrics expose density, longest streak, rest ratio, gesture-change rate, hold conflicts, impossible proximity and section balance. Regressions prove mixed gestures, multi-phrase/section coverage, deliberate rests and conflict-free sustained holds.
- The product-facing result prioritizes Song, Difficulty, Chart Style, Generate Chart and Enter Pulse Garden. Tempo/confidence/mode/onsets/note count/quality/seed are optional advanced details; imported filenames use `textContent`. Simplified Chinese and English remain complete replacement locales.
- Desktop mouse smoke opened the advanced disclosure on the Normal “Gesture weave” fixture with no warning/error log. Android reused the existing game tab and a real touch opened the same disclosure at 1163×632 CSS px / DPR 2.75.
- Android `STREAM_MUSIC` remained `Muted:true`, `streamVolume:0` before and after; no audible sound occurred. `auditory calibration validity NOT ASSESSED because media volume was intentionally muted`.
- Exact detached verification at `af97fae`: `npm ci` PASS; TypeScript lint PASS; 46 files / 299 tests PASS; Pages-base production build PASS. Rhythm main 251.82 kB / gzip 69.25 kB; AutoChart worker 4.61 kB; unchanged out-of-scope Running warning 1.216 MB / gzip 324.98 kB. No Running source was edited.

## PLAN

Next highest-value Rhythm slice:

1. Submit exact R4 bounded delta `e502df2` plus its evidence/status commit for independent closure review.
2. On R4 PASS, submit exact R5 candidate `af97fae` plus evidence/status HEAD `6cb960c` for bounded independent review.

Timing invariant for all future slices:

```text
AudioContext.currentTime → Transport → Scheduler → Judge → StageRunner
```

No display or animation feature may become an alternative judgement clock.
