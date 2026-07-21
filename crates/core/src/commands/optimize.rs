use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PatchEdit {
    pub op: String, // "append" | "insert_after" | "replace" | "delete"
    pub target: Option<String>,
    pub content: Option<String>,
    pub support_count: Option<u32>,
    pub source_type: Option<String>, // "failure" | "success"
}

// ── Levenshtein Distance ─────────────────────────────────────────────────────
fn levenshtein(a: &str, b: &str) -> usize {
    let a_chars: Vec<char> = a.chars().collect();
    let b_chars: Vec<char> = b.chars().collect();
    let m = a_chars.len();
    let n = b_chars.len();
    let mut dp = vec![vec![0; n + 1]; m + 1];

    for i in 0..=m {
        dp[i][0] = i;
    }
    for j in 0..=n {
        dp[0][j] = j;
    }

    for i in 1..=m {
        for j in 1..=n {
            if a_chars[i - 1] == b_chars[j - 1] {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + std::cmp::min(
                    dp[i - 1][j],
                    std::cmp::min(dp[i][j - 1], dp[i - 1][j - 1]),
                );
            }
        }
    }
    dp[m][n]
}

fn normalized_similarity(a: &str, b: &str) -> f64 {
    let a_len = a.chars().count();
    let b_len = b.chars().count();
    if a_len == 0 && b_len == 0 {
        return 1.0;
    }
    let max_len = std::cmp::max(a_len, b_len);
    1.0 - (levenshtein(a, b) as f64 / max_len as f64)
}

// Check if content matches any existing part of the file
fn is_duplicate(content: &str, file_text: &str, threshold: f64) -> bool {
    let content_stripped = content.trim();
    if content_stripped.is_empty() {
        return true;
    }
    
    // Exact check
    if file_text.contains(content_stripped) {
        return true;
    }

    // Paragraph/Line check
    for line in file_text.lines() {
        let line_stripped = line.trim();
        if !line_stripped.is_empty() && normalized_similarity(content_stripped, line_stripped) >= threshold {
            return true;
        }
    }

    false
}

pub fn optimize_skill_step(
    skill_path: &str,
    edits_json: &str,
    budget: u32,
) -> Result<String> {
    let path = Path::new(skill_path);
    let mut skill_content = if path.exists() {
        fs::read_to_string(path)
            .with_context(|| format!("Failed to read skill file: {}", skill_path))?
    } else {
        String::new()
    };

    let mut edits: Vec<PatchEdit> = serde_json::from_str(edits_json)
        .with_context(|| "Failed to parse edits JSON")?;

    // ── Rank Edits ──
    // 1. Failure-driven patches take priority
    // 2. High support count takes priority
    edits.sort_by(|a, b| {
        let a_is_fail = a.source_type.as_deref() == Some("failure");
        let b_is_fail = b.source_type.as_deref() == Some("failure");
        if a_is_fail != b_is_fail {
            return b_is_fail.cmp(&a_is_fail);
        }
        let a_support = a.support_count.unwrap_or(1);
        let b_support = b.support_count.unwrap_or(1);
        b_support.cmp(&a_support)
    });

    let active_edits = edits.into_iter().take(budget as usize);

    // ── Find Slow Update Protected Region ──
    let slow_start_marker = "<!-- SLOW_UPDATE_START -->";
    let slow_end_marker = "<!-- SLOW_UPDATE_END -->";

    let (slow_start, slow_end) = match (
        skill_content.find(slow_start_marker),
        skill_content.find(slow_end_marker),
    ) {
        (Some(start), Some(end)) if start < end => (Some(start), Some(end + slow_end_marker.len())),
        _ => (None, None),
    };

    let is_in_protected_region = |target_pos: usize| -> bool {
        if let (Some(start), Some(end)) = (slow_start, slow_end) {
            target_pos >= start && target_pos < end
        } else {
            false
        }
    };

    let mut applied_count = 0;
    let mut reports = Vec::new();

    for edit in active_edits {
        let op = edit.op.as_str();
        match op {
            "append" => {
                if let Some(content) = edit.content {
                    if is_duplicate(&content, &skill_content, 0.8) {
                        reports.push(format!("skip: append duplicate content"));
                        continue;
                    }
                    if !skill_content.ends_with('\n') && !skill_content.is_empty() {
                        skill_content.push('\n');
                    }
                    skill_content.push_str(&content);
                    skill_content.push('\n');
                    applied_count += 1;
                    reports.push(format!("applied: append content"));
                }
            }
            "delete" => {
                if let Some(target) = edit.target {
                    if let Some(pos) = skill_content.find(&target) {
                        if is_in_protected_region(pos) {
                            reports.push(format!("skip: delete target is inside protected region"));
                            continue;
                        }
                        skill_content = skill_content.replace(&target, "");
                        applied_count += 1;
                        reports.push(format!("applied: deleted target"));
                    } else {
                        reports.push(format!("skip: delete target not found"));
                    }
                }
            }
            "replace" => {
                if let (Some(target), Some(content)) = (edit.target, edit.content) {
                    if let Some(pos) = skill_content.find(&target) {
                        if is_in_protected_region(pos) {
                            reports.push(format!("skip: replace target is inside protected region"));
                            continue;
                        }
                        skill_content = skill_content.replace(&target, &content);
                        applied_count += 1;
                        reports.push(format!("applied: replaced target"));
                    } else {
                        reports.push(format!("skip: replace target not found"));
                    }
                }
            }
            "insert_after" => {
                if let (Some(target), Some(content)) = (edit.target, edit.content) {
                    if let Some(pos) = skill_content.find(&target) {
                        if is_in_protected_region(pos) {
                            reports.push(format!("skip: insert_after target is inside protected region"));
                            continue;
                        }
                        let insert_pos = pos + target.len();
                        let mut next_skill = String::new();
                        next_skill.push_str(&skill_content[..insert_pos]);
                        if !content.starts_with('\n') {
                            next_skill.push('\n');
                        }
                        next_skill.push_str(&content);
                        if !content.ends_with('\n') {
                            next_skill.push('\n');
                        }
                        next_skill.push_str(&skill_content[insert_pos..]);
                        skill_content = next_skill;
                        applied_count += 1;
                        reports.push(format!("applied: inserted content after target"));
                    } else {
                        reports.push(format!("skip: insert_after target not found"));
                    }
                }
            }
            _ => {
                reports.push(format!("skip: unknown operation {}", op));
            }
        }
    }

    if applied_count > 0 {
        fs::write(path, &skill_content)
            .with_context(|| format!("Failed to write updated skill file to {}", skill_path))?;
    }

    let report_json = serde_json::json!({
        "applied_count": applied_count,
        "reports": reports,
        "success": true
    });

    Ok(serde_json::to_string(&report_json)?)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_levenshtein_distance() {
        assert_eq!(levenshtein("kitten", "sitting"), 3);
        assert_eq!(levenshtein("flaw", "lawn"), 2);
    }

    #[test]
    fn test_normalized_similarity() {
        let sim = normalized_similarity("hello", "hello");
        assert!((sim - 1.0).abs() < 1e-6);

        let sim_diff = normalized_similarity("hello", "world");
        assert!(sim_diff < 0.5);
    }

    #[test]
    fn test_is_duplicate() {
        let text = "This is a custom procedural rule.";
        assert!(is_duplicate("procedural rule", text, 0.7));
        assert!(!is_duplicate("completely different text", text, 0.7));
    }
}
