# GATE 1 — Firefly Dock Review Record

## Submission 1 — ready for independent review (2026-08-10)

Scope:
- core main menu and original stage select
- Firefly Dock interactive onboarding and full original stage
- localized unlock, tutorial, feedback, result, restart, and exit
- mouse/touch comprehension gate
- deterministic runner teardown

Evidence:
- `docs/evidence/gate0_chrome_20260810.json`
- `docs/evidence/firefly_complete_flow_20260810.json`
- desktop mouse beat 2.0143 -> GREAT, zero early misses
- touch PointerEvent beat 2.0143 -> GREAT, zero early misses
- complete run ended at beat 68.9963 with droppedLate=0
- restart returned to countdown beat -0.8842 and reset all counts
- second run ended at beat 69.0195 with droppedLate=0
- exit returned to stage select with canvasCount=0 and runtimeCount=0

Static verification at HEAD `a6b6dcf`:
- TypeScript PASS
- 99/99 tests PASS (14 files)
- production build PASS

Requested verdict: `GATE 1: PASS / PARTIAL / FAIL`.

## Submission 1 verdict — PARTIAL

Blocking issues:
1. `window.__BEATGARDEN__` retained the destroyed Runner.
2. Auto-MISS triggered the player-operated lever.
3. Submitted and verified SHAs differed.

## PARTIAL fixes ready for resubmission

- StageRunner stores its installed debug handle and deletes it only if the global still
  belongs to that Runner. Real Chrome post-exit telemetry:
  `screen=stage-select`, `debugHandlePresent=false`, `canvasCount=0`.
- `Judge.autoMiss()` now labels results `automatic=true`; Firefly still renders miss/
  disappointment feedback but only non-automatic player outcomes set `workerActionT0`.
- Regression test explicitly verifies automatic MISS leaves lever timestamp null and
  a player MISS sets it.
- Final verification will be rerun after the fix commit, and the exact tested HEAD will
  be used in the Bridge resubmission.

## Resubmission verdict — PASS

- Exact reviewed HEAD: `07a6fb2`
- Bridge request id: `msm3d2zt-by80o397`
- Message id: `83w326i5pao7do8t8hotc6`
- Nonce ownership: PASS (`MSG_codex_gate1_fix_07a6fb2_20260810a`)
- Attachment acknowledgement: 6/6
- Verdict: `GATE 1: PASS`

The independent reviewer confirmed all three blockers are closed. This gate is a
milestone only; development proceeds to original content, AutoChart, PWA/Android,
production hardening, and GATE 2–4.
