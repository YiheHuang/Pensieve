# Pensieve

一个温柔、私密、本地优先的 Windows 记忆存取应用。Pensieve 不把记录变成表格，而是让用户自由写下或说出记忆，再通过情绪、人物、主题、时间和自然语言重新浮现它。

## 已实现

- 冷调黑曜石质感、深水渐变与电影化冥想盆微光动效
- 默认中文并支持一键切换英文界面
- 首次 PIN 创建、锁屏、手动锁定和减少动态效果
- 首页、存入记忆、自然语言检索、详情回放、时间线、回收站和设置
- 文字、图片、音频、视频导入入口；桌面端附件使用 AES-256-GCM 加密落盘
- 自由叙述后自动建议标题、情绪和标签，保存优先于后台整理
- 本地关键词/情绪/日期/媒体筛选和关联记忆
- Tauri 原生加密记忆库、Argon2id 密钥派生、Windows 凭据中的 AI 密钥
- OpenAI 兼容的聊天整理和嵌入接口适配器
- 独立密码加密的 `.pensieve` 备份导出
- 浏览器开发模式提供 localStorage 适配器，便于独立调试 UI

## 技术栈

- Tauri 2、Rust、SQLite、AES-GCM、Argon2id
- React 19、TypeScript、Vite
- TanStack Query、Zustand、React Router、Lucide
- Vitest、Testing Library

## 开发

环境要求：Node.js 20+、Rust stable、Visual Studio 2022 Build Tools（Desktop development with C++）及 WebView2。

```powershell
npm install
npm run dev          # 浏览器 UI 开发
npm run tauri dev    # Windows 桌面开发
npm test
npm run lint
npm run build
```

生成 Windows 安装包：

```powershell
npm run tauri build
```

预编译 Windows 安装包可从 [Releases](https://github.com/YiheHuang/Pensieve/releases) 下载。

## 目录

```text
src/
  components/  # 魔法盆、记忆卡、壳层和锁屏
  pages/       # 五个核心体验及设置
  services/    # Web/原生双数据适配器
  stores/      # 锁定状态和偏好
  styles/      # 设计令牌、动效和响应式布局
src-tauri/src/
  ai.rs        # 可插拔 AI 接口及兼容实现
  commands.rs  # 前端可调用的原生命令
  crypto.rs    # Argon2id 与 AES-256-GCM
  domain.rs    # 领域类型
  storage.rs   # SQLite、加密记录、附件和备份
```

## 隐私原则

记忆正文和附件在桌面端加密保存；PIN 与主密钥不发送到网络。AI 默认关闭，只有用户配置服务并启用后才会发起请求。备份不包含 AI API 密钥。

