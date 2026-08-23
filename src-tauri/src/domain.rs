use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashSet};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntityTag {
    pub id: String,
    pub label: String,
    pub kind: String,
    pub confidence: f32,
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Attachment {
    pub id: String,
    pub name: String,
    pub kind: String,
    pub mime_type: String,
    pub size: u64,
    pub encrypted_path: Option<String>,
    pub duration: Option<f64>,
    #[serde(default)]
    pub transcript: Option<String>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Memory {
    pub id: String,
    pub title: String,
    pub content: String,
    pub summary: String,
    pub occurred_at: String,
    pub created_at: String,
    pub updated_at: String,
    pub emotion: String,
    #[serde(default)]
    pub emotions: Vec<String>,
    pub emotion_color: String,
    pub status: String,
    pub tags: Vec<EntityTag>,
    pub attachments: Vec<Attachment>,
    pub ai_status: String,
    // Older encrypted memories predate the "most precious" marker. Keeping a
    // default here lets those records open normally after upgrading.
    #[serde(default)]
    pub favorite: bool,
}

pub fn normalize_emotion(value: &str) -> &'static str {
    match value.trim() {
        "欣喜" | "开心" | "快乐" | "高兴" | "喜悦" | "兴奋" | "幸福" => "欣喜",
        "温暖" | "温馨" | "感动" | "安心" | "亲密" | "治愈" => "温暖",
        "怀念" | "怀旧" | "想念" | "思念" | "留恋" => "怀念",
        "勇敢" | "坚定" | "自豪" | "振奋" | "有力量" => "勇敢",
        "难过" | "悲伤" | "失落" | "沮丧" | "遗憾" | "孤独" => "难过",
        "宁静" | "平静" | "安宁" | "放松" | "祥和" | "平和" => "宁静",
        _ => "宁静",
    }
}

pub fn emotion_color(value: &str) -> &'static str {
    match value {
        "欣喜" => "#f4ca72",
        "温暖" => "#ec9e7e",
        "怀念" => "#b7a1e5",
        "勇敢" => "#8cd4bd",
        "难过" => "#8193c9",
        _ => "#86c8d7",
    }
}

