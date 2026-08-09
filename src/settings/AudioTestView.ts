import { AudioEngine } from '../audio/AudioEngine';
import { Synth } from '../audio/Synth';
import { t } from '../i18n/strings';
import { loadSettings } from './settings';

export class AudioTestView {
  private readonly audio: AudioEngine;
  private readonly synth: Synth;
  private closed = false;

  constructor(root: HTMLElement, onBack: () => void) {
    const settings = loadSettings();
    this.audio = new AudioEngine({ musicVolume: settings.musicVolume, sfxVolume: settings.sfxVolume });
    this.synth = new Synth(this.audio);
    const page = document.createElement('main');
    page.style.cssText = 'width:min(780px,calc(100% - 40px));padding:34px;color:#fff;font-family:system-ui';
    page.innerHTML = `
      <button data-role="back" style="color:#b9c9ff;border:0;background:transparent;font-size:17px">← ${t('menu.back')}</button>
      <h1 style="font-size:42px;margin:30px 0 10px">${t('audioTest.title')}</h1>
      <p style="font-size:18px;color:#bdc9ee;line-height:1.55">${t('audioTest.instructions')}</p>
      <button data-role="enable" style="margin-top:25px;padding:16px 25px;border:0;border-radius:999px;background:#536bff;color:#fff;font-size:19px">${t('audio.enable')}</button>
      <div data-role="controls" hidden style="display:flex;gap:16px;flex-wrap:wrap;margin-top:25px">
        <button data-role="music" style="padding:16px 22px;border-radius:15px;border:1px solid #5d71b9;background:#1c2851;color:#fff;font-size:18px">${t('audioTest.music')}</button>
        <button data-role="sfx" style="padding:16px 22px;border-radius:15px;border:1px solid #5d71b9;background:#1c2851;color:#fff;font-size:18px">${t('audioTest.sfx')}</button>
      </div>
      <output data-role="status" style="display:block;margin-top:24px;color:#9ff0d0;font-size:18px">${t('audioTest.locked')}</output>`;
    const controls = page.querySelector<HTMLElement>('[data-role="controls"]')!;
    const status = page.querySelector<HTMLOutputElement>('[data-role="status"]')!;
    page.querySelector<HTMLButtonElement>('[data-role="enable"]')!.addEventListener('click', async (event) => {
      const ok = await this.audio.unlockFromUserGesture();
      if (!ok || this.closed) { status.textContent = t('audio.enableFailed'); return; }
      (event.currentTarget as HTMLButtonElement).hidden = true;
      controls.hidden = false;
      status.textContent = t('audioTest.ready');
    });
    page.querySelector<HTMLButtonElement>('[data-role="music"]')!.addEventListener('click', () => {
      const now = this.audio.now() + .02;
      [261.63, 329.63, 392].forEach((freq, index) => this.synth.play('pluck', now + index * .16, freq, .35, .7));
      status.textContent = t('audioTest.musicPlayed');
    });
    page.querySelector<HTMLButtonElement>('[data-role="sfx"]')!.addEventListener('click', () => {
      this.synth.play('success', this.audio.now() + .02, undefined, undefined, .75);
      status.textContent = t('audioTest.sfxPlayed');
    });
    page.querySelector<HTMLButtonElement>('[data-role="back"]')!.addEventListener('click', () => {
      this.closed = true;
      void this.audio.close().then(onBack);
    });
    root.appendChild(page);
  }
}
