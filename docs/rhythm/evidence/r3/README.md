# R3 Stage Differentiation evidence

Prepared during the interrupted R2 review wait and held uncommitted until the R2 verdict permits R3 submission.

## Intended proof surfaces

- `bubble-intro.png`: three full-width kitchen zones, falling ingredient cue, pot-shaped hit zones, and a compact authored recipe/order card in formal play. The recipe card is suppressed during the interactive tutorial to avoid collision.
- `cloud-intro.png`: central mailbox, left/right destination routes, envelope approach and explicit directional flight path.
- `greenhouse-tutorial.png`: paired press/release geometry, continuous stem connection, lane-specific plants, and hold-state meter.
- `firefly-constellation.png`: successful player launches persist as a growing constellation rather than disappearing after the transient arc.
- `android-bubble-touch.png`: exact detached runtime `ef87dff` on Xiaomi `24091RPADC`; real CDP touch at authored beat 4 recorded `pointerType: touch`, `GREAT`, Combo 1 and Groove 21.84 at 1163×632 CSS px / DPR 2.75.

All stage progression continues to use authored Scheduler targets and the shared Transport/Judge authority. Section identity changes target phrases, rests, hold durations, scenery and procedural instrumentation; it does not change judgement windows.

Exact detached verification at `ef87dff`: TypeScript lint PASS; 45 files / 294 tests PASS; Pages-base production build PASS; Rhythm main 243.37 kB / gzip 66.25 kB; AutoChart worker 4.61 kB. The unchanged out-of-scope Running chunk remains 1,216.79 kB / gzip 324.98 kB with the existing size warning. Android `STREAM_MUSIC` was `Muted:true`, `streamVolume:0` before and after the touch smoke; no audible sound was played. `auditory calibration validity NOT ASSESSED because media volume was intentionally muted`.

## Bounded persistence delta after R3 PARTIAL

Runtime delta: `6b778bf`

- `GardenRunProgress` now owns separate durable lane totals and 1.8-second transient success FX. Expiring FX does not modify durable totals.
- Bubble increments durable pot fill only for successful nonautomatic authoritative tap judgements.
- Greenhouse increments durable lane growth only for a successful authoritative `holdRelease`; `holdStart`, `MISS`, and automatic `MISS` do not grow a plant.
- `onStart()` and `onRestart()` reset both durable and transient state. Firefly constellation behavior is unchanged.
- Deterministic regressions prove retention after 1.81 seconds, accumulation across successes, restart reset, automatic-MISS exclusion, and no Greenhouse growth before successful release.
- `bubble-retained-progression.png`: real desktop formal-play Judge smoke accumulated four successes; the late-run frame was captured more than seven seconds after the most recent success and still shows retained pot fill.
- `greenhouse-climax-retained-growth.png`: muted real Android touch smoke completed five authored start/release pairs with 10 PERFECT judgements. At Climax beat 44, growth remains across all three lanes more than 2.6 seconds after the prior release.
- Android returned to the existing single CheapLive black-screen protector tab afterward. `STREAM_MUSIC` remained `Muted:true`, `streamVolume:0`; no audible sound was played. `auditory calibration validity NOT ASSESSED because media volume was intentionally muted`.
- Exact detached `6b778bf`: `npm ci` PASS; TypeScript lint PASS; 46 files / 302 tests PASS; Pages-base production build PASS; Rhythm main 252.38 kB / gzip 69.40 kB; AutoChart worker 4.61 kB. The unchanged out-of-scope Running chunk remains 1,216.79 kB / gzip 324.98 kB.
