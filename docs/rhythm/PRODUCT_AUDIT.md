# BeatGarden Rhythm Mode V2 — R0 产品审计

## 审计边界与结论

- 审计基线：`27739e7d6c621c661edfc3b55df981d9e3438f46`（`origin/main`）。
- 审计阶段只新增文档与证据，没有修改 runtime code。
- 实际运行覆盖：Mode Select、Rhythm Home、Stage Select、四个内置关卡、AutoChart、Pulse Garden、四个工具页、所有 legacy deep links，以及 Running Mode 启动边界。
- 尺寸覆盖：1440×810、1280×800、1024×768、390×844；Android 平板 2136×3200 竖屏与 3200×2136 横屏。
- Android 设备：Xiaomi `24091RPADC`，ADB serial `bbda35e`。测试前与运行后均确认 `STREAM_MUSIC: Muted: true`；未产生可听声音。
- 总结：底层 timing/lifecycle 已有可靠 V1 基础，但当前 Rhythm V2 的产品层仍明显像功能完成后的开发演示。R1 必须先解决窄屏可达性、Bubble/Cloud/Greenhouse 控制可读性和共同 HUD；随后才能增加更强视觉表现。

桌面截图由 Codex in-app Browser 采集。该环境的位图捕获存在可复现的 2:1 backing-surface 缩放差异；DOM 同时验证了真实 CSS viewport 与元素矩形。因此证据图中的右侧/下方空白不作为产品缺陷，布局结论以 DOM 几何与 Android 原生截图交叉确认。Android 截图为设备原生像素。

## 证据索引

- 总览：[contact sheet](evidence/r0/contact-sheet.png)
- 单帧清单：`docs/rhythm/evidence/r0/01` 至 `18`。
- 关卡运行样本：Firefly `PERFECT 1 / GREAT 1 / OK 2 / MISS 16`；Bubble `2 / 1 / 1 / 19`；Cloud `0 / 0 / 1 / 26`；Greenhouse `0 / 0 / 0 / 16`；Pulse fixture `3 / 4 / 0 / 7`。这些是审计交互样本，不是玩家能力或 timing acceptance 结果。
- AutoChart fixture 额外验证：Normal seed 1 的 14 个目标全部为 tap；Hard seed 2 的 20 个目标仍全部为 tap。随后按目标时刻自动执行鼠标输入得到 `GREAT 8 / OK 6 / MISS 0`，证明基础 timing 可运行，但该 fixture 暴露了“难度提高却没有动作类型变化”的产品风险。

## 状态覆盖矩阵

| Surface | unlock / instruction | countdown / first target | correct / wrong | mid / dense | pause | result |
| --- | --- | --- | --- | --- | --- | --- |
| Firefly Dock | 已渲染 | 已渲染 | 已真实输入 | 已完整运行 | 已验证 | 已验证 |
| Bubble Kitchen | 已渲染 | 已渲染 | 三轨点击样本 | 已完整运行 | 已验证 | 已验证 |
| Cloud Post | 已渲染 | 已渲染 | 实际 drag 样本 | 已完整运行 | 已验证 | 已验证 |
| Sleepy Greenhouse | 已渲染 | 已渲染 | 实际 press/release 尝试 | 已完整运行 | 已验证 | 已验证 |
| Pulse Garden | 已渲染 | fixture 起播 | tap 命中；swipe/hold 能力由控件与源码存在性确认 | 已完整运行 | 不适用当前实现 | 已验证 |

Pulse Garden 的 fixture 在 Normal/Hard 两次生成中均没有产生 swipe/hold 目标，故不能用它声称这些手势已达到产品级可玩性；这是 R5 必须补足的可测覆盖。

## 高风险假设验证

### Additional stages template sameness — CONFIRMED

