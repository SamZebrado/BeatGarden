# Slowly Island B0 Product, State, and Persistence Contract

Status: **B0 candidate for High review**  
Authority snapshot: current Notion overview, PLAN, and Slowly Island proposal read on
2026-09-06; repository baseline `85fcc8a5ef5e1813db83491b928b439e6a52d212`.

This document freezes a contract only. It does not authorize the B1 implementation.

## Product contract

- Slowly Island is a fourth peer world inside BeatGarden Running Mode. It is not a
  Rest Corner activity and does not modify the separate IslandSlonelyFall site.
- The first slice is one no-failure journey:
  `Situation -> Feelings -> Needs -> Distill -> Mirror/Bridge -> Action/Rest -> Record`.
  Every step offers Back, Skip where meaningful, and **Today is enough**. There is no
  enemy, automatic attack, HP, XP, boss, academic/career clock, difficulty multiplier,
  streak, score, diagnosis, or required calm/happiness outcome.
- The product may suggest candidates, never infer a feeling, need, diagnosis, truth
  about another person, or whether the player has improved. Visual settling is a game
  metaphor for attention becoming organized, not a treatment or outcome claim.
- Mirror and Bridge are editable drafts. BeatGarden never sends them. The player is
  the final author, and Situation text is never expanded or evaluated by an AI.
- A journey may end with no Companion. Rest, support, clarity, and boundary choices
  remain available without earning or equipping anything.

## Candidate-field and autonomy contract

- The source vocabulary may contain at most 96 feelings and 48 needs in B1. The
  initial readable field exposes at most 36 feelings on desktop/tablet and 18 on a
  phone; a labelled **More candidates** control provides the rest in stable pages.
  No candidate is accessible only through animation, proximity, colour, or sound.
- Feelings and Needs each allow zero to three selections. Zero is a valid Skip; one
  selection is sufficient to continue. A persistent selection tray exposes Remove,
  Undo, and **Show all** until the player explicitly continues.
- Fading begins only after the first explicit selection. It is a reversible 900 ms
  presentation transition: selected items stay fully readable, related suggestions
  remain readable, and other visible candidates become quieter but never disappear
  from the accessibility tree or stored state. Pausing or reading slowly never
  advances the journey.
- With reduced motion, position, drift, shaking, scale, and timed fading are removed.
  The same hierarchy is conveyed by static outline, grouping, text, and an explicit
  selected state. Colour is never the only distinction.
- B1 minimum targets are 44 CSS px, complete keyboard traversal, visible focus,
  logical focus restoration after Undo/Back, screen-reader names/states, touch and
  pointer parity, and no horizontal page overflow at 390x844 or 844x390.

## Companion contract

- `Need`, `Strategy`, and `Insight` are distinct user-confirmed concepts:
  - Need: what matters or may be needed now.
  - Strategy: one optional action, request, rest, or pause the player chooses.
  - Insight: an optional player-authored or player-selected observation.
- Distill may create at most one Companion for the B1 journey. Its data is a stable
  local ID, kind (`need | strategy | insight`), source selection IDs, user-visible
  label, optional user-edited prompt, and geometric presentation ID.
- A Companion is descriptive and Slowly-Island-local. It grants no combat/stat buff,
  does not unlock basic care/support options, does not enter a Boss, and does not
  affect PhD, Master, Work, Rhythm, Rest Corner, achievements, or completion rules.
  Cross-world effects require a future separately reviewed contract.

## State and routing contract

- B1 must split the domain types before widening any world union:
  `CareerWorld = 'phd' | 'master' | 'work'` and
  `RunningWorld = CareerWorld | 'slowly'`. `CareerWorld` remains the exclusive
  authority for `JourneyRecordV1`, journey completion and failed-run statistics,
  `worldCompletions`, `difficultyRecords`, `three-gardens` / `ALL_WORLDS`, Boss
  worlds, promoted-player Boss conversion, and all existing career achievements.
  The wider type is used only by routing, world selection, and current-run surfaces
  that explicitly support Slowly Island. `ReflectionRecordV1` remains separate.
