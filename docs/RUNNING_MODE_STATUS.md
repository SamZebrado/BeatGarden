# BeatGarden Running Mode — STATUS / LOG / PLAN

Authority: current repository behavior is authoritative for implementation. Product
scope is frozen by the takeover prompt, archived Deep Research, and the designated
ChatGPT review conversation.

## STATUS

### Current product state

- Gates A, B, C, D and E: `PASS`.
- Gate F: `PARTIAL`; only remote-main publication/CI and a three-world difficulty
  runtime-wiring canary remain before re-review.
- The product has one responsive top-level Mode Select. Legacy `?screen=...` links
  remain Rhythm-owned; `?mode=rhythm` and `?mode=running` are explicit routes.
- Running ships three playable deterministic worlds: PhD, Master and Work.
  Cultivation remains visible and locked under the Gate E scope contract.
- Sprout, Garden and Storm difficulty profiles change enemy speed, damage, spawn
  interval and telegraph duration. Garden is the defensive default.
- Running storage is additive at `beatgarden.running.v1`; Rhythm settings and best
  score keys are neither renamed nor migrated. Cross-world storage is deferred.

### Playable scope

- PhD: movement, automatic offense, pickups/upgrades, heterogeneous Portfolio Orbit,
  meetings, phone interruptions, projects, Signal/Noise, mentor vectors, resources,
  Calendar/pollution, annual review, Qualifying arena, four-stage Thesis growth,
  Year-five Defense Gate, Committee boss, seasonal/Years 6–9 progression, bounded
  Year-nine end and graduation terminals.
- Master: compressed coursework/deadline pressure, course and deadline hazards,
  term-rush event, four-way track trade-off, Exam climax and completion.
- Work: interruption/priority pressure, request and notification hazards, daily and
  weekly events, two-way priority trade-off, Delivery climax and completion.
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

## PLAN

### Blocker

1. Push the implementation, license and canary commits to GitHub `main`; verify
   remote SHA/license/CI.
2. Return the three-world canary evidence and boot wiring to the designated ChatGPT
   conversation and obtain `BEATGARDEN_RUNNING_FINAL_ACCEPTANCE: PASS`.

### Immediate closeout

1. Record final full lint/test/build/audit counts after the difficulty addition.
2. Commit the implementation/evidence, then perform the requested Apache-2.0
   relicensing as a separate commit.
3. Send the Gate F evidence packet and authorized concrete code; wait for the required
   standalone completion marker, with an extra five-minute wait only if it is absent.
4. Stop local test servers, remove the exact temporary Android screenshots/reverse
   mapping, close the in-app browser, and verify no Playwright process remains.

### Deferred by approved scope

- Cultivation gameplay; cross-world profile/Calendar/economy; capped shared gains;
  custom per-axis assist sliders; additional Master/Work content; commercial name
  clearance; long-duration Android thermal/battery profiling.
