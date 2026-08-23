import { languageTargetAction, languageTargetLabel, t, toggleLocale } from '../i18n/strings';
import { loadRunningSave, updateRunningSave } from './core/save';
import { resetSemanticHints } from './SemanticHints';
import { warmRunningOfflineCache } from '../pwa/warmRunningCache';
import type { RunningDifficulty } from './core/difficulty';
import { clearCurrentRun, loadCurrentRun, type CurrentRunV1 } from './core/currentRun';
import { SettingsView } from '../settings/SettingsView';

export interface RunningGameHandle { destroy(): void; saveNow?(): void }

export class RunningModeHost {
  private game: RunningGameHandle | null = null;
  private loading = false;
  private readonly onVisibilityChange = (): void => { if (document.visibilityState === 'hidden') this.game?.saveNow?.(); };
  private readonly onPageHide = (): void => this.game?.saveNow?.();

  constructor(
    private readonly root: HTMLElement,
    private readonly actions: {
      initialWorld: string | null;
      difficulty: RunningDifficulty;
      onBack: () => void;
      onWorldChanged: (world: string | null) => void;
      onDifficultyChanged: (difficulty: RunningDifficulty) => void;
    },
  ) {}

  start(): void {
    loadRunningSave();
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('pagehide', this.onPageHide);
    const current = loadCurrentRun();
    if (current) { this.showResumeChoice(current); return; }
    if (this.actions.initialWorld === 'phd' || this.actions.initialWorld === 'master' || this.actions.initialWorld === 'work') void this.launchWorld(this.actions.initialWorld);
    else this.showWorldSelect();
  }

  destroy(): void {
    this.game?.saveNow?.();
    this.game?.destroy();
    this.game = null;
    this.root.replaceChildren();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('pagehide', this.onPageHide);
  }

  private showResumeChoice(run: CurrentRunV1): void {
    this.root.replaceChildren();
    this.root.style.cssText = 'width:100vw;height:100vh;display:grid;place-items:center;background:radial-gradient(circle at 50% 20%,#163f36,#071512 72%);color:#fff;font-family:system-ui;';
    const panel = document.createElement('main');
    panel.dataset.role = 'running-resume-choice';
    panel.style.cssText = 'width:min(560px,calc(100% - 32px));padding:28px;border:1px solid #6a9685;border-radius:24px;background:#10231f;text-align:center;box-shadow:0 24px 80px #0007;';
    const snapshot = run.simulation as { time?: number };
    const worldName = t(`running.${run.world}` as const);
    const detail = t('running.resumeDetail').replace('{world}', worldName).replace('{difficulty}', t(`running.difficulty.${run.difficulty}`)).replace('{time}', `${Math.max(0, Math.floor(snapshot.time ?? 0))}s`);
    panel.innerHTML = `<div style="font-size:52px">↻</div><h1 style="font-size:clamp(28px,7vw,42px);margin:12px 0">${t('running.resumeTitle')}</h1><p style="color:#cce0d9;line-height:1.6">${detail}</p><div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:24px"><button data-role="continue-run" style="padding:13px 20px;border-radius:999px;border:1px solid #92edb5;background:#1d5a43;color:#fff;font-weight:700;cursor:pointer">${t('running.continueRun')}</button><button data-role="start-new-run" style="padding:13px 20px;border-radius:999px;border:1px solid #68877e;background:#17342d;color:#fff;cursor:pointer">${t('running.startNewRun')}</button></div>`;
    panel.querySelector<HTMLButtonElement>('[data-role="continue-run"]')!.addEventListener('click', () => void this.launchWorld(run.world, run));
    panel.querySelector<HTMLButtonElement>('[data-role="start-new-run"]')!.addEventListener('click', () => {
      clearCurrentRun();
      const requested = this.actions.initialWorld;
      if (requested === 'phd' || requested === 'master' || requested === 'work') void this.launchWorld(requested);
      else this.showWorldSelect();
    });
    this.root.appendChild(panel);
  }

