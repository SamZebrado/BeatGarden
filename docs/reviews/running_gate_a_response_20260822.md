# Gate A architecture review — round 1

- Reviewer conversation: designated BeatGarden design/review chat.
- Bridge request ID: `mt45b8cu-o3rh5oro`.
- Request nonce: `BEATGARDEN_GATE_A_20260822_CODEX_01`.
- Message evidence: `MESSAGE_CONFIRMED`, assistant reply settled.
- Verdict: `BEATGARDEN_RUNNING_ARCHITECTURE_REVIEW: PARTIAL`.

## Blocking corrections

1. Freeze one simulation authority. The pure TypeScript fixed-step simulation must own
   gameplay positions, hitboxes/collisions, damage, HP, timers, schedules and seeded
   RNG; Phaser must not become a second physics truth.
2. Add a real Rhythm-home return path to Mode Select and test History API / `popstate`
   behavior. A narrow optional callback in `AppController` is justified.
3. Define and test lazy-Running offline behavior. Do not claim Running offline merely
   because Rhythm shell/build succeeds.

## Approved decisions

- Default `/` becomes Mode Select while recognized legacy `?screen=` routes boot
  Rhythm directly.
- Additive `beatgarden.running.v1`; no Rhythm wrapping or migration.
- RootController above existing AppController; no physical Rhythm reorganization.
- Lazy Phaser, PhD-only initial slice, and incremental `src/running/` structure.
- The 390x844 clipping defect is a shell acceptance requirement, not a broad-refactor
  invitation.
- `public/sw.js` changes require concrete cache evidence, not a mechanical cache bump.

## Round-1 disposition

No broad gameplay implementation until a concise correction re-review returns PASS.

