import type { RunningDifficulty } from './difficulty';
import type { RelationshipStateV1 } from './personScience';
import type { RunningWorld } from './types';

export const JOURNEY_SCHEMA = 'beatgarden-journey.v1' as const;
export const MAX_JOURNEY_RECORDS = 200;
export const MAX_JOURNEY_SECONDS = 60 * 60 * 24;

export type MusicStyle = 'classic' | 'chiptune' | 'organic';
export type DynamicIntensity = 'full' | 'soft' | 'off';
export type RestActivityId = 'breathingRing' | 'lightPlacement' | 'soundGarden';

export interface JourneyRecordV1 {
  schema: typeof JOURNEY_SCHEMA;
  recordId: string;
  completedAt: string;
  world: RunningWorld;
  difficulty: RunningDifficulty;
  outcome: 'completed';
  runDuration: number;
  finalStage: string;
  personCode: string | null;
  routeChoices: string[];
  relationship: Pick<RelationshipStateV1, 'trust' | 'reciprocity' | 'unresolvedConflict' | 'boundaryHistory'> | null;
  build: { orbit: number; cadence: number; vitality: number };
  resources: { energy: number; focus: number; spirit: number };
  milestones: string[];
  storyMarks: StoryMarkId[];
  medalsUnlocked: AchievementId[];
  promotedBossId: string | null;
  musicStyle: MusicStyle;
  gameVersion: string;
}

export interface RunningAggregateStats {
  failedRuns: Partial<Record<RunningWorld, number>>;
  completedByStyle: Partial<Record<MusicStyle, number>>;
  restSessions: number;
  restActivities: RestActivityId[];
  recoveryTaken: number;
  recoveryDeclined: number;
  exports: number;
  imports: number;
}

export type AchievementId =
  | 'first-journey' | 'three-gardens' | 'storm-clear' | 'first-promoted-boss' | 'portable-garden'
  | 'qualifying-light' | 'independent-root' | 'boundary-held' | 'signal-in-static' | 'late-bloom' | 'revision-return'
  | 'master-three-years' | 'research-compass' | 'workward-compass' | 'open-compass'
  | 'changed-direction' | 'weak-market-conversion' | 'delivery-crown' | 'protected-focus'
  | 'back-from-low' | 'three-sound-gardens' | 'rest-corner-visitor' | 'recovery-choice'
  | 'story-collector' | 'boss-seed';

export type StoryMarkId =
  | 'held-boundary' | 'noise-but-useful' | 'late-bloom' | 'changed-direction'
  | 'rebuilt-after-setback' | 'too-much-extra-work' | 'quiet-mentor'
  | 'high-pressure-high-signal' | 'protected-focus' | 'gentle-pause' | 'weak-market-step';

export interface AchievementDefinition {
  id: AchievementId;
  category: 'general' | 'phd' | 'master' | 'work' | 'recovery';
  icon: string;
  title: { en: string; 'zh-CN': string };
  detail: { en: string; 'zh-CN': string };
  cosmetic: string;
}

