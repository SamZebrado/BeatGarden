import { t } from '../i18n/strings';

export class StreamSafeView {
  constructor(root: HTMLElement, onBack: () => void) {
    const page = document.createElement('main');
    page.style.cssText = 'width:min(900px,calc(100% - 40px));max-height:100vh;overflow:auto;padding:34px;color:#fff;font-family:system-ui;box-sizing:border-box';
    page.innerHTML = `
      <button data-role="back" style="color:#b9c9ff;border:0;background:transparent;font-size:17px">← ${t('menu.back')}</button>
      <h1 style="font-size:42px;margin:26px 0 8px">${t('provenance.title')}</h1>
      <p style="color:#b9c7ee;font-size:18px;line-height:1.55">${t('provenance.intro')}</p>
      <section style="margin-top:28px;padding:24px;border:1px solid #4e9b80;border-radius:20px;background:#12352f">
        <h2 style="margin:0;color:#b6f5d8">${t('provenance.builtin')}</h2>
        <p style="font-size:22px;font-weight:800">${t('provenance.streamSafe')}</p>
        <p style="line-height:1.6;color:#d4efe4">${t('provenance.builtinDetail')}</p>
      </section>
      <section style="margin-top:18px;padding:24px;border:1px solid #9c7651;border-radius:20px;background:#3a291c">
        <h2 style="margin:0;color:#ffd29c">${t('provenance.imported')}</h2>
        <p style="font-size:22px;font-weight:800">${t('provenance.rightsUnknown')}</p>
        <p style="line-height:1.6;color:#f1dcc8">${t('provenance.importedDetail')}</p>
      </section>
      <p style="margin-top:24px;color:#9eabd2;line-height:1.55">${t('provenance.disclaimer')}</p>`;
    page.querySelector<HTMLButtonElement>('[data-role="back"]')!.addEventListener('click', onBack);
    root.appendChild(page);
  }
}
