// BeatGarden main entry.
//
// Creates a StageRunner for the currently-in-development stage (Firefly Dock).
// Stage menu / stage select UI is Phase 2 (after GATE 1 Pass), for now direct
// boot into stage 1.

import { t } from './i18n/strings';
import { AppController } from './app/AppController';

function boot(): void {
  const root = document.getElementById('app');
  if (!root) {
    document.body.innerHTML = `<div style="padding:24px;color:#fff;font-family:sans-serif">${t('error.missingRoot')}</div>`;
    return;
  }
  new AppController(root).start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