const medal = (id: AchievementId, category: AchievementDefinition['category'], icon: string, zh: string, en: string, zhDetail: string, enDetail: string, cosmetic: string): AchievementDefinition =>
  ({ id, category, icon, title: { en, 'zh-CN': zh }, detail: { en: enDetail, 'zh-CN': zhDetail }, cosmetic });

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  medal('first-journey', 'general', '●', '第一颗种子', 'First Seed', '完成第一段人生旅程', 'Complete a first life-path journey', 'journal-ring'),
  medal('three-gardens', 'general', '△', '三园行者', 'Three Gardens', '完成三个可玩花园', 'Complete all three playable gardens', 'triple-border'),
  medal('storm-clear', 'general', '◇', '穿过风暴', 'Through the Storm', '在风暴难度完成旅程', 'Complete a journey on Storm', 'storm-spark'),
  medal('first-promoted-boss', 'general', '⬡', '留下倒影', 'A Garden Echo', '首次把结局保存为 Boss', 'Promote a completed self into a Boss', 'boss-hex'),
  medal('portable-garden', 'general', '↔', '随身花园', 'Portable Garden', '完成一次存档导出与导入', 'Complete both a save export and import', 'portable-line'),
  medal('qualifying-light', 'phd', '◆', '考核之光', 'Qualifying Light', '通过博士中期考核', 'Pass the PhD Qualifying milestone', 'signal-ray'),
  medal('independent-root', 'phd', '⌁', '独立生根', 'Independent Root', '以强独立研究积累完成博士旅程', 'Complete PhD with strong independent research', 'root-motif'),
  medal('boundary-held', 'phd', '□', '边界仍在', 'Boundary Held', '在导师额外任务中成功守住边界', 'Complete a path with successful boundary setting', 'square-frame'),
  medal('signal-in-static', 'phd', '◈', '噪声里的信号', 'Signal in Static', '经历高信号与高噪声并完成旅程', 'Complete after experiencing high Signal and Noise', 'split-diamond'),
  medal('late-bloom', 'phd', '✿', '晚开也开', 'Late Bloom', '在较晚年份完成博士旅程', 'Graduate in a later year', 'late-petal'),
  medal('revision-return', 'phd', '↻', '修改归来', 'Revision Return', '经历修改后完成答辩', 'Return from revisions and complete the defense', 'return-ring'),
  medal('master-three-years', 'master', '▱', '三年成章', 'Three-Year Chapter', '完成硕士三年路径', 'Complete the three-year Master path', 'chapter-line'),
  medal('research-compass', 'master', '⌃', '研究罗盘', 'Research Compass', '以研究 / 读博计划完成', 'Complete with the Research/PhD plan', 'north-mark'),
  medal('workward-compass', 'master', '▦', '就业罗盘', 'Workward Compass', '以就业计划完成', 'Complete with the Employment plan', 'grid-mark'),
  medal('open-compass', 'master', '○', '未定也前行', 'Open Compass', '以暂未决定路线完成', 'Complete while remaining Undecided', 'open-circle'),
  medal('changed-direction', 'work', '↗', '换向之后', 'After the Turn', '改变或拒绝早期路径后完成转正', 'Convert after changing an earlier direction', 'turn-arrow'),
  medal('weak-market-conversion', 'work', '◒', '逆市落脚', 'A Place in Thin Weather', '在较弱市场完成转正', 'Convert in a weak market', 'half-moon'),
  medal('delivery-crown', 'work', '▣', '交付成冠', 'Delivery Crown', '以强交付推进完成晋升', 'Earn promotion through strong Delivery', 'delivery-corner'),
  medal('protected-focus', 'work', '▢', '守住专注', 'Focus Kept', '有意义地使用保护专注', 'Use Protect Focus meaningfully', 'focus-frame'),
  medal('back-from-low', 'recovery', '↑', '低谷回升', 'Back from Low', '从严重低状态恢复并完成主要节点', 'Recover from a severe low state and finish a major milestone', 'rising-line'),
  medal('three-sound-gardens', 'recovery', '♫', '三种声景', 'Three Sound Gardens', '使用三种音乐风格完成旅程', 'Complete journeys with all three music styles', 'music-triplet'),
  medal('rest-corner-visitor', 'recovery', '◌', '休息角来客', 'Rest Corner Visitor', '完成三种休息角活动', 'Complete all three Rest Corner activities', 'calm-ring'),
  medal('recovery-choice', 'recovery', '∿', '留出一口气', 'Room to Breathe', '在旅程中选择一次恢复机会', 'Take an in-run recovery opportunity', 'soft-wave'),
  medal('story-collector', 'recovery', '✣', '印记成页', 'A Page of Marks', '收集五种不同故事印记', 'Collect five distinct Story Marks', 'stamp-border'),
  medal('boss-seed', 'general', '⬢', '自造回声', 'Boss Seed', '保存一个自定义或玩家晋升 Boss', 'Save a custom or promoted Boss', 'hex-accent'),
] as const;

