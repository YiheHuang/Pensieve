# Pensieve v0.4.0 User Guide

**English** · [简体中文使用手册](使用手册.md) · [Project home](../README.en.md)

## 1. Install and begin

1. Download `Pensieve-Setup-0.4.0.exe` from the [v0.4.0 release](https://github.com/YiheHuang/Pensieve/releases/tag/v0.4.0).
2. Run the installer and launch Pensieve.
3. Create and confirm a **4–8 digit PIN**.
4. Enter the name Pensieve should use for you. You can change it later under Preferences & Protection.

> Keep your PIN and export encrypted backups regularly. The backup password is separate from the PIN.

## 2. Full-screen sanctuary

Pensieve runs as a frameless full-screen application without native Windows chrome.

- **End meditation** at the lower left closes the application.
- **Lock memory vault** removes the decrypted key from memory and returns to the lock screen.
- **Preferences & Protection** contains profile, language, motion, sound, AI, and backup settings.

## 3. Extract a memory

1. Select **Extract** in the sidebar.
2. Write the original memory, or add one or more attachments without text.
3. Use **Add media** for images, audio, and video, or **Voice input** to record audio.
4. For ordinary capture, no title, feeling, or clue fields are required.
5. Expand **Advanced options** to set a title, Beijing time, primary/secondary emotions, or clues manually.
6. Select **Extract**.

The wand ritual loops until AI returns a definitive result. Pensieve opens the detail page only after analysis finishes. If a request errors, the draft remains available for another attempt or further editing.

## 4. AI and compatible endpoints

Under **Preferences & Protection → AI organization**:

1. Enable AI organization.
2. Enter an OpenAI-compatible base URL, such as `https://api.openai.com/v1` or a compatible relay's `/v1` endpoint.
3. Enter the API key and the chat, embedding, and transcription model names.
4. Save the connection.

AI extracts only:

- a title;
- an occurrence time when explicitly stated in the source;
- one primary emotion and up to three secondary emotions;
- people, places, and topic tags;
- image clues and audio transcripts.

AI does not summarize or rewrite the memory body. Pensieve uses a relay-friendly subset of OpenAI Structured Outputs, followed by local normalization and deduplication.

## 5. Layered emotions

The standard vocabulary is **Joy, Serenity, Warmth, Nostalgia, Courage, and Sadness**.

- The first value is the primary emotion.
- Up to three following values are secondary emotions.
- Duplicate primary/secondary values are removed locally.
- Cards and details display the hierarchy clearly.
- Search filters match both primary and secondary emotions.

## 6. Edit text, time, and attachments

Open a memory and select the pencil icon in the upper-right corner. You can:

- edit the original text;
- edit **Memory time · Beijing time**;
- add attachments;
- rename or remove existing attachments.

After saving, the detail view, date filters, and gallery ordering update together. The circular-arrow button manually reanalyzes the title, emotions, and clues without replacing the original text.

## 7. Search and immersive replay

- **Immerse** supports natural-language queries plus emotion, date, and media filters.
- Results consider the original text, title, time, emotions, and clues.
- In a memory detail, select **Immersive replay** to cycle media above the original prose.
- Images receive a cool, dim memory filter so they do not compete with the text.

## 8. Gallery and treasured memories

- Switch the gallery between timeline and grid views.
- Heart a memory, then use **Most treasured** to filter those moments.
- **Today's echo** comes from real local memories and rotates on Beijing time.

## 9. Time Echoes

Open **Time Echoes** from the sidebar:

1. Choose a start and end date. Dates follow Beijing calendar days, and the default range is the latest 30 days.
2. Confirm that the range contains at least one active memory.
3. Select **Listen to the time echo**.
4. Let Pensieve complete every stage: gathering memories, looking back in batches, converging the echo, and sealing the archive.

The report reflects on the chapter through its overview and statistics, emotional journey, people and relationships, places and scenes, themes and events, patterns and insights, treasured moments, and closing reflection. Inside the archive:

- The cover presents memory count, active days, and leading emotions as softly colored glimmers.
- A dedicated **Emotional spectrum** page uses a ring chart, proportion bars, and percentages to show the distribution of primary and secondary emotions.
- Use the side buttons, chapter dots, or `←` and `→` keys to read one page at a time; swipe horizontally on touch screens.
- Press `Esc` or select **Return to archive** to leave the reader.
- Each treasured moment remains paired with its source memory. Select **Enter the original memory** and returning preserves the report page.
- Favorite, rename, or permanently delete reports after confirmation.

A report is an independent snapshot. Later edits or deletion of source memories do not rewrite it. A missing source is shown as a quiet, static notice.

## 10. Recycle bin

Deleting from a memory detail first moves it to the recycle bin.

- **Restore** returns it to the gallery.
- **Delete forever** asks for confirmation, then removes the memory record, related index data, and encrypted attachments.

Permanently deleted content is excluded from future backups.

## 11. Language

Open **Preferences & Protection** and choose:

- 简体中文 (default)
- English

The interface changes immediately. Pensieve never translates or modifies your memory text.

## 12. Backup and restore

### Export

1. Open **Preferences & Protection → Backup & migration**.
2. Select **Export memory backup**.
3. Choose a destination and create a separate password of at least eight characters.

### Restore

1. Select **Restore from backup**.
2. Choose the `.pensieve` file and enter its backup password.
3. After validation, unlock with the original vault PIN.

A backup includes the memory database, structured metadata, encrypted media, and Time Echo archives. It excludes the AI API key.

## 13. Privacy habits

- Desktop data lives in the current Windows user's application-data directory.
- Memory text and attachments are encrypted locally.
- AI keys are stored through Windows Credential Manager.
- Lock the vault before leaving the computer.
- Export `.pensieve` backups regularly and store the backup password in a trusted password manager.
