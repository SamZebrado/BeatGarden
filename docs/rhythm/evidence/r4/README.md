# Rhythm V2 R4 — Menu / Stage Select / Result evidence

Runtime commit under test: `2459de0`

## Exact detached verification

- Worktree: `/private/tmp/beatgarden-r4-acc1da0` (detached at `2459de0`)
- `npm ci`: PASS, 87 packages, 0 vulnerabilities
- `npm run lint`: PASS
- `npm test -- --run`: PASS, 46 files / 297 tests
- `VITE_BASE=/BeatGarden/ npm run build`: PASS
- Rhythm main: 248.36 kB / gzip 68.07 kB
- AutoChart worker: 4.61 kB
- Existing out-of-scope Running chunk warning: 1,216.79 kB / gzip 324.98 kB

## Browser smoke

- Desktop mouse/browser: Rhythm Home and Stage Select navigation PASS.
- Cards expose a procedural preview, mechanic/input badge, approximate difficulty,
  best grade, best accuracy, and a concise stage promise.
- 390x844 responsive viewport: single-column cards and internal vertical scroll PASS.
- Result hierarchy: Grade, Score, Accuracy, New Best/local best, Best Combo, Timing
  Tendency PASS.
- Secondary `<details>` contains P/G/O/M, mean, median and timing histogram.
- Result actions: Retry, Next Stage, Stage Select.
- Menu, stage instruction and result reveal use a non-blocking 220 ms animation;
  the first pointer finishes it immediately and reduced-motion disables it.
- Simplified Chinese and complete English replacement UI checked separately.
- Browser console: no warning/error observed during the R4 flows.

## Muted Android tablet smoke

- Device: Xiaomi `24091RPADC` (`bbda35e`)
- Chrome viewport: 1163x632, DPR 2.75
- Exact URL: `http://127.0.0.1:5177/?screen=firefly&runtimeSmoke=result`
- Real CDP `touchStart` / `touchEnd` at result detail summary: PASS
- Details changed from closed to open and exposed all secondary metrics.
- Before and after: `STREAM_MUSIC Muted:true`, `streamVolume:0`.
- No audible sound was intentionally produced.
- `auditory calibration validity NOT ASSESSED because media volume was intentionally muted`

`android-result-details.png` is the post-touch Android screenshot.
