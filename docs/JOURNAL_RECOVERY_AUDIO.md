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

## Cast and fictional context

The built-in academic pool contains eight anonymous Person cores. PhD and Master each
show exactly three unique candidates selected deterministically from the run seed.
Cards expose only a short trait-derived code, two or three visible role qualities, a
one-to-two-line seeded fictional background and uncertainty. Big Five,
non-exploitation facets and future behavior probabilities remain hidden.

Work keeps exactly three anonymous manager offers and the established
offers → trial → conversion → employed → promotion path. Academic and manager
backgrounds contain no real name, institution or lab and do not mutate Person Core.

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