- The future route is `?mode=running&world=slowly`; the world appears beside PhD,
  Master, and Work. Difficulty controls are hidden or explicitly inapplicable for
  Slowly Island, never silently interpreted as emotional difficulty. A Slowly route
  is canonicalized without a `difficulty` query parameter; a stray parameter is
  ignored and removed on the next canonical navigation.
- The deterministic phase union is:
  `situation | feelings | needs | distill | expression | action | optionalRest |
  record | ended`. State changes occur only on explicit player actions; animation and
  audio clocks cannot advance semantic state.
- Back restores the previous committed phase draft. **Today is enough** can terminate
  from every phase and asks whether to keep a compact record. Ordinary world-select
  navigation prompts Save draft / Discard draft / Stay when unsaved private text or
  selections exist.
- BeatGarden retains one authoritative current journey. Starting any world while a
  resumable journey exists uses the existing Continue / Start New flow; it never
  merges or silently overwrites two worlds.
- B1 introduces a version-2 current-run envelope under the existing
  `beatgarden.running.current.v1` key. Its union is explicit: career members retain
  the required `difficulty: RunningDifficulty`; the Slowly member is
  `world: 'slowly', difficulty: null` and never stores Garden or another career
  difficulty as meaningful state. It accepts and migrates current version-1
  PhD/Master/Work snapshots without semantic changes and adds a strict `slowly`
  discriminator with a separately validated `SlowlyJourneyStateV1`. Unknown fields,
  impossible phases, oversized text, invalid IDs, and unsafe object depth fail closed.
- The ordinary export stays `beatgarden-save-bundle.v1` and widens only its
  `currentRun` member to accept legacy `CurrentRunV1` or the new `CurrentRunV2`; old
  bundles remain accepted. Export writes the normalized V2 envelope. Import validates
  and migrates the contained run before either Running key is written, keeps the
  existing two-key rollback/readback transaction, and displays Slowly difficulty as
  `N/A`. `normalizeCurrentRun` dispatches by the explicit discriminator and never
  instantiates a career simulation for Slowly.
- Visibility/pagehide saves semantic state before teardown. Manual pause remains
  manual after visibility changes. Destroy removes timers, listeners, audio nodes, and
  pending animation work. Slowly Island is lazy-loaded and must not enter Rhythm's
  initial dependency graph.

## Persistence and privacy contract

- Structured progress and compact reflection records migrate the existing meta value
  to `RunningSaveV3` under `beatgarden.running.v2`; version 2 remains readable and is
  migrated additively. Existing Journey records remain exactly PhD/Master/Work.
  `three-gardens`, `ALL_WORLDS`, medals, failures, difficulty records, and completion
  counts continue to mean those three worlds only.
- Slowly Island uses `ReflectionRecordV1`, not `JourneyRecordV1`. It records outcome
  (`completed | ended-early`), phase reached, chosen vocabulary IDs, optional compact
  user-approved summary, optional Companion summary, timestamps, and version. It has
  no `completed` gameplay outcome and cannot be promoted to Boss. History is capped at
  200 and deduplicated by stable source-run ID.
- Private Situation text, editable Mirror/Bridge drafts, and free-text Companion
  prompts live in a separate local-only record keyed by opaque reflection ID:
  `beatgarden.running.slowly.private.v1`. They are **not saved by default**. The save
  screen offers an explicit, unchecked **Keep my private text on this device** choice.
  Without it, resumable state keeps only structured IDs and the UI clearly says that
  unsaved text will not return after reload.
- Every persisted in-progress private draft is linked to exactly one opaque run and
  reflection ID. Discard draft, Start New, explicit current-run deletion, and
  reflection deletion remove the linked private record. A completed or early-ended
  reflection retains private text only while the player's explicit per-record opt-in
  remains true; disabling it deletes the private body without deleting the compact
  reflection record.
- `beatgarden.running.slowly.private.v1` has its own strict exact-key validator:
  Situation, Mirror, Bridge, and Companion free-text fields are each at most 4,000
  Unicode code points; there are at most 50 private records and 256 KiB total
  serialized data. Unknown fields, invalid IDs, control characters, unsafe depth, and
  oversized input are rejected before write. Writes use verify-or-rollback behavior;
  orphan cleanup may delete only records whose linked run/reflection no longer exists.
