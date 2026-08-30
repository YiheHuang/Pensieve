use anyhow::{anyhow, Context, Result};
use serde_json::Value;

pub fn parse_response_bytes(bytes: &[u8], operation: &str) -> Result<Value> {
    let bytes = bytes.strip_prefix(&[0xEF, 0xBB, 0xBF]).unwrap_or(bytes);
    serde_json::from_slice(bytes).with_context(|| {
        format!(
            "AI {operation}响应不是有效 JSON（响应长度 {} 字节）",
            bytes.len()
        )
    })
}

pub fn extract_structured_content(response: &Value, operation: &str) -> Result<Value> {
    let content = response
        .pointer("/choices/0/message/content")
        .or_else(|| response.pointer("/choices/0/text"))
        .or_else(|| response.pointer("/choices/0/message/tool_calls/0/function/arguments"))
        .ok_or_else(|| anyhow!("AI {operation}返回缺少内容"))?;

    match content {
        Value::Object(_) => Ok(content.clone()),
        Value::String(text) => parse_content_text(text, operation),
        Value::Array(parts) => {
            let text = parts
                .iter()
                .filter_map(|part| {
                    part.as_str()
                        .or_else(|| part.get("text").and_then(Value::as_str))
                        .or_else(|| part.get("content").and_then(Value::as_str))
                })
                .collect::<Vec<_>>()
                .join("");
            if text.trim().is_empty() {
                Err(anyhow!("AI {operation}返回的内容数组为空"))
            } else {
                parse_content_text(&text, operation)
            }
        }
        _ => Err(anyhow!("AI {operation}返回了不受支持的内容格式")),
    }
}

fn parse_content_text(text: &str, operation: &str) -> Result<Value> {
    let mut text = text.trim().trim_start_matches('\u{feff}').trim();
    if let Some(stripped) = text.strip_prefix("```json") {
        text = stripped;
    } else if let Some(stripped) = text.strip_prefix("```") {
        text = stripped;
    }
    if let Some(stripped) = text.strip_suffix("```") {
        text = stripped;
    }
    serde_json::from_str(text.trim())
        .with_context(|| format!("AI {operation}返回的结构化内容不是有效 JSON"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn accepts_utf8_bom_and_content_arrays() {
        let raw = b"\xEF\xBB\xBF{\"choices\":[{\"message\":{\"content\":[{\"type\":\"text\",\"text\":\"{\\\"title\\\":\\\"lake\\\"}\"}]}}]}";
        let response = parse_response_bytes(raw, "test").unwrap();
        assert_eq!(
            extract_structured_content(&response, "test").unwrap(),
            json!({"title":"lake"})
        );
    }

    #[test]
    fn accepts_fenced_and_object_content() {
        let fenced =
            json!({"choices":[{"message":{"content":"```json\n{\"title\":\"rain\"}\n```"}}]});
        assert_eq!(
            extract_structured_content(&fenced, "test").unwrap(),
            json!({"title":"rain"})
        );
        let object = json!({"choices":[{"message":{"content":{"title":"wind"}}}]});
        assert_eq!(
            extract_structured_content(&object, "test").unwrap(),
            json!({"title":"wind"})
        );
    }
}