Bubble、Cloud、Greenhouse 使用同一个 `GardenStage` 渲染骨架。实际画面都以水平虚线、圆形判定区、中央或分轨目标和同位置大 judgement 为核心。颜色、符号和背景物体不同，但节奏段落与画面阅读顺序相近，当前更像一个模板的三个皮肤，而不是三个独立小游戏。

### Control comprehension — FAIL for first-time comprehension

- Bubble：三个锅存在，但“当前应点哪个锅”的轨道边界、持续 lane 标识与错误 lane 因果不足。
- Cloud：箭头表达方向，但没有起点、终点、最短距离或滑动轨迹反馈；上屏后的通用设备文案仍说“鼠标左键/触摸屏幕”。
- Greenhouse：没有稳定的 `PRESS → HOLDING → RELEASE` 状态、蓄水/压力计或持续按住确认；自动化实际按住尝试未得到可辨别状态反馈。
- Firefly：光种与光圈最清楚，但教学文字偏多，大型顶部反馈会与下一目标竞争注意力。

### Result screen — CONFIRMED diagnostic dump

四关结果页首先展示 score、accuracy、计数、mean/median timing error；缺少 grade、最佳 combo、Groove、趋势解释、奖励和“下一关”主行动。它服务调试多于服务玩家。

### AutoChart musicality — PARTIAL / high risk

分析结果页以 BPM、confidence、timing mode、onset count、note count、raw seed 为主，像开发工具。fixture 可以稳定生成和游玩，但 Normal 与 Hard 样本都退化为全 tap；当前证据不能证明 note type 与音乐具有可感知关系，也不能证明 phrase/build/climax/rest。该结论不是算法错误判定，而是产品证据不足与 fixture 暴露的变化性失败。

## 逐项缺陷

### R0-01 — Shared shell 像原型导航

- **Observed screen/state:** Mode Select、Rhythm Home、Stage Select。
- **Specific visual or interaction defect:** 大面积通用渐变卡片、emoji/字符作为主图标、页面间相同的居中卡片语法；关卡卡没有 artwork、机制图标、难度、最佳成绩或完成度。
- **Why it harms comprehension/game feel:** 玩家无法快速建立产品身份，也没有选择与重玩的理由；页面像组件样例而非成品入口。
- **Severity:** High。
- **Narrow proposed direction:** 保留现有信息架构，建立统一夜光花园 shell；用小型场景缩略图、机制 badge、成绩/grade 和清晰主次按钮替代“每处都是渐变卡片”。

### R0-02 — 390×844 Rhythm Home 不可完整访问

- **Observed screen/state:** 390×844 Rhythm Home 与 Stage Select。
- **Specific visual or interaction defect:** Root 固定 `100vh`、垂直居中且 `overflow:hidden`。Rhythm Home 的 main DOM 为 `top=-131 / bottom=975 / height=1106`，但 document `scrollHeight=844`，顶部和底部工具均不可滚动到；Stage Select main 也轻微越界。
- **Why it harms comprehension/game feel:** mobile-like viewport 会丢失返回、语言或工具入口；这不是视觉瑕疵，而是功能不可达。
- **Severity:** Blocker for R1。
- **Narrow proposed direction:** Shell 页面使用 `min-height:100dvh`、顶部对齐与纵向滚动；gameplay canvas 继续保持受控横屏适配。

### R0-03 — Stage Select 没有预期与进度

- **Observed screen/state:** Stage Select desktop 与 Android portrait。
- **Specific visual or interaction defect:** 四张卡只含标题与一句机制说明，没有每关的节奏性格、输入图示、难度、最好 grade、最高 combo、完成标记。
- **Why it harms comprehension/game feel:** 玩家无法判断差异，也没有“再试一次提高成绩”的动机。
- **Severity:** High。
- **Narrow proposed direction:** 每卡只新增一张自有场景缩略图、一个输入 badge、一个难度标签和一个历史最佳摘要。

### R0-04 — Unlock 教学仍依赖文字说明

