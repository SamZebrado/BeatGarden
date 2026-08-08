# BeatGarden Asset Provenance

This file records the origin of every creative asset used in BeatGarden v1.
Goal for v1: 0 third-party files imported as binary assets.

## v1 — Procedural-only target

| Category        | Source                                                      | Status        |
| --------------- | ----------------------------------------------------------- | ------------- |
| Music (songs)   | Web Audio API — procedural synthesis by game code           | PLANNED       |
| SFX             | Web Audio API — procedural synthesis by game code           | PLANNED       |
| Graphics        | Canvas 2D / SVG / CSS — procedural drawing by game code     | PLANNED       |
| UI icons / UI   | Inline SVG drawn by code (no external files)                | PLANNED       |
| Fonts           | System fonts only (system-ui, sans-serif)                   | PLANNED       |
| Animations      | Code-driven curves, not external sprite sheets              | PLANNED       |
| Particles       | Code-generated point clouds                                 | PLANNED       |

## External dependencies (code only, not creative assets)

| Package       | Version | License  | Purpose                     |
| ------------- | ------- | -------- | --------------------------- |
| typescript    | ^5.5    | Apache-2.0| Build type checking        |
| vite          | ^5.4    | MIT      | Dev server + bundler        |
| vitest        | ^2.0    | MIT      | Unit tests                  |

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
