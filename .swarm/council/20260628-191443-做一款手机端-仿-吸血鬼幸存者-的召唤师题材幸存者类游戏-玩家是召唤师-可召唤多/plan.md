# 计划书 — 召唤师幸存者 H5（仿《吸血鬼幸存者》的召唤师题材手机网页割草游戏）

> Council run: `.swarm/council/20260628-191443-.../` · 模式: tender（方案竞标） · 日期: 2026-06-28
> 阵容: GPT-5.5 / Gemini 3.1 Pro / GLM-5.2 / Kimi K2.7 / DeepSeek V4 Pro · 终审: Claude Opus 4.8 (chair, 中立)
> **执行器: Codex 目标模式（GPT-5.5 单 agent 长跑） + 调用图像模型生成全套美术**
> 用户决策: 范围档 **C 丰满打磨（约 4 周+）** · 操作 **全屏任意拖拽** · 连携 **单层薄结合（元素反应 + 轻量猎印标记）** · 美术 **全套 AI 生成** · 风格 **暗色哥特复古像素风（致敬吸幸，chair 定）**

---

## 一句话结论

用 **Phaser 3 + TypeScript + Vite** 做一款竖屏、全屏拖拽操作的 H5 召唤师幸存者：玩家只走位、5 种宠物全自动作战，靠"元素反应 + 一层薄猎印标记"做连携，吸血鬼幸存者式升级三选一 + 宠物等级成长 + 轻度局外成长树，**全套 AI 生成暗色哥特像素美术**，由 **Codex 目标模式（GPT-5.5）按 M0–M5 里程碑长跑**，4 周打磨出手机浏览器可玩、不卡、有结算、可外发的完整 Demo。**以 Kimi 方案为骨架，融合 GPT 的可配置架构与指挥感、DeepSeek 的风险工程与移动端打磨，并修掉三处 P0 隐患。**

## 为什么是这个方案

5 个模型在技术栈上**零分歧**——全部选 Phaser 3 + TypeScript（多数 + Vite）、轻量 ECS、对象池 + 空间哈希网格、元素反应连携、竖屏、升级三选一、localStorage 局外成长、几何/AI 占位美术、3 周里程碑。跨家族一致 = 这就是"AI 生成代码 + 手机 H5 + 几周出 Demo"的最优解。

修正脚本误解析后的真实总分（满分 35）：**甲 Kimi 31.67** > 戊 DeepSeek 30.0 > 乙 GLM 29.67 = 丙 GPT 29.67 > 丁 Gemini 24.0。前四名仅差约 2 分（6%），胶着，且三位评委不约而同建议"以 Kimi 为骨架做融合"。故最终取**混合**：

- **骨架 = Kimi（甲）**：手感/UX 细节最足、3 周排期最紧凑，最贴合"几周出能玩 Demo"。
- **融合 GPT（丙）**：配置驱动架构（新增宠物只改配置、不动主循环）、卡池权重优先已有宠物（解决"升级太随机、构筑不成型"）、"标记→引爆"指挥感。
- **融合 DeepSeek（戊）**：P0/P1/P2 风险分级、宠物锁定粘性（防横跳）、全屏拖拽优先、SaveManager 防损坏 + 版本迁移、Service Worker 秒开、低端机自动降级、iOS 音频解锁、逐日任务粒度。
- **融合 GLM（乙）硬原则**：放弃 Arcade 全量碰撞，统一 SpatialGrid + 距离判定。

被否决：**Gemini（丁）** 仅 4 宠、细节留白、"300 怪 45fps"不现实，垫底；**PixiJS / 纯 Canvas**（缺脚手架、AI 易翻车）、**Unity / Godot / Cocos Web**（包体大、移动兼容差、AI 语料少）均放弃。

---

## 方案详情

