use crate::domain::{AiProviderConfig, Memory, TimeEchoReference, TimeEchoSection};
use anyhow::{anyhow, Context, Result};
use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

fn memory_analysis_schema() -> Value {
    // OpenAI-compatible relays commonly implement the Structured Outputs
    // subset rather than every JSON Schema keyword. Duplicate emotions are
    // removed by Memory::normalize_metadata after parsing.
    json!({"name":"memory_analysis","strict":true,"schema":{"type":"object","additionalProperties":false,"required":["title","occurredAt","primaryEmotion","secondaryEmotions","people","places","topics","confidence"],"properties":{"title":{"type":"string"},"occurredAt":{"type":["string","null"],"description":"仅在原文明确表达时间时返回 RFC3339 时间，否则为 null"},"primaryEmotion":{"type":"string","enum":["欣喜","宁静","温暖","怀念","勇敢","难过"]},"secondaryEmotions":{"type":"array","maxItems":3,"items":{"type":"string","enum":["欣喜","宁静","温暖","怀念","勇敢","难过"]}},"people":{"type":"array","items":{"type":"string"}},"places":{"type":"array","items":{"type":"string"}},"topics":{"type":"array","items":{"type":"string"}},"confidence":{"type":"number"}}}})
}

fn time_echo_schema() -> Value {
    let section = json!({"type":"object","additionalProperties":false,"required":["heading","narrative","highlights","memoryIds"],"properties":{
        "heading":{"type":"string"},"narrative":{"type":"string"},"highlights":{"type":"array","items":{"type":"string"}},"memoryIds":{"type":"array","items":{"type":"string"}}
    }});
    let reference = json!({"type":"object","additionalProperties":false,"required":["title","reflection","memoryIds"],"properties":{
        "title":{"type":"string"},"reflection":{"type":"string"},"memoryIds":{"type":"array","items":{"type":"string"}}
    }});
    json!({"name":"time_echo_analysis","strict":true,"schema":{"type":"object","additionalProperties":false,
        "required":["title","overview","emotionalJourney","peopleAndRelationships","placesAndScenes","themesAndEvents","patternsAndInsights","treasuredMoments","closingReflection"],
        "properties":{
            "title":{"type":"string"},"overview":{"type":"string"},
            "emotionalJourney":section.clone(),"peopleAndRelationships":section.clone(),"placesAndScenes":section.clone(),
            "themesAndEvents":section.clone(),"patternsAndInsights":section,
            "treasuredMoments":{"type":"array","items":reference},"closingReflection":{"type":"string"}
        }
    }})
}

