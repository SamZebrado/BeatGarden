import { AudioEngine } from '../audio/AudioEngine';
import { InputRouter, type PointerAction } from '../game/InputRouter';
import { t } from '../i18n/strings';
import { CanvasManager } from '../render/CanvasManager';
import { Judge, type StageScore } from '../timing/Judge';
import type { ScheduledJudgeTarget } from '../timing/Scheduler';
import { Transport } from '../timing/Transport';
import { TIMING_CONFIG, type InputKind, type JudgementKind } from '../timing/config';
import { ImportedTrackPlayer } from './ImportedTrackPlayer';
import { ImportedTrackTimeline } from './ImportedTrackTimeline';
import type { AutoChartNote, GeneratedAutoChart } from './types';

type Phase = 'ready' | 'playing' | 'paused' | 'ended';

interface PulseTarget extends ScheduledJudgeTarget {
  songTimeSec: number;
  meta: { note: AutoChartNote; direction?: 'left' | 'right'; part?: 'start' | 'release' };
}

export class PulseGardenRunner {
  private readonly canvasManager: CanvasManager;
  private readonly timeline: ImportedTrackTimeline;
  private readonly player: ImportedTrackPlayer;
  private readonly input: InputRouter;
  private readonly judge: Judge;
  private readonly targets: PulseTarget[];
  private phase: Phase = 'ready';
  private feedback: { kind: JudgementKind | 'WAIT'; at: number } | null = null;
  private bloomPulse = 0;
  private resultShown = false;
  private readonly runtimeStatus: HTMLOutputElement;

  constructor(
    private readonly root: HTMLElement,
    private readonly audio: AudioEngine,
    private readonly buffer: AudioBuffer,
    chart: GeneratedAutoChart,
  ) {
    root.replaceChildren();
    root.style.cssText = 'width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#07142a;';
    this.canvasManager = new CanvasManager({ parent: root, config: TIMING_CONFIG });
    this.timeline = new ImportedTrackTimeline(() => audio.now());
    this.player = new ImportedTrackPlayer({ context: audio.getContext(), destination: audio.getMusicBus() });
    const transport = new Transport(() => audio.now(), chart.bpm ?? 120, [4, 4]);
    this.judge = new Judge(TIMING_CONFIG, transport, 0, {
      targetAudioTime: (target) => this.timeline.songTimeToAudioTime(target.songTimeSec!),
      onJudge: (result) => {
        this.feedback = { kind: result.kind, at: this.audio.now() };
        if (result.kind !== 'MISS') this.bloomPulse = 1;
      },
    });
    this.targets = buildTargets(chart.notes);
    this.input = new InputRouter({
      config: TIMING_CONFIG,
      getAudioTime: () => audio.now(),
      el: this.canvasManager.canvas,
      aggressiveDefaults: true,
    });
    this.input.addListener((action) => this.onInput(action));
    this.runtimeStatus = document.createElement('output');
    this.runtimeStatus.id = 'autogarden-runtime-status';
    this.runtimeStatus.style.cssText = 'position:fixed;left:-10000px;width:1px;height:1px;overflow:hidden';
    root.appendChild(this.runtimeStatus);
    window.addEventListener('keydown', this.onKeyDown);
    this.buildStartOverlay();
    this.frame();
  }

  private buildStartOverlay(): void {
    const overlay = document.createElement('div');
    overlay.dataset.role = 'autogarden-start';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:40;background:rgba(5,10,28,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:28px;color:#fff;font-family:system-ui;';
    overlay.innerHTML = `<h1 style="font-size:48px">${t('autogarden.title')}</h1><p style="font-size:21px;max-width:780px;line-height:1.5;margin-top:18px;color:#d6e5ff">${t('autogarden.instructions')}</p><div style="margin-top:30px;padding:17px 26px;border-radius:999px;background:#4dcb9a;color:#07150f;font-size:20px;font-weight:900">${t('autogarden.start')}</div>`;
    overlay.addEventListener('pointerdown', () => void this.start(overlay));
    this.root.appendChild(overlay);
  }

  private async start(overlay: HTMLElement): Promise<void> {
    if (!await this.audio.unlockFromUserGesture()) return;
    overlay.remove();
    this.judge.resetRun();
    this.input.lastInputAudioTime = 0;
    this.input.lastInputDomTimeMs = 0;
    this.input.lastPointerType = 'none';
    // Two-second visual lead-in lets the first imported onset approach the
    // wreath before the one-shot song source starts.
    const startAt = this.audio.now() + 2;
    this.timeline.start(0, startAt);
    this.player.start(this.buffer, 0, startAt);
    this.phase = 'playing';
  }

  private onInput(action: PointerAction): void {
    if (this.phase !== 'playing') return;
    const actual = actionToInputKind(action);
    const okSec = TIMING_CONFIG.okWindowMs / 1000 + 0.035;
    let best: PulseTarget | null = null;
    let bestDistance = Infinity;
    for (const target of this.targets) {
      if (this.judge.hasRecorded(target.id) || !semanticCompatible(target.inputKind, actual)) continue;
      const distance = Math.abs(action.audioTime - this.timeline.songTimeToAudioTime(target.songTimeSec));
      if (distance <= okSec && distance < bestDistance) {
        best = target;
        bestDistance = distance;
      }
    }
    if (best) this.judge.judgeTarget(best, action.audioTime, actual);
    else this.feedback = { kind: 'WAIT', at: this.audio.now() };
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      if (this.phase === 'playing') void this.pause();
      else if (this.phase === 'paused') void this.resume();
    } else if ((event.key === 'r' || event.key === 'R') && this.phase !== 'ready') {
      void this.restart();
    }
  };

