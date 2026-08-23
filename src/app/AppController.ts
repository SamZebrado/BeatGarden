import { AutoChartAnalysisView } from '../autochart/AutoChartAnalysisView';
import { StageRunner } from '../game/StageRunner';
import { languageTargetAction, languageTargetLabel, t, toggleLocale } from '../i18n/strings';
import { FireflyDockStage } from '../stages/fireflyDock/FireflyDockStage';
import { BubbleKitchenStage, CloudPostStage, SleepyGreenhouseStage } from '../stages/original/GardenStages';
import { CalibrationView } from '../settings/CalibrationView';
import { SettingsView } from '../settings/SettingsView';
import { AudioTestView } from '../settings/AudioTestView';
import { StreamSafeView } from '../settings/StreamSafeView';
import { loadBestScore } from '../settings/scores';
import type { StringKey } from '../i18n/strings';
import { resultGrade } from '../game/resultPresentation';

type RhythmStage = FireflyDockStage | BubbleKitchenStage | CloudPostStage | SleepyGreenhouseStage;
type StageCardSpec = {
  role: string;
  id: string;
  create: () => RhythmStage;
  detailKey: StringKey;
  inputKey: StringKey;
  difficultyKey: StringKey;
  colors: string;
  preview: string;
};

const STAGES: readonly StageCardSpec[] = [
  { role: 'firefly', id: 'firefly-dock', create: () => new FireflyDockStage(), detailKey: 'menu.fireflyDetail', inputKey: 'menu.input.tap', difficultyKey: 'menu.difficulty.warmup', colors: '#1c2a63,#281d4e', preview: '✦ · ◉ · ✦' },
  { role: 'bubble', id: 'bubble-kitchen', create: () => new BubbleKitchenStage(), detailKey: 'menu.bubbleDetail', inputKey: 'menu.input.tap', difficultyKey: 'menu.difficulty.medium', colors: '#592149,#311449', preview: '◯　◉　◯' },
  { role: 'cloud', id: 'cloud-post', create: () => new CloudPostStage(), detailKey: 'menu.cloudDetail', inputKey: 'menu.input.swipe', difficultyKey: 'menu.difficulty.medium', colors: '#24558a,#283d73', preview: '←　▱　→' },
  { role: 'greenhouse', id: 'sleepy-greenhouse', create: () => new SleepyGreenhouseStage(), detailKey: 'menu.greenhouseDetail', inputKey: 'menu.input.hold', difficultyKey: 'menu.difficulty.focus', colors: '#164d47,#102e3b', preview: '⌄　│　⌃' },
];

export class AppController {
  constructor(
    private readonly root: HTMLElement,
    private readonly options: { onExitToModeSelect?: () => void } = {},
  ) {}

  start(): void {
    const requested = new URLSearchParams(window.location.search).get('screen');
    if (requested === 'autochart') this.showAutoChart();
    else if (requested === 'firefly') this.playFirefly();
    else if (requested === 'bubble') this.playStage(new BubbleKitchenStage());
    else if (requested === 'cloud') this.playStage(new CloudPostStage());
    else if (requested === 'greenhouse') this.playStage(new SleepyGreenhouseStage());
    else this.showMenu();
  }

