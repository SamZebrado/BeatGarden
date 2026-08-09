import { AudioEngine } from '../audio/AudioEngine';
import { Synth } from '../audio/Synth';
import { InputRouter, type PointerAction } from '../game/InputRouter';
import { t } from '../i18n/strings';
import { TIMING_CONFIG } from '../timing/config';
import { calculateCalibrationOffset } from './calibration';
import { loadSettings, updateSettings } from './settings';

type Phase = 'ready' | 'running' | 'complete' | 'failed';

export class CalibrationView {
  private readonly audio: AudioEngine;
  private readonly synth: Synth;
  private readonly input: InputRouter;
  private readonly targets: number[] = [];
  private readonly usedTargets = new Set<number>();
  private readonly samples: number[] = [];
  private phase: Phase = 'ready';
  private raf: number | null = null;
  private readonly status: HTMLElement;
  private readonly pulse: HTMLElement;
  private readonly runtimeStatus: HTMLOutputElement;

  constructor(private readonly root: HTMLElement, onBack: () => void) {
    const settings = loadSettings();
    this.audio = new AudioEngine({ musicVolume: settings.musicVolume, sfxVolume: settings.sfxVolume });
    this.synth = new Synth(this.audio);
    root.replaceChildren();
    root.style.cssText = 'width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;background:#090d20;color:#fff;font-family:system-ui;touch-action:none;';
    const page = document.createElement('main');
    page.style.cssText = 'width:min(760px,calc(100% - 40px));text-align:center;padding:30px;';
    page.innerHTML = `<button data-role="back" style="position:fixed;left:24px;top:24px;color:#b9c9ff;border:0;background:transparent;font-size:16px">← ${t('menu.back')}</button><h1 style="font-size:46px">${t('calibration.title')}</h1><p style="font-size:20px;line-height:1.55;color:#d2dcff;margin-top:18px">${t('calibration.instructions')}</p><div data-role="pulse" style="width:170px;height:170px;border-radius:50%;margin:42px auto;background:radial-gradient(circle,#dffff0 0 12%,#4dcb9a 13% 24%,#193a46 25% 100%);box-shadow:0 0 60px rgba(77,203,154,.35)"></div><button data-role="start" style="padding:16px 24px;border:0;border-radius:999px;background:#4dcb9a;color:#07150f;font-size:19px;font-weight:900">${t('calibration.start')}</button><div data-role="status" aria-live="polite" style="margin-top:26px;min-height:64px;font-size:20px;color:#e3eaff"></div>`;
    this.status = page.querySelector('[data-role="status"]')!;
    this.pulse = page.querySelector('[data-role="pulse"]')!;
    page.querySelector<HTMLButtonElement>('[data-role="back"]')!.addEventListener('click', () => void this.destroy().then(onBack));
    page.querySelector<HTMLButtonElement>('[data-role="start"]')!.addEventListener('pointerdown', () => void this.start());
    root.appendChild(page);
    this.runtimeStatus = document.createElement('output');
    this.runtimeStatus.id = 'calibration-runtime-status';
    this.runtimeStatus.style.cssText = 'position:fixed;left:-10000px;width:1px;height:1px;overflow:hidden';
    root.appendChild(this.runtimeStatus);
    this.input = new InputRouter({ config: TIMING_CONFIG, getAudioTime: () => this.audio.now(), el: this.pulse, aggressiveDefaults: true });
    this.input.addListener((action) => this.onInput(action));
    this.frame();
  }

  private async start(): Promise<void> {
    if (this.phase === 'running') return;
    if (!await this.audio.unlockFromUserGesture()) return;
    this.targets.length = 0;
    this.samples.length = 0;
    this.usedTargets.clear();
    const first = this.audio.now() + 1;
    for (let i = 0; i < 20; i++) {
      const target = first + i * 0.65;
      this.targets.push(target);
      this.synth.play('uiClick', target, undefined, 0.05, 0.7);
    }
    this.phase = 'running';
    this.status.textContent = `${t('calibration.progress')}: 0 / 16`;
  }

  private onInput(action: PointerAction): void {
    if (this.phase !== 'running' || action.type !== 'tap') return;
    let bestIndex = -1;
    let bestDistance = Infinity;
    for (let i = 0; i < this.targets.length; i++) {
      if (this.usedTargets.has(i)) continue;
      const distance = Math.abs(action.audioTime - this.targets[i]);
      if (distance < bestDistance) { bestIndex = i; bestDistance = distance; }
    }
    if (bestIndex < 0 || bestDistance > 0.28) return;
    this.usedTargets.add(bestIndex);
    this.samples.push((action.audioTime - this.targets[bestIndex]) * 1000);
    this.status.textContent = `${t('calibration.progress')}: ${this.samples.length} / 16`;
    if (this.samples.length >= 16) this.finish();
  }

  private finish(): void {
    const offset = calculateCalibrationOffset(this.samples);
    if (offset === null) {
      this.phase = 'failed';
      this.status.textContent = t('calibration.failed');
      return;
    }
    this.phase = 'complete';
    updateSettings({ calibrationOffsetMs: offset });
    this.status.textContent = `${t('calibration.saved')} · ${t('calibration.offset')}: ${offset.toFixed(1)} ms`;
  }

  private frame = (): void => {
    const now = this.audio.now();
    if (
      this.phase === 'running' &&
      this.targets.length > 0 &&
      now > this.targets[this.targets.length - 1] + 0.35 &&
      this.samples.length < 16
    ) {
      this.phase = 'failed';
      this.status.textContent = t('calibration.failed');
    }
    const nextTarget = this.targets.find((target, index) => !this.usedTargets.has(index) && target >= now - 0.28) ?? null;
    const distance = nextTarget === null ? Infinity : Math.abs(nextTarget - now);
    const scale = distance < 0.12 ? 1.22 : 0.9 + Math.max(0, 1 - distance / 0.65) * 0.16;
    this.pulse.style.transform = `scale(${scale})`;
    this.runtimeStatus.textContent = JSON.stringify({ phase: this.phase, audioContextState: this.audio.getContext().state, samples: this.samples.length, nextTargetAudioTime: nextTarget, audioTime: Number(now.toFixed(4)), savedOffsetMs: loadSettings().calibrationOffsetMs });
    this.raf = requestAnimationFrame(this.frame);
  };

  private async destroy(): Promise<void> {
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.input.detach();
    await this.audio.close();
    this.root.replaceChildren();
  }
}
