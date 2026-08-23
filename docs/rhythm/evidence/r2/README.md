# R2 Shared Game Feel evidence

Prepared locally during bounded R1 review waits, then held uncommitted until `RHYTHM V2 CONTROL GATE: PASS`. This folder supports the R2 source/tests but is not a Gate verdict by itself.

## Desktop real-browser smoke

- `desktop-cloud-tutorial-feedback.png` — a real mouse swipe generated an authoritative `OK` with signed `FAST` feedback; the tutorial result remains visually separate from the instruction card.
- `desktop-cloud-formal-hud.png` — formal play shows the stage/section label, progress, judgement-specific shape, localized signed timing and Groove atmosphere without moving the target path.
- `desktop-cloud-section-pause.png` — formal Intro state shows the shared progress/Groove HUD and the 52×52 CSS px pause control.
- `desktop-cloud-hit-feedback.mp4` — 21 real-browser frames (H.264, 960×540, 2.625 s) spanning an authored Cloud target, real mouse swipe and shared result/Groove response.
- The pause control was clicked in-browser: runtime moved `playing → paused`, AudioContext and Transport both suspended, the button changed to localized Resume, then runtime returned to `playing` only after that explicit click.

## Authority and accessibility checks

- Combo, best Combo, Groove, judgement and FAST/SLOW consume existing `JudgeResult` objects only.
- Section labels and atmosphere consume Transport beat/progress only; they do not modify authored targets, judgement windows or score.
- Feedback lifetime is capped at 0.52 s.
- Reduced motion disables judgement scaling and ambient drift while preserving the text, result shape, outline and static Groove state.
- Automatic MISS has no fabricated timing delta or FAST/SLOW label.

## Android tablet muted touch smoke

- Device `bbda35e` / Xiaomi `24091RPADC`; viewport 1163×632 CSS px at DPR 2.75.
- `android-cloud-pause-resume.png` records the resumed formal-play HUD.
- CDP touch emulation acted on the visible 52×52 CSS px control. Runtime changed `playing / running / Transport playing` → `paused / suspended / false`; its localized aria label changed `暂停` → `继续`; the second touch restored `playing / running / true`.
- `STREAM_MUSIC Muted: true` and `streamVolume:0` were verified before and after. No audible sound was produced.
- `auditory calibration validity NOT ASSESSED because media volume was intentionally muted`.
