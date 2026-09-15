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
    let skill_name = path.parent()
        .and_then(|p| p.file_name())
        .and_then(|n| n.to_str())
        .unwrap_or("unknown");

    let base_skill_content = if path.exists() {
        fs::read_to_string(path)
            .with_context(|| format!("Failed to read skill file: {}", skill_path))?
    } else {
        String::new()
    };

    let edits: Vec<PatchEdit> = serde_json::from_str(edits_json)
        .with_context(|| "Failed to parse edits JSON")?;

    let slow_start_marker = "<!-- SLOW_UPDATE_START -->";
    let slow_end_marker = "<!-- SLOW_UPDATE_END -->";

    let (slow_start, slow_end) = match (
        base_skill_content.find(slow_start_marker),
        base_skill_content.find(slow_end_marker),
    ) {
        (Some(start), Some(end)) if start < end => (Some(start), Some(end + slow_end_marker.len())),
        _ => (None, None),
    };

    let is_in_protected_region = |_content: &str, target_pos: usize| -> bool {
        if let (Some(start), Some(end)) = (slow_start, slow_end) {
            target_pos >= start && target_pos < end
        } else {
            false
        }
    };

    // Helper to apply a single edit
    let apply_edit = |base: &str, edit: &PatchEdit| -> Option<String> {
        let op = edit.op.as_str();
        let mut new_content = base.to_string();
        match op {
            "append" => {
                if let Some(content) = &edit.content {
                    if is_duplicate(content, base, 0.8) {
                        return None;
                    }
                    if !new_content.ends_with('\n') && !new_content.is_empty() {
                        new_content.push('\n');
                    }
                    new_content.push_str(content);
                    new_content.push('\n');
                    return Some(new_content);
                }
            }
            "delete" => {
                if let Some(target) = &edit.target {
                    if let Some(pos) = new_content.find(target) {
                        if is_in_protected_region(base, pos) { return None; }
                        return Some(new_content.replace(target, ""));
                    }
                }
            }
            "replace" => {
                if let (Some(target), Some(content)) = (&edit.target, &edit.content) {
                    if let Some(pos) = new_content.find(target) {
                        if is_in_protected_region(base, pos) { return None; }
                        return Some(new_content.replace(target, content));
                    }
                }
            }
            "insert_after" => {
                if let (Some(target), Some(content)) = (&edit.target, &edit.content) {
                    if let Some(pos) = new_content.find(target) {
                        if is_in_protected_region(base, pos) { return None; }
                        let insert_pos = pos + target.len();
                        let mut next_skill = String::new();
                        next_skill.push_str(&new_content[..insert_pos]);
                        if !content.starts_with('\n') { next_skill.push('\n'); }
                        next_skill.push_str(content);
                        if !content.ends_with('\n') { next_skill.push('\n'); }
                        next_skill.push_str(&new_content[insert_pos..]);
                        return Some(next_skill);
                    }
                }
            }
            _ => {}
        }
        None
    };

    // ── Genetic Tournament Selection ──
    // Evaluate all candidates
    let mut candidates: Vec<(f64, String, PatchEdit)> = Vec::new();
    for edit in edits {
        if let Some(mutated_content) = apply_edit(&base_skill_content, &edit) {
            let report = crate::commands::fitness_scorer::score_skill_content(skill_name, &mutated_content);
            candidates.push((report.composite_fitness, mutated_content, edit));
        }
    }

    // Sort by composite fitness descending
    candidates.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));

    let mut applied_count = 0;
    let mut reports = Vec::new();
    let mut final_content = base_skill_content.clone();

    // Greedily apply top N mutations (if budget allows, though usually they are conflicting so we just take the best one)
    // To support budget > 1 properly, we should re-evaluate, but for simplicity we'll just apply the absolute best candidate.
    // If budget > 1, we iteratively apply the best edit if it still cleanly applies.
    let mut current_fitness = crate::commands::fitness_scorer::score_skill_content(skill_name, &final_content).composite_fitness;

    for (candidate_fitness, _mutated, edit) in candidates.into_iter().take(budget as usize) {
        if candidate_fitness > current_fitness {
            // Re-apply to current final_content to ensure it still works
            if let Some(next_content) = apply_edit(&final_content, &edit) {
                let next_fitness = crate::commands::fitness_scorer::score_skill_content(skill_name, &next_content).composite_fitness;
                if next_fitness > current_fitness {
                    final_content = next_content;
                    current_fitness = next_fitness;
                    applied_count += 1;
                    reports.push(format!("applied: {} (fitness: {:.3})", edit.op, current_fitness));
                } else {
                    reports.push(format!("skip: {} (did not improve fitness after prior edits)", edit.op));
                }
            } else {
                reports.push(format!("skip: {} (failed to apply cleanly)", edit.op));
            }
        } else {
            reports.push(format!("skip: {} (fitness {:.3} <= current {:.3})", edit.op, candidate_fitness, current_fitness));
        }
    }

    if applied_count > 0 {
        fs::write(path, &final_content)
            .with_context(|| format!("Failed to write updated skill file to {}", skill_path))?;
    }

    let report_json = serde_json::json!({
        "applied_count": applied_count,
        "reports": reports,
        "final_fitness": current_fitness,
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
