<div align="center">

[**English**](README.en.md) · **简体中文**

# Pensieve · 冥想盆

### 让记忆被安静地保存，也被温柔地重新看见。

Pensieve 是一款面向 Windows 的本地优先私人记忆应用。<br />
它不要求你把生活写成规整的日志，而是先接住真实的文字、声音与影像，再帮助你沿着情绪、人物和时间回到当时。

[![Release](https://img.shields.io/github/v/release/YiheHuang/Pensieve?style=for-the-badge&color=527f96&label=Release)](https://github.com/YiheHuang/Pensieve/releases/latest)
[![Windows](https://img.shields.io/badge/Windows-10%20%7C%2011-315a70?style=for-the-badge&logo=windows11)](https://github.com/YiheHuang/Pensieve/releases/latest)
[![License](https://img.shields.io/github/license/YiheHuang/Pensieve?style=for-the-badge&color=27495d)](LICENSE)

**[下载 Pensieve](https://github.com/YiheHuang/Pensieve/releases/latest)** · **[阅读使用手册](docs/使用手册.md)** · **[English](README.en.md)**

</div>

---

<p align="center"><img src="docs/images/pensieve-hero.png" alt="Pensieve 锁定界面" width="100%" /></p>

> 锁定界面展示不含记忆正文、附件、API 密钥或其他私人数据。

## 它为什么诞生

人的记忆并不像文件夹那样整齐。

我们常常只记得雨声、某个人说话的神情、一顿饭后的温度，或一句没有来得及说出口的话。传统日记更擅长按日期归档，却很难承接这种模糊、零散而带有情绪的回想；许多记录工具又把重点放在表格、效率和统计上，使“保存一段记忆”变成另一项需要完成的任务。

Pensieve 因此诞生。

它的名字取意于一个承载、沉淀与重新读取记忆的魔法意象。我们希望做的不是另一款日志软件，而是一个安静的私人空间：你可以先原样留下此刻，之后再从情绪、人物、地点、声音或画面中重新进入它。

Pensieve 坚持三个原则：

1. **先保留真实，再进行整理**——原始正文属于用户，AI 只提取辅助信息。
2. **回忆应当是一种体验**——界面、声音和动效共同服务于沉浸，而不是堆叠功能。
3. **私人记忆应由本人掌握**——本地加密、主动启用 AI、可导出的加密备份，让数据边界保持清晰。

## 主要功能

### 💧 自然地留下记忆

写下一段话，加入照片、视频或声音，也可以直接录音。常规使用时只需提供想保存的内容，标题、情绪和线索都不是负担；需要精确控制时，再展开高级选项。

### 🪄 从“提取”到沉入水面

保存不是一个冰冷的提交动作。魔杖携带记忆微光进入冥想盆，光芒在水中晕开；Pensieve 会等待 AI 整理完成，再带你进入这段记忆。

### 🎭 看见复杂而真实的情绪

一段记忆很少只有一种感受。Pensieve 为每段记忆保留一个主情绪和最多三个副情绪，并统一为六类标准标签：欣喜、宁静、温暖、怀念、勇敢与难过。它们不仅用于展示，也能参与筛选和寻找。

### 🧩 让 AI 整理线索，而不是改写人生

可选 AI 会提取标题、原文明示的时间、人物、地点、主题和情绪。它不会生成正文摘要，也不会把你的表达改写成另一种故事。人物、地点与主题会在本地进一步标准化和去重。

### 🌊 沉浸式重新进入

在“沉浸”中用自然语言描述你想找的片刻，也可以按情绪、日期和媒体类型筛选。进入回放后，影像、声音与文字在深水环境中依次浮现；图片经过低亮度冷色“回忆”滤镜，让画面与文字各自呼吸。

### ✏️ 记忆始终可以被维护

正文、发生时间、图片、音频和视频附件均可修改。你也可以重新运行 AI 分析，只更新标题、情绪和线索，而保留原始正文。

### 💗 珍藏、回响与长廊

点亮爱心即可建立“最珍贵记忆”筛选；记忆长廊提供时间线和网格视图；“今日回响”会从真实本地记忆中带回一句旧日微光。

### 🗑️ 有余地，也有决定权

删除首先进入回收站，你可以随时唤醒。选择彻底删除时，Pensieve 会同时清理记忆记录、相关索引与加密附件。

### 🌐 为更多使用者准备

应用默认使用简体中文，并提供完整 English 界面、[English README](README.en.md) 与 [English User Guide](docs/User-Guide.en.md)。称呼也由每位用户自行设置。

## 适合谁

Pensieve 适合：

- 想记录生活，但不喜欢固定日记格式的人；
- 更习惯用照片、语音和片段文字保存感受的人；
- 希望通过情绪、人物或场景寻找往事的人；
- 在意本地保存、加密与数据自主权的人；
- 喜欢安静、克制、带有仪式感的软件体验的人。

它也适合作为旅行札记、家庭回忆、成长档案、灵感收藏或个人声音日记。

## 开始使用

1. 前往 [最新 Release](https://github.com/YiheHuang/Pensieve/releases/latest)。
2. 下载并运行 `Pensieve-Setup-0.2.0.exe`。
3. 创建 4–8 位数字 PIN，并填写你的称呼。
4. 进入 **提取**，写下第一段记忆。
5. 如需智能整理，在 **偏好与守护** 中配置你的 OpenAI 兼容服务。

更完整的安装、AI 配置、编辑、备份和恢复说明，请阅读 **[Pensieve 使用手册](docs/使用手册.md)**。

## 隐私与数据边界

- 记忆正文、结构化信息和附件在 Windows 桌面端加密保存。
- PIN 通过 Argon2id 派生密钥；AI API 密钥由 Windows 系统凭据保管。
- AI 默认关闭，仅在用户主动启用后请求其配置的兼容服务。
- `.pensieve` 备份使用独立密码加密，并排除 AI API 密钥。
- 应用支持锁定记忆库与彻底删除，数据控制权始终属于用户。

> Pensieve 是个人记忆工具，不代替专业的医疗、心理或数据归档服务。重要资料请保留独立备份。

## 开源与共创

Pensieve 仍在成长。欢迎记忆书写者、数字生活爱好者、设计师和开发者通过 [Issues](https://github.com/YiheHuang/Pensieve/issues) 分享使用感受、提出新想法或参与改进。

<details>
<summary><strong>面向开发者：技术与本地运行</strong></summary>

```text
界面       React 19 · TypeScript · Vite · Zustand · TanStack Query
桌面       Tauri 2 · Rust · WebView2
存储       SQLite · AES-256-GCM · Argon2id
质量       Vitest · Testing Library · Oxlint · Rust checks
```

```powershell
git clone https://github.com/YiheHuang/Pensieve.git
cd Pensieve
npm install
npm run dev          # 浏览器界面开发
npm run tauri dev    # Windows 桌面开发
```

```powershell
npm test
npm run lint
npm run build
npm run tauri:build:gnu
```

</details>

---

<div align="center">

**愿每一段被珍惜的记忆，都有再次发光的地方。**

[下载](https://github.com/YiheHuang/Pensieve/releases/latest) · [使用手册](docs/使用手册.md) · [English](README.en.md) · [MIT License](LICENSE)

</div>
