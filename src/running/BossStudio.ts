import { getLocale, t, type StringKey } from '../i18n/strings';
import { BOSS_SCHEMA_VERSION, parseBossConfig, type BossConfigV1 } from './core/bossSchema';
import { loadRunningSave, updateRunningSave } from './core/save';
import supportiveMentorExample from '../../docs/examples/supportive-mentor.boss.json';

/** Public, versioned reference for people using an external text assistant. */
export const BOSS_SCHEMA_DOC_URL = 'https://github.com/SamZebrado/BeatGarden/blob/main/docs/BOSS_SCHEMA_V1.md';
export const BOSS_STUDIO_EXAMPLE = JSON.stringify(supportiveMentorExample, null, 2);

const labelKeys: Record<string, StringKey> = {
  'schema': 'running.bossField.schema', 'id': 'running.bossField.id', 'name': 'running.bossField.name', 'name.en': 'running.bossField.nameEn', 'name.zh-CN': 'running.bossField.nameZh',
  'origin': 'running.bossField.origin', 'worlds': 'running.bossField.worlds', 'appearance': 'running.bossField.appearance', 'appearance.shape': 'running.bossField.shape', 'appearance.icon': 'running.bossField.icon', 'appearance.palette': 'running.bossField.palette',
  'stats': 'running.bossField.stats', 'stats.hp': 'running.bossField.hp', 'stats.speed': 'running.bossField.speed', 'stats.scale': 'running.bossField.scale',
  'traits': 'running.bossField.traits', 'traits.expertise': 'running.bossField.expertise', 'traits.resources': 'running.bossField.resources', 'traits.clarity': 'running.bossField.clarity', 'traits.autonomySupport': 'running.bossField.autonomySupport', 'traits.emotionalSafety': 'running.bossField.emotionalSafety', 'traits.fairness': 'running.bossField.fairness', 'traits.boundaryRespect': 'running.bossField.boundaryRespect', 'traits.projectMatch': 'running.bossField.projectMatch',
  'behavior': 'running.bossField.behavior', 'behavior.signal': 'running.bossField.signal', 'behavior.noise': 'running.bossField.noise', 'behavior.attacks': 'running.bossField.attacks', 'behavior.telegraphMs': 'running.bossField.telegraphMs', 'behavior.phases': 'running.bossField.phases',
  'weaknesses': 'running.bossField.weaknesses', 'resistances': 'running.bossField.resistances', 'reward': 'running.bossField.reward', 'reward.title': 'running.bossField.rewardTitle', 'reward.profileTag': 'running.bossField.profileTag', 'Root': 'running.bossField.root',
};

const valueKeys: Record<string, StringKey> = {
  phd: 'running.bossWorld.phd', master: 'running.bossWorld.master', work: 'running.bossWorld.work',
  builtin: 'running.bossOrigin.builtin', custom: 'running.bossOrigin.custom', 'promoted-player': 'running.bossOrigin.promotedPlayer',
  circle: 'running.bossShape.circle', triangle: 'running.bossShape.triangle', square: 'running.bossShape.square', hexagon: 'running.bossShape.hexagon',
  'radial-pulse': 'running.bossAttack.radialPulse', 'directed-burst': 'running.bossAttack.directedBurst', 'orbiting-pressure': 'running.bossAttack.orbitingPressure', 'lane-sweep': 'running.bossAttack.laneSweep', 'interrupt-ring': 'running.bossAttack.interruptRing',
  focus: 'running.bossWeakness.focus', evidence: 'running.bossWeakness.evidence', clarity: 'running.bossWeakness.clarity', boundary: 'running.bossWeakness.boundary', connection: 'running.bossWeakness.connection', mobility: 'running.bossWeakness.mobility',
};

export class BossStudio {
  constructor(private readonly root: HTMLElement, private readonly onBack: () => void) {}

