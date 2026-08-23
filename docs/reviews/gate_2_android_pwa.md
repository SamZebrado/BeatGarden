# GATE 2 — Android touch + Calibration + PWA Review Record

Status: refreshed V2 RC verdict `GATE 2: PASS` (2026-08-24); official 2026-08-10 PASS preserved below as history.

## Official refreshed V2 verdict — PASS

- Request id: `mt6bc7ju-2ptmw98o`.
- Message id: `tfdiz47v6npatmkn257ukt`.
- Nonce: `MSG_OPENAI_CODEX_GATE2_ANDROID_60A115F_20260824A`; owned message confirmed once.
- Concrete blockers: none.
- Reviewer accepted the complete refreshed Android production matrix, correct muted
  calibration claim, PWA app-owned manifest/SW/offline behavior, Pages run
  `32667218477`, and the docs/evidence-only `60a115f...0762c3f` boundary.
- Standalone launch remains `UNVERIFIED`, not a fabricated PASS; it was classified as
  an external Chrome/WebAPK delivery residual with no observed app-owned defect.
- Refreshed GATE 4 and final acceptance remain separate and are not implied.

## 2026-08-24 refreshed V2 RC external delta

- Exact runtime/test SHA, GitHub main and deployed Pages SHA:
  `60a115fafea5d7bd972eba44ea6054f3b364bb68`.
- Pages workflow run `32666334718`: build and deploy PASS; public origin HTTPS/assets,
  `/BeatGarden/` scope/controller and `beatgarden-shell-v5` cache PASS.
- Xiaomi 24091RPADC / Android 16 / Chrome 145.0.7632.159, USB ADB, single page tab `234`.
- Real production touch: Firefly `OK`, Cloud left-swipe `GREAT`, both
  `pointerType:touch`, `droppedLate=0`.
- Calibration: 16 real muted inputs, saved/persisted `-10.6667 ms`; after reload the
  Firefly Judge debug overlay displayed `校准偏移: -10.7 ms`.
- Portrait 776×1019 and landscape 1163×632 layout/resize PASS; no clipping or double offset.
- Home background/foreground froze suspend/resume beat at `6.624`, resumed with
  `droppedLate=0` and no recovery input. Manual pause stayed paused at beat `4.4693`
  across Home/Chrome round-trip with unchanged counts.
- Wi-Fi disabled and active default network `none`; Chrome cold restart plus never-used
  fresh query URL booted the cached main menu, then physical touch entered Firefly.
- Media remained `Muted:true`, `streamVolume:0`; no audible sound occurred.
  **auditory calibration validity NOT ASSESSED because media volume was intentionally muted**.
- The user accepted formal install confirmation, but package table, launcher UI and
  Chrome shortcut manager expose no BeatGarden standalone entry. Standalone launch is
  `UNVERIFIED`; no app-owned manifest/HTTPS/icon/scope/SW/offline defect was observed.
- Evidence: `docs/evidence/android_release_20260824.json`,
  `docs/evidence/public_pages_20260824.json`, screenshots under
  `docs/evidence/android_20260824/`.
- Exact refreshed validation: 47 files / 307 tests, TypeScript 0 errors, Pages build,
  npm audit 0, focused ten-minute mixed-frame drift 4/4 PASS.

Requested refreshed verdict: `GATE 2: PASS / PARTIAL / FAIL`, concrete blockers only.

## Official re-verdict — PASS

- Request id: `msmra21b-23eyvamr`.
- Message id: `zty9qf03p0gvog6uaei9l`.
- Nonce: `MSG_codex_gate2_android_f0c3780_20260810a`; ownership PASS.
- Four of four attachments acknowledged.
- Concrete blockers: none.
- Reviewer retained `standalone launch: UNVERIFIED — external Chrome WebAPK delivery
  failure`, but found the correct formal installability UI and no app-owned manifest,
  HTTPS, scope, service-worker, or eligibility defect; it does not block GATE 2.