- **Observed screen/state:** 四关 unlock / instruction。
- **Specific visual or interaction defect:** 文案说明占主导，真实可操作区域和手势没有在画面中演示；通用设备行对 Cloud/Greenhouse 过度简化。
- **Why it harms comprehension/game feel:** 首次玩家必须读完文字并记忆后再进入动态画面，违反十秒内理解控制的目标。
- **Severity:** Critical。
- **Narrow proposed direction:** 前 4–8 拍做关内交互教学；同屏显示设备自适应的鼠标/触摸图示、目标路径和动作 ghost，成功后立即让环境产生因果反应。

### R0-05 — Firefly 反馈与下一目标竞争

- **Observed screen/state:** Firefly first approach、correct/wrong feedback、mid section。
- **Specific visual or interaction defect:** 顶部完整句式反馈尺寸大、持续时间长；判定词和说明句占据视线，目标仍沿同一路径继续接近。
- **Why it harms comprehension/game feel:** 玩家命中后会看文字而不是下一颗光种，连续输入的节奏感被反馈打断。
- **Severity:** High。
- **Narrow proposed direction:** 判定缩成 hit zone 附近的短促双通道反馈（形状+文字），教学解释放侧边 tutorial rail，并在熟练后淡出。

### R0-06 — Bubble 三轨不是“一眼可见的三个操作区”

- **Observed screen/state:** Bubble countdown、mid、wrong lane attempt。
- **Specific visual or interaction defect:** 三个锅有位置差异，但共享一条横向判定线和相似圆环；缺少贯穿 approach path 的 lane 容器、编号/图形标识与当前 lane 落点反馈。
- **Why it harms comprehension/game feel:** 玩家可能把它理解为任意位置点击，而不是命中对应锅；错误 lane 的因果不够明确。
- **Severity:** Critical。
- **Narrow proposed direction:** 把画面明确分成三个锅口轨道；目标从配方架落入对应锅，点错锅时只让错误锅冒出失败泡泡。

### R0-07 — Cloud 只显示方向，不解释手势

- **Observed screen/state:** Cloud unlock、first target、drag attempts、mid。
- **Specific visual or interaction defect:** 箭头表示左右，但没有 swipe 起点/终点、最短距离、ghost trail、已达到阈值或反向错误反馈。
- **Why it harms comprehension/game feel:** 玩家知道“可能要滑”，但不知道从哪里开始、滑多远、何时滑；实际 drag 样本多数 MISS。
- **Severity:** Critical。
- **Narrow proposed direction:** 邮件沿风道进入投递区时出现短 ghost trail；按下显示起点，拖动实时填充距离，方向/阈值满足后锁定并在松开时寄出。

### R0-08 — Greenhouse 缺少持有状态机的可视化

- **Observed screen/state:** Greenhouse first target、press/hold/release attempts、mid。
- **Specific visual or interaction defect:** 大矩形温室占据舞台，但没有 PRESS、HOLDING、RELEASE 状态、持续时间计、压力/水位或断开提示。
- **Why it harms comprehension/game feel:** 玩家无法知道按下是否被识别、还需按多久、何时松开；静态画面让操作看起来没有因果。
- **Severity:** Blocker for R1。
- **Narrow proposed direction:** 雨滴落下触发按下窗；按住后水压环持续充能并驱动藤蔓生长；release 窗打开时环形出口发亮，松手才开花。

### R0-09 — 三个 Additional stages 是同一模板换皮

- **Observed screen/state:** Bubble、Cloud、Greenhouse gameplay 并排比较。
- **Specific visual or interaction defect:** 相同水平线、相同圆形判定区、相同 judgement 位置、相近目标节奏与段落长度；背景色和符号是主要差异。
- **Why it harms comprehension/game feel:** 新关卡没有新的身体动作和视觉阅读方式，重复感会在第二关就出现。
- **Severity:** Critical for R3。
- **Narrow proposed direction:** 共享 timing/HUD，不共享 approach geometry：Bubble 垂直三锅、Cloud 水平风道、Greenhouse 持续压力曲线。