### 1. 技术栈
- **引擎**：Phaser 3（3.80+，WebGL 优先、Canvas 回退）。
- **语言**：TypeScript（strict，少 `any`），作 AI 持续迭代的类型护栏。
- **构建**：Vite 5（秒级 HMR、产物小、tree-shaking）。
- **美术**：**全套 AI 图像模型生成**，暗色哥特复古像素风，统一后处理 + 打纹理图集（详见第 8 节）。
- **音效**：jsfxr 程序化生成（攻击/受伤/升级/连携），零网络、零成本。
- **存档**：localStorage（无后端、无账号）。

### 2. 代码架构（配置驱动 + 轻量 ECS 风格，对 AI 迭代友好）
```
src/
  main.ts                  # Phaser 配置、缩放(FIT 竖屏)、场景注册
  scenes/  Boot / Title(含局外成长商店入口) / Game / GameOver
  core/    EntityManager · ObjectPool<T> · SpatialGrid · EventBus
  systems/ SpawnSystem · EnemySystem · PetAISystem · CombatSystem
           ElementSystem(标记+反应) · XPSystem · WaveSystem
  data/    PetDefs · EnemyDefs · UpgradeDefs · SynergyDefs · Balance   ← 数值/内容全在这里
  entities/ Summoner · Pet · Enemy · Projectile · Gem
  ui/      DragInput(全屏拖拽，含摇杆备选) · HUD · PetStatusBar
           UpgradePanel/UpgradeCard · DamageNumber · ResultPanel
  storage/ SaveManager(write-then-validate + version 迁移)
  utils/   MathUtils · DeviceDetect · AssetKeys(sprite key 索引，热替换)
assets/    sprites/(AI 生成原图) · atlas/(打包图集 .png+.json) · audio/
tools/     art/(生成 prompt 模板 + 后处理脚本：降采样/量化/打图集)
```
- **主循环**：输入(拖拽)→刷怪→宠物索敌/攻击→敌人移动→投射物/碰撞(SpatialGrid)→伤害结算→元素反应→经验/升级→波次计时→UI 刷新。
- **碰撞统一走 SpatialGrid**（cell ≈ 96–128px）+ 距离平方判定，**不用 Arcade 全量碰撞**（修 P0-甲）。
- **对象池**全覆盖，热路径零 `new`。
- **新增宠物/卡/反应 = 只改 `data/` 配置表 + 可选一个行为函数，不动主循环**。
- **美术与逻辑解耦**：所有 sprite 经 `AssetKeys` 用 key 索引；先几何占位跑通玩法，美术 ready 后换图集，不改逻辑。

### 3. 5 种宠物（数据驱动）
| 宠物 | 元素 | 攻击方式 | 定位 | 连携角色 |
|---|---|---|---|---|
| 剑齿狼 | 物理 | 冲向最近敌人撕咬（近战单体） | 前排割草 | 挂**猎印 Mark**（指挥层） |
| 焰魔 | 火 | 火球命中爆炸（远程 AOE） | 清群/点燃 | 挂火标记、可引爆 |
| 霜灵蝶 | 冰 | 冰晶/光环减速（控场） | 削速/聚怪 | 挂冰标记 |
| 雷羽鹰 | 雷 | 闪电链弹射 2–4 目标 | 连锁清杂 | 挂雷标记、引爆超导 |
| 治愈花 | 辅助 | 周期回血 + 短暂护盾 | 续航兜底 | 不参与反应（降复杂度） |
- 宠物独立等级 **Lv1→5**，3/5 级质变（焰魔三连火球、雷羽鹰弹射 +1 等）。最多带 5 只。觉醒色变用代码 tint，不另出图。

### 4. 连携 = 单层薄结合
- **主体：元素反应**。敌人挂元素标记（火/冰/雷，各 2.5s），两种并存触发反应并消耗标记：
  - **融化（火+冰）**：额外伤害 + 小范围 AOE + 减速。
  - **超导（冰+雷）**：破防（受伤×1.5）+ 闪电额外弹跳。