  private async pause(): Promise<void> {
    this.phase = 'paused';
    if (await this.audio.suspend()) this.timeline.pause(this.audio.now());
  }

  private async resume(): Promise<void> {
    if (!await this.audio.resume()) return;
    this.timeline.resume(this.audio.now());
    this.phase = 'playing';
  }

  private async restart(): Promise<void> {
    if (!await this.audio.resume()) return;
    this.judge.resetRun();
    this.input.lastInputAudioTime = 0;
    this.input.lastInputDomTimeMs = 0;
    this.input.lastPointerType = 'none';
    this.feedback = null;
    this.resultShown = false;
    this.root.querySelector('[data-role="autogarden-result"]')?.remove();
    const startAt = this.audio.now() + 2;
    this.timeline.start(0, startAt);
    this.player.start(this.buffer, 0, startAt);
    this.phase = 'playing';
  }

  private frame = (): void => {
    const snapshot = this.timeline.snapshot();
    if (this.phase === 'playing') {
      const expiry = snapshot.songTimeSec - TIMING_CONFIG.okWindowMs / 1000 - 0.01;
      for (const target of this.targets) {
        if (target.songTimeSec < expiry && !this.judge.hasRecorded(target.id)) this.judge.autoMiss(target);
      }
      if (snapshot.songTimeSec >= this.buffer.duration + 0.3 && !this.resultShown) this.finish();
    }
    this.render(snapshot.songTimeSec);
    requestAnimationFrame(this.frame);
  };

