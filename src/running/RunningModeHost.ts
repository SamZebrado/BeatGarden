import { t, toggleLocale } from '../i18n/strings';
import { loadRunningSave, updateRunningSave } from './core/save';
import { resetSemanticHints } from './SemanticHints';
import { warmRunningOfflineCache } from '../pwa/warmRunningCache';
import type { RunningDifficulty } from './core/difficulty';

export interface RunningGameHandle { destroy(): void }

export class RunningModeHost {
  private game: RunningGameHandle | null = null;
  private loading = false;

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
    if (this.actions.initialWorld === 'phd' || this.actions.initialWorld === 'master' || this.actions.initialWorld === 'work') void this.launchWorld(this.actions.initialWorld);
    else this.showWorldSelect();
  }

  destroy(): void {
    this.game?.destroy();
    this.game = null;
    this.root.replaceChildren();
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
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><button data-role="back" style="padding:10px 16px;border-radius:999px;border:1px solid #5f7c73;background:#10231f;color:#fff">← ${t('mode.backToModes')}</button><button data-role="language" style="padding:10px 16px;border-radius:999px;border:1px solid #5f7c73;background:#10231f;color:#fff">${t('language.switch')}</button></div>
      <h1 style="font-size:clamp(36px,8vw,54px);margin-top:28px">${t('running.worldSelect')}</h1>
      <div aria-label="${t('running.difficulty')}" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:4px;margin-bottom:20px">${(['sprout', 'garden', 'storm'] as const).map((difficulty) => `<button data-difficulty="${difficulty}" aria-pressed="${difficulty === this.actions.difficulty}" style="padding:10px 16px;border-radius:999px;border:1px solid ${difficulty === this.actions.difficulty ? '#92edb5' : '#45615a'};background:${difficulty === this.actions.difficulty ? '#1d5a43' : '#10231f'};color:#fff;cursor:pointer">${t(`running.difficulty.${difficulty}`)}</button>`).join('')}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:16px;margin-top:24px">
        <button data-role="phd" style="min-height:160px;padding:24px;border-radius:24px;border:1px solid #61c78b;background:linear-gradient(145deg,#185943,#18354c);color:#fff;text-align:left;cursor:pointer"><span style="font-size:36px">🌳</span><strong style="display:block;font-size:27px;margin-top:10px">${t('running.phd')}</strong><span style="display:block;color:#d7f8e4;font-size:16px;margin-top:9px">${t('running.phdDetail')}</span></button>
        ${world('master', t('running.master'), t('running.masterDetail'), '📘', '#6fbce8')}${world('work', t('running.work'), t('running.workDetail'), '▦', '#e4b764')}${locked(t('running.cultivation'), '◇')}
      </div><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px"><button data-role="boss-studio" style="padding:11px 16px;border-radius:999px;border:1px solid #7b9e91;background:#10231f;color:#fff;cursor:pointer">⬡ ${t('running.bossStudio')}</button><button data-role="reset-hints" style="padding:11px 16px;border-radius:999px;border:1px solid #55736a;background:#10231f;color:#cce0d9;cursor:pointer">↺ ${t('running.resetHints')}</button></div>`;
    page.querySelector<HTMLButtonElement>('[data-role="back"]')!.addEventListener('click', this.actions.onBack);
    page.querySelector<HTMLButtonElement>('[data-role="language"]')!.addEventListener('click', () => { toggleLocale(); this.showWorldSelect(); });
    page.querySelector<HTMLButtonElement>('[data-role="phd"]')!.addEventListener('click', () => this.actions.onWorldChanged('phd'));
    page.querySelector<HTMLButtonElement>('[data-role="master"]')!.addEventListener('click', () => this.actions.onWorldChanged('master'));
    page.querySelector<HTMLButtonElement>('[data-role="work"]')!.addEventListener('click', () => this.actions.onWorldChanged('work'));
    page.querySelector<HTMLButtonElement>('[data-role="boss-studio"]')!.addEventListener('click', async () => {
      const { BossStudio } = await import('./BossStudio');
      new BossStudio(this.root, () => this.showWorldSelect()).show();
    });
    page.querySelector<HTMLButtonElement>('[data-role="reset-hints"]')!.addEventListener('click', () => resetSemanticHints());
    for (const difficulty of ['sprout', 'garden', 'storm'] as const) page.querySelector<HTMLButtonElement>(`[data-difficulty="${difficulty}"]`)!.addEventListener('click', () => this.actions.onDifficultyChanged(difficulty));
    this.root.appendChild(page);
  }

  private async launchWorld(world: 'phd' | 'master' | 'work'): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    this.showLoading();
    try {
      if (world === 'phd') {
        const module = await import('./phaser/bootPhdGarden');
        this.game = await module.bootPhdGarden(this.root, { onExit: () => this.actions.onWorldChanged(null) });
      } else {
        const module = await import('./phaser/bootScenarioGarden');
        this.game = await module.bootScenarioGarden(this.root, { world, onExit: () => this.actions.onWorldChanged(null) });
      }
      const save = loadRunningSave();
      updateRunningSave({ lastWorld: world, totalRuns: save.totalRuns + 1, difficultyRecords: { ...save.difficultyRecords, [world]: this.actions.difficulty } });
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
