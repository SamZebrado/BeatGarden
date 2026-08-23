# Garden Journal, Recovery and Audio Authority

Status: maintained product and persistence authority for the 2026-08-23 Running depth
release. Executable source and validators remain final authority.

## Garden Journal

The Running hub exposes two secondary destinations beneath PhD, Master and Work:
**Garden Journal / 生涯档案** and **Rest Corner / 休息角**. They are not combat-HUD
controls and do not become equal-sized life-path worlds.

`core/journal.ts` defines `beatgarden-journey.v1`. A successful run commits exactly one
compact record using a stable source-run ID. A record contains completion time, world,
difficulty, duration/final stage, public mentor/manager code, route choices, bounded
relationship/build/resource summaries, milestones, Story Marks, medals unlocked in
that run, optional promoted Boss ID, music style and game version. It never serializes
the live simulation. History is sorted deterministically and capped at the latest 200
records; failed runs are aggregate counts only.

The Journal has three areas: Run History, all 25 geometric Medals (including locked
state), and 11 independent Story Marks. Medals are idempotent and cosmetic. Story Marks
record notable outcomes without approving or condemning them. Neither system writes
combat damage, HP, RNG, currency or permanent power.

Completion order is: persistent journey transaction → Journey summary → newly unlocked
Medals → Story Marks → optional promoted-player Boss action. Boss creation patches the
same JourneyRecord with its stable Boss ID.

Journey/meta persistence is written and read back before the terminal current-run key
is removed. A storage exception is contained by the scene, leaves the recoverable
terminal checkpoint in place, and is retried idempotently from the same stable run ID.
Imported `personCode` and `finalStage` values remain plain data and are HTML-escaped at
the Journal presentation boundary.

## Cast and fictional context

The built-in academic pool contains eight anonymous Person cores. PhD and Master each
show exactly three unique candidates selected deterministically from the run seed.
Cards expose only a short trait-derived code, two or three visible role qualities, a
one-to-two-line seeded fictional background and uncertainty. Big Five,
non-exploitation facets and future behavior probabilities remain hidden.

Work keeps exactly three anonymous manager offers and the established
offers → trial → conversion → employed → promotion path. Academic and manager
backgrounds contain no real name, institution or lab and do not mutate Person Core.
Legacy checkpoints retain their `mei`, `rowan` and `lin` internal IDs for behavioral
compatibility, but public presentation maps them to anonymous `CL-AS`, `RS-DM` and
`AU-LC` aliases.

## Music

All players can immediately select Garden Classic, Famicom / Chiptune or Quiet
Organic. Synthesis is original and procedural: Classic uses restrained pads and soft
tones; Chiptune uses low-volume square/pulse character, bass and short arpeggios;
Organic uses sparse glass/bell/pluck timbres. No samples or borrowed melodies exist.

`RunningAudio` keeps one running transport and adds Base, Pressure, Milestone and
Recovery layers without restarting the score. Dynamic Intensity Full/Soft/Off scales
only adaptive layers. Mute remains authoritative. Style and presentation timers never
consume gameplay RNG. Settings persist style, Running music volume, Running SFX
volume and Dynamic Intensity in the existing Running v2 meta save.

The release-readiness long-session pass treats Chiptune as the conservative fatigue
case. Its base step now runs at 378 ms, the bright upper lead appears once per eight
steps, and its pressure click appears on alternating steps. Garden Classic and Quiet
Organic retain their slower, softer spacing. These are presentation-only density and
level limits: simulation timing, combat events, seeded RNG and save authority do not
change. A deterministic audio test locks the reduced Chiptune event density.

## Rest and in-run recovery

Rest Corner contains exactly three functional no-failure activities: a 30-second
Breathing Ring, four-point Light Placement, and a five-tone Sound Garden whose timbre
follows the selected style. Sessions produce only a bounded cosmetic Story Mark and
aggregate activity metadata; there is no score, currency, streak, daily reward or
combat buff.

PhD, Master and Work may each offer at most one Recovery Event after a meaningful low
state and outside major milestone combat. Take a Break restores a bounded amount of
Spirit/Energy while Calendar advances; Keep Pushing preserves momentum with no moral
judgment. The outcome is part of the resumable current-run snapshot, so reload cannot
offer or apply it twice.

This is game pacing, not treatment. See `RESEARCH_FOUNDATIONS.md` for the evidence and
explicit non-clinical boundary.

## Persistence and isolation

Running v2 meta additively stores Journey history, Medal IDs, Story Mark IDs, bounded
aggregate statistics, music style/volumes and Dynamic Intensity. Missing fields in old
v2 saves migrate to neutral defaults. Current-run v1 migration adds seeded candidate
and one-time recovery authority without resetting advanced RNG state.

The existing `beatgarden-save-bundle.v1` export/import includes these fields in strict
preview, confirmation, write and verification. Invalid Journal records make a strict
whole-save import fail before storage mutation. Rhythm keys are neither enumerated nor
written.
