<div align="center">

# Pensieve · 冥想盆

### 把值得珍藏的时刻，轻轻放进一片会呼吸的深水。

一款冷色、沉浸、私密的 Windows 记忆应用。自由写下或说出记忆，<br />
再沿着人物、情绪、时间与声音，让它们从冥想盆中重新浮现。

[![Release](https://img.shields.io/github/v/release/YiheHuang/Pensieve?style=for-the-badge&color=527f96&label=Release)](https://github.com/YiheHuang/Pensieve/releases/latest)
[![Windows](https://img.shields.io/badge/Windows-10%20%7C%2011-315a70?style=for-the-badge&logo=windows11)](https://github.com/YiheHuang/Pensieve/releases/latest)
[![Tauri](https://img.shields.io/badge/Tauri-2-18384a?style=for-the-badge&logo=tauri)](https://tauri.app/)
[![License](https://img.shields.io/github/license/YiheHuang/Pensieve?style=for-the-badge&color=27495d)](LICENSE)

**[下载 Windows 安装包](https://github.com/YiheHuang/Pensieve/releases/latest)** · [使用手册](docs/使用手册.md) · [功能一览](#一眼看懂-pensieve)

</div>

---

<p align="center">
  <img src="docs/images/pensieve-hero.png" alt="Pensieve 冥想盆界面概念展示" width="100%" />
</p>

> 上图为隐私安全的界面概念展示，使用虚构记忆内容，不含真实用户数据。

## 为什么是 Pensieve？

普通日志常常要求你填满日期、标题和分类。Pensieve 更像一个安静的容器：先让记忆自然流淌，再替你整理散落其中的情绪、人物、地点与主题。

- **记录不必规整**：一段话、一张照片、一段声音，都可以成为记忆。
- **回想不靠翻页**：描述一个人、一种感受或一幕场景，即可寻找相关片段。
- **沉浸而非浏览**：影像、声音与文字在深水环境中轮询浮现。
- **隐私先于便利**：正文与附件在桌面端加密保存在本机。

## 一眼看懂 Pensieve

| 体验 | 你可以做什么 |
| --- | --- |
| 💧 **存入记忆** | 写下文字，加入图片、音频或视频；魔杖会将记忆注入冥想盆。 |
| 🌊 **沉浸回放** | 像俯身进入水面一样，让媒体与文字在深水环境中依次显现。 |
| 🫧 **自然语言寻找** | 用日常语言描述线索，并按日期、情绪和媒体类型进一步筛选。 |
| 💗 **最珍贵记忆** | 点亮爱心，在记忆长廊中单独查看最珍视的时刻。 |
| ✨ **今日回响** | 每天从真实记忆中浮现一段回响，以北京时间稳定轮换。 |
| 🪄 **智能整理** | 将情绪归入六类标准格式，并整理人物、地点和主题标签。 |
| 🌐 **中英双语** | 默认中文，可在“偏好与守护”中切换 English。 |
| 🔐 **本地守护** | PIN、加密附件、系统凭据与独立密码备份共同守护记忆。 |

## 立即开始

### Windows 用户

1. 打开 [最新 Release](https://github.com/YiheHuang/Pensieve/releases/latest)。
2. 下载 `Pensieve-Setup-0.1.0.exe`。
3. 运行安装程序并启动 **Pensieve**。
4. 首次进入时创建 PIN，然后存入第一缕记忆。

当前版本：**v0.1.0** · [直接下载安装包](https://github.com/YiheHuang/Pensieve/releases/download/v0.1.0/Pensieve-Setup-0.1.0.exe)

```text
SHA-256
297299E8D7157AC761F1973990482B65F94F4F70EF283906231D1422A684CDD8
```

## 隐私与数据

Pensieve 采用本地优先设计：

- 记忆正文、结构化信息和附件在 Windows 桌面端加密保存。
- PIN 通过 Argon2id 派生密钥，主密钥仅服务于本机记忆库。
- AI 整理默认关闭；启用后才会请求你配置的兼容服务。
- AI API 密钥交由 Windows 系统凭据保管。
- `.pensieve` 备份使用独立密码加密，并排除 AI API 密钥。
- 浏览器开发模式使用隔离的 localStorage 适配器，仅用于界面调试。

> PIN 是进入记忆库的重要凭据。请妥善记住 PIN，并定期导出加密备份。

## 技术构成

```text
界面       React 19 · TypeScript · Vite · Zustand · TanStack Query
桌面       Tauri 2 · Rust · WebView2
存储       SQLite · AES-256-GCM · Argon2id
体验       React Router · Lucide · CSS 动效 · Web Audio
质量       Vitest · Testing Library · Oxlint
```

## 本地开发

### 环境

- Node.js 20+
- Rust stable
- Windows 10/11 与 WebView2
- Windows 构建需 Visual Studio 2022 Build Tools，或项目脚本配置的 GNU 工具链

### 运行

```powershell
git clone https://github.com/YiheHuang/Pensieve.git
cd Pensieve
npm install

npm run dev          # 浏览器界面开发
npm run tauri dev    # Windows 桌面开发
```

### 检查与构建

```powershell
npm test
npm run lint
npm run build
npm run tauri:build:gnu
```

Windows 安装包会生成在：

```text
src-tauri/target/x86_64-pc-windows-gnu/release/bundle/nsis/
```

## 项目结构

```text
src/
├─ components/       冥想盆、锁屏、记忆卡与沉浸回放
├─ pages/            首页、存入、寻找、长廊、详情与设置
├─ services/         浏览器/桌面双数据适配器与声音服务
├─ stores/           锁定状态、语言和偏好
└─ styles/           深水视觉、动效与响应式布局

src-tauri/src/
├─ ai.rs             可插拔 AI 整理与嵌入接口
├─ commands.rs       Tauri 命令层
├─ crypto.rs         Argon2id 与 AES-256-GCM
├─ domain.rs         记忆、情绪与标签标准化
└─ storage.rs        SQLite、附件、搜索与加密备份
```

## 参与项目

欢迎通过 [Issues](https://github.com/YiheHuang/Pensieve/issues) 分享体验、提交问题或提出新的沉浸想法。提交代码前，请运行测试、代码检查和前端构建。

---

<div align="center">

**愿每一段被珍惜的记忆，都有再次发光的地方。**

Released under the [MIT License](LICENSE).

</div>