  private render(songTime: number): void {
    const ctx = this.canvasManager.ctx;
    const width = this.canvasManager.logicalWidth;
    const height = this.canvasManager.logicalHeight;
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#07142a');
    gradient.addColorStop(1, '#123b35');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    this.bloomPulse *= 0.92;
    const hitX = 560;
    const hitY = 580;
    const success = this.judge.statsCounts().PERFECT + this.judge.statsCounts().GREAT + this.judge.statsCounts().OK;
    const nextTarget = this.targets.find((target) => !this.judge.hasRecorded(target.id));
    this.runtimeStatus.textContent = JSON.stringify({
      phase: this.phase,
      audioContextState: this.audio.getContext().state,
      songTimeSec: Number(songTime.toFixed(4)),
      sourcePlaying: this.player.isPlaying,
      pointerType: this.input.lastPointerType,
      inputSongTimeSec: this.input.lastInputAudioTime
        ? Number(this.timeline.audioTimeToSongTime(this.input.lastInputAudioTime).toFixed(4))
        : null,
      nextTarget: nextTarget
        ? { songTimeSec: nextTarget.songTimeSec, inputKind: nextTarget.inputKind, id: nextTarget.id }
        : null,
      counts: this.judge.statsCounts(),
    });
    drawGarden(ctx, width, height, success, this.bloomPulse);
    ctx.strokeStyle = `rgba(210,255,230,${0.6 + 0.3 * Math.sin(songTime * Math.PI * 4)})`;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(hitX, hitY, 92 + Math.sin(songTime * Math.PI * 4) * 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '800 34px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(t('autogarden.instructions'), width / 2, 82);
    for (const target of this.targets) {
      if (this.judge.hasRecorded(target.id)) continue;
      const delta = target.songTimeSec - songTime;
      if (delta < -0.25 || delta > 2.2) continue;
      const progress = 1 - Math.max(0, delta) / 2.2;
      const x = hitX + (width - 180 - hitX) * (1 - progress);
      const laneY = target.meta.note.band === 'low' ? hitY + 120 : target.meta.note.band === 'high' ? hitY - 140 : hitY;
      const y = laneY + (hitY - laneY) * progress;
      drawTarget(ctx, target, x, y);
    }
    if (this.feedback && this.audio.now() - this.feedback.at < 0.9) {
      ctx.font = '900 68px system-ui';
      ctx.fillStyle = this.feedback.kind === 'MISS' || this.feedback.kind === 'WAIT' ? '#ffd17c' : '#d9fff0';
      const label = this.feedback.kind === 'WAIT' ? t('autogarden.wait') : t(`feedback.${this.feedback.kind}` as 'feedback.PERFECT');
      ctx.fillText(label, width / 2, 185);
    }
    if (this.phase === 'paused') {
      ctx.fillStyle = 'rgba(4,8,24,.75)'; ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#fff'; ctx.font = '800 54px system-ui'; ctx.fillText(t('autogarden.paused'), width / 2, height / 2);
    }
  }

  private finish(): void {
    this.phase = 'ended';
    this.resultShown = true;
    const score = this.judge.finalScore();
    this.player.stop();
    this.timeline.pause(this.audio.now());
    this.buildResult(score);
  }

  private buildResult(score: StageScore): void {
    const overlay = document.createElement('div');
    overlay.dataset.role = 'autogarden-result';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:50;background:rgba(3,8,20,.9);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-family:system-ui;text-align:center;';
    overlay.innerHTML = `<h2 style="font-size:44px">${t('result.title')}</h2><p style="font-size:28px;margin-top:18px">${t('result.score')}: ${score.score} · ${t('result.accuracy')}: ${(score.accuracy * 100).toFixed(1)}%</p><button data-role="restart" style="margin-top:28px;padding:15px 24px;border:0;border-radius:12px;background:#4dcb9a;font-size:18px;font-weight:800">${t('action.restart')}</button>`;
    overlay.querySelector('button')!.addEventListener('click', () => void this.restart());
    this.root.appendChild(overlay);
  }
}

function buildTargets(notes: readonly AutoChartNote[]): PulseTarget[] {
  const targets: PulseTarget[] = [];
  notes.forEach((note, index) => {
    const beat = note.beatIndex ?? index;
    if (note.type === 'hold') {
      const releaseId = `${note.id}-release`;
      targets.push({ type: 'judge-target', id: `${note.id}-start`, beat, songTimeSec: note.songTimeSec, inputKind: 'holdStart', pairedId: releaseId, meta: { note, part: 'start' } });
      targets.push({ type: 'judge-target', id: releaseId, beat: beat + 0.5, songTimeSec: note.songTimeSec + (note.durationSec ?? 0.7), inputKind: 'holdRelease', pairedId: `${note.id}-start`, meta: { note, part: 'release' } });
    } else if (note.type === 'swipe') {
      const direction = index % 2 ? 'left' : 'right';
      targets.push({ type: 'judge-target', id: note.id, beat, songTimeSec: note.songTimeSec, inputKind: direction === 'left' ? 'swipeLeft' : 'swipeRight', meta: { note, direction } });
    } else {
      targets.push({ type: 'judge-target', id: note.id, beat, songTimeSec: note.songTimeSec, inputKind: 'tap', meta: { note } });
    }
  });
  return targets.sort((a, b) => a.songTimeSec - b.songTimeSec);
}

function actionToInputKind(action: PointerAction): InputKind {
  if (action.type === 'swipe') return action.direction === 'left' ? 'swipeLeft' : 'swipeRight';
  if (action.type === 'holdStart') return 'holdStart';
  if (action.type === 'holdEnd') return 'holdRelease';
  return 'tap';
}

function semanticCompatible(expected: InputKind, actual: InputKind): boolean {
  return expected === actual;
}

function drawGarden(ctx: CanvasRenderingContext2D, width: number, height: number, successes: number, pulse: number): void {
  ctx.fillStyle = '#0c2c29'; ctx.fillRect(0, height * 0.68, width, height * 0.32);
  const flowers = Math.min(20, 4 + successes);
  for (let i = 0; i < flowers; i++) {
    const x = 110 + i * (width - 220) / Math.max(1, flowers - 1);
    const y = height * 0.77 + Math.sin(i * 2.3) * 55;
    const radius = 14 + (i === flowers - 1 ? pulse * 20 : 0);
    ctx.strokeStyle = '#5daf76'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x, height); ctx.lineTo(x, y); ctx.stroke();
    ctx.fillStyle = ['#ffcf72', '#ff8cac', '#83dbff'][i % 3];
    for (let petal = 0; petal < 6; petal++) {
      const angle = petal / 6 * Math.PI * 2;
      ctx.beginPath(); ctx.arc(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, radius * 0.68, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawTarget(ctx: CanvasRenderingContext2D, target: PulseTarget, x: number, y: number): void {
  const color = target.meta.note.band === 'low' ? '#ffb15c' : target.meta.note.band === 'high' ? '#91dfff' : '#85efb7';
  ctx.fillStyle = color; ctx.strokeStyle = '#fff'; ctx.lineWidth = 5;
  if (target.meta.note.type === 'swipe') {
    ctx.beginPath();
    const dir = target.meta.direction === 'left' ? -1 : 1;
    ctx.moveTo(x + dir * 42, y); ctx.lineTo(x - dir * 22, y - 34); ctx.lineTo(x - dir * 22, y + 34); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (target.meta.note.type === 'hold') {
    ctx.fillRect(x - 24, y - 60, 48, 120); ctx.strokeRect(x - 24, y - 60, 48, 120);
  } else {
    ctx.beginPath(); ctx.arc(x, y, 36, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
}