async fn checked_response(
    response: reqwest::Response,
    operation: &str,
) -> Result<reqwest::Response> {
    if response.status() == reqwest::StatusCode::TOO_MANY_REQUESTS {
        let retry_after = response
            .headers()
            .get(reqwest::header::RETRY_AFTER)
            .and_then(|value| value.to_str().ok())
            .map(|value| format!("，服务端建议等待 {value} 秒"))
            .unwrap_or_default();
        return Err(anyhow!(
            "AI {operation}请求达到服务商的频率或额度上限（429）{retry_after}。应用本次只发送一次分析请求。"
        ));
    }
    response.error_for_status().map_err(Into::into)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryAnalysis {
    pub title: String,
    pub occurred_at: Option<String>,
    pub primary_emotion: String,
    pub secondary_emotions: Vec<String>,
    pub people: Vec<String>,
    pub places: Vec<String>,
    pub topics: Vec<String>,
    pub confidence: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimeEchoAnalysis {
    pub title: String,
    pub overview: String,
    pub emotional_journey: TimeEchoSection,
    pub people_and_relationships: TimeEchoSection,
    pub places_and_scenes: TimeEchoSection,
    pub themes_and_events: TimeEchoSection,
    pub patterns_and_insights: TimeEchoSection,
    pub treasured_moments: Vec<TimeEchoReference>,
    pub closing_reflection: String,
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
    async fn summarize_time_echo(
        &self,
        input: &str,
        language: &str,
        is_intermediate: bool,
    ) -> Result<TimeEchoAnalysis>;
}

pub struct OpenAiCompatibleProvider {
    client: Client,
    config: AiProviderConfig,
    api_key: String,
}
impl OpenAiCompatibleProvider {
    pub fn new(config: AiProviderConfig, api_key: String) -> Self {
        Self {
            client: Client::builder()
                .timeout(std::time::Duration::from_secs(90))
                .build()
                .unwrap_or_else(|_| Client::new()),
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
        let schema = memory_analysis_schema();
        let mut content = vec![json!({"type":"text","text":memory.content})];
        for (mime, data) in images.iter().take(4) {
            content.push(json!({"type":"image_url","image_url":{"url":format!("data:{};base64,{}",mime,data),"detail":"low"}}));
        }
        let response = self.client.post(format!("{}/chat/completions",self.config.base_url.trim_end_matches('/'))).bearer_auth(&self.api_key).json(&json!({"model":self.config.chat_model,"messages":[{"role":"system","content":"你是私人记忆元数据整理助手。只提取标题、时间、情绪与人物/地点/主题标签，不要总结、改写或生成正文，也不得编造未出现的信息。必须从欣喜、宁静、温暖、怀念、勇敢、难过中判断一个最主导的 primaryEmotion；只有记忆确实同时包含其他感受时，才将最多三个不同于主标签的情绪放入 secondaryEmotions，不要为了凑数添加副标签。people 只放人物姓名或明确称谓，places 只放地点，topics 只放事件或主题；三个数组之间不得出现相同标签，也不要用人物名充当主题。仅当原文明确提到记忆发生时间时，将 occurredAt 规范为带时区的 RFC3339；否则返回 null。"},{"role":"user","content":content}],"response_format":{"type":"json_schema","json_schema":schema}})).send().await?;
        let response = checked_response(response, "记忆分析").await?;
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

    async fn summarize_time_echo(
        &self,
        input: &str,
        language: &str,
        is_intermediate: bool,
    ) -> Result<TimeEchoAnalysis> {
        let language_name = if language == "en" {
            "English"
        } else {
            "简体中文"
        };
        let stage = if is_intermediate {
            "这是分批材料。忠实提炼其中的信号，为后续总汇保留全部 memory id。"
        } else {
            "这是最终材料。生成一份完整、克制、温柔而有洞察的时光回响报告。"
        };
        let body = json!({
            "model": self.config.chat_model,
            "messages": [
                {"role":"system","content":format!("你是 Pensieve 的私人时光分析助手。{stage} 只依据材料分析，不编造事实或统计数字；memoryIds 只能使用材料中方括号标明的 ID。人物、地点、主题、情绪轨迹、珍贵片段与变化洞察应彼此区分。输出语言必须是 {language_name}。")},
                {"role":"user","content":input}
            ],
            "response_format":{"type":"json_schema","json_schema":time_echo_schema()}
        });
        let url = format!(
            "{}/chat/completions",
            self.config.base_url.trim_end_matches('/')
        );
        let mut attempt = 0u32;
        loop {
            let result = self
                .client
                .post(&url)
                .bearer_auth(&self.api_key)
                .json(&body)
                .send()
                .await;
            match result {
                Ok(response) => {
                    let status = response.status();
                    if status.is_success() {
                        let value: Value = response.json().await?;
                        let content = value
                            .pointer("/choices/0/message/content")
                            .and_then(Value::as_str)
                            .ok_or_else(|| anyhow!("AI 返回缺少内容"))?;
                        return serde_json::from_str(content)
                            .context("AI 返回的时光回响结构与约定不符");
                    }
                    if (status == reqwest::StatusCode::TOO_MANY_REQUESTS
                        || status.is_server_error())
                        && attempt < 3
                    {
                        let retry_after = response
                            .headers()
                            .get(reqwest::header::RETRY_AFTER)
                            .and_then(|value| value.to_str().ok())
                            .and_then(|value| value.parse::<u64>().ok());
                        let seconds = retry_after.unwrap_or(2u64.pow(attempt + 1)).min(60);
                        attempt += 1;
                        tokio::time::sleep(std::time::Duration::from_secs(seconds)).await;
                        continue;
                    }
                    return Err(anyhow!("AI 时光回响请求失败（HTTP {status}）"));
                }
                Err(error) if (error.is_timeout() || error.is_connect()) && attempt < 3 => {
                    let seconds = 2u64.pow(attempt + 1);
                    attempt += 1;
                    tokio::time::sleep(std::time::Duration::from_secs(seconds)).await;
                }
                Err(error) => return Err(error.into()),
            }
        }
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
        let raw = r#"{"title":"雨天","occurredAt":null,"primaryEmotion":"宁静","secondaryEmotions":["怀念"],"people":[],"places":[],"topics":["日常"],"confidence":0.9}"#;
        let parsed: MemoryAnalysis = serde_json::from_str(raw).unwrap();
        assert_eq!(parsed.primary_emotion, "宁静");
        assert_eq!(parsed.secondary_emotions, vec!["怀念"]);
    }

    #[test]
    fn relay_compatible_schema_avoids_unsupported_unique_items() {
        let schema = memory_analysis_schema();
        let secondary = schema
            .pointer("/schema/properties/secondaryEmotions")
            .unwrap();
        assert!(secondary.get("uniqueItems").is_none());
        assert_eq!(secondary.get("maxItems").and_then(Value::as_u64), Some(3));
    }

    #[test]
    fn time_echo_schema_stays_relay_compatible() {
        let schema = time_echo_schema();
        assert!(!schema.to_string().contains("uniqueItems"));
        assert_eq!(
            schema.pointer("/schema/additionalProperties"),
            Some(&Value::Bool(false))
        );
    }
}
