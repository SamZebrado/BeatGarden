import { t } from '../i18n/strings';
import { graduationRequirements } from './core/phdSystems';
import type { RunningSnapshot } from './core/simulation';
import type { ScenarioSnapshot } from './core/scenarioSimulation';

export type LegendWorld = 'phd' | 'master' | 'work';

export interface LegendEntry {
  symbol: string;
  name: string;
  detail: string;
  status?: 'complete' | 'current' | 'locked';
}

export interface RunningLegendOptions {
  world: LegendWorld;
  textOff: boolean;
  getEntries: () => readonly LegendEntry[];
  onOpenChange: (open: boolean) => void;
}

/** A DOM-only, scrollable reference panel. Its owner gates simulation updates while open. */
export class RunningLegend {
  private readonly control: HTMLButtonElement | null;
  private overlay: HTMLElement | null = null;
  private open = false;

  constructor(private readonly root: HTMLElement, private readonly options: RunningLegendOptions) {
    if (options.textOff) {
      this.control = null;
      return;
    }
    const control = document.createElement('button');
    control.dataset.role = 'legend-control';
    control.dataset.world = options.world;
    control.setAttribute('aria-label', t('running.legend.open'));
    control.title = t('running.legend.open');
    control.textContent = 'ⓘ';
    control.style.cssText = 'position:fixed;z-index:70;right:calc(max(14px,env(safe-area-inset-right)) + 56px);top:max(14px,env(safe-area-inset-top));width:48px;height:48px;border-radius:50%;border:1px solid #8fb9ab;background:#0d241ecc;color:#fff;font-size:23px;cursor:pointer;touch-action:manipulation;';
    control.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); this.show(); });
    root.appendChild(control);
    this.control = control;
  }

  get isOpen(): boolean { return this.open; }

  destroy(): void {
    this.close();
    this.control?.remove();
  }

  private show(): void {
    if (this.open || this.options.textOff) return;
    this.open = true;
    this.root.dataset.legendOpen = 'true';
    this.options.onOpenChange(true);
    const overlay = document.createElement('div');
    overlay.dataset.role = 'running-legend';
    overlay.dataset.open = 'true';
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', t('running.legend.title'));
    overlay.style.cssText = 'position:fixed;z-index:80;inset:0;box-sizing:border-box;padding:max(14px,env(safe-area-inset-top)) max(14px,env(safe-area-inset-right)) max(14px,env(safe-area-inset-bottom)) max(14px,env(safe-area-inset-left));background:rgba(3,12,10,.84);overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;color:#f1fff6;font:16px/1.45 system-ui;';
    const panel = document.createElement('section');
    panel.style.cssText = 'box-sizing:border-box;width:min(680px,100%);min-height:min(720px,100%);margin:auto;padding:18px;border:1px solid #6f9c8a;border-radius:18px;background:#102820;box-shadow:0 18px 60px #0008;';
    const entries = this.options.getEntries();
    panel.innerHTML = `<header style="display:flex;align-items:center;justify-content:space-between;gap:14px"><div><h1 style="margin:0;font-size:24px">${t('running.legend.title')}</h1><p style="margin:4px 0 14px;color:#b6d7c8">${t('running.legend.paused')}</p></div><button data-role="legend-close" aria-label="${t('running.legend.close')}" style="width:44px;height:44px;border:1px solid #88b4a0;border-radius:50%;background:#183b30;color:#fff;font-size:24px;cursor:pointer">×</button></header><div data-role="legend-list" style="display:grid;gap:10px"></div>`;
    const list = panel.querySelector<HTMLElement>('[data-role="legend-list"]')!;
    for (const entry of entries) {
      const status = entry.status ? `<small style="color:${entry.status === 'complete' ? '#8ff0b5' : entry.status === 'current' ? '#ffe18b' : '#a9c2b7'}">${t(`running.legend.status.${entry.status}` as 'running.legend.status.complete')}</small>` : '';
      const item = document.createElement('article');
      item.style.cssText = 'display:grid;grid-template-columns:38px 1fr;gap:10px;padding:11px;border:1px solid #315c4e;border-radius:12px;background:#0c201a';
      item.innerHTML = `<span aria-hidden="true" style="font-size:24px;text-align:center">${entry.symbol}</span><div><strong>${entry.name}</strong>${status}<p style="margin:3px 0 0;color:#cae2d6">${entry.detail}</p></div>`;
      list.appendChild(item);
    }
    overlay.appendChild(panel);
    overlay.addEventListener('pointerdown', (event) => event.stopPropagation());
    panel.addEventListener('click', (event) => event.stopPropagation());
    overlay.addEventListener('click', () => this.close());
    panel.querySelector<HTMLButtonElement>('[data-role="legend-close"]')!.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); this.close(); });
    this.overlay = overlay;
    this.root.appendChild(overlay);
  }

  private close(): void {
    if (!this.open) return;
    this.open = false;
    delete this.root.dataset.legendOpen;
    this.overlay?.remove();
    this.overlay = null;
    this.options.onOpenChange(false);
  }
}