- The muted calibration was accepted only as software-flow/persistence/Judge evidence,
  never as an auditory latency measurement.

## 2026-08-10 real-device closure evidence

- Exact runtime/test SHA: `cec5d2f529a55720cd58943f10c0e1810d95c118`.
- Device: Xiaomi `24091RPADC` (`muyu`), Android 16, Chrome 145.0.7632.159,
  serial redacted as `bbda…35e`; USB ADB transport.
- The entire Android run kept `STREAM_MUSIC` at 0/160. No audible sound was
  intentionally produced.
- Public Pages boot, physical touch, Firefly `GREAT`, Bubble `PERFECT`, portrait
  Firefly `GREAT`, orientation restore, lifecycle suspend/resume, and cold offline
  fresh-query boot all PASS with `droppedLate=0` where applicable.
- Calibration received 16 physical inputs, saved `-50.0 ms`, survived refresh and a
  Chrome process restart, and the built-in Judge visibly read `-50.0 ms`.
  **auditory calibration validity NOT ASSESSED because media volume was intentionally muted**.
  This value is a software-flow/persistence fixture only.
- Chrome showed the formal installable-app dialog for `BeatGarden` at
  `samzebrado.github.io`. Both the user-confirmed attempt and a later online ADB-confirmed
  attempt were accepted by the UI. No WebAPK package appeared; Chrome logged
  `WebAPK server returned response code -1`. Therefore standalone launch remains
  `UNVERIFIED`; this is reported as an external installer-service residual, not a PASS.
- Durable telemetry and screenshots: `docs/evidence/android_release_20260810.json` and
  `docs/evidence/android_20260810/`.

Requested re-verdict: `GATE 2: PASS / PARTIAL / FAIL`, with concrete blockers only and
explicit consideration of whether the external WebAPK delivery failure blocks release.

## Submission verdict — PARTIAL

- Bridge request id: `msm4kshf-m85vqj7l`
- Message id: `126nr2me271f73836cav58`
- Nonce: `MSG_codex_gate2_pwa_e23d775_20260810a`
- Attachment acknowledgement: 8/8
- Verdict: `GATE 2: PARTIAL`

Blockers:
1. real Android-tablet validation is missing;
2. canonical index cache update was fire-and-forget.

Blocker 2 is fixed: the navigation `respondWith` chain now awaits both cache writes,
then an online prime -> server stop -> fresh-query offline boot was rerun successfully.

Blocker 1 remains external: `adb devices -l` returned no connected devices. Android
must remain `UNVERIFIED`; it is not replaced by desktop PointerEvent evidence.

Current verified scope:
- 16-input real Chrome calibration saved +6.3 ms.
- Settings persistence and Judge integration.
- touch PointerEvent gameplay equivalence.
- `/BeatGarden/` build with manifest/service worker/offline shell.
- subpath static HTTP assets all 200 with correct MIME.
- production Chrome service-worker controller and `beatgarden-shell-v3` cache confirmed.
- server stopped before a new offline navigation; full app booted from cache.
- 192/512 maskable PNGs plus SVG manifest icon.
- 16:9/16:10/4:3 exact layout tests and live 1440×687 corrected-canvas inspection.

Outstanding before submission:
- live viewport/orientation resizing (browser surface limitation)
- public GitHub Pages URL (workflow is ready but not yet pushed/deployed)
- Android tablet real-device smoke (`ANDROID UNVERIFIED`)

Requested verdict: `GATE 2: PASS / PARTIAL / FAIL`, with concrete blockers only.

Exact pre-submission verification at code HEAD `5776efb`:
- `npm ci`: PASS
- `npm run lint`: PASS
- `npm test -- --run`: 113/113 PASS (18 files)
- `VITE_BASE=/BeatGarden/ npm run build`: PASS
- production bundle: 120.78 kB / gzip 35.56 kB; Worker 4.61 kB
- `npm audit --json`: 0 vulnerabilities
- online controlled PWA then server-off new-URL navigation: PASS
