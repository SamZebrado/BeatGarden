import { t } from '../i18n/strings';
import { loadSettings, updateSettings } from './settings';
import { DataPortabilityPanel } from './DataPortabilityPanel';

export class SettingsView {
  constructor(private readonly root: HTMLElement, private readonly onBack: () => void) {
    this.render();
  }

  private render(): void {
    const settings = loadSettings();
    this.root.replaceChildren();
    this.root.style.cssText = 'width:100vw;height:100vh;display:block;overflow-x:hidden;overflow-y:auto;background:#090d20;color:#fff;font-family:system-ui;';
    const page = document.createElement('main');
    page.style.cssText = 'width:min(760px,calc(100% - 32px));margin:0 auto;padding:max(24px,env(safe-area-inset-top)) 0 max(32px,env(safe-area-inset-bottom));';
    page.innerHTML = `<button data-role="back" style="color:#b9c9ff;border:0;background:transparent;font-size:16px">← ${t('menu.back')}</button><h1 style="font-size:46px;margin-top:34px">${t('settings.title')}</h1><div style="display:grid;gap:28px;margin-top:34px;padding:26px;border:1px solid #344473;border-radius:20px;background:#121a35"><label>${t('settings.music')}<input data-role="music" type="range" min="0" max="1" step="0.01" value="${settings.musicVolume}" style="display:block;width:100%;margin-top:12px" /></label><label>${t('settings.sfx')}<input data-role="sfx" type="range" min="0" max="1" step="0.01" value="${settings.sfxVolume}" style="display:block;width:100%;margin-top:12px" /></label><label style="display:flex;gap:12px;align-items:center"><input data-role="motion" type="checkbox" ${settings.reducedMotion ? 'checked' : ''} /> ${t('settings.reducedMotion')}</label><p style="color:#aebbe4">${t('settings.saved')}</p></div>`;
    const save = () => updateSettings({
      musicVolume: Number(page.querySelector<HTMLInputElement>('[data-role="music"]')!.value),
      sfxVolume: Number(page.querySelector<HTMLInputElement>('[data-role="sfx"]')!.value),
      reducedMotion: page.querySelector<HTMLInputElement>('[data-role="motion"]')!.checked,
    });
    page.querySelector('[data-role="music"]')!.addEventListener('input', save);
    page.querySelector('[data-role="sfx"]')!.addEventListener('input', save);
    page.querySelector('[data-role="motion"]')!.addEventListener('change', save);
    page.querySelector('[data-role="back"]')!.addEventListener('click', this.onBack);
    this.root.appendChild(page);
    new DataPortabilityPanel(page);
  }
}
