// BeatGarden main entry (PHASE 0 — Timing Foundation Smoke Scene)
//
// Scope:
//   - Wire AudioEngine, Transport, Scheduler, Synth, Judge together
//   - "Tap anywhere to enable audio" screen
//   - Short drum+bass+pluck loop as timing smoke test
//   - Scene: night garden with a bouncing beat orb; judge taps on every beat
//
// Full Stage 1 (Firefly Dock) is PHASE 1, after GATE 0 passes.

import { TIMING_CONFIG } from './timing/config';
import { Transport } from './timing/Transport';
import {
  Scheduler,
  type ScheduledEvent,
  type ScheduledJudgeTarget,
} from './timing/Scheduler';
import { AudioEngine } from './audio/AudioEngine';
import { Synth } from './audio/Synth';
import { Judge } from './timing/Judge';
import type { InputKind, JudgeResult } from './timing/config';
import { InputRouter, type PointerAction } from './game/InputRouter';
import { GameLoop } from './game/GameLoop';
import { CanvasManager } from './render/CanvasManager';
import { DebugOverlay } from './render/DebugOverlay';
import type { TransportSnapshot } from './timing/Transport';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
if (!canvas) throw new Error('Canvas #game-canvas not found');

const cfg = TIMING_CONFIG;
const audio = new AudioEngine({
  musicVolume: cfg.musicVolumeDefault,
  sfxVolume: cfg.sfxVolumeDefault,
});

const transport = new Transport(() => audio.now(), 120, [4, 4]);
const synth = new Synth(audio);
const judge = new Judge(cfg, transport, cfg.calibrationDefaultOffsetMs);

// ---------- event list ----------

function buildSmokeEvents(): ScheduledEvent[] {
  const events: ScheduledEvent[] = [];
  const BARS = 16; // 16 bars * 4 beats = 64 beats of smoke test.
  for (let bar = 0; bar < BARS; bar++) {
    for (let beat = 0; beat < 4; beat++) {
      const b = bar * 4 + beat;
      // Drums: kick on 0/2, snare on 1/3, hats on all 16ths.
      if (beat === 0 || beat === 2) events.push({ type: 'audio', beat: b, sound: 'kick' });
      if (beat === 1 || beat === 3) events.push({ type: 'audio', beat: b, sound: 'snare' });
      for (let s = 0; s < 4; s++) {
        events.push({
          type: 'audio',
          beat: b + s * 0.25,
          sound: s === 2 ? 'hatOpen' : 'hatClosed',
          velocity: 0.55,
        });
      }
      // Bass walking pattern.
      if (beat === 0)
        events.push({ type: 'audio', beat: b, sound: 'bass', freqHz: 65.41, durationSec: 0.28 });
      if (beat === 1)
        events.push({
          type: 'audio',
          beat: b + 0.5,
          sound: 'bass',
          freqHz: 55,
          durationSec: 0.2,
        });
      if (beat === 2)
        events.push({
          type: 'audio',
          beat: b,
          sound: 'bass',
          freqHz: 73.42,
          durationSec: 0.28,
        });
      if (beat === 3)
        events.push({
          type: 'audio',
          beat: b,
          sound: 'bass',
          freqHz: 82.41,
          durationSec: 0.28,
        });
      // Melody pluck.
      const mel = [523.25, 587.33, 659.25, 783.99];
      events.push({
        type: 'audio',
        beat: b,
        sound: 'pluck',
        freqHz: mel[beat],
        durationSec: 0.22,
        velocity: 0.65,
      });
      // Judgeable tap target on every beat.
      events.push({
        type: 'judge-target',
        beat: b,
        id: `beat-${b}`,
        inputKind: 'tap',
      });
      if (beat === 0) events.push({ type: 'cue', beat: b, name: 'downbeat-flash' });
    }
  }
  return events;
}

// ---------- scene state ----------

let lastDownbeatFlash = 0;

const scheduler = new Scheduler({
  config: cfg,
  transport,
  synth,
  cueHandler: (_ev, _at, _beat) => {
    if (_ev.name === 'downbeat-flash') lastDownbeatFlash = 1;
  },
});
scheduler.setEvents(buildSmokeEvents());

// ---------- canvas / overlay ----------

const canvasManager = new CanvasManager({ canvas, config: cfg });
const overlay = new DebugOverlay();

// ---------- helpers ----------

function findNearestTapTarget(
  snap: TransportSnapshot,
  aheadBeats: number = 1.0,
  behindBeats: number = 0.8,
): ScheduledJudgeTarget | null {
  const targets = scheduler.getJudgeTargets();
  const curBeat = snap.beat;
  let best: ScheduledJudgeTarget | null = null;
  let bestDist = Infinity;
  for (const t of targets) {
    if (t.inputKind !== 'tap') continue;
    const d = t.beat - curBeat;
    if (d < -behindBeats || d > aheadBeats) continue;
    const abs = Math.abs(d);
    if (abs < bestDist) {
      bestDist = abs;
      best = t;
    }
  }
  return best;
}

// ---------- input ----------

let audioUnlocked = false;
let gameStarted = false;

const router = new InputRouter({
  config: cfg,
  getAudioTime: () => audio.now(),
  el: canvas,
});