- **薄指挥层：猎印 Mark**。剑齿狼近战挂"猎印"，元素宠命中带猎印的敌人时反应伤害/范围提升 → "狼锁定→元素宠引爆"的指挥感，但**只多一个布尔标记，不做双状态机**。
- **防雪崩硬上限（修 P0-丙）**：同敌人反应 1.5s 冷却 + 每帧全局触发数封顶 + 扩散标记不再二次引爆。

### 5. 成长系统
- **局内**：杀怪掉经验宝石→磁吸→升级**三选一卡**（新宠/宠物升阶/召唤师强化/连携强化）。**卡池权重优先已有宠物**，前几级提高新宠率，保证构筑成型。
- **局外（轻度成长树）**：结算给"魂晶"，6–8 节点（初始 HP/移速/经验/拾取/起始宠等级/反应伤害）。`SaveManager` 先写临时键校验再落盘 + `version` 迁移 + 坏档回退默认。

### 6. 移动端操作与 UI
- **默认全屏任意拖拽**：手指放任意处拖动→召唤师朝拖动方向移动，松手停；保留虚拟摇杆为设置项。`touch-action:none` + `user-scalable=no` 防浏览器手势冲突。
- **HUD**：顶部计时/等级/击杀；底部宠物状态条 + 全宽经验条；升级时半透遮罩弹三卡；连携大字飘字 + 粒子；受击红边；经验磁吸轨迹。结算页：存活/击杀/魂晶/最高宠等级 + 再来一局/回主菜单。
- **适配**：竖屏 FIT、安全区（刘海）、基准 390×844、触摸热区 ≥44px。

### 7. 性能方案（中端机 150–200 怪 ≥30fps，低端降级 ≥24fps）
对象池 + SpatialGrid + 伤害结算 100ms tick + 宠物索敌 0.2s 节流且**锁定粘性** + 视野外裁剪 + **纹理图集合批**（与美术工作流强绑定）+ 粒子全局上限 + `DeviceDetect` 帧率自适应降级 + **软上限维持刷怪而非停刷**（修 P0-丁）+ Service Worker 秒开。

### 8. 美术工作流（全套 AI 生成，受控）★本次新增

**美术圣经 / Art Bible（统一风格的唯一基准）**
- **基调**：暗色哥特奇幻 + 复古像素风（pixel-art），高对比、霓虹元素色发光，致敬《吸血鬼幸存者》。
- **视角**：2D 俯视/略俯（top-down），居中站立。
- **调色板**：暗背景（深紫黑/墨绿）+ 元素高饱和色（火 #ff5a36 / 冰 #4cc9f0 / 雷 #b388ff+#ffd166 / 自然绿 / 暗紫）。固定一套约 32 色 palette，全资产共用。
- **像素网格/尺寸**：召唤师·宠物 48×48；普通杂兵 32×32；精英 64×64；Boss 96×96；经验宝石/拾取 16×16；UI 图标 64×64；地砖 tile 32×32（可平铺）。
- **描边**：1px 深色描边，暗背景下轮廓清晰。
- **输出**：透明背景 PNG（含 alpha），不带地台阴影（地面阴影用代码画椭圆）。

**固定 prompt 模板（喂给图像模型，每个资产只换主体与元素）**
```
pixel art sprite, {主体描述}, top-down view, dark gothic fantasy,
vibrant {element} glow, 1px dark outline, transparent background,
centered, limited retro palette, clean hard edges, no text, no shadow
```

**后处理流水线（关键：把大模型的"伪像素"规整成真像素，放 tools/art/）**
1. 生成高分辨率图 → 2. **降采样**到目标像素网格（nearest-neighbor）→ 3. **调色板量化**（限制到统一 palette）→ 4. **清理半透明边缘**（alpha 阈值化）→ 5. 统一尺寸/锚点 → 6. 免费工具打 **Texture Atlas**（free-tex-packer / TexturePacker 免费版）→ 输出 `assets/atlas/`。

