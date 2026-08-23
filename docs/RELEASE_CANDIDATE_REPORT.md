# BeatGarden Release Candidate Report

## OVERALL

**REFRESHED RELEASE CANDIDATE `60a115f` — Rhythm V2 R0–R5 PASS; refreshed external
GATE 2/GATE 4 re-verdicts pending.** Public GitHub Pages and the real Android production
matrix are evidenced at the refreshed V2 RC. Chrome recognizes the manifest and the
user accepted the formal install confirmation, but no standalone package/launcher
entry is observable, so standalone launch remains `UNVERIFIED` as an external,
non-app-owned residual.

## GATE 0 Timing

**PASS.** Independent ChatGPT verdict; AudioContext-authoritative anchors, scheduler,
Judge, calibration sign, suspend/resume, failure recovery, and drift tests accepted.

## Audio lifecycle

**PASS (desktop Chrome).** Initial gesture unlock, bounded rejected/pending resume,
manual pause freeze, visibility failure/recovery, restart, and teardown verified.

## Calibration

**PASS for software flow on desktop and Android.** Android received 16 physical muted
inputs, saved -50.0 ms, persisted across refresh and Chrome restart, and the Judge read
the value. **auditory calibration validity NOT ASSESSED because media volume was intentionally muted**;
the muted value is not claimed as an auditory latency measurement.

## Firefly Dock

**PASS.** GATE 1 independent verdict. First-player mouse/touch comprehension is YES;
two complete runs and exit cleanup had `droppedLate=0`.

## Other stages

**PASS (desktop Chrome).** Bubble Kitchen, Cloud Post, and Sleepy Greenhouse have
distinct tap/swipe/hold mechanics, complete procedural scores/scenes/results, first-
target PERFECT touch smokes, full runs with `droppedLate=0`, and teardown evidence.

## AutoChart analysis

**PASS for synthetic/local File path.** Deterministic DSP Worker, progress, fallback,
resource bounds, cancellation, difficulty, seed, waveform/markers, and explicit errors.
Native OS picker automation is NOT RUN; the same `analyzeFile(File)` path is exercised
with an original in-memory WAV.

## AutoChart playback

**PASS (desktop and Android).** `songTimeSec` is authoritative. Tap judgement,
pause/resume, restart, full result/source stop, and regenerate/change-song are verified.
The R5 Hard/seed-1 product flow recorded a `PERFECT` generated Swipe plus `PERFECT`
Hold start/release through real Android touch.

## AutoChart deterministic tests

**PASS.** Silence, 120 BPM tolerance, band separation, loudness robustness,
deterministic seed, difficulty density, one-minute bounded storage, imported timeline,
source lifecycle, and hold expiry coverage.

## Imported music privacy

**PASS by architecture/source audit.** File data is decoded and analyzed locally,
transferred only to a local Worker, never uploaded, never placed in the repository, and
never labelled stream safe.

## Android

**PASS for production boot, Firefly tap, Cloud swipe, calibration software flow,
orientation, lifecycle/manual-pause intent, and cold offline relaunch** on Xiaomi
24091RPADC / Android 16 / Chrome 145.0.7632.159. The standalone-installed-WebAPK
sub-item remains `UNVERIFIED`: formal installation was accepted, but no package,
launcher entry or Chrome shortcut is observable.

## PWA

**PASS for installability UI, manifest/SW/offline behavior; standalone package
UNVERIFIED.** Public desktop and Android origins are controlled at `/BeatGarden/` by
`beatgarden-shell-v3`; Android cold Chrome restart with all networks disabled booted a
never-used query URL and navigated to Firefly by physical touch.

## GitHub Pages

**PASS.** GitHub Pages workflow run `32666334718` built and deployed refreshed SHA
`60a115f` successfully.
`https://samzebrado.github.io/BeatGarden/` returned HTTPS 200, all production subpath
assets returned 200 with correct types, and connected Chrome verified rendering,
i18n replacement, Firefly entry, SW scope/controller/cache, and zero runtime errors.

## Stream-safe built-in content

**PASS (provenance statement, not legal guarantee).** Built-in music/SFX/art/animation
are code-generated and recorded separately from user-imported rights-unverified audio.

## Third-party provenance

**PASS.** No runtime CDN is used. Phaser `3.90.0` is the single pinned direct runtime
dependency for the separately owned Running Mode; exact direct development versions and
licenses are recorded. `npm audit` reports zero vulnerabilities.

## Tests

**PASS at runtime/test SHA `60a115fafea5d7bd972eba44ea6054f3b364bb68`.** `npm ci` succeeded; TypeScript emitted zero
errors; Vitest passed 307/307 tests in 47 files. Coverage includes a deterministic
ten-minute mixed-frame simulation locked to the AudioContext clock with zero phase
drift, plus pause/resume, scheduler jitter, inputs, stages, AutoChart, PWA lifecycle,
layout, settings, calibration, and teardown contracts.

## Build

**PASS at `60a115fafea5d7bd972eba44ea6054f3b364bb68`.** `VITE_BASE=/BeatGarden/ npm run build` produced `dist/index.html`
(1.67 kB, gzip 0.73 kB), Worker `analysis.worker-DvmQPAok.js` (4.61 kB), and Rhythm/main
`index-CsZwzdHX.js` (253.05 kB, gzip 69.60 kB). The unchanged separately owned Running
chunk is 1,216.79 kB / gzip 324.98 kB with the existing size warning. Online `npm audit` reports zero
vulnerabilities.

## Browser smoke

Desktop Chrome: menu/i18n, audio test, provenance, calibration/settings, all built-in
stages, AutoChart Worker/play/result, lifecycle A–D, corrected DPR layout, controlled
PWA, and server-off offline boot. Android: public production boot, real touch gameplay,
muted calibration flow, orientation, lifecycle, and cold offline relaunch PASS.

## Known issues

1. Android Chrome's external WebAPK delivery returned response code `-1`; the formal
   install dialog was accepted, but no installed package/standalone launch was observed.
2. Native OS file-picker automation is unavailable in the
   connected browser surface; corresponding code paths have synthetic/pure-math evidence.

## HEAD

Runtime/test candidate and currently deployed GitHub main: `60a115fafea5d7bd972eba44ea6054f3b364bb68`.
The next release-record commit modifies only `docs/` evidence, reviews, reports and
screenshots; it does not modify runtime, tests, dependencies, workflow/build inputs or
application assets. Its exact documentation SHA and resulting Pages run are recorded in
the Gate submission because a commit cannot contain its own SHA.
