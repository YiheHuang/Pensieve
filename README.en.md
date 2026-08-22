<div align="center">

**English** · [简体中文](README.md)

# Pensieve

### A quiet, breathing basin for the moments you want to keep.

Pensieve is a cool-toned, immersive, local-first memory sanctuary for Windows. Capture a memory in your own words, then rediscover it through people, emotions, time, images, and sound.

[![Release](https://img.shields.io/github/v/release/YiheHuang/Pensieve?style=for-the-badge&color=527f96&label=Release)](https://github.com/YiheHuang/Pensieve/releases/latest)
[![Windows](https://img.shields.io/badge/Windows-10%20%7C%2011-315a70?style=for-the-badge&logo=windows11)](https://github.com/YiheHuang/Pensieve/releases/latest)
[![Tauri](https://img.shields.io/badge/Tauri-2-18384a?style=for-the-badge&logo=tauri)](https://tauri.app/)
[![License](https://img.shields.io/github/license/YiheHuang/Pensieve?style=for-the-badge&color=27495d)](LICENSE)

**[Download for Windows](https://github.com/YiheHuang/Pensieve/releases/latest)** · **[English User Guide](docs/User-Guide.en.md)** · **[中文说明](README.md)**

</div>

---

<p align="center"><img src="docs/images/pensieve-hero.png" alt="Pensieve lock screen" width="100%" /></p>

> This lock-screen capture contains no memory text, attachments, API keys, or other private data.

## Why Pensieve?

Most journals ask you to organize first and write second. Pensieve does the opposite: it preserves your original words, while optional AI extracts only metadata such as a title, time, emotions, and clues. Your memory body remains yours.

| Experience | What v0.2.0 offers |
| --- | --- |
| 💧 **Extract a memory** | Write only the memory, or attach images, audio, video, and voice recordings. Advanced fields stay optional. |
| 🪄 **Casting ritual** | The wand-and-basin animation loops until AI returns a definitive result. |
| 🎭 **Layered emotions** | One primary emotion and up to three secondary emotions, all searchable. |
| 🧩 **Clean clues** | People, places, and topics are normalized and deduplicated across categories. |
| 🌊 **Immersive replay** | Media appears above the original text, softened by a cool memory filter. |
| ✏️ **Editable memories** | Edit the original text, occurrence time, and attachments at any time. |
| 💗 **Treasured memories** | Hearts power a dedicated “Most treasured” filter. |
| 🗑️ **Recycle bin** | Restore a memory or erase it permanently together with its encrypted attachments. |
| 🌐 **Chinese & English** | Chinese is the default; switch to English in Preferences & Protection. |
| 🔐 **Local protection** | PIN access, local encryption, system credentials, and encrypted backups. |

## Quick start

1. Open the [Pensieve v0.2.0 release](https://github.com/YiheHuang/Pensieve/releases/tag/v0.2.0).
2. Download and run `Pensieve-Setup-0.2.0.exe`.
3. Create a 4–8 digit PIN and choose how Pensieve should address you.
4. Optional: configure an OpenAI-compatible endpoint under **Preferences & Protection**.
5. Open **Extract** and write your first memory.

Read the full [English User Guide](docs/User-Guide.en.md), or switch to the [Chinese README](README.md).

## Highlights in v0.2.0

- Frameless full-screen sanctuary with an in-app “End meditation” action.
- First-run profile setup and Chinese/English language switching.
- A simplified capture flow that waits for AI before opening details.
- Primary/secondary emotion tags with a fixed six-emotion vocabulary.
- Original-text protection: AI no longer summarizes or rewrites the memory body.
- Editable memory text, occurrence time, and attachments.
- Treasured-memory filtering, real daily echoes, and permanent recycle-bin deletion.
- Structured Outputs compatibility for OpenAI-compatible relays, including OpenLux-style endpoints.

See the [v0.2.0 release notes](https://github.com/YiheHuang/Pensieve/releases/tag/v0.2.0) for the complete changelog.

## Privacy

- Memory text, structured metadata, and attachments are encrypted on the desktop.
- The PIN derives the vault key through Argon2id; AI keys stay in Windows Credential Manager.
- AI is off by default and only contacts the endpoint you configure.
- `.pensieve` backups use a separate password and exclude the AI API key.
- Permanent deletion removes the database record, related index data, and encrypted attachments.

## Technology

```text
UI          React 19 · TypeScript · Vite · Zustand · TanStack Query
Desktop     Tauri 2 · Rust · WebView2
Storage     SQLite · AES-256-GCM · Argon2id
Quality     Vitest · Testing Library · Oxlint · Rust checks
```

## Development

```powershell
git clone https://github.com/YiheHuang/Pensieve.git
cd Pensieve
npm install
npm run dev
npm run tauri dev
```

Checks and packaging:

```powershell
npm test
npm run lint
npm run build
npm run tauri:build:gnu
```

Contributions and ideas are welcome through [GitHub Issues](https://github.com/YiheHuang/Pensieve/issues).

---

<div align="center">

**May every cherished memory find a place to glow again.**

Released under the [MIT License](LICENSE).

</div>
