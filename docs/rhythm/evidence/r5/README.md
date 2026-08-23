# Rhythm V2 R5 — AutoChart phrase / playability evidence

Runtime candidate: `af97fae`

## Product behavior

- AutoChart now assigns every generated note to `intro`, `low`, `build`, `peak`, or `outro` from the existing local RMS envelope and song progress.
- Four-beat phrase grouping enforces deliberate rests and bounded action streaks: Easy 3, Normal 6, Hard 10 before a minimum 0.8 s breath.
- Easy remains tap-only. Normal and Hard may derive directional swipes from high-frequency accents and gap-safe holds from sustained mid-energy passages.
- A final ergonomic pass prevents quick reverse-swipe traps, excessive swipe streaks, impossible proximity, and actions overlapping an active hold.
- The normal product surface prioritizes Song, Difficulty, Chart Style, Generate Chart, and Enter Pulse Garden. Tempo, confidence, timing mode, onset count, note count, quality metrics, and numeric seed are in an optional advanced disclosure.
- The imported filename is inserted with `textContent`, not interpolated HTML. Simplified Chinese and English are complete replacement locales.

## Browser evidence

- `desktop-autochart-details.png`: desktop mouse click opens the technical disclosure after the fixture produces a Normal “Gesture weave” chart. Browser warning/error log was empty.
- `android-autochart-details.png`: the existing Android Chrome BeatGarden tab was navigated in place; real CDP `touchStart` / `touchEnd` opened the same disclosure at 1163×632 CSS px / DPR 2.75. No additional Android tab was created for this R5 smoke.
- Android `STREAM_MUSIC` before and after: `Muted:true`, `streamVolume:0`; no audible sound was played.
- `auditory calibration validity NOT ASSESSED because media volume was intentionally muted`.

## Exact detached verification

At `af97fae`: `npm ci` PASS; TypeScript lint PASS; 46 files / 299 tests PASS; Pages-base production build PASS. Rhythm main 251.82 kB / gzip 69.25 kB; AutoChart worker 4.61 kB. The unchanged out-of-scope Running chunk remains 1,216.79 kB / gzip 324.98 kB with its existing size warning.

R5 is implemented and exact-verified, but it is not pre-accepted here. Independent Gate submission remains ordered after R3 and R4.
