use crate::{
    ai::{load_api_key, store_api_key, AiProvider, OpenAiCompatibleProvider},
    domain::{AiProviderConfig, Attachment, Memory, SearchRequest, SearchResult},
    storage::Vault,
};
use std::{path::PathBuf, sync::RwLock};
use tauri::State;

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
pub fn save_memory(mut memory: Memory, state: State<AppState>) -> CmdResult<Memory> {
    memory.normalize_metadata();
    state.vault.save(&memory).map_err(err)?;
    Ok(memory)
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
    let embedding = provider
        .embed(&format!(
            "{}\n{}\n{}",
            analysis.title, memory.content, analysis.summary
        ))
        .await
        .map_err(err)?;
    memory.title = analysis.title;
    memory.summary = analysis.summary;
    memory.emotion = analysis.emotion;
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
    state
        .vault
        .save_embedding(&memory.id, &embedding)
        .map_err(err)?;
    Ok(memory)
}
