import { describe, expect, it } from 'vitest';
import { parseBossConfig, promotedPlayerBoss } from '../src/running/core/bossSchema';
import { createBossAiPrompt, formatBossPreview, localizeBossValidationErrors, normalizeBossForCustomSave } from '../src/running/BossStudio';
import { setLocale } from '../src/i18n/strings';

describe('BeatGarden Boss Schema v1', () => {
  it('accepts a bounded data-only supportive promoted profile', () => {
    const boss = promotedPlayerBoss({ world: 'phd', completionNumber: 2, difficulty: 'garden', orbitCount: 5, energy: 72, focus: 84, spirit: 91, evidence: 76, connection: 68 });
    expect(parseBossConfig(JSON.stringify(boss))).toEqual({ ok: true, value: boss, errors: [] });
    expect(boss.origin).toBe('promoted-player');
    expect(boss.behavior.noise).toBeLessThan(boss.behavior.signal);
  });

  it('rejects executable and unknown fields with field-level errors', () => {
    const boss = { ...promotedPlayerBoss({ world: 'work', completionNumber: 1, difficulty: 'sprout', orbitCount: 2, energy: 60, focus: 50, spirit: 70 }), script: 'fetch("https://example.test")' };
    const result = parseBossConfig(JSON.stringify(boss));
    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('Root.script: unknown field');
  });

  it('rejects out-of-range stats and unrecognized attacks', () => {
    const boss = promotedPlayerBoss({ world: 'master', completionNumber: 1, difficulty: 'storm', orbitCount: 3, energy: 40, focus: 60, spirit: 50 });
    boss.stats.hp = 9999;
    boss.behavior.attacks = ['arbitrary-code' as never];
    const result = parseBossConfig(JSON.stringify(boss));
    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('stats.hp');
    expect(result.errors.join('\n')).toContain('behavior.attacks');
  });

  it('maps materially different bounded player snapshots to different valid Bosses', () => {
    const focused = promotedPlayerBoss({ world: 'work', completionNumber: 3, difficulty: 'storm', orbitCount: 6, energy: 45, focus: 94, spirit: 52, activePriority: '▣' });
    const rushing = promotedPlayerBoss({ world: 'work', completionNumber: 3, difficulty: 'sprout', orbitCount: 2, energy: 88, focus: 38, spirit: 84, activePriority: '⚡' });
    expect(parseBossConfig(JSON.stringify(focused)).ok).toBe(true);
    expect(parseBossConfig(JSON.stringify(rushing)).ok).toBe(true);
    expect(focused.stats).not.toEqual(rushing.stats);
    expect(focused.behavior).not.toEqual(rushing.behavior);
    expect(focused.appearance).not.toEqual(rushing.appearance);
  });

  it('localizes player-facing Boss Studio previews and validation errors in zh-CN', () => {
    setLocale('zh-CN');
    const boss = promotedPlayerBoss({ world: 'master', completionNumber: 1, difficulty: 'garden', orbitCount: 5, energy: 70, focus: 80, spirit: 90, evidence: 80 });
    const preview = formatBossPreview(boss);
    expect(preview).toContain('硕士花园之我 1');
    expect(preview).toContain('生命值');
    expect(preview).toContain('环形脉冲');
    expect(localizeBossValidationErrors(['JSON: invalid syntax.', 'behavior.attacks: expected 1-4 values from radial-pulse.'])).toEqual(['JSON 语法无效。', '攻击：必须使用允许的选项及数量。']);
    expect(localizeBossValidationErrors(['Root.script: unknown field; executable or extension content is not allowed.'])).toEqual(['根对象.script：不允许此字段；不能包含可执行或扩展内容。']);
    expect(localizeBossValidationErrors(['behavior.payload: unknown field; executable or extension content is not allowed.'])).toEqual(['行为.payload：不允许此字段；不能包含可执行或扩展内容。']);
  });

  it('normalizes imported Boss Studio saves to custom and provides a self-contained JSON-only prompt', () => {
    const imported = promotedPlayerBoss({ world: 'phd', completionNumber: 1, difficulty: 'sprout', orbitCount: 1, energy: 70, focus: 70, spirit: 70 });
    expect(normalizeBossForCustomSave(imported)).toEqual({ ...imported, origin: 'custom' });
    const prompt = createBossAiPrompt();
    expect(prompt).toContain('beatgarden-boss.v1');
    expect(prompt).toContain('Required root keys (and no others): schema, id, name, origin, worlds, appearance, stats, traits, behavior, weaknesses, resistances, reward.');
    expect(prompt).toContain('"radial-pulse"');
    expect(prompt).toContain('telegraphMs 500-5000');
    expect(prompt).toContain('JSON only: no prose');
  });
});