  private showWorldSelect(): void {
    this.game?.destroy();
    this.game = null;
    this.root.replaceChildren();
    this.root.style.cssText = 'width:100vw;height:100vh;display:block;overflow-x:hidden;overflow-y:auto;background:radial-gradient(circle at 50% 15%,#163f36,#071512 72%);';
    const page = document.createElement('main');
    page.dataset.role = 'running-world-select';
    page.style.cssText = 'width:min(980px,calc(100% - 32px));min-height:100%;margin:0 auto;padding:max(20px,env(safe-area-inset-top)) 0 max(28px,env(safe-area-inset-bottom));color:#fff;font-family:system-ui;display:flex;flex-direction:column;justify-content:center;';
    const world = (id: 'master' | 'work', name: string, detail: string, icon: string, color: string) => `<button data-role="${id}" style="min-height:150px;padding:22px;border-radius:22px;border:1px solid ${color};background:#10231f;color:#fff;text-align:left;cursor:pointer"><span style="font-size:30px">${icon}</span><strong style="display:block;font-size:23px;margin-top:8px">${name}</strong><span style="display:block;margin-top:7px;color:#cce0d9">${detail}</span></button>`;
    const locked = (name: string, icon: string) => `<div aria-disabled="true" style="min-height:128px;padding:22px;border-radius:22px;border:1px solid #45615a;background:#10231f;color:#8ea59e;filter:saturate(.55)"><span style="font-size:30px">${icon}</span><strong style="display:block;font-size:23px;margin-top:8px">${name}</strong><span style="display:block;margin-top:7px">🔒 ${t('running.locked')}</span></div>`;
    page.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><button data-role="back" style="padding:10px 16px;border-radius:999px;border:1px solid #5f7c73;background:#10231f;color:#fff">← ${t('mode.backToModes')}</button><button data-role="language" aria-label="${languageTargetAction()}" title="${languageTargetAction()}" style="padding:10px 16px;border-radius:999px;border:1px solid #5f7c73;background:#10231f;color:#fff">${languageTargetLabel()}</button></div>
      <h1 style="font-size:clamp(36px,8vw,54px);margin-top:28px">${t('running.worldSelect')}</h1>
      <div aria-label="${t('running.difficulty')}" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:4px;margin-bottom:20px">${(['sprout', 'garden', 'storm'] as const).map((difficulty) => `<button data-difficulty="${difficulty}" aria-pressed="${difficulty === this.actions.difficulty}" style="padding:10px 16px;border-radius:999px;border:1px solid ${difficulty === this.actions.difficulty ? '#92edb5' : '#45615a'};background:${difficulty === this.actions.difficulty ? '#1d5a43' : '#10231f'};color:#fff;cursor:pointer">${t(`running.difficulty.${difficulty}`)}</button>`).join('')}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:16px;margin-top:24px">
        <button data-role="phd" style="min-height:160px;padding:24px;border-radius:24px;border:1px solid #61c78b;background:linear-gradient(145deg,#185943,#18354c);color:#fff;text-align:left;cursor:pointer"><span style="font-size:36px">🌳</span><strong style="display:block;font-size:27px;margin-top:10px">${t('running.phd')}</strong><span style="display:block;color:#d7f8e4;font-size:16px;margin-top:9px">${t('running.phdDetail')}</span></button>
        ${world('master', t('running.master'), t('running.masterDetail'), '📘', '#6fbce8')}${world('work', t('running.work'), t('running.workDetail'), '▦', '#e4b764')}${locked(t('running.cultivation'), '◇')}
      </div><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px"><button data-role="settings" style="padding:11px 16px;border-radius:999px;border:1px solid #7b9e91;background:#10231f;color:#fff;cursor:pointer">⚙ ${t('settings.title')}</button><button data-role="boss-studio" style="padding:11px 16px;border-radius:999px;border:1px solid #7b9e91;background:#10231f;color:#fff;cursor:pointer">⬡ ${t('running.bossStudio')}</button><button data-role="reset-hints" style="padding:11px 16px;border-radius:999px;border:1px solid #55736a;background:#10231f;color:#cce0d9;cursor:pointer">↺ ${t('running.resetHints')}</button></div>`;
    page.querySelector<HTMLButtonElement>('[data-role="back"]')!.addEventListener('click', this.actions.onBack);
    page.querySelector<HTMLButtonElement>('[data-role="language"]')!.addEventListener('click', () => { toggleLocale(); this.showWorldSelect(); });
    page.querySelector<HTMLButtonElement>('[data-role="phd"]')!.addEventListener('click', () => this.actions.onWorldChanged('phd'));
    page.querySelector<HTMLButtonElement>('[data-role="master"]')!.addEventListener('click', () => this.actions.onWorldChanged('master'));
    page.querySelector<HTMLButtonElement>('[data-role="work"]')!.addEventListener('click', () => this.actions.onWorldChanged('work'));
    page.querySelector<HTMLButtonElement>('[data-role="settings"]')!.addEventListener('click', () => new SettingsView(this.root, () => {
      const imported = loadCurrentRun();
      if (imported) this.showResumeChoice(imported);
      else this.showWorldSelect();
    }));
    page.querySelector<HTMLButtonElement>('[data-role="boss-studio"]')!.addEventListener('click', async () => {
      const { BossStudio } = await import('./BossStudio');
      new BossStudio(this.root, () => this.showWorldSelect()).show();
    });
    page.querySelector<HTMLButtonElement>('[data-role="reset-hints"]')!.addEventListener('click', () => resetSemanticHints());
    for (const difficulty of ['sprout', 'garden', 'storm'] as const) page.querySelector<HTMLButtonElement>(`[data-difficulty="${difficulty}"]`)!.addEventListener('click', () => this.actions.onDifficultyChanged(difficulty));
    this.root.appendChild(page);
  }

