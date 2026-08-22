# BeatGarden Running Mode — STATUS / LOG / PLAN

Authority: current repository behavior is authoritative for implementation. Product
scope is frozen by the takeover prompt, archived Deep Research, and the designated
ChatGPT review conversation.

## STATUS

### Current product state

- Gates A, B, C, D and E: `PASS`.
- Gate F: `PASS`. Gates A–F are closed; the current Running Mode playable-alpha
  mission is complete.
- The product has one responsive top-level Mode Select. Legacy `?screen=...` links
  remain Rhythm-owned; `?mode=rhythm` and `?mode=running` are explicit routes.
- Running ships three playable deterministic worlds: PhD, Master and Work.
  Cultivation remains visible and locked under the Gate E scope contract.
- Sprout, Garden and Storm difficulty profiles change enemy speed, damage, spawn
  interval and telegraph duration. Garden is the defensive default.
- Running storage is additively migrated from `beatgarden.running.v1` to
  `beatgarden.running.v2`; Rhythm settings and best-score keys are neither renamed nor
  migrated. V2 owns completions, milestone records, difficulty records, persistent
  semantic hints, local Boss metadata and Running mute state.

### Reality & Clarity checkpoint — 2026-08-23

- Qualifying is now one finite designated roster: Garden initializes exactly nine
  targets once, clearing/suspending ambient pressure. Defeats permanently reduce that
  same roster, academic time stays frozen, and neither waiting nor kills can replenish
  it. Defense and Master Proposal/Defense use their own bounded finite sets.
- Academic milestone arenas now run continuously through Preparation, Rehearsal and
  Presentation. Preparation consumes resources, rehearsal is a short corrective phase,
  and only Presentation is assessed; there is no active timeout or quit path.
- Person profiles are separate from gameplay roles and Boss data. PhD and Master use
  the same three academic people through distinct role adapters. PhD independently
  tracks assigned labor and thesis/research progress, with low-frequency Accept / Set
  Boundary / Decline requests and profile-dependent reactions.
- Master is a distinct three-year path: Year 1 courses plus onboarding work, Year 2
  research/project ending in Proposal, and Year 3 completion/planning ending in
  Defense. It has no Qualifying Exam. Career Plan is exactly Research/PhD, Employment
  or Undecided, with no universally best option.
- Work begins with exactly three partial-information offers and continues through trial,
  conversion, employment and promotion. Manager profile, seeded slow Job Market drift,
  Experience, explicit switching costs and Delivery contributions are deterministic;
  interruption defeats never become career achievement.
- All language controls name the target locale (`English` or `中文`) and expose the
  target action in `aria-label`/`title`. Boss Studio adds a localized compact creation
  workflow, provider-neutral complete prompt, maintained example and stable schema link.
  Only the top-level Mode Select carries the subordinate, verified public Slowly Island Pages link.

- Player-visible Running terminology is localized in English and Simplified Chinese;
  internal choice/event IDs no longer leak into cards. English recurring PhD meetings
  are consistently named **Lab Meeting**.
- A queued, persistent first-seen hint surface keeps each explanation visible for about
  four seconds. The bilingual Legend explains symbols, mechanics, progression and unmet
  graduation requirements while authoritatively pausing simulation. `textOff=1`
  creates neither hint prose nor Legend controls.
- PhD offers exactly three partially described supervisor candidates after the Year-1
  talk and renders no supervisor or supervisor feedback before selection. The visible
  path is supervisor selection, Year-2 Lab Meeting, Year-3 Proposal, Year-4 Qualifying
  Exam, annual Lab Meetings thereafter, Pre-Defense, revisions and final Defense.
- Five bounded lifestyle choices expose opposing resource/trade-off effects: rest,
  exercise, social connection, mindfulness and weekend overtime. Active Qualifying and
  Defense arenas have progress targets but no forced timeout failure.
- Work ordinary defeats do not create Delivery progress or Orbit farming. Accept Rush
  opens a 13-second continuing resource/Calendar cost window; Protect Focus opens a
  13-second recovery/progress window with an immediate Calendar opportunity cost.
- Three procedural world-specific music identities, compact event SFX, pressure
  variation and a persistent top-right mute control are wired through browser-safe
  pointer and keyboard audio unlock.
- Boss Studio provides strict data-only v1 JSON paste/file import, localized validation
  and preview, explicit confirmation, local export/delete and a self-contained AI
  conversion prompt. Persisted Boss payloads are revalidated on load.
- World completion records progress but never auto-creates a Boss. An explicit terminal
  action maps the selected final run snapshot into a bounded `promoted-player` Boss.

### Current checkpoint verification — 2026-08-23

- `npm run lint`: PASS.
- `npm test`: PASS — 199/199 tests in 30 files after the bounded external-review repair.
- `npm run build`: PASS; the known lazy Phaser chunk warning remains.
- Fresh 390×844 browser checks covered target-language labels/ARIA, the top-level-only
  Slowly Island footer, Boss example validation/confirmation, finite PhD Qualifying,
  Master Year 3, Work offers/conversion, Text Off, Rhythm menu and Firefly. No horizontal
  overflow or browser console errors were observed. Legend-open sampling froze Work
  simulation exactly; closing resumed it.
