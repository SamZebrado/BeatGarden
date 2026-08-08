# GATE 0 — Architecture / Timing Engine

Status: **Local complete. Bridge BRIDGE_BLOCKED. Awaiting ChatGPT audit PASS/PARTIAL/FAIL.**

Local snapshot: HEAD pending commit (after Firefly Dock stage1 + TS fixes).
tsc: 0 errors. vitest: 56/56 PASS. vite build: PASS. dist 44.96 kB JS (gzip 13.33 kB).

---

## Summary submitted to ChatGPT (scheduled)

Gate goal: Audit Timing Engine architecture — authoritative clock, transport algebra,
scheduler lookahead filling, judge windows + calibration, Stage abstraction decoupled
from renderer state, anti-drift.

Implemented (local claim):
- AudioEngine owns AudioContext({latencyHint:'interactive'}). User gesture unlock.
  visibilitychange → suspend/resume. Music/SFX master gain buses.
- Transport uses (audioAnchor, transportAnchor) algebra for beat↔audio time.
  start/pause/seekToBeat/setBpm. setBpm preserves musical beat (not raw seconds).
- Scheduler with setTimeout loop (lookahead 25ms, scheduleAhead 120ms) pushes
  OscillatorNode.schedule/noteOn into WebAudio timeline. Cursor skips past events.
- Synth: procedural kick/snare/hatClosed/bass/pluck/bell/lead/uiClick/success/miss
  (OscillatorNode + GainNode ADSR + Biquad + simple FM). No external audio files.
- Judge: PERFECT ±32ms / GREAT ±72ms / OK ±130ms / MISS. Calibration offset subtracted
  from delta. Hold-release windows wider. Call-and-response echo matching with
  pushEchoWindow/matchEchoTap. Score weights: P=300 G=200 OK=100 M=0. Accuracy/
  meanSignedErrorMs/medianSignedErrorMs/delta histogram.
- InputRouter: pointerdown → tap. Swipe detection. Supports touch+mouse.
  Prevents default for gestures on canvas.
- Stage interface: StageDefinition / StageRuntimeServices (transport/scheduler/judge/
  synth/audio/canvas/debug). Each stage owns data/music/events/render/input map/lifecycle.
- Debug overlay: AudioContext time, transport state, BPM, FPS, calibration offset,
  last delta, last judge, queue length. Toggle via D key.
- CanvasManager: 1920×1080 logical, fit-contain, DPR-aware, resize handler.

Tests actually run (evidence):
- 56/56 vitest PASS (6 files).
- Transport.beatToAudioTime 1e-9 tolerance at 60/120 BPM.
- setBpm 60→120 preserves beat position (beat=4 stays beat=4).
- Judge boundaries 0→P / 32+ε→G / 72→G / 72+ε→OK / 131→M.
- Calibration median + outlier robust: 340±10 ms inputs + 5×500 ms outliers → median 340.
- Timing drift 1000 iterations ±100 ms frame jitter → final beat err ≤ 1e-9.
- Pause/resume 100 cycles random 0–1000 ms sleep → final beat err ≤ 1e-9.
- Scheduler cursor skips 8 beats into past (4 sec at 120 BPM).

Known issues:
- No real browser smoke test yet (in progress this session).
- No GATE 0 PASS from ChatGPT audit yet.

## ChatGPT verdict

Bridge blocked (locator.fill: Timeout 10000ms, 3 attempts). Awaiting retry.

- Verdict: —
- Required fixes: —
- Resubmitted with: short message (<800 chars) after local browser smoke test.

## Follow-up after audit

- TBD.
