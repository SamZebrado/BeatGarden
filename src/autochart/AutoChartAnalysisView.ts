import { AudioEngine } from '../audio/AudioEngine';
import { getLocale, languageTargetAction, languageTargetLabel, t, toggleLocale } from '../i18n/strings';
import { AUTOCHART_CONFIG } from './config';
import { AutoChartWorkerClient } from './AutoChartWorkerClient';
import { generateAutoChart } from './generateChart';
import { prepareMonoForAnalysis } from './prepareAudio';
import type { AutoChartAnalysis, AutoChartDifficulty, GeneratedAutoChart } from './types';
import { PulseGardenRunner } from './PulseGardenRunner';
import { loadSettings } from '../settings/settings';

export class AutoChartAnalysisView {
  private readonly audio = new AudioEngine({
    musicVolume: loadSettings().musicVolume,
    sfxVolume: loadSettings().sfxVolume,
  });
  private readonly worker = new AutoChartWorkerClient();
  private analysis: AutoChartAnalysis | null = null;
  private chart: GeneratedAutoChart | null = null;
  private difficulty: AutoChartDifficulty = 'normal';
  private seed = 1;
  private waveform: number[] = [];
  private decodedBuffer: AudioBuffer | null = null;
  private analysisRun = 0;
  private songName = '';

  constructor(private readonly root: HTMLElement, private readonly onBack?: () => void) {
    this.render();
    if (new URLSearchParams(window.location.search).get('runtimeSmoke') === 'autochart-fixture') {
      queueMicrotask(() => void this.analyzeFile(buildSyntheticFixtureFile()));
    }
  }