- Android canary on the connected 24091RPADC used the production `/BeatGarden/` base:
  Running world select rendered in zh-CN, a real device tap entered PhD, one canvas and
  the mobile controls appeared with zero horizontal overflow, and the v4 service worker
  reported both registration and control. The temporary ADB reverse/DevTools forwards
  and device screenshots were removed afterward.
- Rhythm Mode route/menu smoke passed after Running changes. No claim is made that this
  bounded smoke replaces the older full Rhythm release evidence below.
- Android device `bbda35e` opened live PhD Garden through `adb reverse`; the captured
  3200×2136 frame showed the live HUD, hint, controls and choice cards, and real key input
  advanced the defeated count. Temporary device files and reverse mapping were removed.
  This is a functional launch/input canary, not audible-listening, thermal or long-session
  performance evidence.
- The designated ChatGPT review returned three bounded P1 findings. Supervisor behavior
  is now gated until selection, the Legend path now matches runtime, and Accept Rush has
  continuing 13-second costs; focused regression tests raised the suite from 183 to 185.

### Playable scope

- PhD: movement, automatic offense, pickups/upgrades, heterogeneous Portfolio Orbit,
  meetings, phone interruptions, projects, Signal/Noise, mentor vectors, resources,
  Calendar/pollution, annual review, Qualifying arena, four-stage Thesis growth,
  Year-five Defense Gate, Committee boss, seasonal/Years 6–9 progression, bounded
  Year-nine end and graduation terminals.
- Master: three-year coursework/onboarding → research/project → Proposal → Career Plan
  → finish/Defense path, shared academic Person pool, term pressure, finite milestones
  and four-way local focus trade-offs.
- Work: exactly three offers, manager selection, trial, conversion/leave-search,
  employment and promotion; request/notification hazards, daily/weekly events,
  Job Market/Experience effects and delivery-backed rather than kill-backed progress.
- All three support keyboard, pointer drag/touch, portrait camera, text-off rendering,
  natural playable climax completion and restart/exit.

### Verified evidence — 2026-08-22

- `npm run lint`: PASS.
- `npm test -- --run`: PASS — 162/162 tests in 25 files after the three-world
  difficulty runtime-wiring canary.
- `npm run build`: PASS. Final pre-commit chunks: Rhythm/shared entry 139.71 kB
  (40.87 kB gzip), PhD renderer 19.55 kB (6.90 kB gzip), scenario renderer
  19.42 kB (6.78 kB gzip), Phaser/shared simulation 1,215.54 kB (324.35 kB gzip).
- `npm audit --json`: PASS — 0 known vulnerabilities from a live registry query.
- Production browser integration: Rhythm menu, Firefly deep link, AutoChart deep link,
  all three Running canvases and difficulty selection booted with no console errors.
  Rhythm-only startup fetched only the entry chunk and no Phaser/Running chunk.
- Runtime storage fixture remained byte-identical for `beatgarden.settings.v1` and
  `beatgarden.best.firefly-dock`; Running ended as version 1, lastWorld Work,
  totalRuns 3.
- Actual cold-start PWA test stopped the origin server and restarted the browser.
  Fresh offline Running showed the localized recoverable fallback. After one online
  PhD launch, PhD, Master and Work each cold-booted offline with a canvas; the v4 cache
  contained both renderer chunks, the entry and the shared simulation chunk.
- Production 15-second gameplay sampling per world had no console/page errors. Latest
  p95 frame intervals were 18.4 ms (PhD), 18.4 ms (Master), 18.5 ms (Work); bounded
  isolated long tasks were observed and are retained in final evidence.
- Physical Android tablet `24091RPADC`: Master and Work launched through Chrome over
  `adb reverse`; landscape rendering, real gameplay state changes and touch swipes
  were observed. PhD portrait/touch was covered in browser QA.
- Visual evidence includes desktop, 390x844 portrait/text-off, dense events, phone,
  Thesis stages, Defense/Committee, Year-nine/graduation terminals, Master/Work
  differentiation, climaxes, natural completions and Android hardware frames.

### Research archive

- Immutable copy:
  `docs/research/BEATGARDEN_RUNNING_MODE_DEEP_RESEARCH_2026-08-22.md`.
- Source/archive: 100,384 bytes, 1,486 lines, byte-identical.
- SHA-256: `84ba807c2ced541fdd8f71038617fec7bb7ae7d3292c5daf5a888ff7998ffd2f`.

### Honest unresolved boundary

- Vite reports the known >500 kB shared Phaser/simulation chunk warning. It remains
  lazy from Rhythm and measured gameplay p95 stayed below 19 ms on the test Mac.
- Cultivation, shared Calendar/profile, cross-world gains and `beatgarden.shared.v1`
  are deliberately deferred by Gate E, not partially implemented.
- No external creative assets were introduced. Formal BeatGarden trademark/name
  clearance remains required before a major commercial launch.
- Android hardware evidence is functional/touch evidence, not a long-duration thermal
  or battery benchmark. No regression is inferred from desktop performance alone.