function judgeTap(action: PointerAction): void {
  if (action.type === 'holdStart') {
    // In smoke scene, treat holdStart as tap → immediate judge, not hold-release.
  }
  let inputKindActual: InputKind = 'tap';
  if (action.type === 'swipe') {
    inputKindActual =
      action.direction === 'left'
        ? 'swipeLeft'
        : action.direction === 'right'
          ? 'swipeRight'
          : 'tap';
  }
  const snap = transport.snapshot(action.audioTime);
  const target = findNearestTapTarget(snap, 1.0, 0.8);
  if (!target) return;
  const r: JudgeResult = judge.judge(target, action.audioTime, inputKindActual);
  overlay.reportTarget(target.beat, transport.beatToAudioTime(target.beat));
  overlay.reportInput(r.deltaMs, action.audioTime);
  overlay.reportJudgement(r);
  const t = audio.now() + 0.002;
  if (r.kind === 'PERFECT' || r.kind === 'GREAT') synth.play('success', t);
  else if (r.kind === 'OK') synth.play('bell', t, 660, 0.35, 0.5);
  else synth.play('miss', t);
}

router.addListener((action) => {
  if (!audioUnlocked) {
    void audio.unlockFromUserGesture().then(() => {
      audioUnlocked = true;
      if (!gameStarted) {
        gameStarted = true;
        judge.resetRun();
        scheduler.start();
        const startAudioTime = audio.now() + 0.08;
        transport.start(0, startAudioTime);
      }
    });
    synth.play('uiClick', audio.now() + 0.002);
    return;
  }
  if (action.type === 'tap' || action.type === 'swipe' || action.type === 'holdEnd') {
    judgeTap(action);
  } else if (action.type === 'holdStart') {
    judgeTap(action);
  }
});

// ---------- render ----------

function renderScene(ctx: CanvasRenderingContext2D, snap: TransportSnapshot): void {
  const w = cfg.logicalWidth;
  const h = cfg.logicalHeight;

  // Night garden background gradient.
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#0b0d23');
  g.addColorStop(1, '#170f2c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Far horizon / dock silhouette.
  ctx.fillStyle = '#080a1a';
  ctx.fillRect(0, h * 0.66, w, h - h * 0.66);

  // Procedural twinkles.
  for (let i = 0; i < 80; i++) {
    const sx = (i * 131) % w;
    const sy = (i * 257) % Math.floor(h * 0.6);
    const phase = ((snap.transportTime * 1.3) + i * 0.37) % 1;
    const tw = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2);
    ctx.fillStyle = `rgba(200,220,255,${0.15 + 0.35 * tw})`;
    ctx.fillRect(sx, sy, 2, 2);
  }

  // Downbeat flash overlay.
  if (lastDownbeatFlash > 0) {
    ctx.fillStyle = `rgba(110,230,255,${0.08 + lastDownbeatFlash * 0.12})`;
    ctx.fillRect(0, 0, w, h * 0.66);
    lastDownbeatFlash = Math.max(0, lastDownbeatFlash - 0.04);
  }

  // Central beat orb: bounces + squashes on beat position.
  const beatFrac = snap.beatInBar - Math.floor(snap.beatInBar);
  const bob = 1 - Math.abs(beatFrac - 0.5) * 2; // triangle 0..1
  const cx = w / 2;
  const cy = h * 0.5;
  ctx.save();
  ctx.translate(cx, cy - bob * 40);
  const scaleX = 1 + bob * 0.12;
  const scaleY = 1 - bob * 0.08;
  ctx.scale(scaleX, scaleY);
  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 260);
  glow.addColorStop(0, 'rgba(180,255,220,0.55)');
  glow.addColorStop(0.4, 'rgba(120,220,180,0.18)');
  glow.addColorStop(1, 'rgba(120,220,180,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 260, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c8ffe8';
  ctx.beginPath();
  ctx.arc(0, 0, 80, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 4 beat ticker in a bar.
  for (let i = 0; i < 4; i++) {
    const bix = cx - 3 * 60 + i * 120;
    const biy = cy + 220;
    const on = Math.floor(snap.beatInBar) === i;
    ctx.fillStyle = on ? '#ffe27a' : 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.arc(bix, biy, on ? 22 : 14, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bottom hint.
  ctx.fillStyle = 'rgba(230,240,255,0.8)';
  ctx.font = '36px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  if (!audioUnlocked) {
    ctx.fillText('Tap anywhere to enable audio', cx, h - 160);
  } else {
    ctx.fillText('Tap on the beat — PERFECT = center of the glow', cx, h - 160);
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// ---------- game loop ----------

canvasManager.resize();
window.addEventListener('resize', () => canvasManager.resize());

const loop = new GameLoop({
  canvas,
  transport,
  render: (ctx, snap) => {
    renderScene(ctx, snap);
  },
  postRender: (_ctx, snap, fps) => {
    overlay.reportTransport(snap, fps);
    overlay.reportCalibration(judge.getCalibrationOffsetMs());
    overlay.reportSchedulerQueue(scheduler.lastScheduledQueueLength);
    overlay.reportCounts(judge.currentCounts);
    overlay.render(_ctx);
  },
});
loop.start();

// Debug shortcuts: D = toggle debug overlay, Space = toggle transport pause.
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'd') overlay.enabled = !overlay.enabled;
    else if (e.key === ' ') {
      e.preventDefault();
      transport.toggle();
    }
  });
}
