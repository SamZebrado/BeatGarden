export type Locale = 'zh-CN' | 'en';

const zhCN = {
  'stage.firefly.title': '萤火码头',
  'stage.firefly.tagline': '光种进入码头中央光圈时，点击或触摸屏幕。',
  'audio.enable': '点击或触摸屏幕，启用声音',
  'audio.enableFailed': '声音未能启用，请再次点击或触摸',
  'smoke.touchPointer': '模拟 Android 触摸指针',
  'smoke.visibilityReject': '模拟后台恢复被拒绝',
  'input.howTo': '电脑：鼠标左键　·　Android：触摸屏幕',
  'shortcuts': '快捷键：R 重新开始　D 调试信息　Esc 暂停',
  'language.switch': '切换语言',
  'result.title': '本局结果',
  'result.score': '分数',
  'result.accuracy': '准确率',
  'result.perfect': '完美',
  'result.great': '很棒',
  'result.ok': '可以',
  'result.miss': '错过',
  'result.meanError': '平均时间误差',
  'result.medianError': '时间误差中位数',
  'action.restart': '重新开始',
  'action.back': '返回标题',
  'tutorial.action': '光种进入光圈时，点击或触摸！',
  'tutorial.watch': '跟着移动的光种，瞄准中央光圈',
  'tutorial.stage': '互动教学 · 前四次会逐步提示',
  'tutorial.wait': '再等等：光种还没进入光圈',
  'feedback.PERFECT': '完美！',
  'feedback.GREAT': '很棒！',
  'feedback.OK': '可以！',
  'feedback.MISS': '错过！',
  'status.paused': '已暂停',
  'debug.title': 'BeatGarden　时序调试',
  'debug.audioTime': '音频时间',
  'debug.transportTime': '乐曲时间',
  'debug.transportBeat': '当前节拍',
  'debug.frameRate': '帧率',
  'debug.calibration': '校准偏移',
  'debug.lastInputDelta': '最近输入误差',
  'debug.lastInputTime': '最近输入时间',
  'debug.lastTargetBeat': '最近目标节拍',
  'debug.lastTargetTime': '最近目标时间',
  'debug.lastJudgement': '最近判定',
  'debug.schedulerQueue': '调度队列',
  'debug.counts': '判定计数',
  'debug.events': '个事件',
  'error.missingRoot': '页面缺少游戏容器。',
} as const;

const en: Record<keyof typeof zhCN, string> = {
  'stage.firefly.title': 'Firefly Dock',
  'stage.firefly.tagline': 'Click or touch when the glowing seed enters the center ring.',
  'audio.enable': 'Click or touch to enable audio',
  'audio.enableFailed': 'Audio could not start. Click or touch again.',
  'smoke.touchPointer': 'Simulate Android touch pointer',
  'smoke.visibilityReject': 'Simulate rejected background resume',
  'input.howTo': 'Computer: left mouse button  ·  Android: touch the screen',
  'shortcuts': 'Shortcuts: R restart  D debug  Esc pause',
  'language.switch': 'Switch language',
  'result.title': 'Result',
  'result.score': 'Score',
  'result.accuracy': 'Accuracy',
  'result.perfect': 'Perfect',
  'result.great': 'Great',
  'result.ok': 'OK',
  'result.miss': 'Miss',
  'result.meanError': 'Mean timing error',
  'result.medianError': 'Median timing error',
  'action.restart': 'Restart',
  'action.back': 'Back to title',
  'tutorial.action': 'Click or touch when the seed enters the ring!',
  'tutorial.watch': 'Follow the moving seed toward the center ring',
  'tutorial.stage': 'Interactive tutorial · the first four cues are guided',
  'tutorial.wait': 'Not yet — wait until the seed enters the ring',
  'feedback.PERFECT': 'PERFECT!',
  'feedback.GREAT': 'GREAT!',
  'feedback.OK': 'OK!',
  'feedback.MISS': 'MISS!',
  'status.paused': 'Paused',
  'debug.title': 'BeatGarden  Timing Debug',
  'debug.audioTime': 'Audio time',
  'debug.transportTime': 'Song time',
  'debug.transportBeat': 'Transport beat',
  'debug.frameRate': 'Frame rate',
  'debug.calibration': 'Calibration offset',
  'debug.lastInputDelta': 'Last input delta',
  'debug.lastInputTime': 'Last input time',
  'debug.lastTargetBeat': 'Last target beat',
  'debug.lastTargetTime': 'Last target time',
  'debug.lastJudgement': 'Last judgement',
  'debug.schedulerQueue': 'Scheduler queue',
  'debug.counts': 'Judgement counts',
  'debug.events': 'events',
  'error.missingRoot': 'The game container is missing.',
};

export type StringKey = keyof typeof zhCN;

let activeLocale: Locale = loadLocale();

function browserStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function loadLocale(): Locale {
  const storage = browserStorage();
  if (!storage || typeof storage.getItem !== 'function') return 'zh-CN';
  return storage.getItem('beatgarden.locale') === 'en' ? 'en' : 'zh-CN';
}

function syncDocumentLanguage(): void {
  if (typeof document !== 'undefined') document.documentElement.lang = activeLocale;
}

export function getLocale(): Locale {
  return activeLocale;
}

export function setLocale(locale: Locale): void {
  activeLocale = locale;
  const storage = browserStorage();
  if (storage && typeof storage.setItem === 'function') {
    storage.setItem('beatgarden.locale', locale);
  }
  syncDocumentLanguage();
}

export function toggleLocale(): Locale {
  const next = activeLocale === 'zh-CN' ? 'en' : 'zh-CN';
  setLocale(next);
  return next;
}

export function t(key: StringKey): string {
  return activeLocale === 'zh-CN' ? zhCN[key] : en[key];
}

syncDocumentLanguage();
