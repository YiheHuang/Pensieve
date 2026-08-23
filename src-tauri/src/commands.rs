use crate::{
    ai::{load_api_key, store_api_key, AiProvider, OpenAiCompatibleProvider},
    domain::{
        AiProviderConfig, Attachment, GenerateTimeEchoRequest, Memory, SearchRequest, SearchResult,
        TimeEchoProgress, TimeEchoReport, TimeEchoStats, UpdateTimeEchoRequest,
    },
    storage::Vault,
};
use std::{
    collections::{BTreeMap, HashSet},
    path::PathBuf,
    sync::RwLock,
};
use tauri::{ipc::Channel, State};

pub struct AppState {
    pub vault: Vault,
    pub ai_config: RwLock<Option<AiProviderConfig>>,
}
type CmdResult<T> = Result<T, String>;
fn err(error: impl std::fmt::Display) -> String {
    error.to_string()
}

#[tauri::command]
pub fn vault_status(state: State<AppState>) -> serde_json::Value {
    serde_json::json!({"initialized":state.vault.is_initialized(),"unlocked":state.vault.is_unlocked()})
}
#[tauri::command]
pub fn initialize_vault(pin: String, state: State<AppState>) -> CmdResult<()> {
    state.vault.initialize(&pin).map_err(err)
}
#[tauri::command]
pub fn unlock_vault(pin: String, state: State<AppState>) -> CmdResult<()> {
    state.vault.unlock(&pin).map_err(err)?;
    // Opening the vault also upgrades every existing record, including items
    // in the archive and recycle bin.
    for status in ["active", "archived", "trashed"] {
        state.vault.list(status).map_err(err)?;
    }
    // Earlier preview builds moved failed extraction drafts to the recycle bin
    // when returning to edit. Bring those drafts back on the first unlock.
    state.vault.restore_failed_extractions().map_err(err)?;
    Ok(())
}
#[tauri::command]
pub fn lock_vault(state: State<AppState>) {
    state.vault.lock();
}
#[tauri::command]
pub fn list_memories(status: Option<String>, state: State<AppState>) -> CmdResult<Vec<Memory>> {
    state
        .vault
        .list(status.as_deref().unwrap_or("active"))
        .map_err(err)
}
#[tauri::command]
pub fn get_memory(id: String, state: State<AppState>) -> CmdResult<Option<Memory>> {
    state.vault.get(&id).map_err(err)
}

#[tauri::command]
pub fn list_time_echoes(state: State<AppState>) -> CmdResult<Vec<TimeEchoReport>> {
    state.vault.list_time_echoes().map_err(err)
}

#[tauri::command]
pub fn get_time_echo(id: String, state: State<AppState>) -> CmdResult<Option<TimeEchoReport>> {
    state.vault.get_time_echo(&id).map_err(err)
}

#[tauri::command]
pub fn update_time_echo(
    request: UpdateTimeEchoRequest,
    state: State<AppState>,
) -> CmdResult<TimeEchoReport> {
    let mut report = state
        .vault
        .get_time_echo(&request.id)
        .map_err(err)?
        .ok_or_else(|| "时光回响不存在".to_string())?;
    if let Some(title) = request
        .title
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
    {
        report.title = title;
    }
    if let Some(favorite) = request.favorite {
        report.favorite = favorite;
    }
    report.updated_at = chrono::Utc::now().to_rfc3339();
    state.vault.save_time_echo(&report).map_err(err)?;
    Ok(report)
}

#[tauri::command]
pub fn delete_time_echo(id: String, state: State<AppState>) -> CmdResult<()> {
    state.vault.delete_time_echo(&id).map_err(err)
}

fn emit_progress(
    channel: &Channel<TimeEchoProgress>,
    stage: &str,
    current: usize,
    total: usize,
    zh: &str,
    en: &str,
    language: &str,
) {
    let _ = channel.send(TimeEchoProgress {
        stage: stage.into(),
        current,
        total,
        message: if language == "en" { en } else { zh }.into(),
    });
}

fn memory_documents(memories: &[Memory]) -> Vec<String> {
    const SEGMENT: usize = 18_000;
    let mut documents = Vec::new();
    for memory in memories {
        let tags = memory
            .tags
            .iter()
            .map(|tag| format!("{}:{}", tag.kind, tag.label))
            .collect::<Vec<_>>()
            .join("、");
        let transcripts = memory
            .attachments
            .iter()
            .filter_map(|attachment| attachment.transcript.as_deref())
            .collect::<Vec<_>>()
            .join("\n");
        let chars = memory.content.chars().collect::<Vec<_>>();
        let segment_count = chars.len().max(1).div_ceil(SEGMENT);
        for (index, chunk) in chars.chunks(SEGMENT).enumerate() {
            let body = chunk.iter().collect::<String>();
            documents.push(format!("[memory:{}] ({}/{})\n标题：{}\n发生时间：{}\n情绪：{}\n标签：{}\n原始正文：{}\n音频转写：{}",
                memory.id, index + 1, segment_count, memory.title, memory.occurred_at, memory.emotions.join("、"), tags, body, transcripts));
        }
        if chars.is_empty() {
            documents.push(format!("[memory:{}] (1/1)\n标题：{}\n发生时间：{}\n情绪：{}\n标签：{}\n原始正文：\n音频转写：{}",
                memory.id, memory.title, memory.occurred_at, memory.emotions.join("、"), tags, transcripts));
        }
    }
    documents
}