export const STORY_MARKS: Record<StoryMarkId, { icon: string; title: { en: string; 'zh-CN': string } }> = {
  'held-boundary': { icon: '□', title: { en: 'Held the Boundary', 'zh-CN': '守住边界' } },
  'noise-but-useful': { icon: '◈', title: { en: 'Noise, but Useful', 'zh-CN': '有噪声，也有用' } },
  'late-bloom': { icon: '✿', title: { en: 'Late Bloom', 'zh-CN': '晚开' } },
  'changed-direction': { icon: '↗', title: { en: 'Changed Direction', 'zh-CN': '改变方向' } },
  'rebuilt-after-setback': { icon: '↻', title: { en: 'Rebuilt After Setback', 'zh-CN': '挫折后重建' } },
  'too-much-extra-work': { icon: '▥', title: { en: 'Too Much Extra Work', 'zh-CN': '额外工作太多' } },
  'quiet-mentor': { icon: '○', title: { en: 'Quiet Mentor', 'zh-CN': '安静的导师' } },
  'high-pressure-high-signal': { icon: '◇', title: { en: 'High Pressure, High Signal', 'zh-CN': '高压力，高信号' } },
  'protected-focus': { icon: '▢', title: { en: 'Protected Focus', 'zh-CN': '保护专注' } },
  'gentle-pause': { icon: '◌', title: { en: 'A Gentle Pause', 'zh-CN': '轻轻停一下' } },
  'weak-market-step': { icon: '◒', title: { en: 'A Step in Thin Weather', 'zh-CN': '逆风落脚' } },
};

export const DEFAULT_AGGREGATE_STATS: Readonly<RunningAggregateStats> = {
  failedRuns: {}, completedByStyle: {}, restSessions: 0, restActivities: [], recoveryTaken: 0,
  recoveryDeclined: 0, exports: 0, imports: 0,
};

export interface JourneyCompletionInput {
  sourceRunId: string;
  completedAt?: string;
  world: RunningWorld;
  difficulty: RunningDifficulty;
  runDuration: number;
  finalStage: string;
  personCode: string | null;
  routeChoices: string[];
  relationship: JourneyRecordV1['relationship'];
  build: JourneyRecordV1['build'];
  resources: JourneyRecordV1['resources'];
  milestones: string[];
  storyMarks: StoryMarkId[];
  musicStyle: MusicStyle;
  achievementSignals?: AchievementId[];
  gameVersion?: string;
}

export function journeyRecord(input: JourneyCompletionInput, alreadyUnlocked: readonly AchievementId[], stats: RunningAggregateStats, completedWorlds: readonly RunningWorld[]): { record: JourneyRecordV1; unlocked: AchievementId[] } {
  const completedAt = input.completedAt ?? new Date().toISOString();
  const signals = new Set<AchievementId>(['first-journey', ...(input.achievementSignals ?? [])]);
  if (input.difficulty === 'storm') signals.add('storm-clear');
  if (new Set([...completedWorlds, input.world]).size === 3) signals.add('three-gardens');
  const styleCount = new Set([...Object.keys(stats.completedByStyle), input.musicStyle]).size;
  if (styleCount === 3) signals.add('three-sound-gardens');
  const unlocked = [...signals].filter((id) => !alreadyUnlocked.includes(id));
  return {
    record: {
      schema: JOURNEY_SCHEMA, recordId: safeRecordId(input.sourceRunId), completedAt, world: input.world,
      difficulty: input.difficulty, outcome: 'completed', runDuration: clamp(input.runDuration, 0, MAX_JOURNEY_SECONDS),
      finalStage: safeText(input.finalStage, 80), personCode: input.personCode ? safeText(input.personCode, 32) : null,
      routeChoices: cleanIds(input.routeChoices, 20), relationship: input.relationship ? boundedRelationship(input.relationship) : null,
      build: { orbit: integer(input.build.orbit, 0, 99), cadence: integer(input.build.cadence, 0, 99), vitality: integer(input.build.vitality, 0, 99) },
      resources: { energy: clamp(input.resources.energy, 0, 100), focus: clamp(input.resources.focus, 0, 100), spirit: clamp(input.resources.spirit, 0, 100) },
      milestones: cleanIds(input.milestones, 30), storyMarks: uniqueEnum(input.storyMarks, Object.keys(STORY_MARKS) as StoryMarkId[], 20),
      medalsUnlocked: unlocked, promotedBossId: null, musicStyle: input.musicStyle, gameVersion: safeText(input.gameVersion ?? '0.1.0', 24),
    },
    unlocked,
  };
}

