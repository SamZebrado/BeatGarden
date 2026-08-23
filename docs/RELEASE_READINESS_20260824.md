# Release Readiness Audit — 2026-08-24

This is a bounded audit of the released feature set. It does not authorize or add a
new gameplay system. Current source, deterministic tests and the measured production
build are authority.

## Size, network and offline baseline

`VITE_BASE=/BeatGarden/ npm run build` produces 12.53 MB in `dist`: 10.88 MB of that
is source maps, while executable/static runtime files total 1.65 MB raw, 473.9 KB gzip
and 391.7 KB Brotli. Source maps are deployed but are not ordinary page requests.

The initial document and JavaScript are 86.9 KB gzip-equivalent: the 59.7 KB app entry
and 26.4 KB initial save module plus the small HTML document. The major lazy/runtime
JavaScript chunks are:

| Chunk | Raw | Gzip | Brotli | Entry condition |
| --- | ---: | ---: | ---: | --- |
| JourneyResult + Phaser | 1,216.8 KB | 320.3 KB | 257.5 KB | first selected Running world |
| app entry | 220.7 KB | 59.7 KB | 50.2 KB | initial page and Rhythm |
| save | 80.9 KB | 26.4 KB | 21.9 KB | initial modulepreload |
| PhD world | 37.6 KB | 12.5 KB | 10.8 KB | Running warm/PhD |
| Master/Work world | 20.8 KB | 7.5 KB | 6.5 KB | Running warm/Master or Work |
| Boss Studio | 14.5 KB | 5.3 KB | 4.5 KB | Running warm/Studio |
| Rest Corner | 7.2 KB | 3.2 KB | 2.6 KB | Running warm/Rest |
| Garden Journal | 4.7 KB | 2.4 KB | 1.9 KB | Running warm/Journal |

There are no downloaded fonts, samples or audio files. Static image assets are three
application icons (SVG, 192 px and 512 px), about 40 KB raw in total. Music, sound and
game graphics are procedural.

A cold Mode Select or Rhythm visit requests only the app entry, save module and icon;
it does not request Phaser or a Running world. Running does not load Rhythm gameplay
as a separate lazy dependency: Rhythm is part of the small initial application entry.
Selecting a Running world fetches Phaser and the selected world, while the Running hub
warms the bounded Running-only chunks for offline continuity.

The install precache is 119.9 KB gzip-equivalent and includes root/index, manifest,
icons, the app entry and Vite's initial `modulepreload` save module. It excludes source
maps and Phaser. First-time mobile visitors download the 86.9 KB initial code plus
small manifest/icon requests; returning visitors can use the cached shell. Rhythm and
Mode Select are available offline after the shell install. Running destinations become
offline-ready after the Running warm path or a prior visit. An in-app Browser server-
stop navigation produced an empty tool snapshot, so a fresh-process/offline-navigation
claim remains unverified; cache-v5 control and the exact precache inputs were verified.

The large Phaser chunk is a user-facing cost only when a player deliberately starts
Running. It is healthy lazy loading, not grounds for an architectural rewrite.

Top meaningful contributors are Phaser, the initial app/Rhythm entry, save/person/
schema logic, PhD presentation and the two scenario worlds. Source maps dominate the
published directory but not normal loading.

## CI size budget

`npm run size:check` uses the measured healthy baseline and two thresholds. Warnings
leave CI green; hard limits fail a clear regression:

| Metric | Current | Warn | Fail |
| --- | ---: | ---: | ---: |
| initial JS gzip | 86.1 KB | 100 KB | 115 KB |
| initial payload gzip | 86.9 KB | 102 KB | 118 KB |
| PWA precache gzip-equivalent | 119.9 KB | 135 KB | 155 KB |
| largest lazy JS gzip | 320.3 KB | 360 KB | 410 KB |
| runtime assets gzip | 473.9 KB | 535 KB | 610 KB |
| total `dist` raw | 12.53 MB | 14 MB | 16 MB |

## Playability and pacing

Representative deterministic journeys covered all three PhD supervisor positions,
Master research/PhD, employment and undecided Career Plans, Work protect-focus and
accept-rush priorities, Storm, Recovery taken and declined, and all three music
styles. Public cast outputs span clearly different signal, noise, autonomy, pressure,
extraction and boundary profiles. Seeded cards show the consequences without exposing
hidden traits, so the differences are understandable through choices and feedback.

Achievements are cosmetic and individual runs remain memorable through independent
Story Marks. The tested early completion sequence unlocked 4, then 3, then 7 new
Medals (14/25 total) and 1, 2 and 2 Story Marks. That early burst is generous and can
make the result panel busy, but it neither changes power nor blocks release. A V2
pacing pass should consider presentation cadence rather than tightening achievement
conditions without player data.

The Journal becomes useful after multiple runs because it separates compact history,
the full Medal cabinet and Story Marks. Completion provides a visible persistent
record and optional player-to-Boss continuation, which is a credible replay prompt.

Rest Corner communicates that its three activities have no failure, streak or reward
optimization. Recovery appears once at a meaningful low state and offers an explicit
resource/time trade-off; taking or declining it is resumable and non-moralizing. It
does not interrupt ordinary runs repeatedly.

## Long-session audio

Garden Classic and Quiet Organic have slower event spacing, soft synthesis and modest
adaptive layering. Their milestone and pressure changes are perceptible without dense
high-frequency repetition. Chiptune was the clear 20–30 minute fatigue risk: its old
302.4 ms base step, bright lead every four steps and every-step pressure click could
produce about 5.8 base events per second before pressure layering.

Chiptune now uses a 378 ms base step, an upper lead every eight steps at a lower pitch
and level, and a pressure click only on alternating steps. The bass cadence remains.
This preserves the style while reducing persistent high-frequency density and peak
stacking. Audio-only timers still do not consume gameplay RNG.

## Release disposition

| Area | Status | Finding |
| --- | --- | --- |
| bundle/network health | PASS | healthy initial graph; intentional lazy Phaser |
| PWA/offline size | PARTIAL | bounded precache verified; fresh-process offline navigation not tool-verified |
| product replay pacing | PASS | varied paths, persistent Journal and replay hook |
| supervisor perceptibility | PASS | anonymous profiles are materially distinct and legible |
| achievement pacing | PARTIAL | early cosmetic unlock burst is generous |
| Rest/Recovery pacing | PASS | useful, voluntary and non-compulsory |
| music fatigue | PASS | Chiptune density reduced; other styles already restrained |

There are no release blockers. Worthwhile V2 work is limited to observing achievement
presentation cadence with real play data and adding a fresh-browser offline navigation
canary. Optional cosmetics include README screenshots and later audio mix telemetry;
neither is needed for this release.

The optional Android pass is **UNVERIFIED**. Tablet `bbda35e` was connected and awake,
but an unrelated full-screen game owned the focused window; the audit did not interrupt
that activity or reuse older device evidence as a current pass.