### R0-10 — 部分动作看起来随机而非玩家触发

- **Observed screen/state:** Firefly worker、Bubble bubbles、Cloud mail、Greenhouse vines。
- **Specific visual or interaction defect:** 环境动画会随时间或判定发生，但玩家输入的 Contact 与 Payoff 没有稳定的同点起因；MISS 与成功有时只由顶部文字区分。
- **Why it harms comprehension/game feel:** 玩家不确定自己是否造成了发射、弹跳、寄出或开花。
- **Severity:** High。
- **Narrow proposed direction:** 每个成功输入都遵循 Anticipation→Contact→Payoff→Recovery，并从输入位置或 hit zone 发起；环境自主循环只做低层背景。

### R0-11 — 判定语言太依赖大字和颜色

- **Observed screen/state:** 四关和 Pulse 的 PERFECT/GREAT/OK/MISS。
- **Specific visual or interaction defect:** 判定大多出现在固定顶部区域，形状、节奏和位移差异有限；长句提示会覆盖高密度阅读区域。
- **Why it harms comprehension/game feel:** 色觉、reduced motion 和高密度段下辨识度下降；注意力离开 hit zone。
- **Severity:** High。
- **Narrow proposed direction:** 判定使用文字+独特轮廓+短音效；FAST/SLOW 放在判定下方；最大持续约 420ms，下一目标到达前完成 Recovery。

### R0-12 — Pause 是通用遮罩，没有情境恢复提示

- **Observed screen/state:** 四关 pause。
- **Specific visual or interaction defect:** 只有“已暂停”和通用暗遮罩；没有当前进度、控制复习或恢复倒计时。
- **Why it harms comprehension/game feel:** 新玩家暂停后仍不知道如何继续操作，恢复瞬间容易直接 MISS。
- **Severity:** Medium。
- **Narrow proposed direction:** Pause card 显示进度、当前关卡的一条控制提示、继续/重开/退出；恢复使用 3 拍重入倒计时。

### R0-13 — Result 首先服务开发诊断

- **Observed screen/state:** 四关 result 与 Pulse result。
- **Specific visual or interaction defect:** 数值密集、mean/median timing 直接处于主层级；没有 grade、最佳 combo、Groove、FAST/SLOW 倾向、奖励场景和下一关主按钮。
- **Why it harms comprehension/game feel:** 结束没有高潮或成长反馈，玩家不知道自己哪里做得好、为何要重玩。
- **Severity:** Critical for R4。
- **Narrow proposed direction:** 第一屏为 grade、score、accuracy、best combo、节奏倾向与环境奖励；高级 timing diagnostics 折叠到“详细数据”。

### R0-14 — AutoChart analysis result 像开发工具

- **Observed screen/state:** AutoChart analyzing/result/difficulty/seed。
- **Specific visual or interaction defect:** BPM、confidence、timing mode、onset count、note count 和 raw numeric seed 并列为主信息；主要按钮之间缺少推荐路径。
- **Why it harms comprehension/game feel:** 玩家被算法术语要求做选择，而不是先知道“这首歌将怎么玩”。
- **Severity:** High。
- **Narrow proposed direction:** 主层只展示歌曲、推荐难度、谱面长度、动作构成与“开始”；诊断指标折叠；seed 改成可理解的“变化版本”。

### R0-15 — AutoChart fixture 没有证明音乐驱动的动作变化