export function parseJourneyRecord(value: unknown): JourneyRecordV1 | null {
  if (!record(value) || value.schema !== JOURNEY_SCHEMA || value.outcome !== 'completed') return null;
  const allowed = ['schema', 'recordId', 'completedAt', 'world', 'difficulty', 'outcome', 'runDuration', 'finalStage', 'personCode', 'routeChoices', 'relationship', 'build', 'resources', 'milestones', 'storyMarks', 'medalsUnlocked', 'promotedBossId', 'musicStyle', 'gameVersion'];
  if (Object.keys(value).some((key) => !allowed.includes(key)) || !validDate(value.completedAt) || !isWorld(value.world) || !isDifficulty(value.difficulty) || !isMusicStyle(value.musicStyle)) return null;
  if (typeof value.recordId !== 'string' || safeRecordId(value.recordId) !== value.recordId || typeof value.finalStage !== 'string' || safeText(value.finalStage, 80) !== value.finalStage) return null;
  if (value.personCode !== null && (typeof value.personCode !== 'string' || safeText(value.personCode, 32) !== value.personCode)) return null;
  if (!finiteIn(value.runDuration, 0, MAX_JOURNEY_SECONDS) || !record(value.build) || !record(value.resources)) return null;
  if (!exactNumberRecord(value.build, ['orbit', 'cadence', 'vitality'], 0, 99, true) || !exactNumberRecord(value.resources, ['energy', 'focus', 'spirit'], 0, 100, false)) return null;
  if (!stringArray(value.routeChoices, 20) || !stringArray(value.milestones, 30)) return null;
  const marks = uniqueEnum(value.storyMarks, Object.keys(STORY_MARKS) as StoryMarkId[], 20);
  const medals = uniqueEnum(value.medalsUnlocked, ACHIEVEMENTS.map((item) => item.id), ACHIEVEMENTS.length);
  if (JSON.stringify(marks) !== JSON.stringify(value.storyMarks) || JSON.stringify(medals) !== JSON.stringify(value.medalsUnlocked)) return null;
  const relationship = value.relationship === null ? null : parseRelationshipSummary(value.relationship);
  if (value.relationship !== null && !relationship) return null;
  if (value.promotedBossId !== null && (typeof value.promotedBossId !== 'string' || safeRecordId(value.promotedBossId) !== value.promotedBossId)) return null;
  if (typeof value.gameVersion !== 'string' || safeText(value.gameVersion, 24) !== value.gameVersion) return null;
  return structuredClone(value) as JourneyRecordV1;
}

export function sanitizeJourneyHistory(value: unknown): JourneyRecordV1[] {
  if (!Array.isArray(value)) return [];
  const records = value.map(parseJourneyRecord).filter((item): item is JourneyRecordV1 => item !== null);
  const unique = [...new Map(records.map((record) => [record.recordId, record])).values()];
  return unique.sort((a, b) => a.completedAt.localeCompare(b.completedAt) || a.recordId.localeCompare(b.recordId)).slice(-MAX_JOURNEY_RECORDS);
}

export function sanitizeAchievementIds(value: unknown): AchievementId[] { return uniqueEnum(value, ACHIEVEMENTS.map((item) => item.id), ACHIEVEMENTS.length); }
export function sanitizeStoryMarkIds(value: unknown): StoryMarkId[] { return uniqueEnum(value, Object.keys(STORY_MARKS) as StoryMarkId[], Object.keys(STORY_MARKS).length); }