impl Memory {
    pub fn normalize_metadata(&mut self) -> bool {
        let before = serde_json::to_vec(self).unwrap_or_default();
        // `summary` is kept for backup compatibility, but it mirrors the
        // untouched source text. AI metadata must never replace the memory body.
        self.summary = self.content.clone();
        if self.emotions.is_empty() {
            self.emotions
                .push(normalize_emotion(&self.emotion).to_string());
        } else {
            let mut seen_emotions = HashSet::new();
            self.emotions = self
                .emotions
                .iter()
                .map(|value| normalize_emotion(value).to_string())
                .filter(|value| seen_emotions.insert(value.clone()))
                .take(4)
                .collect();
        }
        self.emotion = self
            .emotions
            .first()
            .cloned()
            .unwrap_or_else(|| "宁静".into());
        self.emotion_color = emotion_color(&self.emotion).to_string();

        // Prefer the most specific interpretation when an AI response placed
        // the same label in more than one category.
        self.tags.sort_by_key(|tag| match tag.kind.as_str() {
            "person" => 0,
            "place" => 1,
            "topic" => 2,
            _ => 3,
        });
        let mut seen = HashSet::new();
        self.tags.retain_mut(|tag| {
            tag.label = tag.label.trim().trim_start_matches('#').trim().to_string();
            if tag.label.is_empty() {
                return false;
            }
            let key = tag
                .label
                .chars()
                .filter(|c| !c.is_whitespace())
                .collect::<String>()
                .to_lowercase();
            seen.insert(key)
        });
        before != serde_json::to_vec(self).unwrap_or_default()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchRequest {
    pub query: String,
    pub emotion: Option<String>,
    pub tag: Option<String>,
    pub media_kind: Option<String>,
    pub from: Option<String>,
    pub to: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub memory: Memory,
    pub score: f32,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiProviderConfig {
    pub enabled: bool,
    pub base_url: String,
    pub chat_model: String,
    pub embedding_model: String,
    pub transcription_model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct TimeEchoSection {
    pub heading: String,
    pub narrative: String,
    #[serde(default)]
    pub highlights: Vec<String>,
    #[serde(default)]
    pub memory_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct TimeEchoReference {
    pub title: String,
    pub reflection: String,
    #[serde(default)]
    pub memory_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct TimeEchoStats {
    pub active_days: usize,
    pub attachment_count: usize,
    pub favorite_count: usize,
    #[serde(default)]
    pub emotion_counts: BTreeMap<String, usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimeEchoReport {
    pub id: String,
    pub title: String,
    pub period_start: String,
    pub period_end: String,
    pub created_at: String,
    pub updated_at: String,
    pub language: String,
    pub memory_count: usize,
    pub source_memory_ids: Vec<String>,
    pub favorite: bool,
    pub stats: TimeEchoStats,
    pub overview: String,
    pub emotional_journey: TimeEchoSection,
    pub people_and_relationships: TimeEchoSection,
    pub places_and_scenes: TimeEchoSection,
    pub themes_and_events: TimeEchoSection,
    pub patterns_and_insights: TimeEchoSection,
    pub treasured_moments: Vec<TimeEchoReference>,
    pub closing_reflection: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateTimeEchoRequest {
    pub from_date: String,
    pub to_date: String,
    pub language: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTimeEchoRequest {
    pub id: String,
    pub title: Option<String>,
    pub favorite: Option<bool>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TimeEchoProgress {
    pub stage: String,
    pub current: usize,
    pub total: usize,
    pub message: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn memory() -> Memory {
        Memory {
            id: "m1".into(),
            title: "夜晚".into(),
            content: "和小夏散步".into(),
            summary: "散步".into(),
            occurred_at: "2026-08-22T02:00:00Z".into(),
            created_at: "2026-08-22T02:00:00Z".into(),
            updated_at: "2026-08-22T02:00:00Z".into(),
            emotion: "温馨".into(),
            emotions: vec![],
            emotion_color: "#fff".into(),
            status: "active".into(),
            attachments: vec![],
            ai_status: "succeeded".into(),
            favorite: false,
            tags: vec![
                EntityTag {
                    id: "topic".into(),
                    label: "小夏".into(),
                    kind: "topic".into(),
                    confidence: 0.8,
                    source: "ai".into(),
                },
                EntityTag {
                    id: "person".into(),
                    label: " 小夏 ".into(),
                    kind: "person".into(),
                    confidence: 0.9,
                    source: "ai".into(),
                },
                EntityTag {
                    id: "blank".into(),
                    label: "  ".into(),
                    kind: "topic".into(),
                    confidence: 0.5,
                    source: "ai".into(),
                },
            ],
        }
    }

    #[test]
    fn standardizes_emotion_and_removes_cross_category_duplicates() {
        let mut value = memory();
        assert!(value.normalize_metadata());
        assert_eq!(value.emotion, "温暖");
        assert_eq!(value.emotions, vec!["温暖"]);
        assert_eq!(value.emotion_color, "#ec9e7e");
        assert_eq!(value.tags.len(), 1);
        assert_eq!(value.tags[0].kind, "person");
        assert_eq!(value.tags[0].label, "小夏");
        assert!(["欣喜", "宁静", "温暖", "怀念", "勇敢", "难过"].contains(&value.emotion.as_str()));
    }

    #[test]
    fn keeps_one_primary_emotion_and_distinct_secondary_emotions() {
        let mut value = memory();
        value.emotions = vec!["温馨".into(), "怀念".into(), "温暖".into(), "开心".into()];
        value.normalize_metadata();
        assert_eq!(value.emotion, "温暖");
        assert_eq!(value.emotions, vec!["温暖", "怀念", "欣喜"]);
    }
}
