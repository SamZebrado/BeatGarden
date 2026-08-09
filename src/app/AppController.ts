import { AutoChartAnalysisView } from '../autochart/AutoChartAnalysisView';
import { StageRunner } from '../game/StageRunner';
import { t, toggleLocale } from '../i18n/strings';
import { FireflyDockStage } from '../stages/fireflyDock/FireflyDockStage';
import { CalibrationView } from '../settings/CalibrationView';
import { SettingsView } from '../settings/SettingsView';

export class AppController {
  constructor(private readonly root: HTMLElement) {}

  start(): void {
    const requested = new URLSearchParams(window.location.search).get('screen');
    if (requested === 'autochart') this.showAutoChart();
    else if (requested === 'firefly') this.playFirefly();
    else this.showMenu();
  }

  showMenu = (): void => {
    this.prepareRoot();
    const page = document.createElement('main');
    page.style.cssText = 'width:min(980px,calc(100% - 40px));padding:34px;color:#fff;font-family:system-ui;text-align:center;';
    page.innerHTML = `
      <div style="display:flex;justify-content:flex-end"><button data-role="language" style="padding:10px 16px;border-radius:999px;border:1px solid #53618d;background:#151c38;color:#fff">${t('language.switch')}</button></div>
      <div style="font-size:72px;margin-top:10px">🌱</div>
      <h1 style="font-size:58px;letter-spacing:-2px">BeatGarden</h1>
      <p style="font-size:21px;color:#cad7ff;margin-top:12px">${t('menu.tagline')}</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;margin-top:42px;text-align:left">
        <button data-role="original" style="min-height:170px;padding:25px;border-radius:22px;border:1px solid #4e67b8;background:linear-gradient(145deg,#17295a,#1b2046);color:#fff;text-align:left;cursor:pointer"><strong style="font-size:28px">${t('menu.original')}</strong><span style="display:block;color:#c9d7ff;font-size:17px;line-height:1.5;margin-top:12px">${t('menu.originalDetail')}</span></button>
        <button data-role="autochart" style="min-height:170px;padding:25px;border-radius:22px;border:1px solid #4e9b80;background:linear-gradient(145deg,#123d38,#172e45);color:#fff;text-align:left;cursor:pointer"><strong style="font-size:28px">${t('menu.yourMusic')}</strong><span style="display:block;color:#d2f5e6;font-size:17px;line-height:1.5;margin-top:12px">${t('menu.yourMusicDetail')}</span></button>
      </div>`;
    const utilities = document.createElement('div');
    utilities.style.cssText = 'display:flex;justify-content:center;gap:14px;flex-wrap:wrap;margin-top:22px';
    utilities.innerHTML = `<button data-role="calibration" style="padding:14px 18px;border:1px solid #59678e;border-radius:14px;background:#151c38;color:#fff"><strong>${t('menu.calibration')}</strong><span style="display:block;color:#aebbe4;margin-top:5px">${t('menu.calibrationDetail')}</span></button><button data-role="settings" style="padding:14px 18px;border:1px solid #59678e;border-radius:14px;background:#151c38;color:#fff"><strong>${t('menu.settings')}</strong><span style="display:block;color:#aebbe4;margin-top:5px">${t('menu.settingsDetail')}</span></button>`;
    page.appendChild(utilities);
    page.querySelector<HTMLButtonElement>('[data-role="original"]')!.addEventListener('click', this.showStageSelect);
    page.querySelector<HTMLButtonElement>('[data-role="autochart"]')!.addEventListener('click', this.showAutoChart);
    utilities.querySelector<HTMLButtonElement>('[data-role="calibration"]')!.addEventListener('click', this.showCalibration);
    utilities.querySelector<HTMLButtonElement>('[data-role="settings"]')!.addEventListener('click', this.showSettings);
    page.querySelector<HTMLButtonElement>('[data-role="language"]')!.addEventListener('click', () => { toggleLocale(); this.showMenu(); });
    this.root.appendChild(page);
  };

  showStageSelect = (): void => {
    this.prepareRoot();
    const page = document.createElement('main');
    page.style.cssText = 'width:min(900px,calc(100% - 40px));padding:34px;color:#fff;font-family:system-ui;';
    page.innerHTML = `<button data-role="back" style="color:#b9c9ff;border:0;background:transparent;font-size:17px">← ${t('menu.back')}</button><h1 style="font-size:44px;margin-top:34px">${t('menu.stageSelect')}</h1><button data-role="firefly" style="display:block;width:100%;margin-top:26px;padding:26px;border-radius:22px;border:1px solid #586ecc;background:linear-gradient(145deg,#1c2a63,#281d4e);color:#fff;text-align:left"><strong style="font-size:30px">${t('stage.firefly.title')}</strong><span style="display:block;margin-top:10px;color:#d5dcff;font-size:18px">${t('menu.fireflyDetail')}</span></button>`;
    page.querySelector<HTMLButtonElement>('[data-role="back"]')!.addEventListener('click', this.showMenu);
    page.querySelector<HTMLButtonElement>('[data-role="firefly"]')!.addEventListener('click', this.playFirefly);
    this.root.appendChild(page);
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

  playFirefly = (): void => {
    this.prepareRoot();
    new StageRunner({ root: this.root, stage: new FireflyDockStage(), onExit: this.showStageSelect });
  };

  private prepareRoot(): void {
    this.root.replaceChildren();
    this.root.style.cssText = 'width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden;background:radial-gradient(circle at 50% 20%,#18244d,#080b1c 70%);';
  }
}
