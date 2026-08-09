// BeatGarden main entry.
//
// Creates a StageRunner for the currently-in-development stage (Firefly Dock).
// Stage menu / stage select UI is Phase 2 (after GATE 1 Pass), for now direct
// boot into stage 1.

import { StageRunner } from './game/StageRunner';
import { FireflyDockStage } from './stages/fireflyDock/FireflyDockStage';
import { t } from './i18n/strings';
import { AutoChartAnalysisView } from './autochart/AutoChartAnalysisView';

function boot(): void {
  const root = document.getElementById('app');
  if (!root) {
    document.body.innerHTML = `<div style="padding:24px;color:#fff;font-family:sans-serif">${t('error.missingRoot')}</div>`;
    return;
  }
  if (new URLSearchParams(window.location.search).get('screen') === 'autochart') {
    new AutoChartAnalysisView(root);
    return;
  }
  // StageRunner creates canvas inside root, handles audio unlock overlay, etc.
  new StageRunner({
    root,
    stage: new FireflyDockStage(),
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
