import { t, toggleLocale } from '../i18n/strings';

export class ModeSelectView {
  constructor(
    private readonly root: HTMLElement,
    private readonly actions: {
      onRhythm: () => void;
      onRunning: () => void;
      onLocaleChanged: () => void;
    },
  ) {}

  show(): void {
    this.root.replaceChildren();
    this.root.style.cssText = 'width:100vw;height:100vh;display:block;overflow-x:hidden;overflow-y:auto;background:radial-gradient(circle at 50% 10%,#183453,#07111c 72%);';
    const page = document.createElement('main');
    page.dataset.role = 'mode-select';
    page.style.cssText = 'width:min(980px,calc(100% - 32px));min-height:100%;margin:0 auto;padding:max(22px,env(safe-area-inset-top)) 0 max(28px,env(safe-area-inset-bottom));color:#fff;font-family:system-ui;text-align:center;display:flex;flex-direction:column;justify-content:center;';
    page.innerHTML = `
      <div style="display:flex;justify-content:flex-end"><button data-role="language" style="padding:10px 16px;border-radius:999px;border:1px solid #537496;background:#10253a;color:#fff">${t('language.switch')}</button></div>
      <div style="font-size:64px;margin-top:8px">🌱</div>
      <h1 style="font-size:clamp(42px,9vw,64px);letter-spacing:-2px">BeatGarden</h1>
      <p style="font-size:clamp(17px,4vw,21px);color:#cde6f5;margin:12px auto 0;max-width:620px">${t('mode.tagline')}</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr));gap:18px;margin-top:34px;text-align:left">
        <button data-role="rhythm" style="min-height:180px;padding:26px;border-radius:26px;border:1px solid #6978db;background:linear-gradient(145deg,#1d2c6b,#241c51);color:#fff;text-align:left;cursor:pointer"><span aria-hidden="true" style="font-size:38px">♫</span><strong style="display:block;font-size:29px;margin-top:12px">${t('mode.rhythm')}</strong><span style="display:block;color:#dbe0ff;font-size:17px;line-height:1.5;margin-top:10px">${t('mode.rhythmDetail')}</span></button>
        <button data-role="running" style="min-height:180px;padding:26px;border-radius:26px;border:1px solid #54aa75;background:linear-gradient(145deg,#164c3a,#15324b);color:#fff;text-align:left;cursor:pointer"><span aria-hidden="true" style="font-size:38px">➜</span><strong style="display:block;font-size:29px;margin-top:12px">${t('mode.running')}</strong><span style="display:block;color:#d9f6e2;font-size:17px;line-height:1.5;margin-top:10px">${t('mode.runningDetail')}</span></button>
      </div>`;
    page.querySelector<HTMLButtonElement>('[data-role="rhythm"]')!.addEventListener('click', this.actions.onRhythm);
    page.querySelector<HTMLButtonElement>('[data-role="running"]')!.addEventListener('click', this.actions.onRunning);
    page.querySelector<HTMLButtonElement>('[data-role="language"]')!.addEventListener('click', () => {
      toggleLocale();
      this.actions.onLocaleChanged();
    });
    this.root.appendChild(page);
  }
}