export function createPhdLegendEntries(state: RunningSnapshot, seenHints: readonly string[]): LegendEntry[] {
  const phd = state.phd;
  const seen = (id: string) => seenHints.includes(id);
  const entries: LegendEntry[] = [
    entry('⚡', 'running.legend.energy', 'running.legend.energyDetail'),
    entry('◉', 'running.legend.focus', 'running.legend.focusDetail'),
    entry('♡', 'running.legend.spirit', 'running.legend.spiritDetail'),
  ];
  if (phd.supervisorId) entries.push(entry('◆', 'running.legend.supervisor', 'running.legend.supervisorDetail'));
  if (phd.completedProjects > 0 || phd.activeProject || seen('activeProject')) entries.push(entry('◆', 'running.legend.project', 'running.legend.projectDetail'));
  if (phd.signal > 0 || seen('signal')) entries.push(entry('◇→', 'running.legend.signal', 'running.legend.signalDetail'));
  if (phd.noise > 0 || phd.pollution > 0 || seen('noise')) entries.push(entry('≈·', 'running.legend.noise', 'running.legend.noiseDetail'));
  if (state.meeting.phase !== 'idle' || seen('meeting')) entries.push(entry('◉', 'running.legend.labMeeting', 'running.legend.labMeetingDetail'));
  if (phd.milestone || phd.annualMilestone || seen('milestone')) entries.push(entry('✦', 'running.legend.milestone', 'running.legend.milestoneDetail'));

  entries.push(entry('✿', 'running.legend.plan', 'running.legend.planDetail'));
  entries.push(planEntry('✦', 'running.legend.plan.year1', 'running.legend.plan.year1Detail', phd.supervisorId ? 'complete' : 'current'));
  entries.push(planEntry('◉', 'running.legend.plan.year2', 'running.legend.plan.year2Detail', phd.year > 2 ? 'complete' : phd.year === 2 && !!phd.supervisorId ? 'current' : 'locked'));
  entries.push(planEntry('✦', 'running.legend.plan.year3', 'running.legend.plan.year3Detail', phd.year > 3 ? 'complete' : phd.year === 3 ? 'current' : 'locked'));
  entries.push(planEntry('✦', 'running.legend.plan.year4', 'running.legend.plan.year4Detail', phd.qualifying === 'passed' ? 'complete' : phd.qualifying === 'ready' || phd.milestone?.kind === 'qualifying' ? 'current' : 'locked'));
  entries.push(planEntry('◉', 'running.legend.plan.annual', 'running.legend.plan.annualDetail', phd.year >= 5 && phd.qualifying === 'passed' ? 'current' : 'locked'));
  entries.push(planEntry('▶', 'running.legend.plan.preDefense', 'running.legend.plan.preDefenseDetail', phd.preDefense === 'passed' ? 'complete' : phd.preDefense === 'ready' ? 'current' : 'locked'));
  entries.push(planEntry('✿', 'running.legend.plan.revisions', 'running.legend.plan.revisionsDetail', phd.preDefense === 'passed' && phd.revisionRemaining === 0 ? 'complete' : phd.revisionRemaining > 0 ? 'current' : 'locked'));
  entries.push(planEntry('✿', 'running.legend.plan.defense', 'running.legend.plan.defenseDetail', phd.defense === 'passed' ? 'complete' : phd.defense === 'ready' ? 'current' : 'locked'));
  for (const requirement of graduationRequirements(phd)) {
    if (!requirement.complete) entries.push(entry('✿', `running.legend.requirement.${requirement.id}` as 'running.legend.requirement.qualifying', 'running.legend.requirementDetail'));
  }
  return entries;
}

export function createScenarioLegendEntries(state: ScenarioSnapshot, seenHints: readonly string[]): LegendEntry[] {
  const seen = (id: string) => seenHints.includes(id);
  const entries: LegendEntry[] = [
    entry('⚡', 'running.legend.energy', 'running.legend.energyDetail'),
    entry('◉', 'running.legend.focus', 'running.legend.focusDetail'),
    entry('♡', 'running.legend.spirit', 'running.legend.spiritDetail'),
    entry('▧', 'running.legend.calendar', 'running.legend.calendarDetail'),
  ];
  if (state.world === 'master') {
    entries.push(entry('▦', 'running.legend.master.course', 'running.legend.master.courseDetail'));
    if (state.event.phase !== 'idle' || seen('milestone')) entries.push(entry('✦', 'running.legend.master.milestone', 'running.legend.master.milestoneDetail'));
  } else {
    entries.push(entry('◷', 'running.legend.work.cycle', 'running.legend.work.cycleDetail'));
    if (state.event.phase !== 'idle') entries.push(state.event.kind === 'weekly'
      ? entry('◎', 'running.legend.work.weekly', 'running.legend.work.weeklyDetail')
      : entry('!', 'running.legend.work.deadline', 'running.legend.work.deadlineDetail'));
    else if (seen('meeting')) entries.push(entry('◎', 'running.legend.work.weekly', 'running.legend.work.weeklyDetail'));
  }
  if (state.orbitCount > 0 || seen('orbit')) entries.push(entry('◉', 'running.legend.orbit', 'running.legend.orbitDetail'));
  return entries;
}

function entry(symbol: string, name: Parameters<typeof t>[0], detail: Parameters<typeof t>[0]): LegendEntry { return { symbol, name: t(name), detail: t(detail) }; }
function planEntry(symbol: string, name: Parameters<typeof t>[0], detail: Parameters<typeof t>[0], status: NonNullable<LegendEntry['status']>): LegendEntry { return { ...entry(symbol, name, detail), status }; }
