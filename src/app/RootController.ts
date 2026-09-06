import { AppController } from './AppController';
import { ModeSelectView } from './ModeSelectView';
import { resolveRootRoute, routeSearch, type RootRoute } from './routes';
import type { RunningModeHost } from '../running/RunningModeHost';

export class RootController {
  private readonly onPopState = (): void => { void this.renderCurrentRoute(); };
  private runningHost: RunningModeHost | null = null;
  private renderGeneration = 0;

  constructor(private readonly root: HTMLElement) {}

  start(): void {
    window.addEventListener('popstate', this.onPopState);
    void this.renderCurrentRoute();
  }

  private navigate = (route: RootRoute): void => {
    window.history.pushState({}, '', routeSearch(route));
    void this.renderCurrentRoute();
  };

  private async renderCurrentRoute(): Promise<void> {
    const generation = ++this.renderGeneration;
    this.runningHost?.destroy();
    this.runningHost = null;
    const route = resolveRootRoute(window.location.search);
    if (route.kind === 'rhythm') {
      new AppController(this.root, { onExitToModeSelect: () => this.navigate({ kind: 'modes' }) }).start();
      return;
    }
    if (route.kind === 'running') {
      const { RunningModeHost } = await import('../running/RunningModeHost');
      if (generation !== this.renderGeneration) return;
      this.runningHost = new RunningModeHost(this.root, {
        initialWorld: route.world,
        difficulty: route.difficulty,
        onBack: () => this.navigate({ kind: 'modes' }),
        onWorldChanged: (world) => this.navigate({ kind: 'running', world, difficulty: route.difficulty }),
        onDifficultyChanged: (difficulty) => this.navigate({ kind: 'running', world: null, difficulty }),
      });
      this.runningHost.start();
      return;
    }
    new ModeSelectView(this.root, {
      onRhythm: () => this.navigate({ kind: 'rhythm' }),
      onRunning: () => this.navigate({ kind: 'running', world: null, difficulty: 'garden' }),
      onLocaleChanged: () => this.renderCurrentRoute(),
    }).show();
  }
}
