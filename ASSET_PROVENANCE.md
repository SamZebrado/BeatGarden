# BeatGarden Asset Provenance

This file records the origin of every creative asset used in BeatGarden v1.
Goal for v1: 0 third-party files imported as binary assets.

## v1 — Procedural-only target

| Category        | Source                                                      | Status        |
| --------------- | ----------------------------------------------------------- | ------------- |
| Music (songs)   | Web Audio API — procedural synthesis by game code           | COMPLETE      |
| SFX             | Web Audio API — procedural synthesis by game code           | COMPLETE      |
| Graphics        | Canvas 2D / SVG / CSS — procedural drawing by game code     | COMPLETE      |
| UI icons / UI   | Original project SVG plus deterministic PNG exports         | COMPLETE      |
| Fonts           | System fonts only (`system-ui`, `sans-serif`)                | COMPLETE      |
| Animations      | Code-driven curves, not external sprite sheets              | COMPLETE      |
| Particles       | Code-generated point clouds                                 | COMPLETE      |

## External dependencies (code only, not creative assets)

| Package       | Version | License  | Purpose                     |
| ------------- | ------- | -------- | --------------------------- |
| typescript    | 7.0.2   | Apache-2.0 | Build type checking       |
| vite          | 8.2.1   | MIT        | Dev server + bundler       |
| vitest        | 4.1.10  | MIT        | Unit tests                 |
| jsdom         | 29.1.1  | MIT        | Test-only DOM environment  |

These are **code dependencies**, not creative assets (music/sfx/art/fonts).

---

## Specific provenance notes

- **No ROM extracts, no commercial game rips, no YouTube audio extracts.**
- **No font files downloaded from third-party foundries.**
- **No Creative Commons / "royalty-free" audio or image packs of unknown chain-of-title.**
- All rhythm cues, note patterns, stage names, character designs, and scene concepts originated for this project in-source.
- Audio synthesis uses only Web Audio built-ins: `OscillatorNode`, `GainNode`, `BiquadFilterNode`, `DelayNode`, and deterministic in-code `AudioBuffer` noise synthesis (no external sample loads).

If a future version introduces binary assets (e.g. custom icon PNGs, WAV samples, a custom webfont),
they MUST be appended to this file with:
- exact source URL / author
- license
- commit SHA when introduced
- any necessary attribution copy that must appear in-stream / in-UI.

## User-imported audio boundary

- User-selected audio is decoded and analyzed locally in the browser.
- It is not uploaded, committed, cached by the service worker, or represented as a built-in asset.
- Its rights status is not verified and BeatGarden never labels it `STREAM SAFE`.
- The in-product provenance page states this distinction in both complete locales.
