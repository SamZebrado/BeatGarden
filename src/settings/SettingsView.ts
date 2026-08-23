import { t } from '../i18n/strings';
import { loadSettings, updateSettings } from './settings';
import { DataPortabilityPanel } from './DataPortabilityPanel';
import { loadRunningSave, updateRunningSave } from '../running/core/save';
import type { DynamicIntensity, MusicStyle } from '../running/core/journal';

export class SettingsView {
  constructor(private readonly root: HTMLElement, private readonly onBack: () => void) {
    this.render();
  }

  private render(): void {
    const settings = loadSettings();
    const running = loadRunningSave();
    this.root.replaceChildren();
    this.root.style.cssText = 'width:100vw;height:100vh;display:block;overflow-x:hidden;overflow-y:auto;background:#090d20;color:#fff;font-family:system-ui;';
    const page = document.createElement('main');
    page.style.cssText = 'width:min(760px,calc(100% - 32px));margin:0 auto;padding:max(24px,env(safe-area-inset-top)) 0 max(32px,env(safe-area-inset-bottom));';
    page.innerHTML = `<button data-role="back" style="color:#b9c9ff;border:0;background:transparent;font-size:16px">← ${t('menu.back')}</button><h1 style="font-size:46px;margin-top:34px">${t('settings.title')}</h1><section style="display:grid;gap:24px;margin-top:34px;padding:26px;border:1px solid #344473;border-radius:20px;background:#121a35"><h2 style="margin:0">${t('settings.audioTitle')}</h2><label>${t('settings.musicStyle')}<select data-role="music-style" style="display:block;width:100%;margin-top:10px;padding:10px;border-radius:10px;background:#0d1730;color:#fff"><option value="classic" ${running.musicStyle === 'classic' ? 'selected' : ''}>${t('settings.musicStyle.classic')}</option><option value="chiptune" ${running.musicStyle === 'chiptune' ? 'selected' : ''}>${t('settings.musicStyle.chiptune')}</option><option value="organic" ${running.musicStyle === 'organic' ? 'selected' : ''}>${t('settings.musicStyle.organic')}</option></select></label><label>${t('settings.music')}<input data-role="music" type="range" min="0" max="1" step="0.01" value="${running.runningMusicVolume}" style="display:block;width:100%;margin-top:12px" /></label><label>${t('settings.sfx')}<input data-role="sfx" type="range" min="0" max="1" step="0.01" value="${running.runningSfxVolume}" style="display:block;width:100%;margin-top:12px" /></label><label>${t('settings.dynamicIntensity')}<select data-role="dynamic-intensity" style="display:block;width:100%;margin-top:10px;padding:10px;border-radius:10px;background:#0d1730;color:#fff"><option value="full" ${running.dynamicIntensity === 'full' ? 'selected' : ''}>${t('settings.dynamicIntensity.full')}</option><option value="soft" ${running.dynamicIntensity === 'soft' ? 'selected' : ''}>${t('settings.dynamicIntensity.soft')}</option><option value="off" ${running.dynamicIntensity === 'off' ? 'selected' : ''}>${t('settings.dynamicIntensity.off')}</option></select></label><label style="display:flex;gap:12px;align-items:center"><input data-role="motion" type="checkbox" ${settings.reducedMotion ? 'checked' : ''} /> ${t('settings.reducedMotion')}</label><p style="color:#aebbe4">${t('settings.saved')}</p></section>`;
    const save = () => updateSettings({
      musicVolume: Number(page.querySelector<HTMLInputElement>('[data-role="music"]')!.value),
      sfxVolume: Number(page.querySelector<HTMLInputElement>('[data-role="sfx"]')!.value),
      reducedMotion: page.querySelector<HTMLInputElement>('[data-role="motion"]')!.checked,
    });
    const saveRunningAudio = () => updateRunningSave({
      musicStyle: page.querySelector<HTMLSelectElement>('[data-role="music-style"]')!.value as MusicStyle,
      runningMusicVolume: Number(page.querySelector<HTMLInputElement>('[data-role="music"]')!.value),
      runningSfxVolume: Number(page.querySelector<HTMLInputElement>('[data-role="sfx"]')!.value),
      dynamicIntensity: page.querySelector<HTMLSelectElement>('[data-role="dynamic-intensity"]')!.value as DynamicIntensity,
    });
    page.querySelector('[data-role="music"]')!.addEventListener('input', () => { save(); saveRunningAudio(); });
    page.querySelector('[data-role="sfx"]')!.addEventListener('input', () => { save(); saveRunningAudio(); });
    page.querySelector('[data-role="music-style"]')!.addEventListener('change', saveRunningAudio);
    page.querySelector('[data-role="dynamic-intensity"]')!.addEventListener('change', saveRunningAudio);
    page.querySelector('[data-role="motion"]')!.addEventListener('change', save);
    page.querySelector('[data-role="back"]')!.addEventListener('click', this.onBack);
    this.root.appendChild(page);
    new DataPortabilityPanel(page);
  }
}
