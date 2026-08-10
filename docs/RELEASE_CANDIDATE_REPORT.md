# BeatGarden Release Candidate Report

## OVERALL

**RELEASE CANDIDATE — GATE 0–4 PASS.** Public GitHub Pages and the real Android
production matrix are evidenced. Chrome recognized the app and
accepted the formal install confirmation, but its external WebAPK delivery returned
response code `-1`; no standalone package appeared, so standalone launch remains
`UNVERIFIED` as an accepted external, non-app-owned residual.

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

**PASS (desktop Chrome fixture).** `songTimeSec` is authoritative. Tap judgement,
pause/resume, restart, full result/source stop, and regenerate/change-song are verified.

## AutoChart deterministic tests

**PASS.** Silence, 120 BPM tolerance, band separation, loudness robustness,
deterministic seed, difficulty density, one-minute bounded storage, imported timeline,
source lifecycle, and hold expiry coverage.

## Imported music privacy

**PASS by architecture/source audit.** File data is decoded and analyzed locally,
transferred only to a local Worker, never uploaded, never placed in the repository, and
never labelled stream safe.

## Android

**PASS for production boot, touch gameplay, calibration software flow, orientation,
lifecycle, and cold offline relaunch** on Xiaomi 24091RPADC / Android 16 / Chrome
145.0.7632.159. The standalone-installed-WebAPK sub-item remains `UNVERIFIED` because
the external Chrome WebAPK service returned response code `-1` after the formal install
confirmation; no package was observed.

## PWA

**PASS for installability UI, manifest/SW/offline behavior; standalone package
UNVERIFIED.** Public desktop and Android origins are controlled at `/BeatGarden/` by
`beatgarden-shell-v3`; Android cold Chrome restart with all networks disabled booted a
never-used query URL and navigated to Firefly by physical touch.

## GitHub Pages

**PASS.** GitHub Pages workflow run `31355206962` built and deployed successfully.
`https://samzebrado.github.io/BeatGarden/` returned HTTPS 200, all production subpath
assets returned 200 with correct types, and connected Chrome verified rendering,
i18n replacement, Firefly entry, SW scope/controller/cache, and zero runtime errors.

## Stream-safe built-in content

**PASS (provenance statement, not legal guarantee).** Built-in music/SFX/art/animation
are code-generated and recorded separately from user-imported rights-unverified audio.

## Third-party provenance

**PASS.** Zero runtime dependencies/CDNs. Exact direct development versions/licenses
are recorded; `npm audit` reports zero vulnerabilities.

## Tests

**PASS at runtime/test SHA `cec5d2f529a55720cd58943f10c0e1810d95c118`.** `npm ci` succeeded; TypeScript emitted zero
errors; Vitest passed 121/121 tests in 18 files. Coverage includes a deterministic
ten-minute mixed-frame simulation locked to the AudioContext clock with zero phase
drift, plus pause/resume, scheduler jitter, inputs, stages, AutoChart, PWA lifecycle,
layout, settings, calibration, and teardown contracts.

## Build

**PASS at `cec5d2f529a55720cd58943f10c0e1810d95c118`.** `VITE_BASE=/BeatGarden/ npm run build` produced `dist/index.html`
(1.58 kB, gzip 0.70 kB), Worker `analysis.worker-DvmQPAok.js` (4.61 kB), and main
`index-BFOtP3PE.js` (121.93 kB, gzip 35.88 kB). Online `npm audit` reports zero
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

Runtime/test candidate: `cec5d2f529a55720cd58943f10c0e1810d95c118`.
All later release-record commits modify only `docs/` evidence, reviews, reports, and
screenshots; they do not modify runtime, tests, dependencies, workflow/build inputs, or
application assets. The canonical final documentation SHA and successful Pages run are
recorded in the final independent submission because a commit cannot contain its own SHA.