- **Observed screen/state:** fixture Normal seed 1、Hard seed 2、Pulse runtime。
- **Specific visual or interaction defect:** 两个样本分别生成 14/20 个目标，却全部是 tap；Hard 只增加密度，没有 swipe/hold 或乐句层级的可见变化。
- **Why it harms comprehension/game feel:** 技术上可判定不等于好玩；玩家会感觉是等间隔点击器，难度和音乐结构没有表达。
- **Severity:** Critical for R5。
- **Narrow proposed direction:** 生成前先建立 phrase/section envelope，再在人体工学约束下分配 tap/swipe/hold；为测试 fixture 明确制造 intro/build/rest/climax 与三种动作。

### R0-16 — Pulse Garden 缺少动作预告和段落身份

- **Observed screen/state:** Pulse start、mid、result。
- **Specific visual or interaction defect:** 开场文字一次性列出圆点/箭头/长条，但运行中没有稳定的 lane/action legend、hold meter 或 section name；花朵反馈漂亮但更像装饰。
- **Why it harms comprehension/game feel:** 混合输入需要更强的视觉预告；玩家看见生长，却不一定知道是哪次动作造成。
- **Severity:** High。
- **Narrow proposed direction:** 将目标形状、接近轨迹与 section growth 一一映射；每一乐句完成时让频谱地形成长，而非每次随机长花。

### R0-17 — 缺少 Combo/Groove/section progression

- **Observed screen/state:** 所有关卡 mid/high-density 与 result。
- **Specific visual or interaction defect:** HUD 没有持续 combo、groove、section/progress；环境成长没有形成清晰的三段变化。
- **Why it harms comprehension/game feel:** 单次 judgement 之间没有长期张力，优秀连续表现和失误恢复都缺少意义。
- **Severity:** High。
- **Narrow proposed direction:** 只从既有 Judge 事件派生 display-only Combo/Groove；每关定义至少 intro/build/climax 三个视觉段落，不改变判定窗口。

### R0-18 — Running 边界当前可启动，但有本机续玩状态

- **Observed screen/state:** `?mode=running` 启动。
- **Specific visual or interaction defect:** 无 Rhythm 缺陷；当前设备显示“继续未完成的旅程？”本机状态提示。
- **Why it harms comprehension/game feel:** 这是边界证据，说明后续回归不能用清空 localStorage 的方式破坏 Running 存档。
- **Severity:** Boundary / no change requested。
- **Narrow proposed direction:** Rhythm 实现不得修改 Running 源码、数据、路由或持久化键；最终只做启动与存档保留 smoke。

## R1–R5 实施切片

1. **R1 Control Clarity:** 先修 shell 滚动与所有关内交互式教学；Bubble lane、Cloud swipe ghost、Greenhouse hold state；建立 shared HUD/tutorial API。
2. **R2 Shared Game Feel:** display-only Combo/Groove/FAST-SLOW；统一 judgement 与 Anticipation/Contact/Payoff/Recovery；reduced-motion 等价反馈。
3. **R3 Stage Differentiation:** 保留 shared timing，拆分三关 approach geometry 与 section progression；每关至少三段明显变化。
4. **R4 Product Loop:** shell、stage cards、pause、result、grade、best combo、节奏倾向、下一关；诊断折叠。
5. **R5 AutoChart:** phrase/section envelope、动作人体工学、变化版本 UI、专用多手势 fixture 与 playability tests。

## Shared files likely to be touched

- `src/app/AppController.ts`, `src/app/ModeSelectView.ts`, `src/app/RootController.ts`
- `src/game/Stage.ts`, `src/game/StageRunner.ts`, `src/game/InputRouter.ts`
- `src/stages/fireflyDock/FireflyDockStage.ts`
- `src/stages/original/GardenStages.ts`
- `src/autochart/AutoChartAnalysisView.ts`, `src/autochart/PulseGardenRunner.ts`, `src/autochart/generateChart.ts`
- `src/i18n/strings.ts`, shared settings and new Rhythm-only presentation modules/tests

Timing authority remains `AudioContext.currentTime → Transport → Scheduler → Judge → StageRunner`. R1–R5 may consume judge events for presentation but must not create a parallel timing clock.
