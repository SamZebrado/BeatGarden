import { AutoChartAnalysisView } from '../autochart/AutoChartAnalysisView';
import { StageRunner } from '../game/StageRunner';
import { languageTargetAction, languageTargetLabel, t, toggleLocale } from '../i18n/strings';
import { FireflyDockStage } from '../stages/fireflyDock/FireflyDockStage';
import { BubbleKitchenStage, CloudPostStage, SleepyGreenhouseStage } from '../stages/original/GardenStages';
import { CalibrationView } from '../settings/CalibrationView';
import { SettingsView } from '../settings/SettingsView';
import { AudioTestView } from '../settings/AudioTestView';
import { StreamSafeView } from '../settings/StreamSafeView';

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
    this.prepareRoot();
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
  };

  showStageSelect = (): void => {
    this.prepareRoot();
    const page = document.createElement('main');
    page.style.cssText = 'width:min(900px,calc(100% - 40px));padding:34px;color:#fff;font-family:system-ui;';
    page.innerHTML = `<button data-role="back" style="color:#b9c9ff;border:0;background:transparent;font-size:17px">← ${t('menu.back')}</button><h1 style="font-size:44px;margin-top:24px">${t('menu.stageSelect')}</h1><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:18px;margin-top:24px">${this.stageCard('firefly', t('stage.firefly.title'), t('menu.fireflyDetail'), '#1c2a63,#281d4e')}${this.stageCard('bubble', t('stage.bubble.title'), t('menu.bubbleDetail'), '#592149,#311449')}${this.stageCard('cloud', t('stage.cloud.title'), t('menu.cloudDetail'), '#24558a,#283d73')}${this.stageCard('greenhouse', t('stage.greenhouse.title'), t('menu.greenhouseDetail'), '#164d47,#102e3b')}</div>`;
    page.querySelector<HTMLButtonElement>('[data-role="back"]')!.addEventListener('click', this.showMenu);
    page.querySelector<HTMLButtonElement>('[data-role="firefly"]')!.addEventListener('click', this.playFirefly);
    page.querySelector<HTMLButtonElement>('[data-role="bubble"]')!.addEventListener('click', () => this.playStage(new BubbleKitchenStage()));
    page.querySelector<HTMLButtonElement>('[data-role="cloud"]')!.addEventListener('click', () => this.playStage(new CloudPostStage()));
    page.querySelector<HTMLButtonElement>('[data-role="greenhouse"]')!.addEventListener('click', () => this.playStage(new SleepyGreenhouseStage()));
    this.root.appendChild(page);
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

  private playStage(stage: FireflyDockStage | BubbleKitchenStage | CloudPostStage | SleepyGreenhouseStage): void {
    this.prepareRoot();
    new StageRunner({ root: this.root, stage, onExit: this.showStageSelect });
  }

  private stageCard(role: string, title: string, detail: string, colors: string): string {
    return `<button data-role="${role}" style="min-height:150px;padding:24px;border-radius:22px;border:1px solid #586ecc;background:linear-gradient(145deg,${colors});color:#fff;text-align:left;cursor:pointer"><strong style="font-size:28px">${title}</strong><span style="display:block;margin-top:10px;color:#e0e5ff;font-size:17px;line-height:1.45">${detail}</span></button>`;
  }

  private prepareRoot(): void {
    this.root.replaceChildren();
    this.root.style.cssText = 'width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden;background:radial-gradient(circle at 50% 20%,#18244d,#080b1c 70%);';
  }
}