  show(): void {
    this.root.replaceChildren();
    this.root.style.cssText = 'width:100vw;min-height:100vh;overflow:auto;background:#071512;color:#fff;font-family:system-ui;';
    const page = document.createElement('main');
    page.dataset.role = 'boss-studio';
    page.style.cssText = 'width:min(880px,calc(100% - 32px));margin:auto;padding:max(22px,env(safe-area-inset-top)) 0 max(30px,env(safe-area-inset-bottom));';
    page.innerHTML = `<button data-role="back" class="boss-button">← ${t('running.backToWorlds')}</button><h1>${t('running.bossStudio')}</h1><p>${t('running.bossPaste')}</p>
      <section aria-label="${t('running.bossHowToTitle')}" style="margin:16px 0;padding:14px;border:1px solid #395b50;border-radius:14px;background:#0c201b"><strong>${t('running.bossHowToTitle')}</strong><ol style="margin:8px 0 0;padding-inline-start:22px;color:#c8ded5"><li>${t('running.bossHowToStepDescribe')}</li><li>${t('running.bossHowToStepCopy')}</li><li>${t('running.bossHowToStepPreview')}</li></ol><p style="margin:10px 0 0;font-size:13px;color:#aac7bd">${t('running.bossHowToSafety')}</p><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px"><button data-role="prompt" class="boss-button">${t('running.bossCopyPrompt')}</button><button data-role="use-example" class="boss-button">${t('running.bossUseExample')}</button><button data-role="copy-example" class="boss-button">${t('running.bossCopyExample')}</button><a class="boss-button" href="${BOSS_SCHEMA_DOC_URL}" target="_blank" rel="noopener noreferrer">${t('running.bossSchemaDocs')} ↗</a></div></section>
      <div style="display:flex;gap:10px;flex-wrap:wrap"><label class="boss-button">${t('running.bossFile')}<input data-role="file" type="file" accept=".json,application/json" hidden></label></div>
      <textarea data-role="input" spellcheck="false" style="box-sizing:border-box;width:100%;height:280px;margin-top:16px;padding:14px;border:1px solid #58776c;border-radius:14px;background:#0c201b;color:#eafff2;font:13px/1.45 ui-monospace,monospace"></textarea>
      <div style="display:flex;gap:10px;margin-top:12px"><button data-role="preview" class="boss-button">${t('running.bossPreview')}</button><button data-role="confirm" class="boss-button" disabled>${t('running.bossConfirm')}</button></div>
      <pre data-role="result" style="white-space:pre-wrap;color:#ffd7a5;background:#0b1714;padding:14px;border-radius:12px"></pre><section data-role="library"></section>
      <style>.boss-button{display:inline-flex;align-items:center;gap:8px;padding:11px 16px;border:1px solid #6d9b89;border-radius:999px;background:#123129;color:#fff;cursor:pointer}.boss-button:disabled{opacity:.4;cursor:not-allowed}</style>`;
    this.root.appendChild(page);
    const input = page.querySelector<HTMLTextAreaElement>('[data-role="input"]')!;
    const result = page.querySelector<HTMLElement>('[data-role="result"]')!;
    const confirm = page.querySelector<HTMLButtonElement>('[data-role="confirm"]')!;
    let preview: BossConfigV1 | null = null;
    page.querySelector<HTMLButtonElement>('[data-role="back"]')!.addEventListener('click', this.onBack);
    page.querySelector<HTMLInputElement>('[data-role="file"]')!.addEventListener('change', async (event) => {
      const file = (event.currentTarget as HTMLInputElement).files?.[0];
      if (!file) return;
      if (!file.name.toLowerCase().endsWith('.json') || file.size > 100_000) { result.textContent = t('running.bossFileInvalid'); return; }
      input.value = await file.text(); preview = null; confirm.disabled = true;
    });
    page.querySelector<HTMLButtonElement>('[data-role="preview"]')!.addEventListener('click', () => {
      const parsed = parseBossConfig(input.value);
      preview = parsed.value ?? null;
      confirm.disabled = !preview;
      result.textContent = preview ? formatBossPreview(preview) : localizeBossValidationErrors(parsed.errors).join('\n');
    });
    confirm.addEventListener('click', () => {
      if (!preview) return;
      const save = loadRunningSave();
      const savedBoss = normalizeBossForCustomSave(preview);
      const stored = { id: savedBoss.id, displayName: bossDisplayName(savedBoss), origin: savedBoss.origin, worlds: savedBoss.worlds, updatedAt: new Date().toISOString(), data: savedBoss };
      updateRunningSave({ customBosses: [...save.customBosses.filter((boss) => boss.id !== preview!.id), stored] });
      result.textContent = t('running.bossSaved'); preview = null; confirm.disabled = true; this.renderLibrary(page);
    });
    page.querySelector<HTMLButtonElement>('[data-role="prompt"]')!.addEventListener('click', () => void copyText(createBossAiPrompt()).then(() => { result.textContent = t('running.bossPromptCopied'); }));
    page.querySelector<HTMLButtonElement>('[data-role="use-example"]')!.addEventListener('click', () => {
      input.value = BOSS_STUDIO_EXAMPLE;
      preview = null;
      confirm.disabled = true;
      result.textContent = t('running.bossExampleLoaded');
    });
    page.querySelector<HTMLButtonElement>('[data-role="copy-example"]')!.addEventListener('click', () => void copyText(BOSS_STUDIO_EXAMPLE).then(() => { result.textContent = t('running.bossExampleCopied'); }));
    this.renderLibrary(page);
  }