**素材清单（全套）**
- 角色：召唤师 ×1
- 宠物：剑齿狼/焰魔/霜灵蝶/雷羽鹰/治愈花 ×5（觉醒色变用 tint，不另出图）
- 敌人：杂兵 3–4（骷髅/蝙蝠/史莱姆/亡灵）+ 精英 1–2 + Boss 1
- 拾取：经验宝石（大中小 3 色）/ 回血 / 魂晶
- 特效：爆炸/闪电/冰碎/治疗光环 各 1–2 帧（其余靠粒子）
- UI：宠物头像 ×5 / 元素图标 ×4 / 升级卡背景 + 稀有度框 / 按钮 / 标题 logo / Splash 背景 ×1
- 背景：可平铺暗色地砖 1–2 套

**动画策略（不做逐帧，省体积省性能）**：静态 sprite + 程序化 tween——待机呼吸缩放、移动 flipX 翻向、攻击位移/缩放、受击闪白 tint、死亡淡出 + 粒子。仅 Boss 可选 2–3 帧。

**体积预算**：全部美术打包图集后控制在 ~0.5–0.8MB（png/webp 压缩），保证 `vite build` 总产物 < 1.5MB（含 Phaser）。

**占位可热替换**：每个 sprite 先用纯色几何占位注册 key 跑通玩法（不阻塞性能门槛 M1），美术 ready 后替换 atlas，零逻辑改动。

---

## 里程碑与任务分解（Codex 目标模式按 M0→M5 顺序执行，每个里程碑是硬闸门）

> 单 agent 长跑要点：**每个里程碑结束必须 `npm run dev` 能跑起来 + 通过验收命令，才进下一个**；先小步可运行，再加内容；每步读项目根 `AGENTS.md` 约束。

