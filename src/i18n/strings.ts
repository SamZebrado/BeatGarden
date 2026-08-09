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
  'action.back': '返回关卡选择',
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
  'autochart.title': '你的音乐',
  'autochart.subtitle': '选择设备上的音乐，在本地生成原创节奏谱面。',
  'autochart.choose': '选择音频文件',
  'autochart.privacy': '音乐只在本设备分析，不会上传。',
  'autochart.rights': '用户导入音乐：版权状态未核验，由用户提供。',
  'autochart.analyzing': '正在分析音乐…',
  'autochart.preparing': '正在准备音频…',
  'autochart.failed': '无法分析此音频文件。',
  'autochart.tempo': '检测速度',
  'autochart.confidence': '置信度',
  'autochart.mode': '计时模式',
  'autochart.onsets': '候选起音',
  'autochart.notes': '生成音符',
  'autochart.difficulty': '难度',
  'autochart.easy': '轻松',
  'autochart.normal': '普通',
  'autochart.hard': '困难',
  'autochart.seed': '变化种子',
  'autochart.regenerate': '重新生成变化',
  'autochart.localMode': '起音直接计时',
  'autochart.beatMode': '节拍网格辅助',
  'autochart.back': '返回萤火码头',
  'autochart.play': '进入脉冲花园',
  'autogarden.title': '脉冲花园',
  'autogarden.instructions': '光点进入中央花环时操作：圆点点击，箭头滑动，长条按住。',
  'autogarden.start': '点击或触摸，开始播放本地音乐',
  'autogarden.wait': '再等等：跟随正在靠近的光点',
  'autogarden.paused': '已暂停 · 再按 Esc 继续',
  'menu.tagline': '种下节拍，让花园回应你的每一次操作。',
  'menu.original': '原创关卡',
  'menu.originalDetail': '游玩 BeatGarden 原创音乐与互动场景',
  'menu.yourMusic': '你的音乐',
  'menu.yourMusicDetail': '在本地分析音频并生成谱面',
  'menu.stageSelect': '选择原创关卡',
  'menu.fireflyDetail': '互动教学 · 点击光种 · 原创程序音乐',
  'menu.back': '返回主菜单',
  'menu.calibration': '时序校准',
  'menu.calibrationDetail': '用节拍点击测量设备与操作偏移',
  'menu.settings': '设置',
  'menu.settingsDetail': '音量、动态效果与本机偏好',
  'calibration.title': '时序校准',
  'calibration.instructions': '听到每次节拍声时立即点击或触摸。需要 16 次有效操作。',
  'calibration.start': '启用声音并开始校准',
  'calibration.progress': '有效操作',
  'calibration.saved': '校准完成并已保存',
  'calibration.failed': '有效操作不足，请重新校准',
  'calibration.offset': '校准偏移',
  'settings.title': '设置',
  'settings.music': '音乐音量',
  'settings.sfx': '音效音量',
  'settings.reducedMotion': '减少动态效果',
  'settings.saved': '设置已自动保存',
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
  'action.back': 'Back to stage select',
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
  'autochart.title': 'Your Music',
  'autochart.subtitle': 'Choose music on this device and generate an original rhythm chart locally.',
  'autochart.choose': 'Choose audio file',
  'autochart.privacy': 'Music is analyzed only on this device and is never uploaded.',
  'autochart.rights': 'User-imported music: rights not verified; provided by the user.',
  'autochart.analyzing': 'Analyzing music…',
  'autochart.preparing': 'Preparing audio…',
  'autochart.failed': 'This audio file could not be analyzed.',
  'autochart.tempo': 'Detected tempo',
  'autochart.confidence': 'Confidence',
  'autochart.mode': 'Timing mode',
  'autochart.onsets': 'Onset candidates',
  'autochart.notes': 'Generated notes',
  'autochart.difficulty': 'Difficulty',
  'autochart.easy': 'Easy',
  'autochart.normal': 'Normal',
  'autochart.hard': 'Hard',
  'autochart.seed': 'Variation seed',
  'autochart.regenerate': 'Regenerate variation',
  'autochart.localMode': 'Direct onset timing',
  'autochart.beatMode': 'Beat-grid assisted',
  'autochart.back': 'Back to Firefly Dock',
  'autochart.play': 'Enter Pulse Garden',
  'autogarden.title': 'Pulse Garden',
  'autogarden.instructions': 'Act when a light enters the center wreath: tap circles, swipe arrows, hold bars.',
  'autogarden.start': 'Click or touch to play local music',
  'autogarden.wait': 'Not yet — follow the approaching light',
  'autogarden.paused': 'Paused · press Esc to continue',
  'menu.tagline': 'Plant the beat and let the garden answer every move.',
  'menu.original': 'Original Stages',
  'menu.originalDetail': 'Play BeatGarden original music and interactive scenes',
  'menu.yourMusic': 'Your Music',
  'menu.yourMusicDetail': 'Analyze local audio and generate a chart on this device',
  'menu.stageSelect': 'Choose an Original Stage',
  'menu.fireflyDetail': 'Interactive tutorial · tap glowing seeds · original procedural music',
  'menu.back': 'Back to main menu',
  'menu.calibration': 'Timing Calibration',
  'menu.calibrationDetail': 'Measure device and input offset with guided taps',
  'menu.settings': 'Settings',
  'menu.settingsDetail': 'Volume, motion, and local preferences',
  'calibration.title': 'Timing Calibration',
  'calibration.instructions': 'Click or touch immediately when you hear each tick. Sixteen valid inputs are required.',
  'calibration.start': 'Enable audio and start calibration',
  'calibration.progress': 'Valid inputs',
  'calibration.saved': 'Calibration complete and saved',
  'calibration.failed': 'Not enough valid inputs. Please run calibration again.',
  'calibration.offset': 'Calibration offset',
  'settings.title': 'Settings',
  'settings.music': 'Music volume',
  'settings.sfx': 'Sound effects volume',
  'settings.reducedMotion': 'Reduce motion',
  'settings.saved': 'Settings save automatically',
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