  private renderLibrary(page: HTMLElement): void {
    const library = page.querySelector<HTMLElement>('[data-role="library"]')!;
    library.replaceChildren();
    for (const boss of loadRunningSave().customBosses) {
      const row = document.createElement('article');
      row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px;padding:14px;border:1px solid #395b50;border-radius:14px;background:#0c201b';
      row.innerHTML = `<span><strong>${escapeHtml(storedBossDisplayName(boss.data, boss.displayName))}</strong><small style="display:block;color:#aac7bd">${localizeBossValue(boss.origin)} · ${boss.worlds.map(localizeBossValue).join('、')}</small></span><span><button data-role="export" class="boss-button">${t('running.bossExport')}</button> <button data-role="delete" class="boss-button">${t('running.bossDelete')}</button></span>`;
      row.querySelector<HTMLButtonElement>('[data-role="export"]')!.addEventListener('click', () => download(`${boss.id}.json`, JSON.stringify(boss.data, null, 2)));
      row.querySelector<HTMLButtonElement>('[data-role="delete"]')!.addEventListener('click', () => { const save = loadRunningSave(); updateRunningSave({ customBosses: save.customBosses.filter((item) => item.id !== boss.id) }); this.renderLibrary(page); });
      library.appendChild(row);
    }
  }
}

export function bossDisplayName(boss: Pick<BossConfigV1, 'name'>): string {
  return getLocale() === 'zh-CN' ? boss.name['zh-CN'] ?? boss.name.en : boss.name.en;
}

export function normalizeBossForCustomSave(boss: BossConfigV1): BossConfigV1 {
  return { ...boss, origin: 'custom' };
}

export function formatBossPreview(boss: BossConfigV1): string {
  return `${t('running.bossValid')}\n\n${boss.appearance.icon} ${bossDisplayName(boss)}\n${t('running.bossHp')} ${boss.stats.hp} · ${t('running.bossSignal')} ${boss.behavior.signal} · ${t('running.bossNoise')} ${boss.behavior.noise}\n${boss.behavior.attacks.map(localizeBossValue).join(' · ')}`;
}

export function localizeBossValue(value: string): string {
  const key = valueKeys[value];
  return key ? t(key) : t('running.bossUnknownValue');
}

export function localizeBossValidationErrors(errors: readonly string[]): string[] {
  return errors.map(localizeBossValidationError);
}

function localizeBossValidationError(error: string): string {
  if (/^File: maximum size is 100 KB\.$/.test(error)) return t('running.bossError.fileTooLarge');
  if (/^JSON: invalid syntax\.$/.test(error)) return t('running.bossError.invalidJson');
  if (/^Root: expected one JSON object\.$/.test(error)) return t('running.bossError.rootObject');
  const path = error.match(/^([^:]+):/)?.[1] ?? 'Root';
  const label = localizeBossField(path);
  if (error.includes('unknown field')) return `${label}：${t('running.bossError.unknownField')}`;
  if (/^schema: expected /.test(error)) return `${label}：${t('running.bossError.schema')}`;
  if (error.includes('use 1-64 letters')) return `${label}：${t('running.bossError.identifier')}`;
  const characters = error.match(/expected (\d+)-(\d+) characters/);
  if (characters) return `${label}：${t('running.bossError.characters')} ${characters[1]}–${characters[2]}`;
  if (error.includes('expected object')) return `${label}：${t('running.bossError.expectedObject')}`;
  if (error.includes('expected 1-4 #RRGGBB colors')) return `${label}：${t('running.bossError.palette')}`;
  const range = error.match(/expected (\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)(?:\.)?$/);
  if (range) return `${label}：${t('running.bossError.range')} ${range[1]}–${range[2]}`;
  if (error.includes('expected an integer')) return `${label}：${t('running.bossError.integer')}`;
  if (error.includes('expected one of') || error.includes('values from')) return `${label}：${t('running.bossError.allowedValues')}`;
  return `${label}：${t('running.bossError.invalid')}`;
}

function localizeBossField(path: string): string {
  const exact = labelKeys[path];
  if (exact) return t(exact);
  const parts = path.split('.');
  for (let length = parts.length - 1; length > 0; length -= 1) {
    const parent = parts.slice(0, length).join('.');
    const parentKey = labelKeys[parent];
    if (!parentKey) continue;
    const suffix = parts.slice(length).join('.').replace(/[^\p{L}\p{N}_.-]/gu, '?').slice(0, 100);
    return `${t(parentKey)}.${suffix}`;
  }
  return `${t('running.bossField.root')}.${path.replace(/[^\p{L}\p{N}_.-]/gu, '?').slice(0, 100)}`;
}

function storedBossDisplayName(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback;
  const name = (data as { name?: unknown }).name;
  if (!name || typeof name !== 'object' || typeof (name as { en?: unknown }).en !== 'string') return fallback;
  const parsedName = name as { en: string; 'zh-CN'?: unknown };
  return getLocale() === 'zh-CN' && typeof parsedName['zh-CN'] === 'string' ? parsedName['zh-CN'] : parsedName.en;
}

