use crate::{
    crypto::{decrypt, derive_key, encrypt, random_salt, SecretKey},
    domain::{AiProviderConfig, Attachment, Memory, SearchRequest, SearchResult, TimeEchoReport},
};
use anyhow::{anyhow, Context, Result};
use base64::{engine::general_purpose::STANDARD, Engine};
use rusqlite::{params, Connection, OptionalExtension};
use std::{
    fs,
    io::{Cursor, Read, Write},
    path::{Path, PathBuf},
    sync::RwLock,
};

const CHECK_VALUE: &[u8] = b"pensieve-vault-check-v1";

pub struct Vault {
    db_path: PathBuf,
    salt_path: PathBuf,
    attachments_path: PathBuf,
    key: RwLock<Option<SecretKey>>,
}

impl Vault {
    pub fn new(app_data: impl AsRef<Path>) -> Result<Self> {
        fs::create_dir_all(app_data.as_ref())?;
        let attachments_path = app_data.as_ref().join("attachments");
        fs::create_dir_all(&attachments_path)?;
        let vault = Self {
            db_path: app_data.as_ref().join("pensieve.db"),
            salt_path: app_data.as_ref().join("vault.salt"),
            attachments_path,
            key: RwLock::new(None),
        };
        vault.migrate()?;
        Ok(vault)
    }

