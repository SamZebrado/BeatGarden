# BeatGarden Rhythm Mode — Design Authority

Status: R0 authority proposal. Runtime implementation begins only after `RHYTHM V2 DESIGN GATE: PASS`.

## 1. Product identity

**Luminous Rhythm Garden / 夜光节拍花园**

BeatGarden Rhythm Mode 是一个让节拍直接种出环境变化的轻量节奏游戏。它不模拟商业音游的舞台、轨道或角色表达；它的独特承诺是：玩家每一次正确动作都能看见“接近、接触、生长、恢复”的完整因果，连续表现会让同一片花园从安静变得繁盛。

三个产品支柱：

1. **十秒懂控制**：不看 README，能从画面知道何时、在哪里、怎样操作。
2. **每拍有因果**：目标、输入、判定、环境反应属于同一动作链。
3. **一局有成长**：关卡有 intro/build/climax，结果页能说明表现并提供重玩目标。

## 2. Rhythm / Running boundary

- Rhythm 可以修改 shared mode shell 的视觉与无障碍样式，但不能更改 Running 规则、世界数据、移动/战斗/成果环、存档键或运行时架构。
- 新的 Rhythm UI、HUD、stage presentation 和 AutoChart 模块放在 Rhythm 范围内；不得把 Running 迁入新设计系统作为本任务附带重构。
- Root route 与 legacy `?screen=*` 深链必须保持兼容。
- 最终回归必须确认 Running 启动以及既有未完成旅程仍可见；测试不得清空用户 localStorage。

## 3. Visual hierarchy

从低到高的固定层级：

1. **Background** — 氛围、远景、低对比环境循环；永不要求玩家阅读。
2. **Gameplay objects** — 与节拍同步的可交互物体和接近路径。
3. **Hit zone** — 当前操作发生的位置或区域；目标临近时必须成为场景最高局部对比。
4. **HUD** — stage、progress、combo、groove；固定在 safe area，不能覆盖 approach path。
5. **Feedback** — judgement、FAST/SLOW、短促因果动画；局部、短时、可退场。
6. **Tutorial** — 只在教学目标和失败恢复时高于 HUD；熟练后主动退场。
7. **Modal / Result** — pause、解锁、结果；只有游戏停止时可以成为最高层。

任何时刻只能有一个“最高注意力请求”。目标临近时，教程、环境粒子和上一拍 judgement 必须让位。

## 4. Typography

统一 font stack：

```css
system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif
```

不随意下载字体。若未来加入第三方字体，必须先记录许可、离线打包和 provenance。

| Role | Desktop | Narrow / tablet | Weight | Line height |
| --- | --- | --- | --- | --- |
| Display | 48–64px | 38–52px | 800 | 1.05 |
| Heading | 28–40px | 26–34px | 750 | 1.15 |
| HUD number | 24–36px tabular | 22–32px | 800 | 1.0 |
| Body | 17–20px | 17–20px | 450–550 | 1.5 |
| Microcopy | minimum 14px | minimum 15px | 550 | 1.35 |

- 中文不使用过紧字距；英文 display 可使用轻微负字距。
- judgement 使用同一字宽预算，避免 PERFECT/GREAT/OK/MISS 导致 HUD 跳动。
- FAST/SLOW 必须本地化；同一页面不得中英混排。BeatGarden 是品牌名，不计作语言混排。

## 5. Shared color tokens

```text
background-deep   #070B1C
background-raised #111A36
text-primary      #F7F9FF
text-secondary    #B7C3E3
perfect           #8FFFE0
great             #FFE58A
ok                #9FC3FF
miss              #FF7E91
fast              #FFB45E
slow              #9AB5FF
combo             #D7FF78
focus-ring        #FFFFFF
```

规则：

- 对正文目标至少 WCAG AA；微文字不放在动态渐变上。
- judgement 不只依赖颜色，必须同时有文本与轮廓/形状。
- 每关只增加一个 primary accent、一个 secondary accent、一个 environmental neutral。

Stage accents：

| Stage | Primary | Secondary | Environmental neutral |
| --- | --- | --- | --- |
| Firefly | `#83FFD0` | `#FFD978` | `#554A78` |
| Bubble | `#FF8AD8` | `#FFE58A` | `#5B4564` |
| Cloud | `#81C8FF` | `#FFB6A1` | `#586A82` |
| Greenhouse | `#9DF49C` | `#72D7FF` | `#425F5B` |
| Pulse | `#78F5D0` | `#FF91B8` | `#50606D` |