  private render(): void {
    this.root.replaceChildren();
    this.root.style.cssText = 'width:100%;height:100%;overflow:auto;display:block;touch-action:pan-y;background:#090d20;';
    const page = document.createElement('main');
    page.style.cssText = 'min-height:100%;max-width:1100px;margin:0 auto;padding:32px 24px 64px;color:#fff;font-family:system-ui;';
    page.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:16px;align-items:center">
        <button data-role="back" style="color:#b9c9ff;border:0;background:transparent;font-size:16px;cursor:pointer">← ${t('menu.back')}</button>
        <button data-role="language" aria-label="${languageTargetAction()}" title="${languageTargetAction()}" style="padding:10px 16px;border-radius:999px;border:1px solid #53618d;background:#151c38;color:#fff">${languageTargetLabel()}</button>
      </div>
      <h1 style="font-size:48px;margin-top:38px">${t('autochart.title')}</h1>
      <p style="font-size:20px;color:#cbd4f5;margin-top:12px">${t('autochart.subtitle')}</p>
      <section style="margin-top:30px;padding:22px;border-radius:18px;background:#121a35;border:1px solid #2c3968">
        <label style="display:inline-flex;align-items:center;padding:16px 22px;border-radius:14px;background:#526fff;font-weight:800;cursor:pointer">
          ${t('autochart.choose')}
          <input data-role="file" type="file" accept="audio/*" style="position:absolute;opacity:0;width:1px;height:1px" />
        </label>
        <p style="margin-top:16px;color:#b8c9ee">${t('autochart.privacy')}</p>
        <p style="margin-top:8px;color:#ffcf91">${t('autochart.rights')}</p>
      </section>
      <div data-role="status" aria-live="polite" style="min-height:52px;margin-top:24px;font-size:19px;color:#d9e4ff"></div>
      <section data-role="results"></section>
    `;
    page.querySelector<HTMLInputElement>('[data-role="file"]')!.addEventListener('change', (event) => void this.onFile(event));
    page.querySelector<HTMLButtonElement>('[data-role="back"]')!.addEventListener('click', () => void this.exit());
    page.querySelector<HTMLButtonElement>('[data-role="language"]')!.addEventListener('click', () => {
      toggleLocale();
      this.analysisRun++;
      this.worker.terminate();
      this.render();
      if (this.analysis && this.chart) this.renderResults();
    });
    this.root.appendChild(page);
  }

  private async onFile(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    await this.analyzeFile(file);
  }

  private async analyzeFile(file: File): Promise<void> {
    const run = ++this.analysisRun;
    const status = this.root.querySelector<HTMLElement>('[data-role="status"]')!;
    const results = this.root.querySelector<HTMLElement>('[data-role="results"]')!;
    const input = this.root.querySelector<HTMLInputElement>('[data-role="file"]')!;
    results.replaceChildren();
    input.disabled = true;
    try {
      if (file.size > AUTOCHART_CONFIG.maxFileBytes) {
        status.textContent = t('autochart.fileTooLarge');
        return;
      }
      status.textContent = `${t('autochart.preparing')} 0%`;
      const data = await file.arrayBuffer();
      const decoded = await this.audio.getContext().decodeAudioData(data.slice(0));
      if (decoded.duration > AUTOCHART_CONFIG.maxDurationSec) {
        status.textContent = t('autochart.audioTooLong');
        return;
      }
      if (run !== this.analysisRun) return;
      this.decodedBuffer = decoded;
      const mono = await prepareMonoForAnalysis(decoded, AUTOCHART_CONFIG.analysisSampleRate, ({ processedFrames, totalFrames }) => {
        if (run === this.analysisRun) status.textContent = `${t('autochart.preparing')} ${Math.round(processedFrames / totalFrames * 100)}%`;
      }, () => run !== this.analysisRun);
      if (run !== this.analysisRun) return;
      this.waveform = downsampleWaveform(mono, 900);
      status.textContent = `${t('autochart.analyzing')} 0%`;
      this.analysis = await this.worker.analyze(mono, AUTOCHART_CONFIG.analysisSampleRate, (progress) => {
        if (run === this.analysisRun) status.textContent = `${t('autochart.analyzing')} ${Math.round(progress * 100)}%`;
      });
      if (run !== this.analysisRun) return;
      this.chart = generateAutoChart(this.analysis, this.difficulty, this.seed);
      this.songName = file.name;
      status.textContent = file.name;
      this.renderResults();
    } catch (error) {
      console.error(error);
      if (run === this.analysisRun) status.textContent = t('autochart.failed');
    } finally {
      if (run === this.analysisRun) input.disabled = false;
    }
  }

  private renderResults(): void {
    if (!this.analysis || !this.chart) return;
    const results = this.root.querySelector<HTMLElement>('[data-role="results"]')!;
    results.replaceChildren();
    const panel = document.createElement('section');
    panel.style.cssText = 'margin-top:8px;padding:22px;border-radius:18px;background:#121a35;border:1px solid #2c3968;';
    const bpm = this.analysis.tempo.bpm?.toFixed(1) ?? '—';
    const mode = this.analysis.tempo.mode === 'beat-grid' ? t('autochart.beatMode') : t('autochart.localMode');
    const gestureCount = this.chart.notes.filter((note) => note.type !== 'tap').length;
    const style = gestureCount === 0 ? t('autochart.style.tap')
      : gestureCount / Math.max(1, this.chart.notes.length) < .22 ? t('autochart.style.flow') : t('autochart.style.mixed');
    panel.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px">
        <div><small>${t('autochart.song')}</small><strong data-role="song" style="display:block;font-size:22px;overflow-wrap:anywhere"></strong></div>
        <div><small>${t('autochart.difficulty')}</small><strong style="display:block;font-size:22px">${t(`autochart.${this.difficulty}`)}</strong></div>
        <div><small>${t('autochart.chartStyle')}</small><strong data-role="chart-style" style="display:block;font-size:22px">${style}</strong></div>
      </div>
      <canvas data-role="analysis-canvas" width="1000" height="300" style="width:100%;margin-top:22px;border-radius:12px;background:#080c1d"></canvas>
      <div style="display:flex;flex-wrap:wrap;gap:14px;align-items:end;margin-top:22px">
        <label>${t('autochart.difficulty')}<select data-role="difficulty" style="display:block;margin-top:6px;padding:12px;background:#080c1d;color:#fff;border:1px solid #53618d;border-radius:10px">
          <option value="easy">${t('autochart.easy')}</option><option value="normal">${t('autochart.normal')}</option><option value="hard">${t('autochart.hard')}</option>
        </select></label>
        <button data-role="regenerate" style="padding:13px 18px;border:0;border-radius:11px;background:#4dcb9a;color:#07150f;font-weight:800">${t('autochart.generate')}</button>
        <button data-role="play" style="padding:13px 18px;border:0;border-radius:11px;background:#ffd16d;color:#201400;font-weight:900">${t('autochart.play')}</button>
      </div>
      <details style="margin-top:18px;padding:14px 16px;border-radius:12px;background:#0a1026;color:#bfcbed">
        <summary style="cursor:pointer;font-weight:700;color:#dce5ff">${t('autochart.advanced')}</summary>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:14px">
          <div><small>${t('autochart.tempo')}</small><strong style="display:block">${bpm}</strong></div>
          <div><small>${t('autochart.confidence')}</small><strong style="display:block">${Math.round(this.analysis.tempo.confidence * 100)}%</strong></div>
          <div><small>${t('autochart.mode')}</small><strong style="display:block">${mode}</strong></div>
          <div><small>${t('autochart.onsets')}</small><strong style="display:block">${this.analysis.onsets.length}</strong></div>
          <div><small>${t('autochart.notes')}</small><strong style="display:block">${this.chart.notes.length}</strong></div>
          <div><small>${t('autochart.quality')}</small><strong style="display:block">${this.chart.quality.densityPerMinute}/min · ${Math.round(this.chart.quality.restRatio * 100)}% ${t('autochart.rest')}</strong></div>
        </div>
        <label style="display:block;margin-top:14px">${t('autochart.seed')}<input data-role="seed" type="number" value="${this.seed}" min="0" max="999999" style="display:block;margin-top:6px;padding:10px;width:130px;background:#080c1d;color:#fff;border:1px solid #53618d;border-radius:10px" /></label>
      </details>
    `;
    panel.querySelector<HTMLElement>('[data-role="song"]')!.textContent = this.songName || t('autochart.localSong');
    const difficulty = panel.querySelector<HTMLSelectElement>('[data-role="difficulty"]')!;
    difficulty.value = this.difficulty;
    difficulty.addEventListener('change', () => {
      this.difficulty = difficulty.value as AutoChartDifficulty;
      this.regenerate();
    });
    panel.querySelector<HTMLButtonElement>('[data-role="regenerate"]')!.addEventListener('click', () => {
      this.seed = Number(panel.querySelector<HTMLInputElement>('[data-role="seed"]')!.value) || 0;
      this.regenerate();
    });
    panel.querySelector<HTMLButtonElement>('[data-role="play"]')!.addEventListener('click', () => {
      if (this.decodedBuffer && this.chart) {
        new PulseGardenRunner(
          this.root,
          this.audio,
          this.decodedBuffer,
          this.chart,
          this.onBack,
          () => new AutoChartAnalysisView(this.root, this.onBack),
        );
      }
    });
    results.appendChild(panel);
    this.drawAnalysis(panel.querySelector<HTMLCanvasElement>('[data-role="analysis-canvas"]')!);
  }

