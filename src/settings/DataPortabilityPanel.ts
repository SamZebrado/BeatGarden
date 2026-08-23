import { getLocale, t } from '../i18n/strings';
import { CUSTOM_CONTENT_SCHEMA, applyCustomContentBundle, applyRunningSaveBundle, createCustomContentBundle, createRunningSaveBundle, parseCustomContentBundle, parseRunningSaveBundle, type CustomContentBundleV1, type RunningSaveBundleV1 } from '../running/core/portability';
import { parsePersonCore } from '../running/core/personScience';
import { loadRunningSave, saveRunningData } from '../running/core/save';

export class DataPortabilityPanel {
  private pendingSave: RunningSaveBundleV1 | null = null;
  private pendingContent: CustomContentBundleV1 | null = null;

  constructor(private readonly parent: HTMLElement) { this.render(); }

  private render(): void {
    const section = document.createElement('section');
    section.dataset.role = 'data-portability';
    section.style.cssText = 'margin-top:24px;padding:24px;border:1px solid #345f55;border-radius:20px;background:#0d201c;';
    section.innerHTML = `<h2 style="font-size:28px">${t('settings.dataTitle')}</h2><p style="margin-top:8px;color:#bad2c9;line-height:1.5">${t('settings.dataDetail')}</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px"><button data-role="export-save" class="data-button">${t('settings.exportSave')}</button><label class="data-button">${t('settings.importSave')}<input data-role="import-save" type="file" accept=".json,application/json" hidden></label></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px"><button data-role="export-content" class="data-button">${t('settings.exportContent')}</button><label class="data-button">${t('settings.importContent')}<input data-role="import-content" type="file" accept=".json,application/json" hidden></label></div>
      <section data-role="preview" hidden style="margin-top:16px;padding:14px;border:1px solid #58776c;border-radius:14px;background:#071512"><strong>${t('settings.preview')}</strong><p data-role="preview-text" style="margin-top:8px;white-space:pre-line;color:#d8ebe4"></p><p style="margin-top:8px;color:#a9c6bb">${t('settings.importReady')}<br>${t('settings.conflictRule')}</p><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px"><button data-role="confirm" class="data-button"></button><button data-role="cancel" class="data-button">${t('settings.cancelImport')}</button></div></section>
      <output data-role="result" style="display:block;margin-top:14px;color:#ffd69e;white-space:pre-line"></output>
      <section data-role="people" style="margin-top:20px"></section>`;
    const style = document.createElement('style');
    style.textContent = '.data-button{display:inline-block;padding:11px 15px;border:1px solid #6d9285;border-radius:12px;background:#17352e;color:#fff;cursor:pointer;font:600 14px system-ui}.data-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid #294a42;flex-wrap:wrap}';
    section.appendChild(style);
    section.querySelector<HTMLButtonElement>('[data-role="export-save"]')!.addEventListener('click', () => downloadJson(saveFilename(), createRunningSaveBundle()));
    section.querySelector<HTMLInputElement>('[data-role="import-save"]')!.addEventListener('change', (event) => void this.readSaveFile(event, section));
    section.querySelector<HTMLButtonElement>('[data-role="export-content"]')!.addEventListener('click', () => downloadJson(contentFilename(), createCustomContentBundle(loadRunningSave())));
    section.querySelector<HTMLInputElement>('[data-role="import-content"]')!.addEventListener('change', (event) => void this.readContentFile(event, section));
    section.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.addEventListener('click', () => this.confirm(section));
    section.querySelector<HTMLButtonElement>('[data-role="cancel"]')!.addEventListener('click', () => this.clearPreview(section));
    this.parent.appendChild(section);
    this.renderPeople(section);
  }