  showMenu = (): void => {
    this.prepareRoot(true);
    const page = document.createElement('main');
    page.style.cssText = 'width:min(980px,calc(100% - 40px));padding:34px;color:#fff;font-family:system-ui;text-align:center;';
    page.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><button data-role="modes" style="padding:10px 16px;border-radius:999px;border:1px solid #53618d;background:#151c38;color:#fff">← ${t('mode.backToModes')}</button><button data-role="language" aria-label="${languageTargetAction()}" title="${languageTargetAction()}" style="padding:10px 16px;border-radius:999px;border:1px solid #53618d;background:#151c38;color:#fff">${languageTargetLabel()}</button></div>
      <div style="font-size:72px;margin-top:10px">🌱</div>
      <h1 style="font-size:58px;letter-spacing:-2px">BeatGarden</h1>
      <p style="font-size:21px;color:#cad7ff;margin-top:12px">${t('menu.tagline')}</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;margin-top:42px;text-align:left">
        <button data-role="original" style="min-height:170px;padding:25px;border-radius:22px;border:1px solid #4e67b8;background:linear-gradient(145deg,#17295a,#1b2046);color:#fff;text-align:left;cursor:pointer"><strong style="font-size:28px">${t('menu.original')}</strong><span style="display:block;color:#c9d7ff;font-size:17px;line-height:1.5;margin-top:12px">${t('menu.originalDetail')}</span></button>
        <button data-role="autochart" style="min-height:170px;padding:25px;border-radius:22px;border:1px solid #4e9b80;background:linear-gradient(145deg,#123d38,#172e45);color:#fff;text-align:left;cursor:pointer"><strong style="font-size:28px">${t('menu.yourMusic')}</strong><span style="display:block;color:#d2f5e6;font-size:17px;line-height:1.5;margin-top:12px">${t('menu.yourMusicDetail')}</span></button>
      </div>`;
    const utilities = document.createElement('div');
    utilities.style.cssText = 'display:flex;justify-content:center;gap:14px;flex-wrap:wrap;margin-top:22px';
    utilities.innerHTML = `<button data-role="calibration" style="padding:14px 18px;border:1px solid #59678e;border-radius:14px;background:#151c38;color:#fff"><strong>${t('menu.calibration')}</strong><span style="display:block;color:#aebbe4;margin-top:5px">${t('menu.calibrationDetail')}</span></button><button data-role="audio-test" style="padding:14px 18px;border:1px solid #59678e;border-radius:14px;background:#151c38;color:#fff"><strong>${t('menu.audioTest')}</strong><span style="display:block;color:#aebbe4;margin-top:5px">${t('menu.audioTestDetail')}</span></button><button data-role="settings" style="padding:14px 18px;border:1px solid #59678e;border-radius:14px;background:#151c38;color:#fff"><strong>${t('menu.settings')}</strong><span style="display:block;color:#aebbe4;margin-top:5px">${t('menu.settingsDetail')}</span></button><button data-role="provenance" style="padding:14px 18px;border:1px solid #59678e;border-radius:14px;background:#151c38;color:#fff"><strong>${t('menu.provenance')}</strong><span style="display:block;color:#aebbe4;margin-top:5px">${t('menu.provenanceDetail')}</span></button>`;
    page.appendChild(utilities);
    page.querySelector<HTMLButtonElement>('[data-role="original"]')!.addEventListener('click', this.showStageSelect);
    page.querySelector<HTMLButtonElement>('[data-role="autochart"]')!.addEventListener('click', this.showAutoChart);
    utilities.querySelector<HTMLButtonElement>('[data-role="calibration"]')!.addEventListener('click', this.showCalibration);
    utilities.querySelector<HTMLButtonElement>('[data-role="settings"]')!.addEventListener('click', this.showSettings);
    utilities.querySelector<HTMLButtonElement>('[data-role="audio-test"]')!.addEventListener('click', this.showAudioTest);
    utilities.querySelector<HTMLButtonElement>('[data-role="provenance"]')!.addEventListener('click', this.showProvenance);
    page.querySelector<HTMLButtonElement>('[data-role="language"]')!.addEventListener('click', () => { toggleLocale(); this.showMenu(); });
    const modes = page.querySelector<HTMLButtonElement>('[data-role="modes"]')!;
    if (this.options.onExitToModeSelect) modes.addEventListener('click', this.options.onExitToModeSelect);
    else modes.remove();
    this.root.appendChild(page);
    this.animateReveal(page);
  };

  showStageSelect = (): void => {
    this.prepareRoot(true);
    const page = document.createElement('main');
    page.style.cssText = 'width:min(980px,calc(100% - 32px));padding:28px 0 42px;color:#fff;font-family:system-ui;';
    page.innerHTML = `<button data-role="back" style="color:#b9c9ff;border:0;background:transparent;font-size:17px;padding:10px 0;cursor:pointer">← ${t('menu.back')}</button><h1 style="font-size:clamp(36px,7vw,52px);margin:18px 0 5px;letter-spacing:-.04em">${t('menu.stageSelect')}</h1><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,390px),1fr));gap:18px;margin-top:24px">${STAGES.map((spec) => this.stageCard(spec)).join('')}</div>`;
    page.querySelector<HTMLButtonElement>('[data-role="back"]')!.addEventListener('click', this.showMenu);
    STAGES.forEach((spec) => page.querySelector<HTMLButtonElement>(`[data-role="${spec.role}"]`)!
      .addEventListener('click', () => this.playStage(spec.create())));
    this.root.appendChild(page);
    this.animateReveal(page);
    const status = document.createElement('output');
    status.id = 'app-runtime-status';
    status.style.cssText = 'position:fixed;left:-10000px;width:1px;height:1px;overflow:hidden';
    status.textContent = JSON.stringify({
      screen: 'stage-select',
      debugHandlePresent: '__BEATGARDEN__' in window,
    });
    this.root.appendChild(status);
  };

  showAutoChart = (): void => {
    this.prepareRoot();
    new AutoChartAnalysisView(this.root, this.showMenu);
  };

  showCalibration = (): void => {
    this.prepareRoot();
    new CalibrationView(this.root, this.showMenu);
  };

  showSettings = (): void => {
    this.prepareRoot();
    new SettingsView(this.root, this.showMenu);
  };

  showAudioTest = (): void => {
    this.prepareRoot();
    new AudioTestView(this.root, this.showMenu);
  };

  showProvenance = (): void => {
    this.prepareRoot();
    new StreamSafeView(this.root, this.showMenu);
  };

  playFirefly = (): void => {
    this.playStage(new FireflyDockStage());
  };

  private playStage(stage: RhythmStage): void {
    this.prepareRoot();
    const index = STAGES.findIndex((spec) => spec.id === stage.id);
    const next = index >= 0 && index < STAGES.length - 1 ? STAGES[index + 1] : undefined;
    new StageRunner({
      root: this.root,
      stage,
      onExit: this.showStageSelect,
      ...(next ? { onNext: () => this.playStage(next.create()) } : {}),
    });
  }

  private stageCard(spec: StageCardSpec): string {
    const stage = spec.create();
    const best = loadBestScore(stage.id);
    const record = best
      ? `${t('menu.bestGrade')} ${resultGrade(best.accuracy)} · ${t('menu.bestAccuracy')} ${(best.accuracy * 100).toFixed(1)}%`
      : t('menu.noRecord');
    return `<button data-role="${spec.role}" style="min-height:240px;padding:0;border-radius:24px;overflow:hidden;border:1px solid #586ecc;background:linear-gradient(145deg,${spec.colors});color:#fff;text-align:left;cursor:pointer;box-shadow:0 18px 46px rgba(0,0,0,.22)"><span aria-hidden="true" style="display:flex;align-items:center;justify-content:center;height:82px;background:rgba(255,255,255,.07);font:700 25px ui-monospace;letter-spacing:.15em;color:#e5ebff">${spec.preview}</span><span style="display:block;padding:20px 22px 22px"><strong style="font-size:27px">${t(stage.titleKey)}</strong><span style="display:block;margin-top:8px;color:#e0e5ff;font-size:16px;line-height:1.4">${t(spec.detailKey)}</span><span style="display:flex;gap:7px;flex-wrap:wrap;margin-top:16px"><span style="padding:6px 9px;border-radius:999px;background:rgba(4,8,25,.28);font-size:12px">${t('menu.mechanic')} · ${t(spec.inputKey)}</span><span style="padding:6px 9px;border-radius:999px;background:rgba(4,8,25,.28);font-size:12px">${t('menu.difficulty')} · ${t(spec.difficultyKey)}</span></span><span style="display:block;margin-top:13px;color:#9fe9d4;font-size:13px">${record}</span></span></button>`;
  }

  private prepareRoot(scrollable = false): void {
    this.root.replaceChildren();
    this.root.style.cssText = scrollable
      ? 'width:100%;min-height:100dvh;display:flex;align-items:flex-start;justify-content:center;overflow-x:hidden;overflow-y:auto;background:radial-gradient(circle at 50% 20%,#18244d,#080b1c 70%);'
      : 'width:100vw;height:100dvh;display:flex;align-items:center;justify-content:center;overflow:hidden;background:radial-gradient(circle at 50% 20%,#18244d,#080b1c 70%);';
  }

  private animateReveal(element: HTMLElement): void {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || typeof element.animate !== 'function') return;
    const animation = element.animate(
      [{ opacity: .35, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }],
      { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' },
    );
    element.addEventListener('pointerdown', () => animation.finish(), { once: true, capture: true });
  }
}