  private async exit(): Promise<void> {
    this.analysisRun++;
    this.worker.terminate();
    await this.audio.close();
    if (this.onBack) this.onBack();
    else window.location.href = './';
  }

  private regenerate(): void {
    if (!this.analysis) return;
    this.chart = generateAutoChart(this.analysis, this.difficulty, this.seed);
    this.renderResults();
  }

  private drawAnalysis(canvas: HTMLCanvasElement): void {
    if (!this.analysis || !this.chart) return;
    const ctx = canvas.getContext('2d')!;
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = '#6075ba';
    ctx.beginPath();
    this.waveform.forEach((value, index) => {
      const x = index / Math.max(1, this.waveform.length - 1) * width;
      const y = height * 0.36 - value * height * 0.28;
      if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    const duration = Math.max(0.001, this.analysis.durationSec);
    for (const onset of this.analysis.onsets) {
      const x = onset.timeSec / duration * width;
      ctx.fillStyle = onset.band === 'low' ? '#ffb15c' : onset.band === 'high' ? '#91dfff' : '#85efb7';
      ctx.fillRect(x, height * 0.55, 2, height * 0.18);
    }
    for (const note of this.chart.notes) {
      const x = note.songTimeSec / duration * width;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x, height * 0.84, note.type === 'swipe' ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function downsampleWaveform(samples: Float32Array, points: number): number[] {
  const output: number[] = [];
  const stride = Math.max(1, Math.floor(samples.length / points));
  for (let start = 0; start < samples.length; start += stride) {
    let peak = 0;
    for (let i = start; i < Math.min(samples.length, start + stride); i++) {
      if (Math.abs(samples[i]) > Math.abs(peak)) peak = samples[i];
    }
    output.push(peak);
  }
  return output;
}

export function autoChartLocale(): string {
  return getLocale();
}

function buildSyntheticFixtureFile(): File {
  const sampleRate = 22_050;
  const durationSec = 10;
  const samples = new Float32Array(sampleRate * durationSec);
  for (let time = 0; time < durationSec; time += 0.5) {
    const start = Math.floor(time * sampleRate);
    for (let i = 0; i < sampleRate * 0.05 && start + i < samples.length; i++) {
      const envelope = Math.exp(-i / (sampleRate * 0.012));
      samples[start + i] += Math.sin(2 * Math.PI * 90 * i / sampleRate) * envelope * 0.75;
    }
  }
  const dataBytes = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(view, 8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataBytes, true);
  for (let i = 0; i < samples.length; i++) {
    view.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), true);
  }
  return new File([buffer], 'BeatGarden-120BPM-original-fixture.wav', { type: 'audio/wav' });
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
}