## LOG

### 2026-08-23 — Running Mode Reality & Clarity MVP

- Added the finite-roster correction, shared Person/role-adapter boundary, PhD
  assigned-labor/boundary decisions, Master three-year Proposal/Defense/Career Plan,
  and Work offer/trial/conversion/manager/market/promotion lifecycle.
- Added target-language labels, Boss creation handoff/discoverability, the top-level
  Slowly Island footer, deterministic life-path probes and current architecture notes.

- Added approximately four-second first-seen hints plus a bilingual, scrollable Legend
  whose open state pauses both PhD and scenario simulation. Text Off removes both prose
  surfaces entirely.
- Added three supervisor candidates, five lifestyle trade-offs, the revised supervisor /
  Signal / Noise / pollution / milestone-target visual grammar, and the exact visible
  PhD institutional sequence with no forced active-milestone timeout failure.
- Removed Work kill-derived progress farming and made both 13-second priority choices
  mechanically persistent. Kept Rhythm and additive Running save boundaries unchanged.
- Used one bounded Terra implementation task for Legend/i18n wiring; the primary agent
  reviewed and corrected integration. Explicit Spark custom-role runtime selection was
  unavailable in the current harness, so no TOML configuration was claimed or installed.
- The designated ChatGPT review completed with its requested terminal marker. Its four
  P1 findings and one P2 finding were reproduced, repaired in one bounded pass and
  covered by final tests; no iterative reviewer/repair loop was started.

### 2026-08-22 — Running product-depth checkpoint

- Added localization, persistent semantic hints, smaller touch presentation, stable
  supervisor semantics, distinct annual/qualifying/pre-defense/revision/defense stages,
  procedural audio and persisted mute.
- Added additive Running v2 migration and strict AI-agnostic Boss Schema v1 Studio with
  example JSON, revalidation and explicit final-snapshot player promotion.
- First designated ChatGPT review returned `REVISE`; corrected the duplicate Year-3
  Qualifying semantics, real music spacing/keyboard unlock, Boss Studio localization and
  origin policy, snapshot-sensitive explicit promotion, persisted-data revalidation and
  missing resource/satellite hints. The bounded re-review found three remaining finite
  defects: project-gated Year-3 Qualifying, a delayed-unlock/destroy audio race, and
  unknown Boss-field path loss. All three were repaired with regression tests; no
  further reviewer loop was opened.

### 2026-08-22 — takeover through PhD closure

- Read the full prompt/research, archived and hashed the report, inspected the clean
  baseline, ran real baseline commands and obtained Gate A PASS after corrections.
- Added the minimal dual-mode router and lazy Phaser boundary without migrating Rhythm.
- Built and play-tested the PhD action loop; corrected boundary spawn geometry and
  portrait camera issues; Gate B passed after code and visual re-review.
- Added the PhD conceptual systems and milestone arenas; corrected resource semantics,
  pre-choice project iconography and arena playability; Gate C passed.
- Completed text-off visual QA, including stronger phone danger, four distinct Thesis
  landmarks and seasonal sweeps/markers; Gate D passed.

### 2026-08-22 — Gate E scope and final integration

- Gate E froze PhD + bounded Master + bounded Work, locked Cultivation, and deferred
  cross-world progression. Implemented the two worlds with one reusable deterministic
  scenario engine plus small world strategies rather than duplicated engines.
- Closed PhD Year-nine behavior with explicit ended/graduated terminals; removed the
  prior infinite capped Year-nine state.
- Made both new climaxes naturally winnable by stopping ambient spawning and clearing
  the arena at climax start; deterministic tests prove natural completion.
- Fixed a real production PWA blocker discovered only by stopping the server: shell v4
  now precaches its hashed entry and warms every shipped Running chunk after one
  successful online Running launch.
- Added additive run recording and verified existing Rhythm key/value preservation in
  both unit and production browser evidence.
- Added Sprout/Garden/Storm as a final Definition-of-Done correction before Gate F.
- Gate F first review was PARTIAL only for remote publication and runtime difficulty
  proof. Pushed the unsquashed chain, verified Apache-2.0 and successful Pages run
  32571070683, fixed the natural PhD telegraph wiring found by the canary, and proved
  speed/damage/spawn/telegraph differences across all three worlds. Final re-review
  returned PASS with no current-mission blocker.

## PLAN

### Blocker

- None for the accepted current mission.

### Immediate closeout

1. Preserve the accepted A–F evidence and tested-runtime SHA boundary.
2. Treat any Cultivation, cross-world or extended-content work as a new product phase.
3. Complete commercial name/trademark clearance before a major public commercial
   launch.

### Deferred by approved scope

- Cultivation gameplay; cross-world profile/Calendar/economy; capped shared gains;
  custom per-axis assist sliders; additional Master/Work content; commercial name
  clearance; long-duration Android thermal/battery profiling.
- Future directions recorded but not implemented: peers/coworkers, multiplayer or
  shared supervisor attention, dropout/change-supervisor/abandon-milestone routes,
  complex quitting, romance/family, entertainment/diet systems, Cultivation, and any
  cross-world economy/profile.
