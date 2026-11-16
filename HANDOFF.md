# 雾港耐力赛策略台 · 项目交接

从项目根目录打开 [GT3-Pitwall-Offline.html](GT3-Pitwall-Offline.html) 即可离线游玩。浏览器按文件地址保存进度，续跑时使用原浏览器和路径。本轮四项交付与复现入口见[工作包索引](DEEPSEEK-HANDOFF.md)。

## 当前可玩内容

- **原创车手图鉴**　从首页可浏览十位车手的围场半身像、小传、无线电和赛车服实拍。九位参考对应的《碧蓝航线》角色，阿斯顿·马丁的埃莉诺·维尔对应约克公爵。捷尼赛思的韩瑞允以韩国海军白头山号（PC-701）为原创灵感。服装参考各队 2025 年实拍，捷尼赛思参考 2026 年首赛季。车队配对、出图设定和来源见 `art/driver-portraits/绘制设定.md`。围场原画位于 `art/driver-portraits/paddock/`，网页图片位于 `dist/assets/drivers/`。
- **雾港邀请赛 32 圈**　七台 Hypercar 与一台 LMGT3 按游戏设定同场争夺总排名。每个品牌由图鉴中对应的原创车手驾驶。八队独立保存进度，原阿斯顿马丁的进度对应保时捷，原捷尼赛思的进度对应克尔维特。
- **旧版 GT3**　保留 Warspite Racing 的 #27 W27 GT3 全程 32 圈，以及从 L24 圈末接手的最后八圈剧本。两种旧模式分别保存，与邀请赛车队进度分开。
- **指挥台**　车队无线电在同一面板常显天气、车手反馈、轮胎和前后车，随圈数自动更新。工程师的本圈通报直接列在四项下方，往圈通话可展开。每圈可选择配速和换胎，查看 GAP、INT 与副队长建议。全程模式支持短段连跑。赛后可回看逐圈指令并选择某一圈重试。
- **车队视觉**　邀请赛无线电在车手反馈旁显示对应头像、车号与车队名；页头车号牌、无线电边线和图鉴卡片沿用涂装配色。十张图鉴卡片突出车号与姓名，保留完整人物原画和赛车侧视图。`dist/crew.js` 与 `dist/crew.css` 管理队色及无线电头像，复用已有图鉴素材；旧 GT3 模式保留原车手文字。八队切换、跑圈与撤回、旧模式切换及 390 像素手机布局已核对。

## 八队对应的实车

| 邀请赛车队 | 游戏车号 | 真实车型 | 游戏车手 |
|---|---:|---|---|
| Porsche Penske Motorsport | 6 | Porsche 963 | 汉娜·克罗尔 |
| Meridian GT | 16 | Ferrari 499P | 妮娜·贝兰迪 |
| Kestrel Racing | 64 | BMW M Hybrid V8 | 玛拉·芬克 |
| Atlas Sport | 31 | Alpine A424 | 伊内丝·维达尔 |
| Vela Racing | 52 | Cadillac V-Series.R | 泰丝·纳瓦罗 |
| Warspite Racing | 27 | Peugeot 9X8 | 莫德·维达尔 |
| TF Sport | 81 | Corvette Z06 GT3.R | 乔·布鲁克斯 |
| Northline | 83 | Toyota TR010 HYBRID | 八木澄 |

真实车型、技术路线与发动机资料附官方来源。雨战、控胎、体力和配速由游戏参数决定。邀请赛七台 Hypercar 在首页、选车与计时塔中使用原创涂装，车手图鉴另外收录 #007 Valkyrie 与 #19 GMR-001 的原创涂装。点击大图可查看前侧与正侧双视角。设计原画位于 `art/liveries/draft-03/`，网页图片位于 `dist/assets/liveries/`，展示逻辑在 `dist/liveries.js` 与 `dist/liveries.css`。品牌标识的车身排布为游戏设计。车库详情可展开实车参考照片。克尔维特与旧版 GT3 使用既有实车侧绘。[2025 WEC 官方车阵](https://www.fiawec.com/en/car/2025) · [2026 WEC 官方车阵](https://www.fiawec.com/en/car/2026)

照片和摄影署名档案见 `tools/hyperphotos.json`。保时捷与克尔维特的车库照片由 Lukas Raich 摄于 2025 勒芒正赛，另六款由 T GOUREAU 摄于 2026 勒芒测试日。车库照片均采用 CC BY-SA 4.0，网页和单文件成品均使用本地图片。[摄影作品许可](https://creativecommons.org/licenses/by-sa/4.0/)

## 开发与基准

- `dist/index.html` 为开发预览。`dist/hypergrid.js` 保存邀请赛八队的型号、车手、建模系数和官方链接。`dist/fullrace.js` 负责全程模型，`dist/race.js` 负责旧版末八圈。`dist/ui.js` 管比赛界面与存档。
- 在根目录运行 `py -3 tools/build_offline.py` 重建离线 HTML，再执行 `node tools/check_pitwall.cjs`。可使用 `--source` 检查源码。
- 新档默认指挥 Warspite。点“选择邀请赛车队”可查看车手、实拍、原厂参数、车组优缺点和官方侧绘。确认选队后，头图、无线电、计时塔和工程遥测使用同一车组。实拍和图注在 `dist/index.html` 的 `hyperMedia` 模板内。
- Windows Edge 离线实测覆盖 1365 像素桌面、390 像素手机宽度、八车照片、选队、各队独立续赛、旧版 v1/v2 存档、完赛和分支重试。车型动力信息用于介绍；32 圈雾港使用固定天气和简化的配速、雨战、胎耗、疲劳模型。
- 既有 GT3 回放基准为全程采纳副队长 P1、3345.893 秒，末八圈采纳副队长 P5、856.262 秒，末八圈均衡留场 P8、876.016 秒。`history/GT3simulation.bundle` 保存早期源码历史。

## 2026-11-14 更新

- **车库与无线电**　八支邀请赛车队各有队史、围场手记及两条由实际赛况触发的通话。打开“选择邀请赛车队”，选车后展开“车队故事 · 雾港原创”。默认 #27 从发车均衡留场至第 10 圈，可听到莫德询问右后胎。[车组资料和复现步骤](handoff/deepseek/b1/README.md)
- **策略回放**　八队各跑三种策略，共 24 场。逐圈记录指令、下令时可见的路况、圈速、名次和总用时。#81 的均衡配速换胎回放比均衡留场节省 43.811 秒；#31 在同样条件下节省 16.362 秒。[全队结果与复现方法](handoff/deepseek/b3/findings.md)
- **真实赛事资料**　2026 CEC 上海站 GT3 与 2025 FIA TCR World Tour 澳门站第一回合各收录三支车组和一张车型参数卡；数据附分站文件、成绩行和规则条款。[资料来源与缺项](handoff/deepseek/b2/sources.md)
- **天气与红旗实验**　独立离线原型提供雨带擦边、暂停后重启、暂停后中止三个场景。可查看每个时刻的雷达信息、赛段积水、事故损失与最终取用的计时点。[运行方法与结算示例](handoff/deepseek/b4/results.md)