| 里程碑 | 任务 | 涉及文件（新建） | 验收闸门 |
|---|---|---|---|
| **M0 初始化**（~0.5d） | 脚手架 Vite+Phaser+TS；生成 `AGENTS.md`；竖屏 FIT；全屏拖拽移动；空场景；首次 git 提交 | main.ts, scenes/*, ui/DragInput.ts, AGENTS.md | 手机浏览器打开能拖动占位方块，无手势冲突 |
| **M1 性能地基+最小闭环**（W1） | **先做** SpatialGrid+ObjectPool+EntityManager 并 200 怪压测；刷怪+难度曲线+敌人移动；1 宠自动战斗(索敌锁定粘性+伤害 100ms)；经验掉落+升级框架；HUD 骨架 | core/*, systems/Spawn·Enemy·PetAI·Combat·XP, data/EnemyDefs·Balance | **空场景 200 占位怪 ≥30fps（不过不进 M2）**；1 宠能打怪、掉经验、能升级 |
| **M2 召唤+连携+成长**（W2） | 5 宠数据驱动；元素标记+薄猎印+2 连携(融化/超导)+防雪崩硬上限；三选一卡池(权重优先已有宠)+宠物 Lv1-5 | data/PetDefs·SynergyDefs·UpgradeDefs, systems/ElementSystem, ui/UpgradePanel·UpgradeCard, tests/synergy.test.ts | 5 宠可玩且行为可区分；火+冰/冰+雷稳定触发且不雪崩(单测通过)；升级弹 3 卡、构筑能成型 |
| **M3 全套像素美术**（W2 末并行起步→W3） | 定 Art Bible；用图像模型按固定 prompt 生成全套素材；后处理(降采样/量化/抠边)；打图集；替换占位；tint/flipX 程序化动画 | tools/art/*, assets/sprites·atlas/*, utils/AssetKeys | 风格统一、透明干净、图集 ≤0.8MB；换图零逻辑改动；动画无逐帧 |
| **M4 局外成长+完整 UI**（W3） | 魂晶成长树+SaveManager(防损坏/迁移)；完整 HUD/连携飘字/磁吸/受击/结算/标题 | storage/SaveManager, scenes/Title·GameOver, ui/HUD·PetStatusBar·DamageNumber·ResultPanel | 魂晶节点可买、刷新保留、坏档不崩；UI 不重叠不截断 |
| **M5 打磨+性能+真机+发布**（W4） | 音效(jsfxr)+震动；视野裁剪/降级/DeviceDetect；iOS 音频解锁/手势/安全区；真机测试；数值平衡；Service Worker；生产构建部署静态托管 | utils/DeviceDetect, public/sw.js, index.html, tests/* | 中端 150-200 怪 ≥30fps、低端降级；iOS 可玩；一局 ≥10 分钟；build<1.5MB；可外发链接 |

## 风险与缓解
- **P0｜同屏怪多掉帧** → M1 先做 SpatialGrid+对象池并 200 怪压测，不过不继续；视野裁剪/图集/帧率自适应/软上限。
- **P0｜连携链式雪崩** → per-target 1.5s 冷却 + 每帧触发数封顶 + 扩散标记不再二次引爆 + 连携单测。
- **P0｜双碰撞体系腐烂** → 统一 SpatialGrid + 距离判定，不用 Arcade 全量碰撞。
- **P1｜单 agent 长跑风格漂移/过度抽象** → 项目根 `AGENTS.md` 约束 + TS strict + 配置驱动；每里程碑读它；"别搞泛型体操，Pet 就是 Pet"。
- **P1｜美术风格不统一/体积超标/伪像素** → Art Bible + 固定 prompt 模板 + 强制后处理(降采样+量化+抠边) + 图集体积预算 ≤0.8MB；逐帧禁用、动画走代码 tween。
- **P1｜存档损坏清零** → write-then-validate + version 迁移 + 坏档回退默认。
- **P1｜iOS Safari 音频/手势** → 标题页"点击开始"解锁音频；canvas `touch-action:none`+`preventDefault`+`user-scalable=no`；M5 真机先测。
- **P1｜场景重开内存泄漏** → GameScene.shutdown 显式清理 children/Group；10 次重开内存测试。
- **P2｜召唤师太弱无聊** → 给足移速/拾取/护盾，走位+选卡构筑就是"指挥"。
- **P2｜4 周排期紧** → 严格按 M0→M5；延误优先砍局外成长高级节点和第 2 连携，保三核心；美术 M3 可与逻辑并行、且占位不阻塞。

## 验收 / done-when
- 手机浏览器打开即玩，全屏拖拽控制召唤师，无手势冲突。
- 三核心齐备：①≥5 宠自动作战且可区分；②元素反应(融化/超导)+猎印指挥可触发、有特效与额外伤害；③宠物 Lv1-5 + 三选一生效。
- 吸幸式循环：掉经验→升级→三选一→即时变强，10 分钟节奏不断档、难度递增。
- 美术：全套像素素材风格统一、透明干净、图集 ≤0.8MB；动画为程序化 tween。
- 性能：中端 150–200 怪 ≥30fps；低端降级 ≥24fps；10 分钟无明显内存增长。
- 局外成长：魂晶存档刷新后仍在、坏档不崩；下一局可感知变强。
- 工程：`tsc --noEmit` 零报错、`vite build` < 1.5MB、连携有单测、无 console 报错。
- 可外发：部署免费静态托管（Vercel/Cloudflare/GitHub Pages），陌生人点链接即玩。

## 备选与放弃理由
技术栈全员一致 Phaser3+TS；差异在连携深度/宠物阵容/工程严谨度/操作方式。Kimi(手感+排期)居首，DeepSeek(风险工程,但5周偏长)、GLM(最稳但偏寡淡)、GPT(可维护性+指挥感,但双层连携偏重)紧随仅差约2分，故混合。Gemini(4宠、留白、性能目标不现实)垫底被否。引擎层 PixiJS/纯Canvas（缺脚手架、AI易翻车）、Unity/Godot/Cocos Web（包体大、移动差、语料少）放弃。连携放弃双层状态机（雪崩+调试地狱）与合体/阵型（Demo做不起），采"元素反应+单层薄猎印"。美术放弃纯几何占位（C档要成品手感）与逐帧动画（体积/性能），采"全套AI像素+程序化动画+后处理图集"。

## 执行交接 — Codex 目标模式（GPT-5.5）
> 把下方目标整段喂给 Codex 目标模式即可开工（亦见 `handoff/codex-goal.md`）。单 agent 按 M0→M5 顺序长跑，每个里程碑过闸门再继续。
```
mode: codex-goal (single-agent, GPT-5.5)
objective: 用 Phaser3+TypeScript+Vite 从零构建 H5 手机召唤师幸存者 Demo（5宠自动战斗+元素反应/薄猎印连携+三选一与宠物成长+轻度局外成长+全套AI暗色哥特像素美术），按 M0→M5 里程碑长跑，4周达到手机浏览器可玩、150-200怪≥30fps、可外发
constraints:
  - 技术栈固定 Phaser3+TS(strict)+Vite，主流且AI友好；别过度抽象(Pet 就是 Pet)
  - 碰撞统一 SpatialGrid+距离判定，禁用 Arcade 全量碰撞
  - 竖屏 + 全屏任意拖拽(摇杆为设置备选)
  - 必保三核心：召唤多宠自动战斗 / 宠物连携(元素反应+薄猎印) / 宠物成长(Lv1-5+三选一)
  - 美术：图像模型按固定 prompt 生成全套像素素材，强制后处理(降采样+调色板量化+抠边)+打图集，体积≤0.8MB；动画走程序化 tween，不做逐帧
  - 无后端，localStorage 存档(write-then-validate+version)
  - 零成本：免费开源 + jsfxr 音效 + 免费图集工具
execution_rule: 每个里程碑结束必须 npm run dev 可运行且过验收命令，才进下一个；先小步可运行再加内容；每步先读项目根 AGENTS.md
milestones:
  - M0 初始化：脚手架+AGENTS.md+竖屏FIT+全屏拖拽+空场景+git提交 | done: 手机能拖动占位方块无手势冲突
  - M1 性能地基+最小闭环：SpatialGrid+对象池+200怪压测(闸门)+刷怪难度+1宠自动战斗+经验升级框架+HUD骨架 | done: 200怪≥30fps 且能打能升(不过不进M2)
  - M2 召唤+连携+成长：5宠数据驱动+元素标记+薄猎印+2连携(防雪崩)+三选一卡池(权重)+宠物Lv1-5 | done: 5宠可玩、连携稳定不雪崩(单测过)、构筑成型
  - M3 全套像素美术：Art Bible+图像模型生成全套+后处理+图集+替换占位+tint/flip动画 | done: 风格统一透明干净、图集≤0.8MB、换图零逻辑改动
  - M4 局外成长+完整UI：魂晶成长树+SaveManager+完整HUD/飘字/磁吸/受击/结算/标题 | done: 存档可靠坏档不崩、UI不崩
  - M5 打磨+性能+真机+发布：音效震动+视野裁剪/降级+iOS音频/手势/安全区+真机+平衡+SW+部署 | done: 中端150-200怪≥30fps、可外发链接、build<1.5MB
validation_commands:
  - npx tsc --noEmit
  - npm run build
  - npm run test
done_when:
  - 三核心齐备且手机浏览器可玩
  - 全套像素美术风格统一、图集≤0.8MB、动画程序化
  - 中端150-200怪≥30fps、低端降级≥24fps、10分钟无明显内存增长
  - 局外存档刷新保留且坏档不崩
  - tsc零报错、vite build<1.5MB、连携有单测、可部署外发
```
