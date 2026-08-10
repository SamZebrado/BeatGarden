# GATE 2 — Android touch + Calibration + PWA Review Record

Status: official re-verdict `GATE 2: PASS`.

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
