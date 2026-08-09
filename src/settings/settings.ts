export interface BeatGardenSettings {
  musicVolume: number;
  sfxVolume: number;
  calibrationOffsetMs: number;
  reducedMotion: boolean;
}

export const DEFAULT_SETTINGS: Readonly<BeatGardenSettings> = {
  musicVolume: 0.8,
  sfxVolume: 0.9,
  calibrationOffsetMs: 0,
  reducedMotion: false,
};

const STORAGE_KEY = 'beatgarden.settings.v1';

export function loadSettings(): BeatGardenSettings {
  const localStore = storage();
  if (!localStore) return { ...DEFAULT_SETTINGS };
  try {
    const parsed = JSON.parse(localStore.getItem(STORAGE_KEY) ?? '{}') as Partial<BeatGardenSettings>;
    return {
      musicVolume: clamp01(parsed.musicVolume ?? DEFAULT_SETTINGS.musicVolume),
      sfxVolume: clamp01(parsed.sfxVolume ?? DEFAULT_SETTINGS.sfxVolume),
      calibrationOffsetMs: clamp(parsed.calibrationOffsetMs ?? 0, -250, 250),
      reducedMotion: parsed.reducedMotion === true,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: BeatGardenSettings): void {
  storage()?.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function updateSettings(patch: Partial<BeatGardenSettings>): BeatGardenSettings {
  const current = loadSettings();
  const next: BeatGardenSettings = {
    musicVolume: clamp01(patch.musicVolume ?? current.musicVolume),
    sfxVolume: clamp01(patch.sfxVolume ?? current.sfxVolume),
    calibrationOffsetMs: clamp(patch.calibrationOffsetMs ?? current.calibrationOffsetMs, -250, 250),
    reducedMotion: patch.reducedMotion ?? current.reducedMotion,
  };
  saveSettings(next);
  return next;
}

function clamp01(value: number): number { return clamp(value, 0, 1); }
function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return typeof window.localStorage?.getItem === 'function' ? window.localStorage : null;
  } catch {
    return null;
  }
}
function clamp(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min;
}