- Garden Journal shows only the compact summary fields the player explicitly approves.
  It never reveals private bodies by default. Opening a private body requires a local
  reveal action; deleting a reflection deletes its linked private record.
- The ordinary BeatGarden save bundle excludes the private-text key. Its preview says
  that private text is excluded. A separate explicit private export, if implemented,
  requires a second confirmation, names the included sensitive fields, and uses the
  same strict parse/preview/confirm/write-readback/rollback boundary. Import never
  logs or renders free text through `innerHTML`.
- All user-authored reflection text, including approved compact summaries and private
  reveal views, is assigned through `textContent` or equivalent explicit escaping and
  is never interpolated raw into `innerHTML`, whether locally created or imported.
- No private or free text enters analytics, console logs, test fixtures, screenshots,
  Bridge/reviewer packets, Boss/custom-content exports, clipboard, network requests,
  or service-worker URLs. This applies even when project source attachments are
  otherwise authorized for review.

## Source and content boundary

- Existing geometric presentation, root routing, locale utilities, lifecycle patterns,
  and portability transaction helpers may be adapted. Combat simulations, career
  calendars, Recovery rewards, Boss promotion, and the Rest Corner record path are not
  reused as Slowly Island semantics.
- Vocabulary may be adapted from IslandSlonelyFall only after the current source and
  licence are recorded. BeatGarden copies an attributable static vocabulary artifact;
  it does not import that site's runtime, localStorage, user data, or deployment.
- Research documentation must distinguish sourced evidence from BeatGarden design
  extrapolation and explicitly preserve the no-diagnosis/no-treatment boundary.

## Expected B1 module boundary (not implementation authorization)

- New: `src/running/slowly/SlowlyIslandHost.ts`, `core/slowlyState.ts`,
  `core/slowlyPersistence.ts`, `core/slowlyVocabulary.ts`, and localized presentation
  components below `src/running/slowly/`.
- Narrow shared edits: `core/types.ts`, `core/currentRun.ts`, `core/save.ts`,
  `core/portability.ts`, `RunningModeHost.ts`, `GardenJournal.ts`, i18n strings, PWA
  warming through `RunningModeHost::warmAllRunningWorldsForOfflineUse()` and
  `src/pwa/warmRunningCache.ts`, and their focused tests/docs. Slowly stays outside
  Rhythm's cold initial graph and joins the established offline-warm path only after
  the player enters Running.
- Forbidden in B1: Rhythm timing/gameplay changes, PhD/Master/Work balance changes,
  Boss schema changes, shared online accounts/sync, AI inference, new currencies,
  five-door/prioritization island, habit workshop, observatory, or cross-world buffs.

## B0 acceptance matrix

The contract passes B0 only when a High review confirms all of the following against
this exact file:

1. Product semantics preserve agency, no-failure play, Today-is-enough exits, and the
   no-diagnosis/no-treatment/no-emotion-as-enemy boundaries.
2. Candidate density, fade, Show all, Undo, Skip, selection limits, reduced motion,
   keyboard/touch/screen-reader behavior, and both required viewports are testable.
3. Need/Strategy/Insight and Companion scope are unambiguous and grant no hidden or
   compulsory optimization benefit.
4. Versioned current-run/meta migration, strict validation, exactly-one current run,
   partial endings, deduplication, and the unchanged three-world achievement semantics
   are explicit.
5. Private text is opt-in local persistence, separated from compact Journal data,
   excluded from ordinary export/review/logging, and governed by explicit reveal,
   delete, and sensitive-export behavior.
6. Route, lazy loading, lifecycle cleanup, offline warm-cache impact, HTML safety,
   size budget, and regression surfaces are named.
7. The independent IslandSlonelyFall runtime/data remain untouched and any vocabulary
   reuse is licence/source checked.

Only after this exact contract passes B0 may a separate B1 implementation checkpoint
begin.
