# Council Transcript — 召唤师幸存者 H5

run-id: 20260628-191443-...  ·  模式: tender  ·  日期: 2026-06-28
阵容: GPT-5.5 / Gemini 3.1 Pro / GLM-5.2 / Kimi K2.7 / DeepSeek V4 Pro  ·  终审: Opus 4.8 (chair)

## R0 开局澄清（AskUser）
平台 = H5 手机网页；目标 = 几周内能玩的原型 Demo；开发条件 = 代码交由顶级 AI 生成（本人小白不写）；连携玩法 = 开放设计。写入 topic-contract.md。

## R1 独立提案（5 模型并行、互相不可见）
- 甲 = Kimi：Phaser3+TS+Vite，轻量ECS，5宠(焰灵狐/霜晶蝶/雷羽鹰/藤蔓灵/暗蝠)，元素反应连携，竖屏动态摇杆，UX/手感细节最足，3周。
- 乙 = GLM：Phaser3+TS，自写极简ECS+空间哈希网格(cell64)，5宠(剑齿狼/焰魔/冰晶蝶/雷霆鸟/治愈花)，融化/超导反应，反应内联CombatSystem，落地最稳，3周。
- 丙 = GPT-5.5：Phaser3+TS+Vite，配置驱动+轻量ECS，5宠(狼灵/火鸦/藤妖/雷灵/守护龟)，"召唤印记+元素反应"双层连携，卡池25-35张，验收最详、可维护性最强，W1-W4。
- 丁 = Gemini：Phaser3(WebGL)+TS，4宠(火球灵/毒蘑菇/旋风兽/雷电鸟)，毒爆/感电连携，全屏滑动，内容最简短。
- 戊 = DeepSeek：Phaser3+TS+Vite，ECS-lite(GameObject+data)，5宠(岩石傀儡/火焰精灵/冰霜之狼/雷电之眼/治愈之灵)，元素标记+4反应，全屏拖拽，逐日任务+P0/P1/P2风险分级最强，自估26天≈5周。

## 匿名映射（chair 私有）
甲=kimi 乙=glm 丙=gpt5 丁=gemini 戊=deepseek

## R2 交叉评审（5 模型并行、各跳过自己，7 维度打分）
- kimi(甲)：丙>乙>戊>丁
- glm(乙)：甲=丙(34)>戊(33)>丁(24)
- gpt5(丙)：甲>乙>戊>丁
- gemini(丁)：口头 丁>丙>戊>甲>乙（违规自评第一；文件未落盘，未计分）
- deepseek(戊)：乙>甲>丙>丁

## Scoreboard（chair 修正后，满分35）
脚本对【戊】误把 DeepSeek 评审正文"26天/25"当打分得 38.25(超满分)，已人工核算修正：
1. 甲 Kimi 31.67  2. 戊 DeepSeek 30.0  3. 乙 GLM 29.67 = 丙 GPT 29.67  5. 丁 Gemini 24.0
前四仅差约2分(6%)，胶着；三位评委均建议"以 Kimi 为骨架做融合"。

## P0 风险（评委标出，已纳入计划规避）
丙：连携扩散标记无上限→链式雪崩；甲：Arcade+自写SpatialGrid双碰撞→分支腐烂；戊：范围5周超期；丁：300怪45fps不现实 + 停刷怪强化存量怪→刮痧局。

## 收敛（AskUser 第一轮）
范围档 C 丰满打磨(约4周+)；操作 全屏任意拖拽；连携 单层薄结合(元素反应+轻量猎印)。

## 计划升级（AskUser 第二轮，执行器与美术）
- 执行器变更：goalswarm 蜂群 → **Codex 目标模式(GPT-5.5 单 agent 长跑)**。交接重写为 **M0-M5 里程碑规格**(去蜂群角色)，新增项目根 **AGENTS.md** 约束 + **handoff/codex-goal.md**(可直接喂给 Codex 的目标)。
- 美术升级：用户选"全套 AI 生成"，chair 定风格 **暗色哥特复古像素风**(致敬吸幸)。plan.md 新增第 8 节美术工作流：Art Bible + 固定 prompt 模板 + 强制后处理(降采样/调色板量化/抠边) + 图集 ≤0.8MB + 程序化 tween 动画 + 占位可热替换。

## 最终方案
以 Kimi 为骨架，融合 GPT(可配置架构+卡池权重+指挥感)、DeepSeek(风险分级+锁定粘性+全屏拖拽+SaveManager+移动打磨)、GLM(放弃Arcade统一SpatialGrid)，修掉3处P0，全套AI像素美术。详见 plan.md。
执行：把 plan.md 的"执行交接"段或 handoff/codex-goal.md 整段喂给 Codex 目标模式(GPT-5.5)，按 M0→M5 长跑，每个里程碑过闸门再继续，M1 的 200 怪压测是硬门槛。