export function sanitizeAggregateStats(value: unknown): RunningAggregateStats {
  if (!record(value)) return cloneStats(DEFAULT_AGGREGATE_STATS);
  const failedRuns: RunningAggregateStats['failedRuns'] = {};
  const completedByStyle: RunningAggregateStats['completedByStyle'] = {};
  for (const world of ['phd', 'master', 'work'] as const) if (record(value.failedRuns) && finiteIn(value.failedRuns[world], 0, 1_000_000) && Number.isInteger(value.failedRuns[world])) failedRuns[world] = value.failedRuns[world] as number;
  for (const style of ['classic', 'chiptune', 'organic'] as const) if (record(value.completedByStyle) && finiteIn(value.completedByStyle[style], 0, 1_000_000) && Number.isInteger(value.completedByStyle[style])) completedByStyle[style] = value.completedByStyle[style] as number;
  return { failedRuns, completedByStyle, restSessions: integer(value.restSessions, 0, 1_000_000), restActivities: uniqueEnum(value.restActivities, ['breathingRing', 'lightPlacement', 'soundGarden'], 3), recoveryTaken: integer(value.recoveryTaken, 0, 1_000_000), recoveryDeclined: integer(value.recoveryDeclined, 0, 1_000_000), exports: integer(value.exports, 0, 1_000_000), imports: integer(value.imports, 0, 1_000_000) };
}

export function achievement(id: AchievementId): AchievementDefinition { return ACHIEVEMENTS.find((item) => item.id === id)!; }

function boundedRelationship(value: JourneyRecordV1['relationship']): NonNullable<JourneyRecordV1['relationship']> { return { trust: clamp(value!.trust, 0, 1), reciprocity: clamp(value!.reciprocity, 0, 1), unresolvedConflict: clamp(value!.unresolvedConflict, 0, 1), boundaryHistory: clamp(value!.boundaryHistory, 0, 1) }; }
function parseRelationshipSummary(value: unknown): JourneyRecordV1['relationship'] { if (!record(value) || Object.keys(value).sort().join('|') !== ['boundaryHistory', 'reciprocity', 'trust', 'unresolvedConflict'].sort().join('|') || !Object.values(value).every((item) => finiteIn(item, 0, 1))) return null; return value as NonNullable<JourneyRecordV1['relationship']>; }
function exactNumberRecord(value: Record<string, unknown>, keys: string[], min: number, max: number, integers: boolean): boolean { return Object.keys(value).sort().join('|') === [...keys].sort().join('|') && keys.every((key) => finiteIn(value[key], min, max) && (!integers || Number.isInteger(value[key]))); }
function cleanIds(value: unknown, max: number): string[] { return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string' && /^[a-z0-9][a-z0-9._:-]{0,79}$/i.test(item)))].slice(0, max) : []; }
function stringArray(value: unknown, max: number): boolean { return Array.isArray(value) && value.length <= max && value.every((item) => typeof item === 'string' && /^[a-z0-9][a-z0-9._:-]{0,79}$/i.test(item)) && new Set(value).size === value.length; }
function uniqueEnum<T extends string>(value: unknown, allowed: readonly T[], max: number): T[] { return Array.isArray(value) ? [...new Set(value.filter((item): item is T => typeof item === 'string' && allowed.includes(item as T)))].slice(0, max) : []; }
function safeRecordId(value: string): string { const safe = value.toLowerCase().replace(/[^a-z0-9._:-]/g, '-').slice(0, 80); return safe || 'journey'; }
function safeText(value: string, max: number): string { return value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max); }
function validDate(value: unknown): value is string { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)); }
function isWorld(value: unknown): value is RunningWorld { return value === 'phd' || value === 'master' || value === 'work'; }
function isDifficulty(value: unknown): value is RunningDifficulty { return value === 'sprout' || value === 'garden' || value === 'storm'; }
function isMusicStyle(value: unknown): value is MusicStyle { return value === 'classic' || value === 'chiptune' || value === 'organic'; }
function finiteIn(value: unknown, min: number, max: number): value is number { return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max; }
function integer(value: unknown, min: number, max: number): number { return finiteIn(value, min, max) && Number.isInteger(value) ? value : min; }
function clamp(value: number, min: number, max: number): number { return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min; }
function record(value: unknown): value is Record<string, any> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function cloneStats(value: Readonly<RunningAggregateStats>): RunningAggregateStats { return { failedRuns: { ...value.failedRuns }, completedByStyle: { ...value.completedByStyle }, restSessions: value.restSessions, restActivities: [...value.restActivities], recoveryTaken: value.recoveryTaken, recoveryDeclined: value.recoveryDeclined, exports: value.exports, imports: value.imports }; }