fn pack_documents(documents: Vec<String>) -> Vec<String> {
    const BUDGET: usize = 24_000;
    let mut batches = Vec::new();
    let mut current = String::new();
    for document in documents {
        if !current.is_empty() && current.chars().count() + document.chars().count() > BUDGET {
            batches.push(current);
            current = String::new();
        }
        if !current.is_empty() {
            current.push_str("\n\n---\n\n");
        }
        current.push_str(&document);
    }
    if !current.is_empty() {
        batches.push(current);
    }
    batches
}

#[tauri::command]
pub async fn generate_time_echo(
    request: GenerateTimeEchoRequest,
    on_progress: Channel<TimeEchoProgress>,
    state: State<'_, AppState>,
) -> CmdResult<TimeEchoReport> {
    let from = chrono::NaiveDate::parse_from_str(&request.from_date, "%Y-%m-%d")
        .map_err(|_| "开始日期格式不正确".to_string())?;
    let to = chrono::NaiveDate::parse_from_str(&request.to_date, "%Y-%m-%d")
        .map_err(|_| "结束日期格式不正确".to_string())?;
    if from > to {
        return Err("开始日期不得晚于结束日期".into());
    }
    emit_progress(
        &on_progress,
        "preparing",
        0,
        1,
        "正在整理记忆",
        "Preparing memories",
        &request.language,
    );
    let beijing = chrono::FixedOffset::east_opt(8 * 3600).unwrap();
    let mut memories = state
        .vault
        .list("active")
        .map_err(err)?
        .into_iter()
        .filter(|memory| {
            chrono::DateTime::parse_from_rfc3339(&memory.occurred_at)
                .ok()
                .map(|date| {
                    let day = date.with_timezone(&beijing).date_naive();
                    day >= from && day <= to
                })
                .unwrap_or(false)
        })
        .collect::<Vec<_>>();
    memories.sort_by(|a, b| a.occurred_at.cmp(&b.occurred_at));
    if memories.is_empty() {
        return Err("所选时间范围内没有正在珍藏的记忆".into());
    }
    let config = state
        .ai_config
        .read()
        .map_err(err)?
        .clone()
        .filter(|config| config.enabled)
        .ok_or_else(|| "请先在偏好与守护中启用 AI 服务".to_string())?;
    let key = load_api_key().map_err(|_| "请先在偏好与守护中保存 API 密钥".to_string())?;
    let provider = OpenAiCompatibleProvider::new(config, key);
    let mut batches = pack_documents(memory_documents(&memories));
    let mut round = 0usize;
    while batches.len() > 1 {
        round += 1;
        let total = batches.len();
        let mut summaries = Vec::with_capacity(total);
        for (index, batch) in batches.into_iter().enumerate() {
            emit_progress(
                &on_progress,
                "batching",
                index + 1,
                total,
                "正在分批回望",
                "Revisiting memories in batches",
                &request.language,
            );
            let summary = provider
                .summarize_time_echo(&batch, &request.language, true)
                .await
                .map_err(err)?;
            summaries.push(format!(
                "[round:{round};part:{}]\n{}",
                index + 1,
                serde_json::to_string(&summary).map_err(err)?
            ));
        }
        let packed = pack_documents(summaries.clone());
        // Even an unexpectedly verbose relay response must make progress
        // through the reduction tree instead of repeating the same layer.
        batches = if packed.len() >= total {
            summaries
                .chunks(2)
                .map(|pair| pair.join("\n\n---\n\n"))
                .collect()
        } else {
            packed
        };
    }
    emit_progress(
        &on_progress,
        "synthesizing",
        1,
        1,
        "正在汇聚回响",
        "Gathering the echoes",
        &request.language,
    );
    let analysis = provider
        .summarize_time_echo(&batches.remove(0), &request.language, false)
        .await
        .map_err(err)?;
    let valid_ids = memories
        .iter()
        .map(|memory| memory.id.clone())
        .collect::<HashSet<_>>();
    let clean_ids = |ids: &mut Vec<String>| {
        ids.retain(|id| valid_ids.contains(id));
        ids.sort();
        ids.dedup();
    };
    let mut emotional_journey = analysis.emotional_journey;
    clean_ids(&mut emotional_journey.memory_ids);
    let mut people_and_relationships = analysis.people_and_relationships;
    clean_ids(&mut people_and_relationships.memory_ids);
    let mut places_and_scenes = analysis.places_and_scenes;
    clean_ids(&mut places_and_scenes.memory_ids);
    let mut themes_and_events = analysis.themes_and_events;
    clean_ids(&mut themes_and_events.memory_ids);
    let mut patterns_and_insights = analysis.patterns_and_insights;
    clean_ids(&mut patterns_and_insights.memory_ids);
    let mut treasured_moments = analysis.treasured_moments;
    for reference in &mut treasured_moments {
        clean_ids(&mut reference.memory_ids);
        let normalized_reference = reference
            .title
            .chars()
            .filter(|character| character.is_alphanumeric())
            .flat_map(char::to_lowercase)
            .collect::<String>();
        if let Some(exact) = memories.iter().find(|memory| {
            memory
                .title
                .chars()
                .filter(|character| character.is_alphanumeric())
                .flat_map(char::to_lowercase)
                .collect::<String>()
                == normalized_reference
        }) {
            reference.memory_ids = vec![exact.id.clone()];
        }
    }
    treasured_moments
        .retain(|reference| !reference.title.trim().is_empty() && !reference.memory_ids.is_empty());
    treasured_moments.truncate(8);
    let mut emotion_counts = BTreeMap::new();
    let mut active_days = HashSet::new();
    for memory in &memories {
        let emotions = if memory.emotions.is_empty() {
            vec![memory.emotion.clone()]
        } else {
            memory.emotions.clone()
        };
        for emotion in emotions.into_iter().collect::<HashSet<_>>() {
            *emotion_counts.entry(emotion).or_insert(0) += 1;
        }
        if let Ok(date) = chrono::DateTime::parse_from_rfc3339(&memory.occurred_at) {
            active_days.insert(date.with_timezone(&beijing).date_naive());
        }
    }
    let now = chrono::Utc::now().to_rfc3339();
    let report = TimeEchoReport {
        id: uuid::Uuid::new_v4().to_string(),
        title: if analysis.title.trim().is_empty() {
            if request.language == "en" {
                "Echoes of this chapter".into()
            } else {
                "这一程的时光回响".into()
            }
        } else {
            analysis.title.trim().to_string()
        },
        period_start: request.from_date,
        period_end: request.to_date,
        created_at: now.clone(),
        updated_at: now,
        language: if request.language == "en" {
            "en".into()
        } else {
            "zh".into()
        },
        memory_count: memories.len(),
        source_memory_ids: memories.iter().map(|memory| memory.id.clone()).collect(),
        favorite: false,
        stats: TimeEchoStats {
            active_days: active_days.len(),
            attachment_count: memories.iter().map(|memory| memory.attachments.len()).sum(),
            favorite_count: memories.iter().filter(|memory| memory.favorite).count(),
            emotion_counts,
        },
        overview: analysis.overview,
        emotional_journey,
        people_and_relationships,
        places_and_scenes,
        themes_and_events,
        patterns_and_insights,
        treasured_moments,
        closing_reflection: analysis.closing_reflection,
    };
    emit_progress(
        &on_progress,
        "saving",
        1,
        1,
        "正在封存档案",
        "Sealing the archive",
        &report.language,
    );
    state.vault.save_time_echo(&report).map_err(err)?;
    Ok(report)
}
#[tauri::command]
pub fn save_memory(mut memory: Memory, state: State<AppState>) -> CmdResult<Memory> {
    memory.normalize_metadata();
    state.vault.save(&memory).map_err(err)?;
    Ok(memory)
}
#[tauri::command]
pub fn delete_memory_permanently(id: String, state: State<AppState>) -> CmdResult<()> {
    state.vault.delete_memory_permanently(&id).map_err(err)
}
#[tauri::command]
pub async fn search_memories(
    request: SearchRequest,
    state: State<'_, AppState>,
) -> CmdResult<Vec<SearchResult>> {
    let config = state.ai_config.read().map_err(err)?.clone();
    let embedding = if !request.query.trim().is_empty() {
        if let Some(config) = config.filter(|c| c.enabled) {
            match load_api_key() {
                Ok(key) => OpenAiCompatibleProvider::new(config, key)
                    .embed(&request.query)
                    .await
                    .ok(),
                Err(_) => None,
            }
        } else {
            None
        }
    } else {
        None
    };
    state
        .vault
        .search(&request, embedding.as_deref())
        .map_err(err)
}
#[tauri::command]
pub fn export_backup(path: String, password: String, state: State<AppState>) -> CmdResult<()> {
    state
        .vault
        .export_backup(&password, &PathBuf::from(path))
        .map_err(err)
}
#[tauri::command]
pub fn restore_backup(path: String, password: String, state: State<AppState>) -> CmdResult<()> {
    state
        .vault
        .restore_backup(&password, &PathBuf::from(path))
        .map_err(err)
}
#[tauri::command]
pub fn import_attachment(
    path: String,
    memory_id: String,
    state: State<AppState>,
) -> CmdResult<Attachment> {
    state
        .vault
        .import_attachment(&PathBuf::from(path), &memory_id)
        .map_err(err)
}
#[tauri::command]
pub fn import_attachment_bytes(
    name: String,
    mime_type: String,
    data_base64: String,
    memory_id: String,
    state: State<AppState>,
) -> CmdResult<Attachment> {
    use base64::Engine;
    let data = base64::engine::general_purpose::STANDARD
        .decode(data_base64)
        .map_err(err)?;
    state
        .vault
        .import_attachment_bytes(&name, &mime_type, &data, &memory_id)
        .map_err(err)
}
#[tauri::command]
pub fn get_attachment_data(encrypted_path: String, state: State<AppState>) -> CmdResult<String> {
    use base64::Engine;
    state
        .vault
        .read_attachment(&encrypted_path)
        .map(|v| base64::engine::general_purpose::STANDARD.encode(v))
        .map_err(err)
}
#[tauri::command]
pub fn delete_attachment(encrypted_path: String, state: State<AppState>) -> CmdResult<()> {
    state.vault.delete_attachment(&encrypted_path).map_err(err)
}
#[tauri::command]
pub fn configure_ai(
    config: AiProviderConfig,
    api_key: Option<String>,
    state: State<AppState>,
) -> CmdResult<()> {
    if let Some(key) = api_key.filter(|k| !k.trim().is_empty()) {
        store_api_key(&key).map_err(err)?;
    }
    state.vault.save_ai_config(&config).map_err(err)?;
    *state.ai_config.write().map_err(err)? = Some(config);
    Ok(())
}
#[tauri::command]
pub async fn analyze_memory(id: String, state: State<'_, AppState>) -> CmdResult<Memory> {
    let mut memory = state
        .vault
        .get(&id)
        .map_err(err)?
        .ok_or_else(|| "记忆不存在".to_string())?;
    let config = state
        .ai_config
        .read()
        .map_err(err)?
        .clone()
        .ok_or_else(|| "尚未配置 AI 服务".to_string())?;
    let key = load_api_key().map_err(err)?;
    let provider = OpenAiCompatibleProvider::new(config, key);
    let mut images = Vec::new();
    let mut transcripts = Vec::new();
    for attachment in &mut memory.attachments {
        if let Some(path) = attachment.encrypted_path.as_deref() {
            if attachment.kind == "image" {
                if let Ok(bytes) = state.vault.read_attachment(path) {
                    use base64::Engine;
                    images.push((
                        attachment.mime_type.clone(),
                        base64::engine::general_purpose::STANDARD.encode(bytes),
                    ));
                }
            } else if attachment.kind == "audio" {
                if let Ok(bytes) = state.vault.read_attachment(path) {
                    if let Ok(text) = provider
                        .transcribe(&attachment.name, &attachment.mime_type, bytes)
                        .await
                    {
                        attachment.transcript = Some(text.clone());
                        transcripts.push(text);
                    }
                }
            }
        }
    }
    let mut analysis_input = memory.clone();
    if !transcripts.is_empty() {
        analysis_input.content = format!(
            "{}\n\n[音频转写]\n{}",
            memory.content,
            transcripts.join("\n")
        );
    }
    let analysis = provider
        .analyze_memory(&analysis_input, &images)
        .await
        .map_err(err)?;
    memory.title = analysis.title;
    memory.summary = memory.content.clone();
    if let Some(occurred_at) = analysis
        .occurred_at
        .filter(|value| chrono::DateTime::parse_from_rfc3339(value).is_ok())
    {
        memory.occurred_at = occurred_at;
    }
    memory.emotion = analysis.primary_emotion.clone();
    memory.emotions = std::iter::once(analysis.primary_emotion)
        .chain(analysis.secondary_emotions)
        .collect();
    memory.ai_status = "succeeded".into();
    let mut tags = Vec::new();
    for (label, kind) in analysis
        .people
        .into_iter()
        .map(|v| (v, "person"))
        .chain(analysis.places.into_iter().map(|v| (v, "place")))
        .chain(analysis.topics.into_iter().map(|v| (v, "topic")))
    {
        tags.push(crate::domain::EntityTag {
            id: uuid::Uuid::new_v4().to_string(),
            label,
            kind: kind.into(),
            confidence: analysis.confidence,
            source: "ai".into(),
        });
    }
    memory.tags = tags;
    memory.normalize_metadata();
    state.vault.save(&memory).map_err(err)?;
    Ok(memory)
}
