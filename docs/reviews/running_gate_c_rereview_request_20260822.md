# BeatGarden Running Mode — Gate C correction re-review

Identity: I am OpenAI Codex working on BeatGarden Running Mode, not Captain Sam.

This addresses all three Gate C blockers. Gate D and other worlds remain unstarted.

## Resource meaning

- Energy continuously scales movement speed from 0.52× to 1.0×.
- Focus scales shot cadence, projectile damage and active-project progress from visibly
  impaired to full efficiency.
- Spirit scales Orbit damage, XP pickup attraction and continuous health recovery.
- Project overdraft remains allowed, but missing Energy/Focus is converted immediately
  into extra Calendar load, pollution and Spirit loss; tests prove bounded consequences.
- This combines choice freedom with direct felt low-resource penalties.

## Project trade-off readability

- Each project card now shows consistent pictograms before selection for exact major
  Energy (`⚡`), Focus (`◉`) and Calendar (`▧`) costs plus its reward-family symbol.
- The attached new 1280×720 frame shows all four updated cards; no tooltip or paragraph
  is required to distinguish cheap/high-Focus/high-Calendar options.

## Playable milestones

- Removed Qualifying/Defense boolean auto-pass checks.
- Attempt now creates a deterministic arena state: 3–4 s world-border telegraph,
  active timer, visible defeat-progress bar and dedicated reviewer/committee waves.
- Preparation changes target count, time allowance and incoming-damage scale. It never
  directly declares success. A lower-readiness but skilled player can still win.
- Actual combat defeats advance the arena; reaching target passes. Timer expiry costs
  limited Spirit and schedules retry without wiping the run. Defer remains available.
- Qualifying is a 25+ s arena; Defense uses a longer/harder Committee variant on the
  same authoritative state-machine foundation.
- Upgrade choices are deferred during an arena so level-up cannot freeze or cover the
  milestone; they reappear safely afterward.
- A dev-only URL seam (`reviewMilestone=qualifying`) starts the real arena state machine
  for reproducible QA without altering production launches. Attached frames show the
  direct live runtime at telegraph, active combat and 7/8 progress; the same run then
  cleared through actual defeats.

## Verification

- Lint PASS.
- Full tests PASS: 144/144 in 22 files.
- `/BeatGarden/` production build PASS.
- New tests cover distinct low-resource modifiers, overdraft consequences and an
  actual Qualifying arena spawning authoritative reviewer enemies.
- Existing tests now drive arena failure, retry, combat pass, Year-five Defense arena
  and graduation rather than hidden numeric pass checks.

Please return exactly one verdict line:
`BEATGARDEN_PHD_SYSTEMS_REVIEW: PASS`, `PARTIAL`, or `FAIL`, then remaining blockers.
Do not silently pass Gate D, offline/PWA, Android, expansion or final integration.

To signal that your complete response has finished, put this exact token on the final
line by itself:

BEATGARDEN_REVIEW_RESPONSE_COMPLETE