## 6. Common HUD

横屏 safe-area 布局：

- 左上：stage name + section name。
- 顶部中：progress bar；不显示会频繁跳动的长文本。
- 右上：pause，触摸目标至少 48×48 CSS px。
- hit zone 上方或侧方：combo；只在 `combo >= 2` 时出现。
- combo 邻近：Groove meter，0–100，仅为表现层，不改变 Judge。
- judgement：hit zone 附近但不在 approach path 中心。
- FAST/SLOW：judgement 下方一行，约 260–420ms。
- tutorial：安全区侧边 rail；只显示当前一步。

窄屏 shell 可滚动；gameplay 自动建议横屏，但不能因地址栏、安全区或 4:3 画幅裁掉 hit zone/HUD。

## 7. Control teaching grammar

每关前 4–8 拍必须按以下流程：

1. **Show:** ghost hand/mouse 演示动作，真实目标同步接近。
2. **Invite:** 明确当前 hit zone，等待玩家完成；不会因阅读慢而罚 MISS。
3. **Confirm:** 显示一次 judgement 和环境因果。
4. **Repeat:** 用轻微变化再做一次。
5. **Release:** tutorial rail 淡出，正式计分开始。

设备文案自适应：desktop 显示鼠标左键/拖动/按住；coarse pointer 显示触摸/滑动/长按。不要同时堆叠两套说明。

### Bubble

- 三个锅就是三个持续可见的 lane，锅口、目标路径和触摸区一致。
- 目标落入哪个锅就点击哪个锅；点错只影响对应锅，形成局部失败因果。

### Cloud

- 目标箭头、ghost trail、按下起点、实时距离和方向确认属于同一风道。
- 达到最短距离时视觉“锁定”；反向或不足距离明确返回，不伪装成 timing MISS。

### Greenhouse

- `PRESS`：雨滴落入蓄水环；按下后转为 `HOLDING`。
- `HOLDING`：水压环持续填充、藤蔓持续生长。
- `RELEASE`：出口窗打开并脉冲；松开完成开花。
- 提前松开与过晚松开必须有不同视觉解释。

### Firefly

- 光种路径和码头光圈保持最高局部对比。
- 教学句缩短；worker 发射动作只由成功输入触发。

## 8. Motion grammar

统一四段：

| Phase | Duration | Purpose | Limit |
| --- | --- | --- | --- |
| Anticipation | 180–420ms | 告诉玩家即将发生什么 | scale ≤ 1.08，glow ≤ 18px |
| Contact | 60–110ms | 输入与目标接触 | 位移 ≤ 8px，单次 flash |
| Payoff | 180–360ms | 环境因果与判定 | stage-specific，不覆盖下一目标 |
| Recovery | 120–280ms | 回到可读基线 | 下一目标高密度时缩短 |

- Camera shake 默认 ≤ 4 CSS px、≤ 120ms；只有 climax PERFECT 可到 6px。
- 无 gameplay 意义的粒子保持低对比且低密度。
- `prefers-reduced-motion` 下取消 shake/大位移，以 outline、短 opacity pulse 和文本保留信息等价性。

## 9. Feedback grammar

| Result | Shape | Motion | Audio role | Meaning |
| --- | --- | --- | --- | --- |
| PERFECT | 完整六瓣光冠 | 向外清晰展开 | 明亮短音 | 正中窗口 |
| GREAT | 四瓣光冠 | 小幅展开 | 温暖短音 | 接近中心 |
| OK | 圆弧 | 轻微侧移 | 柔和短音 | 有效但偏离 |
| MISS | 断裂环 | 向内收缩 | 低短音 | 未完成或错误 |

- FAST/SLOW 依据 Judge 的 signed error 派生；不另建计时源。
- 反馈总持续不超过约 520ms；高密度段可缩至 300ms。
- MISS 不用全屏红闪；错误原因（wrong lane、wrong direction、early release）在局部说明。
- 声音关闭或媒体静音时，视觉必须完整表达结果。

## 10. Combo, Groove, progress

- **Combo:** 连续非 MISS judgement 数；MISS 归零。只影响展示、结果与环境丰盛度，不影响分数或判定。
- **Groove:** 从 recent judgement quality 平滑得到 0–100；MISS 降低但不瞬间清零。只驱动环境亮度、层次和 climax payoff。
- **Progress:** 基于 Transport/已计划 stage duration；不用 wall clock。
- **Sections:** 每关至少 `intro → build → climax`，可以加入 `rest/recovery`；切换由谱面 beat/section metadata 驱动。

