# PITWALL · 雾港耐力赛策略台

一款可以离线玩的中文耐力赛策略游戏。你坐在雾港赛道的维修墙上，每圈根据三个赛段的积水、四条轮胎的状态和前后车差距，决定车手要追击、保胎，还是进站换胎。

## 开始游玩

1. **[下载离线游戏](https://github.com/xymooner/fog-harbor-pitwall/releases/latest/download/GT3-Pitwall-Offline.html)**。整个游戏和图片都在这一个 HTML 里。
2. 在电脑上双击下载好的文件，用浏览器打开。新游戏默认指挥 **#27 Peugeot 9X8**，也可以点“选择邀请赛车队”换队。
3. 选配速和换胎指令，跑完一圈，再看工程师的通报。浏览器会自动保存进度，续跑时用同一浏览器打开原路径的文件。

## 比赛模式

- **雾港邀请赛**有 32 圈。八支可选车队驾驶七台 Hypercar 和一台 LMGT3，同场争夺总排名，各自保存进度。车库里可以看车型、车手和车队故事。雨战能力、胎耗和疲劳采用游戏设定。
- **旧版 GT3** 保留了 Warspite Racing 的 #27 W27 GT3。可以从发车跑完全程 32 圈，也可以在第 24 圈末接手，只跑最后八圈。完赛后可回看逐圈指令，选一圈重试。

后续可能扩展 GT3 或 WTC 赛事内容，具体组别和赛制待定。

## 开发与素材

整库下载后，可在浏览器里打开 [dist/index.html](dist/index.html) 调试。邀请赛车组和车型资料在 [hypergrid.js](dist/hypergrid.js)，32 圈的天气、轮胎及计时模型在 [fullrace.js](dist/fullrace.js)。

在项目根目录用 Python 3 重建单文件版，再用 Node.js 检查：

```sh
python tools/build_offline.py
node tools/check_pitwall.cjs
```

车库照片的原始链接、摄影者署名和许可逐图收录。车手造型和涂装另有设计资料。[实车照片档案](tools/hyperphotos.json) · [车手绘制设定](art/driver-portraits/绘制设定.md) · [涂装原画](art/liveries/draft-03/)