  private async readSaveFile(event: Event, section: HTMLElement): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const parsed = parseRunningSaveBundle(await file.text());
    if (!parsed.ok) { this.fail(section, parsed.errors); return; }
    this.pendingSave = parsed.value; this.pendingContent = null;
    this.showPreview(section, formatSavePreview(parsed.preview), t('settings.confirmImport'));
  }

  private async readContentFile(event: Event, section: HTMLElement): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const parsed = parseCustomContentBundle(await file.text());
    if (!parsed.ok) { this.fail(section, parsed.errors); return; }
    this.pendingContent = parsed.value; this.pendingSave = null;
    this.showPreview(section, t('settings.contentCounts').replace('{people}', String(parsed.value.people.length)).replace('{bosses}', String(parsed.value.bosses.length)), t('settings.confirmContent'));
  }

  private confirm(section: HTMLElement): void {
    try {
      if (this.pendingSave) applyRunningSaveBundle(this.pendingSave);
      else if (this.pendingContent) applyCustomContentBundle(this.pendingContent);
      else return;
      section.querySelector<HTMLOutputElement>('[data-role="result"]')!.textContent = t('settings.importApplied');
      this.clearPreview(section);
      this.renderPeople(section);
    } catch (error) { this.fail(section, [error instanceof Error ? error.message : String(error)]); }
  }

  private showPreview(section: HTMLElement, text: string, confirmText: string): void {
    const preview = section.querySelector<HTMLElement>('[data-role="preview"]')!;
    preview.hidden = false;
    preview.querySelector<HTMLElement>('[data-role="preview-text"]')!.textContent = text;
    preview.querySelector<HTMLButtonElement>('[data-role="confirm"]')!.textContent = confirmText;
    section.querySelector<HTMLOutputElement>('[data-role="result"]')!.textContent = '';
  }

  private clearPreview(section: HTMLElement): void {
    this.pendingSave = null; this.pendingContent = null;
    section.querySelector<HTMLElement>('[data-role="preview"]')!.hidden = true;
    for (const input of section.querySelectorAll<HTMLInputElement>('input[type="file"]')) input.value = '';
  }

  private fail(section: HTMLElement, errors: string[]): void {
    this.pendingSave = null; this.pendingContent = null;
    section.querySelector<HTMLElement>('[data-role="preview"]')!.hidden = true;
    section.querySelector<HTMLOutputElement>('[data-role="result"]')!.textContent = `${t('settings.importFailed')}\n${errors.slice(0, 5).join('\n')}`;
  }

  private renderPeople(section: HTMLElement): void {
    const library = section.querySelector<HTMLElement>('[data-role="people"]')!;
    library.replaceChildren();
    const title = document.createElement('div');
    title.innerHTML = `<h3 style="font-size:20px">${t('settings.peopleTitle')}</h3><label class="data-button" style="margin-top:10px">${t('settings.importPerson')}<input data-role="import-person" type="file" accept=".json,application/json" hidden></label>`;
    title.querySelector<HTMLInputElement>('[data-role="import-person"]')!.addEventListener('change', (event) => void this.importPerson(event, section));
    library.appendChild(title);
    for (const person of loadRunningSave().customPeople) {
      const row = document.createElement('div');
      row.className = 'data-row';
      row.innerHTML = `<span><strong>${escapeHtml(person.name[getLocale()])}</strong><small style="display:block;color:#a9c6bb">${escapeHtml(person.id)}</small></span><span><button data-role="export" class="data-button">${t('settings.exportPerson')}</button> <button data-role="delete" class="data-button">${t('settings.deletePerson')}</button></span>`;
      row.querySelector<HTMLButtonElement>('[data-role="export"]')!.addEventListener('click', () => downloadJson(`BeatGarden-person-${person.id}.json`, person));
      row.querySelector<HTMLButtonElement>('[data-role="delete"]')!.addEventListener('click', () => { if (!window.confirm(`${t('settings.deletePerson')}: ${person.name[getLocale()]}?`)) return; const save = loadRunningSave(); saveRunningData({ ...save, customPeople: save.customPeople.filter((item) => item.id !== person.id) }); this.renderPeople(section); });
      library.appendChild(row);
    }
  }

  private async importPerson(event: Event, section: HTMLElement): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const text = await file.text();
    if (text.length > 100_000) { this.fail(section, ['Person JSON exceeds the 100 KB limit.']); return; }
    let raw: unknown; try { raw = JSON.parse(text); } catch { this.fail(section, ['Person JSON could not be parsed.']); return; }
    const parsed = parsePersonCore(raw);
    if (!parsed.ok) { this.fail(section, parsed.errors); return; }
    const person = parsed.value;
    if (!window.confirm(`${t('settings.importPerson')}: ${person.name[getLocale()]} (${person.id})?\n${t('settings.conflictRule')}`)) { (event.target as HTMLInputElement).value = ''; return; }
    try {
      applyCustomContentBundle({ schema: CUSTOM_CONTENT_SCHEMA, version: 1, exportedAt: new Date().toISOString(), people: [person], bosses: [] });
      section.querySelector<HTMLOutputElement>('[data-role="result"]')!.textContent = t('settings.importApplied');
      this.renderPeople(section);
    } catch (error) { this.fail(section, [error instanceof Error ? error.message : String(error)]); }
  }
}

export function formatSavePreview(preview: { world: string | null; difficulty: string | null; simulationTime: number | null; totalRuns: number; people: number; bosses: number }): string {
  const run = preview.world && preview.difficulty && preview.simulationTime !== null
    ? t('settings.restoreRun').replace('{world}', localizeRunValue(preview.world)).replace('{difficulty}', localizeRunValue(preview.difficulty)).replace('{time}', `${Math.floor(preview.simulationTime)}s`)
    : t('settings.noCurrentRun');
  return `${t('settings.replaceProgress')} · ${preview.totalRuns}\n${run}\n${t('settings.contentCounts').replace('{people}', String(preview.people)).replace('{bosses}', String(preview.bosses))}`;
}

export function downloadJson(name: string, value: unknown): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
function saveFilename(): string { return `BeatGarden-save-${new Date().toISOString().slice(0, 10)}.json`; }
function contentFilename(): string { return `BeatGarden-custom-content-${new Date().toISOString().slice(0, 10)}.json`; }
function localizeRunValue(value: string): string {
  const keys: Record<string, Parameters<typeof t>[0]> = {
    phd: 'running.phd', master: 'running.master', work: 'running.work',
    sprout: 'running.difficulty.sprout', garden: 'running.difficulty.garden', storm: 'running.difficulty.storm',
  };
  return keys[value] ? t(keys[value]) : value;
}
function escapeHtml(value: string): string { return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]!); }