## 11. Stage-specific variation

### Firefly Dock — stars / arcs / launch / accumulation

光种沿弧线靠近码头；命中使 worker 明确发射，萤火在天空累计成星座。段落从单颗引导到双弧交替，再到星座点亮。

### Bubble Kitchen — elasticity / recipe / pot / pop

三个垂直锅轨；目标像配方食材落下，命中使对应锅弹性压缩并冒泡。段落从单锅到交替配方，再到三锅 recipe chain。

### Cloud Post — wind / route / mail / directional flow

邮件沿左右风道靠近投递口；滑动轨迹变成邮路，成功才将信封送入云层。段落从单向到交替，再到短休止与快速投递。

### Sleepy Greenhouse — water / pressure / hold / growth / bloom

按住为蓄水，持续时间驱动压力和藤蔓；release 窗开花。段落从一次短 hold 到长短对比，再到多株连锁盛放。

### Pulse Garden — frequency landscape / section growth / music-driven environment

低/中/高频塑造不同地形层，动作类型来自乐句角色而非纯随机。每个 phrase 完成一层生长，rest 收敛，climax 扩展整个频谱花园。

## 12. Product shell and result

### Shell

- Mode Select 只负责模式差异，不堆 Rhythm 细节。
- Rhythm Home 主行动为“原创关卡”和“你的音乐”；工具退为次级 utility strip。
- Stage card 必须呈现场景、机制、难度、best grade/score 与状态。

### Pause

- 显示 section/progress、控制复习、继续/重开/退出。
- 恢复后 3 拍倒计时并重新锚定既有 Transport 流程；不得自行移动 timing authority。

### Result

主层：grade、score、accuracy、best combo、Groove peak、FAST/SLOW tendency、场景奖励。

行动优先级：`下一关`（若适用）→ `再试一次` → `关卡选择`。详细 timing counts 与 mean/median 放入折叠区。

## 13. AutoChart product rules

1. 先建立 section/phrase envelope，再选择 notes。
2. 每个 phrase 包含可读 motif；变化版本保留 motif，仅改变有限细节。
3. 至少保证 intro、build、rest、climax 的可感知差异。
4. Swipe 不连续左右抽打；Hold 后保留 release recovery；不同动作之间有最小人体工学间隔。
5. 难度提高同时改变密度与动作复杂度，但不能只把间距压缩。
6. 分析页主层展示可玩信息：推荐难度、长度、动作构成、section preview。
7. BPM/confidence/onsets/raw seed 为高级信息；raw seed 对玩家显示为“变化版本”。
8. 用户音乐只在本机分析；provenance/rights 文案保留但不抢主行动。

## 14. Accessibility and locale

- 所有交互 target 至少 44×44 CSS px，主要 gameplay target ≥ 56px。
- keyboard focus 使用 `focus-ring`；shell 可完整键盘导航。
- 颜色之外必须有形状/文字；声音之外必须有视觉；motion 之外必须有静态状态。
- 简体中文为默认，English 为完整替代。任何单页只呈现一个 locale。
- 地址栏、系统 Chrome UI 不属于产品 locale 审计。

## 15. Anti-patterns

禁止：

- generic gradient card everywhere；
- emoji as primary product icon；
- every stage using the same ring and line；
- large judgement text over the next target；
- random particles without gameplay meaning；
- invisible touch zones；
- instructions only on a previous screen；
- raw developer metrics as the main result；
- adding features before fixing readability；
- copying any commercial rhythm-game expression；
- presentation code changing Judge windows or AudioContext timing；
- tests clearing unrelated Running persistence；
- declaring muted calibration an auditory-valid offset。

## 16. Acceptance invariants

- First-time desktop mouse and Android touch players can complete the first tutorial target without README.
- Bubble lane, Cloud direction/distance/timing, and Greenhouse press/holding/release are visible in motion and in a still screenshot.
- judgement never obscures the next approach target.
- Combo/Groove/FAST-SLOW are derived from existing Judge results only.
- All four stages share product grammar but have different approach geometry and at least three sections.
- Result first serves the player; diagnostics are secondary.
- AutoChart fixtures cover tap/swipe/hold and phrase/rest/climax.
- zh-CN and English remain page-pure.
- production build, PWA/offline, legacy links and Running startup remain intact.
