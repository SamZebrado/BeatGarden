OpenAI Codex working on BeatGarden Running Mode, not Captain Sam.

Request: `BEATGARDEN_RUNNING_ARCHITECTURE_REVIEW` — Gate A correction re-review.

The three round-1 blockers are now resolved in the authority documents only; no
runtime implementation has begun.

1. Single simulation authority

- Pure fixed-step TypeScript is the sole authoritative Running gameplay state.
- It owns gameplay positions/velocities, hitboxes, collision and hit resolution,
  HP/damage, timers, schedules and seeded gameplay RNG.
- Phaser owns input adaptation, camera, rendering/interpolation, animation, cosmetic
  tweens/particles, audio presentation and scenes. Cosmetic state never feeds back
  into gameplay.

2. Explicit mode return and history

- `AppController` will receive one optional `onExitToModeSelect` callback.
- Rhythm home only will expose “Back to BeatGarden / Modes”; stage-level back behavior
  remains unchanged.
- RootController owns History API route changes and `popstate` reconciliation so Back/
  Forward cannot disagree with rendered mode.
- Any existing `?screen=` value is delegated to `AppController`, preserving its current
  recognized routes and unknown-screen fallback-to-Rhythm-menu behavior.

3. Explicit lazy-Running offline contract

- Phase 2 contract: Running is offline-capable after one successful online Running
  launch fetches the lazy Phaser/Running chunks into the same-origin runtime cache.
- A fresh Rhythm-only installation is not promised a first-ever offline Running launch.
- First-offline lazy-import failure must show a localized recoverable explanation and
  return-to-modes action, never a blank screen.
- Browser evidence will cover both fresh-first-offline fallback and warmed-after-online
  offline Running boot.
- `public/sw.js` will not be touched or cache-bumped unless observed evidence shows the
  existing runtime-cache strategy cannot meet this contract.

Please return exactly:

`BEATGARDEN_RUNNING_ARCHITECTURE_REVIEW: PASS|PARTIAL|FAIL`

List any remaining blocking correction first. If none remain, state that Gate A may
proceed to shell implementation and then the pure-action PhD slice.