/** A provider-neutral prompt with the current UI locale and a bounded input placeholder. */
export function createBossAiPrompt(): string {
  const locale = getLocale();
  const descriptionPlaceholder = locale === 'zh-CN'
    ? '[请在这里描述一个虚构或复合人物：其压力方式、支持方式、边界与工作场景。]'
    : '[Describe a fictional or composite person here: their pressure, support, boundaries, and setting.]';
  return `Create exactly one valid JSON object for the BeatGarden Boss schema "${BOSS_SCHEMA_VERSION}" from the description below. Current player locale: ${locale}. JSON only: no prose, Markdown, code fences, comments, URLs, code, scripts, plugins, functions, or extra fields. Use a fictional or composite profile only; do not make allegations about real people. The output origin MUST be "custom".\n\nDescription:\n${descriptionPlaceholder}\n\nRequired nested keys, exactly: name={en, optional zh-CN}; appearance={shape, icon, palette}; stats={hp, speed, scale}; traits={expertise, resources, clarity, autonomySupport, emotionalSafety, fairness, boundaryRespect, projectMatch}; behavior={signal, noise, attacks, telegraphMs, phases}; reward={title, profileTag}.\n\nStrict clarification: origin may only be custom; schema must be exactly "${BOSS_SCHEMA_VERSION}". There are no extra fields, executable values, URLs, or external references.\n\n${createBossAiPromptLegacy().replace('origin=["builtin","custom","promoted-player"]; ', 'origin must be "custom"; ')}`;
}

function createBossAiPromptLegacy(): string {
  return `Return exactly one valid JSON object for the BeatGarden Boss schema \"${BOSS_SCHEMA_VERSION}\". JSON only: no prose, Markdown, code fences, comments, URLs, code, scripts, plugins, or extra fields. Use a fictional or composite profile only; do not make allegations about real people.\n\nRequired root keys (and no others): schema, id, name, origin, worlds, appearance, stats, traits, behavior, weaknesses, resistances, reward.\nAllowed enums: worlds=[\"phd\",\"master\",\"work\"]; origin=[\"builtin\",\"custom\",\"promoted-player\"]; appearance.shape=[\"circle\",\"triangle\",\"square\",\"hexagon\"]; behavior.attacks=[\"radial-pulse\",\"directed-burst\",\"orbiting-pressure\",\"lane-sweep\",\"interrupt-ring\"]; weaknesses/resistances=[\"focus\",\"evidence\",\"clarity\",\"boundary\",\"connection\",\"mobility\"].\nRanges: id and reward.profileTag are 1-64 letters/numbers/dot/underscore/hyphen; name.en and optional name.zh-CN, appearance.icon, reward.title are 1-80, 1-4, and 1-80 characters respectively; worlds 1-3; palette 1-4 #RRGGBB colors; hp 20-500; speed 10-180; scale 0.5-2; every trait 0-1; signal/noise 0-100; attacks 1-4; telegraphMs 500-5000; phases integer 1-4; weaknesses and resistances each 0-4.\n\nValid JSON skeleton:\n{\n  \"schema\": \"${BOSS_SCHEMA_VERSION}\",\n  \"id\": \"custom.garden-guide\",\n  \"name\": { \"en\": \"Garden Guide\", \"zh-CN\": \"花园向导\" },\n  \"origin\": \"custom\",\n  \"worlds\": [\"phd\"],\n  \"appearance\": { \"shape\": \"hexagon\", \"icon\": \"✦\", \"palette\": [\"#79e4bd\", \"#ffe18b\"] },\n  \"stats\": { \"hp\": 120, \"speed\": 48, \"scale\": 1 },\n  \"traits\": { \"expertise\": 0.78, \"resources\": 0.7, \"clarity\": 0.82, \"autonomySupport\": 0.88, \"emotionalSafety\": 0.9, \"fairness\": 0.86, \"boundaryRespect\": 0.9, \"projectMatch\": 0.8 },\n  \"behavior\": { \"signal\": 72, \"noise\": 8, \"attacks\": [\"radial-pulse\", \"orbiting-pressure\"], \"telegraphMs\": 1800, \"phases\": 2 },\n  \"weaknesses\": [\"connection\"],\n  \"resistances\": [\"evidence\"],\n  \"reward\": { \"title\": \"A Mentor Worth Becoming\", \"profileTag\": \"supportive-mentor\" }\n}`;
}
function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!); }
function download(name: string, value: string): void { const url = URL.createObjectURL(new Blob([value], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 0); }
async function copyText(value: string): Promise<void> { await navigator.clipboard?.writeText(value); }
