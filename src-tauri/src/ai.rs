use crate::domain::{AiProviderConfig, Memory};
use anyhow::{anyhow, Context, Result};
use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryAnalysis {
    pub title: String,
    pub summary: String,
    pub emotion: String,
    pub people: Vec<String>,
    pub places: Vec<String>,
    pub topics: Vec<String>,
    pub confidence: f32,
}

#[async_trait]
pub trait AiProvider: Send + Sync {
    async fn analyze_memory(
        &self,
        memory: &Memory,
        images: &[(String, String)],
    ) -> Result<MemoryAnalysis>;
    async fn embed(&self, text: &str) -> Result<Vec<f32>>;
    async fn transcribe(&self, name: &str, mime: &str, bytes: Vec<u8>) -> Result<String>;
}

pub struct OpenAiCompatibleProvider {
    client: Client,
    config: AiProviderConfig,
    api_key: String,
}
impl OpenAiCompatibleProvider {
    pub fn new(config: AiProviderConfig, api_key: String) -> Self {
        Self {
            client: Client::new(),
            config,
            api_key,
        }
    }
}

#[async_trait]
impl AiProvider for OpenAiCompatibleProvider {
    async fn analyze_memory(
        &self,
        memory: &Memory,
        images: &[(String, String)],
    ) -> Result<MemoryAnalysis> {
        let schema = json!({"name":"memory_analysis","strict":true,"schema":{"type":"object","additionalProperties":false,"required":["title","summary","emotion","people","places","topics","confidence"],"properties":{"title":{"type":"string"},"summary":{"type":"string"},"emotion":{"type":"string","enum":["欣喜","宁静","温暖","怀念","勇敢","难过"]},"people":{"type":"array","items":{"type":"string"}},"places":{"type":"array","items":{"type":"string"}},"topics":{"type":"array","items":{"type":"string"}},"confidence":{"type":"number"}}}});
        let mut content = vec![json!({"type":"text","text":memory.content})];
        for (mime, data) in images.iter().take(4) {
            content.push(json!({"type":"image_url","image_url":{"url":format!("data:{};base64,{}",mime,data),"detail":"low"}}));
        }
        let response = self.client.post(format!("{}/chat/completions",self.config.base_url.trim_end_matches('/'))).bearer_auth(&self.api_key).json(&json!({"model":self.config.chat_model,"messages":[{"role":"system","content":"你是私人记忆整理助手。温柔、简洁地提取文字与图片中的线索和可见文字，不得编造未出现的信息。emotion 只可从欣喜、宁静、温暖、怀念、勇敢、难过中选择。people 只放人物姓名或明确称谓，places 只放地点，topics 只放事件或主题；三个数组之间不得出现相同标签，也不要用人物名充当主题。"},{"role":"user","content":content}],"response_format":{"type":"json_schema","json_schema":schema}})).send().await?.error_for_status()?;
        let value: Value = response.json().await?;
        let content = value
            .pointer("/choices/0/message/content")
            .and_then(Value::as_str)
            .ok_or_else(|| anyhow!("AI 返回缺少内容"))?;
        serde_json::from_str(content).context("AI 返回结构与约定不符")
    }
    async fn embed(&self, text: &str) -> Result<Vec<f32>> {
        let value: Value = self
            .client
            .post(format!(
                "{}/embeddings",
                self.config.base_url.trim_end_matches('/')
            ))
            .bearer_auth(&self.api_key)
            .json(&json!({"model":self.config.embedding_model,"input":text}))
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;
        value
            .pointer("/data/0/embedding")
            .and_then(Value::as_array)
            .ok_or_else(|| anyhow!("向量接口返回结构异常"))?
            .iter()
            .map(|v| {
                v.as_f64()
                    .map(|x| x as f32)
                    .ok_or_else(|| anyhow!("向量数据异常"))
            })
            .collect()
    }
    async fn transcribe(&self, name: &str, mime: &str, bytes: Vec<u8>) -> Result<String> {
        let part = reqwest::multipart::Part::bytes(bytes)
            .file_name(name.to_string())
            .mime_str(mime)?;
        let form = reqwest::multipart::Form::new()
            .text("model", self.config.transcription_model.clone())
            .part("file", part);
        let value: Value = self
            .client
            .post(format!(
                "{}/audio/transcriptions",
                self.config.base_url.trim_end_matches('/')
            ))
            .bearer_auth(&self.api_key)
            .multipart(form)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;
        value
            .get("text")
            .and_then(Value::as_str)
            .map(str::to_owned)
            .ok_or_else(|| anyhow!("转写接口返回结构异常"))
    }
}

pub fn store_api_key(api_key: &str) -> Result<()> {
    keyring::Entry::new("Pensieve", "ai-provider")?.set_password(api_key)?;
    Ok(())
}
pub fn load_api_key() -> Result<String> {
    Ok(keyring::Entry::new("Pensieve", "ai-provider")?.get_password()?)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn strict_analysis_json_is_validated() {
        let raw = r#"{"title":"雨天","summary":"散步","emotion":"宁静","people":[],"places":[],"topics":["日常"],"confidence":0.9}"#;
        let parsed: MemoryAnalysis = serde_json::from_str(raw).unwrap();
        assert_eq!(parsed.emotion, "宁静");
    }
}
