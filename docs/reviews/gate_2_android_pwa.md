# GATE 2 — Android touch + Calibration + PWA Review Record

Status: ready for independent review; Android hardware explicitly unverified.

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
