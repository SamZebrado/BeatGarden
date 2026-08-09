# BeatGarden Release Candidate Report

## OVERALL

**PARTIAL** — the code/content/PWA candidate is complete on desktop Chrome, but two
external release proofs remain: a real Android tablet and a public GitHub Pages remote.

## GATE 0 Timing

**PASS.** Independent ChatGPT verdict; AudioContext-authoritative anchors, scheduler,
Judge, calibration sign, suspend/resume, failure recovery, and drift tests accepted.

## Audio lifecycle

**PASS (desktop Chrome).** Initial gesture unlock, bounded rejected/pending resume,
manual pause freeze, visibility failure/recovery, restart, and teardown verified.

## Calibration

**PASS (desktop Chrome); Android UNVERIFIED.** Sixteen real browser taps saved +6.3 ms;
settings persist and the shared Judge reads the offset.

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

**UNVERIFIED.** `adb devices -l` found no connected device. GATE 2 remains PARTIAL until
one real tablet covers install/open, gameplay touch, calibration, resize/orientation,
background/foreground audio, and offline relaunch.

## PWA

**PASS in production desktop Chrome.** Manifest, 192/512 maskable PNGs, SVG, offline
shell, controlled `/BeatGarden/` scope, lifecycle-bound canonical refresh, and server-
off fresh-query boot are verified.

## GitHub Pages

**PARTIAL.** `/BeatGarden/` static production mount and workflow are verified locally.
Public deployment is blocked: no local git remote, no BeatGarden repository in the
connected GitHub installation, and invalid local `gh` authentication.

## Stream-safe built-in content

**PASS (provenance statement, not legal guarantee).** Built-in music/SFX/art/animation
are code-generated and recorded separately from user-imported rights-unverified audio.

## Third-party provenance

**PASS.** Zero runtime dependencies/CDNs. Exact direct development versions/licenses
are recorded; `npm audit` reports zero vulnerabilities.

## Tests

Pending final exact-HEAD count after release-audit commit.

## Build

Pending final exact-HEAD production bundle result.

## Browser smoke

Desktop Chrome: menu/i18n, audio test, provenance, calibration/settings, all built-in
stages, AutoChart Worker/play/result, lifecycle A–D, corrected DPR layout, controlled
PWA, and server-off offline boot. Android: NOT RUN.

## Known issues

1. Android real-device evidence unavailable.
2. Public GitHub Pages deployment unavailable without a repository/working credential.
3. Native OS file-picker automation and live viewport resizing are unavailable in the
   connected browser surface; corresponding code paths have synthetic/pure-math evidence.

## HEAD

Pending final release-audit commit.
