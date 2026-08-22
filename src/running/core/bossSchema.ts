import type { RunningWorld } from './types';

export const BOSS_SCHEMA_VERSION = 'beatgarden-boss.v1' as const;
export const ATTACK_PATTERNS = ['radial-pulse', 'directed-burst', 'orbiting-pressure', 'lane-sweep', 'interrupt-ring'] as const;
export const WEAKNESSES = ['focus', 'evidence', 'clarity', 'boundary', 'connection', 'mobility'] as const;

export interface BossConfigV1 {
  schema: typeof BOSS_SCHEMA_VERSION;
  id: string;
  name: { en: string; 'zh-CN'?: string };
  origin: 'builtin' | 'custom' | 'promoted-player';
  worlds: RunningWorld[];
  appearance: { shape: 'circle' | 'triangle' | 'square' | 'hexagon'; icon: string; palette: string[] };
  stats: { hp: number; speed: number; scale: number };
  traits: { expertise: number; resources: number; clarity: number; autonomySupport: number; emotionalSafety: number; fairness: number; boundaryRespect: number; projectMatch: number };
  behavior: { signal: number; noise: number; attacks: Array<typeof ATTACK_PATTERNS[number]>; telegraphMs: number; phases: number };
  weaknesses: Array<typeof WEAKNESSES[number]>;
  resistances: Array<typeof WEAKNESSES[number]>;
  reward: { title: string; profileTag: string };
}

export interface BossValidation { ok: boolean; value?: BossConfigV1; errors: string[] }

const ROOT_KEYS = ['schema', 'id', 'name', 'origin', 'worlds', 'appearance', 'stats', 'traits', 'behavior', 'weaknesses', 'resistances', 'reward'];

export function parseBossConfig(input: string): BossValidation {
  if (input.length > 100_000) return { ok: false, errors: ['File: maximum size is 100 KB.'] };
  let value: unknown;
  try { value = JSON.parse(input); } catch { return { ok: false, errors: ['JSON: invalid syntax.'] }; }
  if (!record(value)) return { ok: false, errors: ['Root: expected one JSON object.'] };
  const errors: string[] = [];
  unknownKeys(value, ROOT_KEYS, 'Root', errors);
  exact(value.schema, BOSS_SCHEMA_VERSION, 'schema', errors);
  identifier(value.id, 'id', errors);
  oneOf(value.origin, ['builtin', 'custom', 'promoted-player'], 'origin', errors);
  if (!record(value.name)) errors.push('name: expected object.');
  else { unknownKeys(value.name, ['en', 'zh-CN'], 'name', errors); text(value.name.en, 'name.en', errors, 1, 80); if (value.name['zh-CN'] !== undefined) text(value.name['zh-CN'], 'name.zh-CN', errors, 1, 80); }
  arrayOf(value.worlds, ['phd', 'master', 'work'], 'worlds', errors, 1, 3);
  if (!record(value.appearance)) errors.push('appearance: expected object.');
  else { unknownKeys(value.appearance, ['shape', 'icon', 'palette'], 'appearance', errors); oneOf(value.appearance.shape, ['circle', 'triangle', 'square', 'hexagon'], 'appearance.shape', errors); text(value.appearance.icon, 'appearance.icon', errors, 1, 4); colorArray(value.appearance.palette, errors); }
  ranges(value.stats, ['hp', 'speed', 'scale'], [[20, 500], [10, 180], [.5, 2]], 'stats', errors);
  ranges(value.traits, ['expertise', 'resources', 'clarity', 'autonomySupport', 'emotionalSafety', 'fairness', 'boundaryRespect', 'projectMatch'], Array(8).fill([0, 1]), 'traits', errors);
  if (!record(value.behavior)) errors.push('behavior: expected object.');
  else {
    unknownKeys(value.behavior, ['signal', 'noise', 'attacks', 'telegraphMs', 'phases'], 'behavior', errors);
    range(value.behavior.signal, 0, 100, 'behavior.signal', errors); range(value.behavior.noise, 0, 100, 'behavior.noise', errors);
    arrayOf(value.behavior.attacks, ATTACK_PATTERNS, 'behavior.attacks', errors, 1, 4);
    range(value.behavior.telegraphMs, 500, 5000, 'behavior.telegraphMs', errors); integer(value.behavior.phases, 1, 4, 'behavior.phases', errors);
  }
  arrayOf(value.weaknesses, WEAKNESSES, 'weaknesses', errors, 0, 4);
  arrayOf(value.resistances, WEAKNESSES, 'resistances', errors, 0, 4);
  if (!record(value.reward)) errors.push('reward: expected object.');
  else { unknownKeys(value.reward, ['title', 'profileTag'], 'reward', errors); text(value.reward.title, 'reward.title', errors, 1, 80); identifier(value.reward.profileTag, 'reward.profileTag', errors); }
  return errors.length ? { ok: false, errors } : { ok: true, value: value as unknown as BossConfigV1, errors: [] };
}

export interface PromotedPlayerSnapshot {
  world: RunningWorld;
  completionNumber: number;
  difficulty: 'sprout' | 'garden' | 'storm';
  orbitCount: number;
  energy: number;
  focus: number;
  spirit: number;
  evidence?: number;
  connection?: number;
  activePriority?: string;
}