    fn connection(&self) -> Result<Connection> {
        Ok(Connection::open(&self.db_path)?)
    }
    pub fn migrate(&self) -> Result<()> {
        self.connection()?.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
          CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value BLOB NOT NULL);
          CREATE TABLE IF NOT EXISTS memories (id TEXT PRIMARY KEY, occurred_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, status TEXT NOT NULL, payload BLOB NOT NULL);
          CREATE INDEX IF NOT EXISTS idx_memories_timeline ON memories(status, occurred_at DESC);
          CREATE TABLE IF NOT EXISTS ai_jobs (id TEXT PRIMARY KEY, memory_id TEXT NOT NULL, kind TEXT NOT NULL, status TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);")?;
        self.connection()?.execute_batch("CREATE TABLE IF NOT EXISTS embeddings (memory_id TEXT PRIMARY KEY, payload BLOB NOT NULL, updated_at TEXT NOT NULL);")?;
        self.connection()?.execute_batch("CREATE TABLE IF NOT EXISTS time_echo_reports (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, payload BLOB NOT NULL); CREATE INDEX IF NOT EXISTS idx_time_echo_created ON time_echo_reports(created_at DESC);")?;
        Ok(())
    }

    pub fn is_initialized(&self) -> bool {
        self.salt_path.exists()
    }
    pub fn is_unlocked(&self) -> bool {
        self.key.read().map(|k| k.is_some()).unwrap_or(false)
    }

    pub fn initialize(&self, pin: &str) -> Result<()> {
        if self.is_initialized() {
            return Err(anyhow!("记忆库已经初始化"));
        }
        if pin.len() < 4 || pin.len() > 8 || !pin.chars().all(|c| c.is_ascii_digit()) {
            return Err(anyhow!("PIN 需为 4–8 位数字"));
        }
        let salt = random_salt();
        let key = derive_key(pin, &salt)?;
        let check = encrypt(&key, CHECK_VALUE)?;
        fs::write(&self.salt_path, salt)?;
        self.connection()?.execute(
            "INSERT OR REPLACE INTO metadata(key,value) VALUES('vault_check',?1)",
            params![check],
        )?;
        *self.key.write().map_err(|_| anyhow!("记忆库状态异常"))? = Some(SecretKey(key));
        Ok(())
    }

    pub fn unlock(&self, pin: &str) -> Result<()> {
        let salt = fs::read(&self.salt_path).context("尚未创建记忆库")?;
        let key = derive_key(pin, &salt)?;
        let check: Vec<u8> = self.connection()?.query_row(
            "SELECT value FROM metadata WHERE key='vault_check'",
            [],
            |row| row.get(0),
        )?;
        if decrypt(&key, &check)? != CHECK_VALUE {
            return Err(anyhow!("PIN 不正确"));
        }
        *self.key.write().map_err(|_| anyhow!("记忆库状态异常"))? = Some(SecretKey(key));
        Ok(())
    }
    pub fn lock(&self) {
        if let Ok(mut key) = self.key.write() {
            *key = None;
        }
    }

    fn with_key<T>(&self, action: impl FnOnce(&[u8; 32]) -> Result<T>) -> Result<T> {
        let guard = self.key.read().map_err(|_| anyhow!("记忆库状态异常"))?;
        let key = guard.as_ref().ok_or_else(|| anyhow!("记忆库已锁定"))?;
        action(&key.0)
    }

    pub fn save(&self, memory: &Memory) -> Result<()> {
        let mut memory = memory.clone();
        memory.normalize_metadata();
        self.with_key(|key| {
        let payload = encrypt(key, &serde_json::to_vec(&memory)?)?;
        self.connection()?.execute("INSERT INTO memories(id,occurred_at,created_at,updated_at,status,payload) VALUES(?1,?2,?3,?4,?5,?6) ON CONFLICT(id) DO UPDATE SET occurred_at=excluded.occurred_at,updated_at=excluded.updated_at,status=excluded.status,payload=excluded.payload", params![memory.id,memory.occurred_at,memory.created_at,memory.updated_at,memory.status,payload])?; Ok(())
    })
    }

    pub fn get(&self, id: &str) -> Result<Option<Memory>> {
        let mut memory = self.with_key(|key| {
            let payload: Option<Vec<u8>> = self
                .connection()?
                .query_row("SELECT payload FROM memories WHERE id=?1", [id], |r| {
                    r.get(0)
                })
                .optional()?;
            payload
                .map(|p| Ok(serde_json::from_slice::<Memory>(&decrypt(key, &p)?)?))
                .transpose()
        })?;
        if let Some(item) = memory.as_mut() {
            if item.normalize_metadata() {
                self.save(item)?;
            }
        }
        Ok(memory)
    }

    pub fn list(&self, status: &str) -> Result<Vec<Memory>> {
        let mut memories = self.with_key(|key| {
            let conn = self.connection()?;
            let mut stmt = conn.prepare(
                "SELECT payload FROM memories WHERE status=?1 ORDER BY occurred_at DESC",
            )?;
            let blobs = stmt
                .query_map([status], |r| r.get::<_, Vec<u8>>(0))?
                .collect::<rusqlite::Result<Vec<_>>>()?;
            blobs
                .into_iter()
                .map(|p| Ok(serde_json::from_slice::<Memory>(&decrypt(key, &p)?)?))
                .collect::<Result<Vec<Memory>>>()
        })?;
        for memory in &mut memories {
            if memory.normalize_metadata() {
                self.save(memory)?;
            }
        }
        Ok(memories)
    }

    pub fn save_time_echo(&self, report: &TimeEchoReport) -> Result<()> {
        self.with_key(|key| {
            let payload = encrypt(key, &serde_json::to_vec(report)?)?;
            self.connection()?.execute(
                "INSERT INTO time_echo_reports(id,created_at,updated_at,payload) VALUES(?1,?2,?3,?4) ON CONFLICT(id) DO UPDATE SET updated_at=excluded.updated_at,payload=excluded.payload",
                params![report.id, report.created_at, report.updated_at, payload],
            )?;
            Ok(())
        })
    }

    pub fn get_time_echo(&self, id: &str) -> Result<Option<TimeEchoReport>> {
        self.with_key(|key| {
            let payload: Option<Vec<u8>> = self
                .connection()?
                .query_row(
                    "SELECT payload FROM time_echo_reports WHERE id=?1",
                    [id],
                    |row| row.get(0),
                )
                .optional()?;
            payload
                .map(|value| Ok(serde_json::from_slice(&decrypt(key, &value)?)?))
                .transpose()
        })
    }

    pub fn list_time_echoes(&self) -> Result<Vec<TimeEchoReport>> {
        self.with_key(|key| {
            let conn = self.connection()?;
            let mut statement =
                conn.prepare("SELECT payload FROM time_echo_reports ORDER BY created_at DESC")?;
            let payloads = statement
                .query_map([], |row| row.get::<_, Vec<u8>>(0))?
                .collect::<rusqlite::Result<Vec<_>>>()?;
            payloads
                .into_iter()
                .map(|payload| Ok(serde_json::from_slice(&decrypt(key, &payload)?)?))
                .collect()
        })
    }

    pub fn delete_time_echo(&self, id: &str) -> Result<()> {
        self.with_key(|_| {
            self.connection()?
                .execute("DELETE FROM time_echo_reports WHERE id=?1", [id])?;
            Ok(())
        })
    }

    pub fn delete_memory_permanently(&self, id: &str) -> Result<()> {
        let memory = self.get(id)?.ok_or_else(|| anyhow!("记忆不存在"))?;
        if memory.status != "trashed" {
            return Err(anyhow!("只有回收站中的记忆可被彻底删除"));
        }
        for attachment in &memory.attachments {
            if let Some(path) = attachment.encrypted_path.as_deref() {
                self.delete_attachment(path)?;
            }
        }
        let mut connection = self.connection()?;
        let transaction = connection.transaction()?;
        transaction.execute("DELETE FROM embeddings WHERE memory_id=?1", [id])?;
        transaction.execute(
            "DELETE FROM memories WHERE id=?1 AND status='trashed'",
            [id],
        )?;
        transaction.commit()?;
        Ok(())
    }

    pub fn save_ai_config(&self, config: &AiProviderConfig) -> Result<()> {
        self.connection()?.execute(
            "INSERT OR REPLACE INTO metadata(key,value) VALUES('ai_config',?1)",
            params![serde_json::to_vec(config)?],
        )?;
        Ok(())
    }
    pub fn load_ai_config(&self) -> Result<Option<AiProviderConfig>> {
        let data: Option<Vec<u8>> = self
            .connection()?
            .query_row(
                "SELECT value FROM metadata WHERE key='ai_config'",
                [],
                |r| r.get(0),
            )
            .optional()?;
        data.map(|v| Ok(serde_json::from_slice(&v)?)).transpose()
    }

    fn load_embedding(&self, memory_id: &str) -> Result<Option<Vec<f32>>> {
        self.with_key(|key| {
            let payload: Option<Vec<u8>> = self
                .connection()?
                .query_row(
                    "SELECT payload FROM embeddings WHERE memory_id=?1",
                    [memory_id],
                    |r| r.get(0),
                )
                .optional()?;
            payload
                .map(|v| Ok(serde_json::from_slice(&decrypt(key, &v)?)?))
                .transpose()
        })
    }

    pub fn search(
        &self,
        request: &SearchRequest,
        query_embedding: Option<&[f32]>,
    ) -> Result<Vec<SearchResult>> {
        let query = request.query.to_lowercase();
        let mut rank = 0usize;
        let mut results: Vec<SearchResult> =
            self.list("active")?
                .into_iter()
                .filter(|m| {
                    request
                        .emotion
                        .as_ref()
                        .is_none_or(|v| m.emotions.iter().any(|emotion| emotion == v))
                        && request
                            .tag
                            .as_ref()
                            .is_none_or(|v| m.tags.iter().any(|t| &t.label == v))
                        && request
                            .media_kind
                            .as_ref()
                            .is_none_or(|v| m.attachments.iter().any(|a| &a.kind == v))
                        && request.from.as_ref().is_none_or(|v| &m.occurred_at >= v)
                        && request.to.as_ref().is_none_or(|v| {
                            m.occurred_at.get(..10).is_some_and(|d| d <= v.as_str())
                        })
                })
                .filter_map(|memory| {
                    let haystack = format!(
                        "{} {} {} {} {}",
                        memory.title,
                        memory.content,
                        memory.summary,
                        memory.emotions.join(" "),
                        memory
                            .tags
                            .iter()
                            .map(|t| t.label.as_str())
                            .collect::<Vec<_>>()
                            .join(" ")
                    )
                    .to_lowercase();
                    let lexical = lexical_score(&query, &haystack);
                    let semantic = query_embedding
                        .and_then(|q| {
                            self.load_embedding(&memory.id)
                                .ok()
                                .flatten()
                                .map(|e| cosine(q, &e))
                        })
                        .unwrap_or(0.0);
                    if !query.is_empty() && lexical == 0.0 && semantic < 0.38 {
                        return None;
                    }
                    let score = if query.is_empty() {
                        0.72 - rank as f32 * 0.02
                    } else {
                        (lexical * 0.42 + semantic * 0.58).max(lexical)
                    };
                    rank += 1;
                    Some(SearchResult {
                        memory,
                        score,
                        reason: if semantic > lexical {
                            "语义与记忆中的情境和感受相近".into()
                        } else {
                            "人物、主题或文字线索与询问相符".into()
                        },
                    })
                })
                .collect();
        results.sort_by(|a, b| b.score.total_cmp(&a.score));
        Ok(results)
    }

    pub fn export_backup(&self, password: &str, target: &Path) -> Result<()> {
        self.with_key(|_| {
            self.connection()?.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")?;
            let mut cursor=Cursor::new(Vec::new());
            {
                let mut zip=zip::ZipWriter::new(&mut cursor);
                let options=zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
                zip.start_file("manifest.json",options)?;
                zip.write_all(br#"{"format":"pensieve-archive","version":3,"includes":["memories","attachments","timeEchoReports","vaultSalt"]}"#)?;
                zip.start_file("pensieve.db",options)?;
                zip.write_all(&fs::read(&self.db_path)?)?;
                // The encrypted database and its PIN derivation salt must
                // travel together for cross-device restoration.
                zip.start_file("vault.salt",options)?;
                zip.write_all(&fs::read(&self.salt_path)?)?;
                for entry in fs::read_dir(&self.attachments_path)? {
                    let entry=entry?;
                    if entry.file_type()?.is_file(){
                        zip.start_file(format!("attachments/{}",entry.file_name().to_string_lossy()),options)?;
                        zip.write_all(&fs::read(entry.path())?)?;
                    }
                }
                zip.finish()?;
            }
            let salt = random_salt(); let key = derive_key(password, &salt)?; let encrypted = encrypt(&key, &cursor.into_inner())?;
            let envelope = serde_json::json!({"format":"pensieve-backup","version":1,"salt":STANDARD.encode(salt),"payload":STANDARD.encode(encrypted)});
            fs::write(target, serde_json::to_vec(&envelope)?)?; Ok(())
        })
    }

    pub fn restore_backup(&self, password: &str, source: &Path) -> Result<()> {
        let raw = fs::read(source)?;
        let envelope: serde_json::Value = serde_json::from_slice(&raw)?;
        if envelope.get("format").and_then(|v| v.as_str()) != Some("pensieve-backup") {
            return Err(anyhow!("备份格式不正确"));
        }
        let salt = STANDARD.decode(
            envelope
                .get("salt")
                .and_then(|v| v.as_str())
                .ok_or_else(|| anyhow!("备份盐值缺失"))?,
        )?;
        let payload = STANDARD.decode(
            envelope
                .get("payload")
                .and_then(|v| v.as_str())
                .ok_or_else(|| anyhow!("备份内容缺失"))?,
        )?;
        let key = derive_key(password, &salt)?;
        let decrypted = decrypt(&key, &payload)?;
        let mut archive = zip::ZipArchive::new(Cursor::new(decrypted))?;
        let mut db = None;
        let mut vault_salt = None;
        let mut attachments = Vec::new();
        for i in 0..archive.len() {
            let mut file = archive.by_index(i)?;
            let name = file.name().to_string();
            let mut data = Vec::new();
            file.read_to_end(&mut data)?;
            if name == "pensieve.db" {
                db = Some(data)
            } else if name == "vault.salt" {
                vault_salt = Some(data)
            } else if let Some(file_name) = name
                .strip_prefix("attachments/")
                .filter(|n| !n.contains('/') && !n.contains('\\'))
            {
                attachments.push((file_name.to_string(), data));
            }
        }
        let db = db.ok_or_else(|| anyhow!("备份中缺少记忆库"))?;
        if vault_salt.as_ref().is_some_and(|salt| salt.len() != 16) {
            return Err(anyhow!("备份中的记忆库盐值已损坏"));
        }
        let validation = self.db_path.with_extension("restore-check");
        fs::write(&validation, &db)?;
        let validation_connection = Connection::open(&validation);
        let valid = validation_connection
            .as_ref()
            .ok()
            .and_then(|connection| {
                connection
                    .query_row("SELECT count(*) FROM memories", [], |row| {
                        row.get::<_, i64>(0)
                    })
                    .ok()
            })
            .is_some();
        if !valid {
            drop(validation_connection);
            let _ = fs::remove_file(&validation);
            return Err(anyhow!("备份中的记忆库已损坏"));
        }

        // v1/v2 archives did not include vault.salt. They are still accepted
        // on the same vault when the active key validates their check value.
        // A cross-device import is stopped before replacing any local data.
        if vault_salt.is_none() {
            let check = validation_connection.as_ref().ok().and_then(|connection| {
                connection
                    .query_row(
                        "SELECT value FROM metadata WHERE key='vault_check'",
                        [],
                        |row| row.get::<_, Vec<u8>>(0),
                    )
                    .ok()
            });
            let matches_current_vault = check
                .as_deref()
                .map(|check| {
                    self.with_key(|key| Ok(decrypt(key, check)? == CHECK_VALUE))
                        .unwrap_or(false)
                })
                .unwrap_or(false);
            if !matches_current_vault {
                drop(validation_connection);
                let _ = fs::remove_file(&validation);
                return Err(anyhow!(
                    "这份旧备份缺少跨设备解锁信息。请在原电脑升级 Pensieve 后重新导出"
                ));
            }
        }
        drop(validation_connection);
        let _ = fs::remove_file(&validation);
        fs::write(&self.db_path, db)?;
        if let Some(vault_salt) = vault_salt {
            fs::write(&self.salt_path, vault_salt)?;
        }
        for suffix in ["-wal", "-shm"] {
            let _ = fs::remove_file(format!("{}{}", self.db_path.display(), suffix));
        }
        for entry in fs::read_dir(&self.attachments_path)? {
            let entry = entry?;
            if entry.file_type()?.is_file() {
                fs::remove_file(entry.path())?;
            }
        }
        for (name, data) in attachments {
            fs::write(self.attachments_path.join(name), data)?;
        }
        // A v0.2 backup has no report table. Migrate the restored database in
        // place so old archives open with an empty Time Echoes library.
        self.migrate()?;
        self.lock();
        Ok(())
    }

    pub fn import_attachment(&self, source: &Path, memory_id: &str) -> Result<Attachment> {
        self.with_key(|key| {
            let bytes = fs::read(source).context("读取附件失败")?;
            let encrypted = encrypt(key, &bytes)?;
            let id = uuid::Uuid::new_v4().to_string();
            let target = self.attachments_path.join(format!("{}.pva", id));
            fs::write(&target, encrypted)?;
            let mime = mime_guess::from_path(source)
                .first_or_octet_stream()
                .to_string();
            let kind = if mime.starts_with("image/") {
                "image"
            } else if mime.starts_with("audio/") {
                "audio"
            } else {
                "video"
            };
            Ok(Attachment {
                id,
                name: source
                    .file_name()
                    .and_then(|v| v.to_str())
                    .unwrap_or("附件")
                    .to_string(),
                kind: kind.into(),
                mime_type: mime,
                size: bytes.len() as u64,
                encrypted_path: Some(format!(
                    "{}/{}",
                    memory_id,
                    target.file_name().unwrap().to_string_lossy()
                )),
                duration: None,
                transcript: None,
                status: "ready".into(),
            })
        })
    }

    pub fn import_attachment_bytes(
        &self,
        name: &str,
        mime: &str,
        data: &[u8],
        memory_id: &str,
    ) -> Result<Attachment> {
        self.with_key(|key| {
            let id = uuid::Uuid::new_v4().to_string();
            let target = self.attachments_path.join(format!("{}.pva", id));
            fs::write(&target, encrypt(key, data)?)?;
            let kind = if mime.starts_with("image/") {
                "image"
            } else if mime.starts_with("audio/") {
                "audio"
            } else {
                "video"
            };
            Ok(Attachment {
                id,
                name: name.into(),
                kind: kind.into(),
                mime_type: mime.into(),
                size: data.len() as u64,
                encrypted_path: Some(format!(
                    "{}/{}",
                    memory_id,
                    target.file_name().unwrap().to_string_lossy()
                )),
                duration: None,
                transcript: None,
                status: "ready".into(),
            })
        })
    }
    pub fn read_attachment(&self, encrypted_path: &str) -> Result<Vec<u8>> {
        self.with_key(|key| {
            let file = Path::new(encrypted_path)
                .file_name()
                .ok_or_else(|| anyhow!("附件路径不正确"))?;
            let payload = fs::read(self.attachments_path.join(file))?;
            Ok(decrypt(key, &payload)?)
        })
    }

    pub fn delete_attachment(&self, encrypted_path: &str) -> Result<()> {
        self.with_key(|_| {
            let file = Path::new(encrypted_path)
                .file_name()
                .ok_or_else(|| anyhow!("附件路径不正确"))?;
            let target = self.attachments_path.join(file);
            if target.exists() {
                fs::remove_file(target).context("删除附件失败")?;
            }
            Ok(())
        })
    }

    pub fn restore_failed_extractions(&self) -> Result<usize> {
        let failed = self
            .list("trashed")?
            .into_iter()
            .filter(|memory| memory.ai_status == "failed")
            .collect::<Vec<_>>();
        let count = failed.len();
        for mut memory in failed {
            memory.status = "active".into();
            self.save(&memory)?;
        }
        Ok(count)
    }
}

