<div align="center">

**English** · [简体中文](README.md)

# Pensieve

### A quiet place where memories can be kept—and gently seen again.

Pensieve is a local-first private memory sanctuary for Windows.<br />
It does not ask you to turn life into a perfectly organized journal. It first receives your words, images, and voice as they are, then helps you return through emotion, people, place, and time.

[![Release](https://img.shields.io/github/v/release/YiheHuang/Pensieve?style=for-the-badge&color=527f96&label=Release)](https://github.com/YiheHuang/Pensieve/releases/latest)
[![Windows](https://img.shields.io/badge/Windows-10%20%7C%2011-315a70?style=for-the-badge&logo=windows11)](https://github.com/YiheHuang/Pensieve/releases/latest)
[![License](https://img.shields.io/github/license/YiheHuang/Pensieve?style=for-the-badge&color=27495d)](LICENSE)

**[Download Pensieve](https://github.com/YiheHuang/Pensieve/releases/latest)** · **[Read the User Guide](docs/User-Guide.en.md)** · **[简体中文](README.md)**

</div>

---

<p align="center"><img src="docs/images/pensieve-hero.png" alt="Pensieve lock screen" width="100%" /></p>

> This lock-screen capture contains no memory text, attachments, API keys, or other private data.

## Why Pensieve exists

Memory is not organized like a folder.

We often remember the sound of rain, the expression on someone's face, the warmth after a shared meal, or a sentence we never managed to say. Conventional journals are good at chronological archives, but less suited to these vague, fragmented, emotional traces. Many modern note-taking tools also center forms, productivity, and metrics—turning the act of preserving a memory into another task to complete.

Pensieve was created in response.

Its name draws on the magical image of a basin in which memories can settle and be revisited. The goal is not to build another journal, but a private, quiet space: leave a moment in its original form today, then return through an emotion, a person, a place, a sound, or an image years later.

Pensieve follows three principles:

1. **Preserve truth before organizing it.** Your original text belongs to you; AI extracts supporting metadata only.
2. **Remembering should feel like an experience.** Interface, sound, and motion serve immersion rather than feature density.
3. **Private memories should remain under personal control.** Local encryption, opt-in AI, and encrypted exports keep the boundary explicit.

## What Pensieve can do

### 💧 Capture without a form

Write a paragraph, add photos, video, or audio, or record your voice directly. In everyday use, the memory itself is enough. Titles, emotions, and clues remain optional behind Advanced settings.

### 🪄 Turn saving into a ritual

Saving is not reduced to a cold submit button. A wand carries the memory's light into the basin, where it blooms across the water. Pensieve waits for AI organization to finish before opening the completed memory.

### 🎭 Respect emotional complexity

A memory rarely contains one feeling. Pensieve keeps one primary emotion and up to three secondary emotions, normalized into six searchable categories: Joy, Serenity, Warmth, Nostalgia, Courage, and Sadness.

### 🧩 Let AI organize clues—not rewrite your life

Optional AI extracts a title, people, places, topics, and emotions. It does not generate a rewritten body or summary, and it never changes the memory time. Time defaults to the Beijing time of the first **Extract** action and changes only when the user edits it in Advanced options or the detail view. Labels are further normalized and deduplicated locally.

### 🌊 Re-enter through immersive replay

Describe a moment naturally in **Immerse**, or filter by emotion, date, and media. From either the detail view or immersive replay, move through adjacent memories with the mouse or arrow keys. Switching inside replay stays beneath the surface and glides directly into the next memory. Media and prose dissolve into irregular light, mist, and ink-like currents; text-only memories use the full scene without an empty media region.

### ✨ Write upon the water

Inputs across Extract, Immerse, and the Gallery awaken with quiet inner light and ripples, then settle when focus leaves. A silver-blue starlight pointer traces a brief glow through movement, carrying the same restrained magical language through writing and discovery, with full reduced-motion and high-contrast adaptations.

### ✏️ Keep memories editable

Edit the original text, occurrence time, and image/audio/video attachments at any time. You can rerun AI analysis to refresh only the title, emotions, and clues while preserving the source text.

### 💗 Build a living gallery

Heart moments to create a **Most treasured** collection. Browse the gallery as a timeline or grid, and let **Today's echo** bring back a line from a real local memory.

### 〰️ Listen to a chapter of time

Choose a Beijing-time date range and Pensieve can reflect on emotional movement, people and relationships, places and scenes, themes and events, and patterns of change. Each report is preserved as an encrypted snapshot and revealed chapter by chapter in a full-screen underwater reader. Memory counts, active days, and emotional proportions become a colored underwater spectrum, while each treasured moment leads precisely back to its source memory.

### 🗑️ Leave room for second thoughts

Deletion first moves a memory to the recycle bin. Restore it whenever you like, or erase it permanently together with its related index data and encrypted attachments.

### 🌐 Welcome more people

Pensieve opens in Simplified Chinese and includes a complete English interface, this README, and an [English User Guide](docs/User-Guide.en.md). Every user chooses their own display name.

## Who it is for

Pensieve may feel at home with people who:

- want to record life without following a fixed journal format;
- naturally remember through photos, voice, and fragments of prose;
- look for old moments through emotions, people, or scenes;
- care about local storage, encryption, and data autonomy;
- appreciate calm, restrained software with a sense of ritual.

It can also serve as a travel journal, family-memory archive, growth record, inspiration library, or private voice diary.

## Start using Pensieve

1. Open the [latest release](https://github.com/YiheHuang/Pensieve/releases/latest).
2. Download and run `Pensieve-Setup-0.7.0.exe`.
3. Create a 4–8 digit PIN and choose how Pensieve should address you.
4. Open **Extract** and leave your first memory.
5. Optional: configure your OpenAI-compatible service under **Preferences & Protection**.

For installation, AI configuration, editing, backup, and recovery, read the complete **[Pensieve User Guide](docs/User-Guide.en.md)**.

## Privacy and data boundaries

- Memory text, structured metadata, and attachments are encrypted on the Windows desktop.
- The PIN derives the vault key through Argon2id; AI API keys stay in Windows Credential Manager.
- AI is off by default and contacts only the compatible service explicitly configured by the user.
- `.pensieve` backups use a separate password and include memories, attachments, Time Echo archives, and the encrypted parameters required for cross-device unlocking. AI API keys remain excluded.
- After restoring on another computer, unlock with the **original PIN of the source vault**. A temporary PIN created on the destination computer does not replace the source vault PIN.
- Vault locking and permanent deletion keep control with the person who owns the memories.

> Pensieve is a personal memory tool, not a substitute for professional medical, mental-health, or archival services. Keep independent backups of important material.

## Open source, shaped together

Pensieve is still growing. Memory keepers, digital-life enthusiasts, designers, and developers are welcome to share experiences, suggest ideas, or contribute through [GitHub Issues](https://github.com/YiheHuang/Pensieve/issues).

<details>
<summary><strong>For developers: technology and local setup</strong></summary>

```text
UI          React 19 · TypeScript · Vite · Zustand · TanStack Query
Desktop     Tauri 2 · Rust · WebView2
Storage     SQLite · AES-256-GCM · Argon2id
Quality     Vitest · Testing Library · Oxlint · Rust checks
```

```powershell
git clone https://github.com/YiheHuang/Pensieve.git
cd Pensieve
npm install
npm run dev          # Browser UI development
npm run tauri dev    # Windows desktop development
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

**May every cherished memory find a place to glow again.**

[Download](https://github.com/YiheHuang/Pensieve/releases/latest) · [User Guide](docs/User-Guide.en.md) · [简体中文](README.md) · [MIT License](LICENSE)

</div>