  private async launchWorld(world: 'phd' | 'master' | 'work', resume?: CurrentRunV1): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    this.showLoading();
    try {
      if (world === 'phd') {
        const module = await import('./phaser/bootPhdGarden');
        this.game = await module.bootPhdGarden(this.root, { onExit: () => this.actions.onWorldChanged(null), difficulty: resume?.difficulty ?? this.actions.difficulty, ...(resume?.world === 'phd' ? { resume } : {}) });
      } else {
        const module = await import('./phaser/bootScenarioGarden');
        this.game = await module.bootScenarioGarden(this.root, { world, onExit: () => this.actions.onWorldChanged(null), difficulty: resume?.difficulty ?? this.actions.difficulty, ...(resume && resume.world !== 'phd' ? { resume } : {}) });
      }
      const save = loadRunningSave();
      updateRunningSave({ lastWorld: world, totalRuns: save.totalRuns + (resume ? 0 : 1), difficultyRecords: { ...save.difficultyRecords, [world]: resume?.difficulty ?? this.actions.difficulty } });
      await warmAllRunningWorldsForOfflineUse();
    } catch (error) {
      this.loading = false;
      console.error('Running Mode initialization failed', error);
      this.showLoadFailure(!navigator.onLine || isChunkLoadFailure(error), world);
      return;
    }
    this.loading = false;
  }

  private showLoading(): void {
    this.root.replaceChildren();
    this.root.style.cssText = 'width:100vw;height:100vh;display:grid;place-items:center;background:#071512;color:#fff;font:600 20px system-ui;';
    const status = document.createElement('p');
    status.textContent = t('running.loading');
    this.root.appendChild(status);
  }

  private showLoadFailure(offline: boolean, world: 'phd' | 'master' | 'work'): void {
    this.root.replaceChildren();
    const panel = document.createElement('main');
    panel.style.cssText = 'margin:auto;width:min(520px,calc(100% - 32px));padding:28px;border:1px solid #536f66;border-radius:22px;background:#10231f;color:#fff;font-family:system-ui;text-align:center;';
    panel.innerHTML = `<div style="font-size:46px">${offline ? '☁' : '⚠'}</div><p style="font-size:19px;line-height:1.55;margin-top:16px">${offline ? t('running.offlineUnavailable') : t('running.loadFailed')}</p><div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:22px"><button data-role="back" style="padding:12px 18px;border-radius:999px;border:1px solid #68877e;background:#17342d;color:#fff">${t('mode.backToModes')}</button>${offline ? `<button data-role="retry" style="padding:12px 18px;border-radius:999px;border:1px solid #71c995;background:#1e6046;color:#fff">${t('running.retryOnline')}</button>` : ''}</div>`;
    panel.querySelector<HTMLButtonElement>('[data-role="back"]')!.addEventListener('click', this.actions.onBack);
    panel.querySelector<HTMLButtonElement>('[data-role="retry"]')?.addEventListener('click', () => void this.launchWorld(world));
    this.root.appendChild(panel);
  }
}

async function warmAllRunningWorldsForOfflineUse(): Promise<void> {
  try {
    // Running remains lazy from Rhythm. Once the player enters Running online,
    // fetch both renderer families so every shipped world survives a cold start.
    await Promise.all([import('./phaser/bootPhdGarden'), import('./phaser/bootScenarioGarden')]);
    await warmRunningOfflineCache();
  } catch {
    // Best-effort only: the already-running world must remain playable.
  }
}

function isChunkLoadFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /fetch dynamically imported module|failed to fetch|importing a module script|chunkloaderror/i.test(error.message);
}