export function promotedPlayerBoss(snapshot: PromotedPlayerSnapshot): BossConfigV1 {
  const { world } = snapshot;
  const completions = Math.max(1, Math.round(snapshot.completionNumber));
  const energy = percent(snapshot.energy);
  const focus = percent(snapshot.focus);
  const spirit = percent(snapshot.spirit);
  const evidence = percent(snapshot.evidence ?? focus);
  const connection = percent(snapshot.connection ?? spirit);
  const pressureAttack = world === 'phd' ? 'orbiting-pressure' : world === 'master' ? 'lane-sweep' : 'interrupt-ring';
  const secondaryAttack = snapshot.orbitCount >= 4 ? 'radial-pulse' : snapshot.activePriority === '⚡' ? 'directed-burst' : 'orbiting-pressure';
  const difficultyBoost = snapshot.difficulty === 'storm' ? 35 : snapshot.difficulty === 'garden' ? 18 : 0;
  return {
    schema: BOSS_SCHEMA_VERSION, id: `promoted.${world}.${completions}.${snapshot.difficulty}`, name: { en: `${worldName(world)} Garden Self ${completions}`, 'zh-CN': `${worldZhName(world)}花园之我 ${completions}` },
    origin: 'promoted-player', worlds: [world], appearance: { shape: snapshot.orbitCount >= 4 ? 'hexagon' : 'circle', icon: snapshot.activePriority === '⚡' ? '⚡' : '✦', palette: [world === 'phd' ? '#79E4BD' : world === 'master' ? '#76D7FF' : '#FFD174', '#FFE18B'] },
    stats: { hp: Math.round(70 + spirit * 2.1 + difficultyBoost), speed: Math.round(20 + energy * 1.25), scale: Math.min(2, .72 + Math.max(1, snapshot.orbitCount) * .12) },
    traits: { expertise: ratio(evidence), resources: ratio((energy + focus) / 2), clarity: ratio(focus), autonomySupport: ratio(spirit), emotionalSafety: ratio(spirit), fairness: ratio((spirit + connection) / 2), boundaryRespect: ratio(energy), projectMatch: ratio((evidence + focus) / 2) },
    behavior: { signal: Math.round((evidence + focus) / 2), noise: Math.round(Math.max(0, 55 - spirit * .45)), attacks: [...new Set([pressureAttack, secondaryAttack])] as BossConfigV1['behavior']['attacks'], telegraphMs: snapshot.difficulty === 'storm' ? 1100 : snapshot.difficulty === 'garden' ? 1600 : 2200, phases: Math.min(4, Math.max(1, Math.ceil(snapshot.orbitCount / 2))) },
    weaknesses: energy < 45 ? ['mobility'] : focus < 45 ? ['clarity'] : ['connection'], resistances: evidence >= 65 ? ['evidence'] : spirit >= 65 ? ['boundary'] : ['focus'], reward: { title: 'The Person I Chose to Become', profileTag: `promoted-${world}` },
  };
}

function percent(value: number): number { return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0)); }
function ratio(value: number): number { return Math.round(percent(value)) / 100; }
function worldName(world: RunningWorld): string { return world === 'phd' ? 'PhD' : world === 'master' ? 'Master' : 'Work'; }
function worldZhName(world: RunningWorld): string { return world === 'phd' ? '博士' : world === 'master' ? '硕士' : '工作'; }

function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function unknownKeys(value: Record<string, unknown>, allowed: readonly string[], path: string, errors: string[]): void { for (const key of Object.keys(value)) if (!allowed.includes(key)) errors.push(`${path}.${key}: unknown field; executable or extension content is not allowed.`); }
function exact(value: unknown, expected: string, path: string, errors: string[]): void { if (value !== expected) errors.push(`${path}: expected ${expected}.`); }
function identifier(value: unknown, path: string, errors: string[]): void { if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,63}$/i.test(value)) errors.push(`${path}: use 1-64 letters, numbers, dot, underscore, or hyphen.`); }
function text(value: unknown, path: string, errors: string[], min: number, max: number): void { if (typeof value !== 'string' || value.length < min || value.length > max) errors.push(`${path}: expected ${min}-${max} characters.`); }
function oneOf(value: unknown, allowed: readonly string[], path: string, errors: string[]): void { if (typeof value !== 'string' || !allowed.includes(value)) errors.push(`${path}: expected one of ${allowed.join(', ')}.`); }
function range(value: unknown, min: number, max: number, path: string, errors: string[]): void { if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) errors.push(`${path}: expected ${min}-${max}.`); }
function integer(value: unknown, min: number, max: number, path: string, errors: string[]): void { range(value, min, max, path, errors); if (!Number.isInteger(value)) errors.push(`${path}: expected an integer.`); }
function arrayOf(value: unknown, allowed: readonly string[], path: string, errors: string[], min: number, max: number): void { if (!Array.isArray(value) || value.length < min || value.length > max || value.some((item) => typeof item !== 'string' || !allowed.includes(item))) errors.push(`${path}: expected ${min}-${max} values from ${allowed.join(', ')}.`); }
function colorArray(value: unknown, errors: string[]): void { if (!Array.isArray(value) || value.length < 1 || value.length > 4 || value.some((item) => typeof item !== 'string' || !/^#[0-9a-f]{6}$/i.test(item))) errors.push('appearance.palette: expected 1-4 #RRGGBB colors.'); }
function ranges(value: unknown, keys: string[], limits: number[][], path: string, errors: string[]): void { if (!record(value)) { errors.push(`${path}: expected object.`); return; } unknownKeys(value, keys, path, errors); keys.forEach((key, index) => range(value[key], limits[index]![0]!, limits[index]![1]!, `${path}.${key}`, errors)); }
