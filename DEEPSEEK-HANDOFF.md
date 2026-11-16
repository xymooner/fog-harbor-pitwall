# 雾港耐力赛策略台 · 工作包交付索引

2026 年 11 月 14 日，四项工作已由 Codex 接手并完成。游戏入口为项目根目录的 [GT3-Pitwall-Offline.html](GT3-Pitwall-Offline.html)。原有目录名沿用，便于查找资料。

| 工作 | 阅读或运行 |
|---|---|
| 八队故事与 16 条比赛无线电，已接入游戏 | [车队数据](handoff/deepseek/b1/teams.json) · [触发条件与复现](handoff/deepseek/b1/README.md) |
| 上海 CEC 与澳门 TCR，两站共六个真实车组 | [参赛、赛规和车型数据](handoff/deepseek/b2/events.json) · [证据及缺件](handoff/deepseek/b2/sources.md) |
| 八队固定天气策略对照 | [24 场结果](handoff/deepseek/b3/findings.md) · [逐圈记录](handoff/deepseek/b3/baseline.json) · [复现程序](handoff/deepseek/b3/replay.mjs) |
| 风雨、事故、红旗与计时，独立原型 | [运行说明](handoff/deepseek/b4/results.md) · [三个场景](handoff/deepseek/b4/scenarios.json) · [离线程序](handoff/deepseek/b4/prototype.mjs) |

<details>
<summary>展开最初任务书（历史原文）</summary>

本轮围绕现有雾港邀请赛的八支车队展开。七台 Hypercar 与 TF Sport 的 #81 Corvette Z06 GT3.R 同场，驾驶角色按品牌取自车手图鉴。请在独立交付目录记录所用源码快照、复现步骤和未核实项。Codex 负责游戏集成、实车找图、图片许可、车身侧绘和车娘的设计与绘制。

## B1 · 邀请赛车队故事、车手和无线电

**可直接交给 Harness**

> 先读 HANDOFF.md，再读 dist/hypergrid.js 的 HyperGrid.entries 和 dist/fullrace.js 的全程模型。先为 Warspite Racing #27 Peugeot 9X8、Meridian GT #16 Ferrari 499P 各做一支虚构车队样稿。保留对应的 teamId、车型、车号和车手。各写一段队史、一个围场故事、一种有代价的驾驶风格和两条能在比赛中触发的无线电。把现实车辆资料、游戏已实现的系数和原创故事分别标出。两队样稿确认后再补齐另外六支。

- **交付**　`handoff/deepseek/b1/teams.json`，每队包含 `teamId, number, model, driver, story, strength, weakness, radioLines, sources`。每条无线电列出 `speaker, trigger, text`。
- **验收**　游戏性能评语能对应 `speed, wetSkill, care, load, effort` 等系数。举例说明 #27 该关注哪条胎、#16 在何种可观察路况下适合提高配速。虚构强弱标明游戏设定。真实的排量或动力路线沿用车型卡的官方证据，新增数据注明赛季、单位及来源，缺项留空。模拟车号使用 HyperGrid 的号码；照片上的真实参赛车号仅作图注。

## B3 · 八队策略回放

> 遍历 HyperGrid.entries，以 HyperRace.simulate(commands, teamId) 重跑八支车队。比较全程均衡留场、固定追击留场、只依赖当时观测换胎的策略，记录逐圈指令、名次、总时间和决策依据。先给出相同输入跑两次的比对，再解释两组最不同的结果。固定天气剧本适合比较策略用时；估计胜率留到随机场景可用后。

交付 `handoff/deepseek/b3/replay.mjs`、`baseline.json` 和 `findings.md`。每条轨迹含 `teamId, mode, strategy, commands, trace, finishPosition, elapsedSeconds`。旧 GT3 的 FullRace.simulate(commands) 与 RaceEngine.simulate(commands) 作为兼容基准。

## 后续工作

- **B2 · CEC 与 TCR**　等待确定下一个组别后再查指定分站的正式参赛名单、赛规与成绩。
- **B4 · 天气、事故与红旗**　后续可先独立验证风向、雨区、分段积水和计时结算。接口确定后，再用相同的随机种子比较各车队和策略。

<details>
<summary>B2 · 一个 CEC 分站，一种 TCR 赛事（后续工作说明）</summary>

**可直接复制**

> 先做 2026 CEC 上海站 GT 杯的一个组别，从正式参赛名单和成绩选最多三支车队；再选择一个有官方规则和正式成绩可查的 TCR 分站，例如 TCR China，做同等规模的候选包。每站注明赛事、赛季、分站、组别、参赛车组、车号、车手、车型与版本。核实赛长、强制进站、换人、进站窗口、红旗重启及无法重启时的判定。区分全年规则、分站补充公告和正式成绩。另为每站一款车型做参数样卡。

- **交付**　`handoff/deepseek/b2/events.json`、`sources.md`。字段示例：`series, season, round, class, entries, rules.minimumStops, rules.minimumDriverChanges, rules.pitWindow, rules.redFlagClassification, sources`。数值有单位，参数注明车型年款、厂商标称值及适用的 BoP（性能平衡）条件。真实分级需有对应赛季来源，原创驾驶评价标为游戏设定。
- **验收**　两个赛事样本、每站最多三队及一张车型参数卡。每条规则和真实资料附可定位的官方链接、页码/条款或成绩表行。缺值写 `null` 和缺证原因。零次进站必须有规则依据。若资料不足，交已核实部分和缺件清单。可先离线整理已有官方材料，补齐真实赛事实证需要官方文档或联网。规则用自己的话概括，官方资料附原文链接。
- **起点**　[CEC 官方规则、参赛名单和成绩](https://china-cec.com/download) · [WSC 的 TCR 类别与系列说明](https://wsc.group/tcr) · [FIA TCR World Tour 规则，仅用于该系列](https://www.fia.com/regulation/category/2102) · [FIA 车手分级](https://www.fia.com/fia-driver-categorisation)。

</details>

<details>
<summary>B4 · 风雨、事故与红旗的独立原型（后续工作说明）</summary>

> 在 handoff/deepseek/b4/ 建一个可用 Node 离线运行的小原型。输入比赛种子、赛段位置、时间步长和简化比赛规则，输出依次发生的天气观测与赛事事件。用有单位的风速与风向推动雨区；给出雨区位置、三个赛段的雨量与积水。区分玩家当时能看到的雷达观测和后续实际天气。把近距离跟车、车速或追击、积水作为打滑或接触的风险因素，允许对手出错。按写明的自定义规则处理暴雨暂停、重启或终止，保存结算使用的计时点。

- **交付**　`prototype.mjs`、三个可重跑的 `scenarios.json` 样例和一页 `results.md`。写清命令、风向的“来向/去向”约定、时间和距离单位。原型可立即独立开发；接入游戏留到评审后。
- **验收**　相同种子和指令逐步重跑结果相同。展示一场雨带擦边、一场雨过重启、一场中止结算；每次名次变化能追到圈速损失、进站、事故或赛事控制记录。清楚列出哪些情景为指定测试条件、哪些事件自然抽到；单次重跑不算概率证据。

</details>

</details>
