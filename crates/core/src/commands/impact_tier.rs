//! Fast AST & diff impact tier classifier for Tribunal Kit Rust Core Engine.

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum ImpactTier {
    Tier0FastPass,
    Tier1Express,
    Tier2Targeted,
    Tier3Gauntlet,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImpactResult {
    pub tier: u8,
    pub score: f32,
    pub require_gate: bool,
    pub max_reviewers: usize,
    pub fast_pass: bool,
    pub reasoning: Vec<String>,
}

pub fn classify_impact(files: &[String], diff_lines: usize, task: &str) -> ImpactResult {
    let mut score: f32 = 0.2;
    let mut reasoning = Vec::new();

    let task_lower = task.to_lowercase();
    let is_critical = files.iter().any(|f| {
        let f_lower = f.to_lowercase();
        f_lower.contains("auth")
            || f_lower.contains("security")
            || f_lower.contains("payment")
            || f_lower.contains("schema")
            || f_lower.contains("migration")
    }) || task_lower.contains("auth")
        || task_lower.contains("security")
        || task_lower.contains("migration");

    if is_critical {
        score += 0.6;
        reasoning.push("Critical path detected (auth/security/schema)".to_string());
    }

    if diff_lines <= 10 {
        score -= 0.15;
        reasoning.push("Small diff size (<= 10 lines)".to_string());
    } else if diff_lines > 100 {
        score += 0.3;
        reasoning.push("Large diff size (> 100 lines)".to_string());
    }

    if task_lower.contains("typo") || task_lower.contains("css") || task_lower.contains("comment") {
        score -= 0.2;
        reasoning.push("Simple edit signal in task text".to_string());
    }

    let clamped_score = score.max(0.0).min(1.0);

    if clamped_score < 0.15 && !is_critical {
        ImpactResult {
            tier: 0,
            score: clamped_score,
            require_gate: false,
            max_reviewers: 0,
            fast_pass: true,
            reasoning,
        }
    } else if clamped_score < 0.35 && !is_critical {
        ImpactResult {
            tier: 1,
            score: clamped_score,
            require_gate: false,
            max_reviewers: 1,
            fast_pass: false,
            reasoning,
        }
    } else if clamped_score < 0.70 && !is_critical {
        ImpactResult {
            tier: 2,
            score: clamped_score,
            require_gate: true,
            max_reviewers: 2,
            fast_pass: false,
            reasoning,
        }
    } else {
        ImpactResult {
            tier: 3,
            score: clamped_score,
            require_gate: true,
            max_reviewers: 8,
            fast_pass: false,
            reasoning,
        }
    }
}