fn cosine(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() || a.is_empty() {
        return 0.0;
    }
    let dot: f32 = a.iter().zip(b).map(|(x, y)| x * y).sum();
    let na: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let nb: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
    if na == 0.0 || nb == 0.0 {
        0.0
    } else {
        dot / (na * nb)
    }
}

/// 中文通常不以空格分词。除整句和空格词元外，再用相邻双字片段做一次
/// 本地召回，让“朋友见面”能够命中“今天要和 xxx 见面啦”这类记忆。
fn lexical_score(query: &str, haystack: &str) -> f32 {
    if query.is_empty() {
        return 0.65;
    }
    if haystack.contains(query) {
        return 0.95;
    }
    if query
        .split_whitespace()
        .any(|token| haystack.contains(token))
    {
        return 0.78;
    }

    let chars: Vec<char> = query.chars().filter(|c| !c.is_whitespace()).collect();
    if chars.len() < 2 {
        return 0.0;
    }
    let fragments: Vec<String> = chars
        .windows(2)
        .map(|pair| pair.iter().collect::<String>())
        .collect();
    let matched = fragments
        .iter()
        .filter(|fragment| haystack.contains(fragment.as_str()))
        .count();
    if matched == 0 {
        0.0
    } else {
        (0.56 + 0.28 * matched as f32 / fragments.len() as f32).min(0.84)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;
    #[test]
    fn encrypted_vault_round_trip() {
        let root = std::env::temp_dir().join(format!("pensieve-test-{}", Uuid::new_v4()));
        let vault = Vault::new(&root).unwrap();
        vault.initialize("2468").unwrap();
        let m = Memory {
            id: "m1".into(),
            title: "湖边".into(),
            content: "珍贵的一天".into(),
            summary: "摘要".into(),
            occurred_at: "2026-08-21T00:00:00Z".into(),
            created_at: "2026-08-21T00:00:00Z".into(),
            updated_at: "2026-08-21T00:00:00Z".into(),
            emotion: "宁静".into(),
            emotions: vec!["宁静".into()],
            emotion_color: "#fff".into(),
            status: "active".into(),
            tags: vec![],
            attachments: vec![],
            ai_status: "idle".into(),
            favorite: false,
        };
        vault.save(&m).unwrap();
        vault.lock();
        assert!(vault.list("active").is_err());
        vault.unlock("2468").unwrap();
        assert_eq!(vault.get("m1").unwrap().unwrap().content, "珍贵的一天");
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn encrypted_time_echo_round_trip_and_delete() {
        use crate::domain::{TimeEchoSection, TimeEchoStats};
        let root = std::env::temp_dir().join(format!("pensieve-echo-test-{}", Uuid::new_v4()));
        let vault = Vault::new(&root).unwrap();
        vault.initialize("2468").unwrap();
        let now = "2026-08-23T00:00:00Z".to_string();
        let report = TimeEchoReport {
            id: "echo-1".into(),
            title: "八月回响".into(),
            period_start: "2026-08-01".into(),
            period_end: "2026-08-23".into(),
            created_at: now.clone(),
            updated_at: now,
            language: "zh".into(),
            memory_count: 1,
            source_memory_ids: vec!["m1".into()],
            favorite: false,
            stats: TimeEchoStats::default(),
            overview: "一段安静的时光".into(),
            emotional_journey: TimeEchoSection::default(),
            people_and_relationships: TimeEchoSection::default(),
            places_and_scenes: TimeEchoSection::default(),
            themes_and_events: TimeEchoSection::default(),
            patterns_and_insights: TimeEchoSection::default(),
            treasured_moments: vec![],
            closing_reflection: "继续向前".into(),
        };
        vault.save_time_echo(&report).unwrap();
        vault.lock();
        assert!(vault.list_time_echoes().is_err());
        vault.unlock("2468").unwrap();
        assert_eq!(
            vault.get_time_echo("echo-1").unwrap().unwrap().overview,
            "一段安静的时光"
        );
        vault.delete_time_echo("echo-1").unwrap();
        assert!(vault.get_time_echo("echo-1").unwrap().is_none());
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn attachment_is_copied_encrypted_and_packaged_in_backup() {
        let root =
            std::env::temp_dir().join(format!("pensieve-attachment-test-{}", Uuid::new_v4()));
        let vault = Vault::new(&root).unwrap();
        vault.initialize("2468").unwrap();
        let source = root.join("source.png");
        let original = b"a private attachment copy";
        fs::write(&source, original).unwrap();
        let attachment = vault.import_attachment(&source, "m1").unwrap();
        fs::remove_file(&source).unwrap();
        assert_eq!(
            vault
                .read_attachment(attachment.encrypted_path.as_deref().unwrap())
                .unwrap(),
            original
        );
        let stored_name = Path::new(attachment.encrypted_path.as_deref().unwrap())
            .file_name()
            .unwrap();
        assert_ne!(
            fs::read(root.join("attachments").join(stored_name)).unwrap(),
            original
        );

        let backup = root.join("copy-test.pensieve");
        vault.export_backup("backup-password", &backup).unwrap();
        let envelope: serde_json::Value =
            serde_json::from_slice(&fs::read(&backup).unwrap()).unwrap();
        let salt = STANDARD.decode(envelope["salt"].as_str().unwrap()).unwrap();
        let payload = STANDARD
            .decode(envelope["payload"].as_str().unwrap())
            .unwrap();
        let key = derive_key("backup-password", &salt).unwrap();
        let archive_bytes = decrypt(&key, &payload).unwrap();
        let mut archive = zip::ZipArchive::new(Cursor::new(archive_bytes)).unwrap();
        let expected = format!("attachments/{}", stored_name.to_string_lossy());
        assert!(archive.by_name(&expected).is_ok());
        assert!(archive.by_name("vault.salt").is_ok());
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn backup_restores_across_devices_with_the_source_pin() {
        let source_root =
            std::env::temp_dir().join(format!("pensieve-source-test-{}", Uuid::new_v4()));
        let destination_root =
            std::env::temp_dir().join(format!("pensieve-destination-test-{}", Uuid::new_v4()));
        let backup = std::env::temp_dir().join(format!(
            "pensieve-transfer-test-{}.pensieve",
            Uuid::new_v4()
        ));

        let source = Vault::new(&source_root).unwrap();
        source.initialize("2468").unwrap();
        source
            .save(&Memory {
                id: "transferred-memory".into(),
                title: "跨设备回响".into(),
                content: "这段记忆应在另一台电脑上被原 PIN 唤醒".into(),
                summary: "".into(),
                occurred_at: "2026-08-30T00:00:00Z".into(),
                created_at: "2026-08-30T00:00:00Z".into(),
                updated_at: "2026-08-30T00:00:00Z".into(),
                emotion: "宁静".into(),
                emotions: vec!["宁静".into()],
                emotion_color: "#fff".into(),
                status: "active".into(),
                tags: vec![],
                attachments: vec![],
                ai_status: "idle".into(),
                favorite: false,
            })
            .unwrap();
        source.export_backup("backup-password", &backup).unwrap();

        let destination = Vault::new(&destination_root).unwrap();
        destination.initialize("1357").unwrap();
        destination
            .restore_backup("backup-password", &backup)
            .unwrap();
        assert!(destination.unlock("1357").is_err());
        destination.unlock("2468").unwrap();
        assert_eq!(
            destination
                .get("transferred-memory")
                .unwrap()
                .unwrap()
                .content,
            "这段记忆应在另一台电脑上被原 PIN 唤醒"
        );

        let _ = fs::remove_dir_all(source_root);
        let _ = fs::remove_dir_all(destination_root);
        let _ = fs::remove_file(backup);
    }

    #[test]
    fn chinese_compound_query_recalls_partial_phrase() {
        assert!(lexical_score("朋友见面", "今天要和xxx见面啦") > 0.0);
        assert_eq!(lexical_score("朋友聚餐", "今天要和xxx见面啦"), 0.0);
    }
}
