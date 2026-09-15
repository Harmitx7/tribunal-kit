//! Fast AST & diff impact tier classifier for Tribunal Kit Rust Core Engine.
//! Enhanced in v10 Drop 1 with domain detection and adaptive reviewer wave sizing.

use serde::{Deserialize, Serialize};

#[allow(dead_code)]
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
    pub recommended_reviewers: Vec<String>,
    pub domain_hint: String,
}

// ── Domain Detection ────────────────────────────────────────────────────────

fn detect_domain_from_files(files: &[String], task: &str) -> String {
    let task_lower = task.to_lowercase();

    // Check task keywords first (highest signal)
    if task_lower.contains("auth") || task_lower.contains("security") || task_lower.contains("injection") || task_lower.contains("xss") || task_lower.contains("csrf") {
        return "security".to_string();
    }
    if task_lower.contains("schema") || task_lower.contains("migration") || task_lower.contains("database") || task_lower.contains("sql") || task_lower.contains("prisma") {
        return "database".to_string();
    }
    if task_lower.contains("deploy") || task_lower.contains("docker") || task_lower.contains("ci/cd") || task_lower.contains("pipeline") || task_lower.contains("terraform") {
        return "devops".to_string();
    }
    if task_lower.contains("test") || task_lower.contains("spec") || task_lower.contains("coverage") {
        return "testing".to_string();
    }

    // Check file extensions
    for file in files {
        let f = file.to_lowercase();
        if f.ends_with(".tsx") || f.ends_with(".jsx") || f.ends_with(".css") || f.ends_with(".scss") || f.ends_with(".vue") || f.ends_with(".svelte") {
            return "frontend".to_string();
        }
        if f.ends_with(".sql") || f.contains("migration") || f.contains("schema.prisma") || f.contains("drizzle") {
            return "database".to_string();
        }
        if f.ends_with(".py") || f.contains("fastapi") || f.contains("django") {
            return "backend".to_string();
        }
        if f.ends_with(".rs") {
            return "backend".to_string();
        }
        if f.ends_with(".swift") || f.ends_with(".kt") || f.contains("expo") || f.contains("react-native") {
            return "mobile".to_string();
        }
        if f.contains("dockerfile") || f.contains(".yml") || f.contains(".yaml") || f.contains("terraform") || f.contains(".tf") {
            return "devops".to_string();
        }
        if f.contains(".test.") || f.contains(".spec.") || f.contains("__tests__") {
            return "testing".to_string();
        }
    }

    // Default to backend for .ts/.js (most common)
    for file in files {
        let f = file.to_lowercase();
        if f.ends_with(".ts") || f.ends_with(".js") {
            // Check if it's a route/API file
            if f.contains("api/") || f.contains("route") || f.contains("server") || f.contains("middleware") {
                return "backend".to_string();
            }
            // Check if it's a component/page
            if f.contains("component") || f.contains("page") || f.contains("layout") || f.contains("app/") {
                return "frontend".to_string();
            }
        }
    }

    "meta".to_string()
}

fn get_reviewers_for_domain(domain: &str, tier: u8) -> Vec<String> {
    // Tier 0: no reviewers (fast pass)
    if tier == 0 {
        return Vec::new();
    }

    let all_reviewers: Vec<&str> = match domain {
        "frontend" => vec!["logic-reviewer", "type-safety-reviewer", "frontend-reviewer", "ui-ux-auditor", "accessibility-reviewer", "visual-reviewer", "interaction-reviewer", "complexity-reviewer"],
        "backend" => vec!["logic-reviewer", "security-auditor", "type-safety-reviewer", "resilience-reviewer", "schema-reviewer", "dependency-reviewer", "performance-reviewer", "complexity-reviewer"],
        "database" => vec!["logic-reviewer", "security-auditor", "sql-reviewer", "schema-reviewer", "db-latency-auditor", "complexity-reviewer"],
        "security" => vec!["security-auditor", "logic-reviewer", "penetration-tester", "resilience-reviewer", "dependency-reviewer", "complexity-reviewer"],
        "devops" => vec!["pipeline-reviewer", "security-auditor", "resilience-reviewer", "dependency-reviewer", "complexity-reviewer"],
        "testing" => vec!["logic-reviewer", "test-coverage-reviewer", "type-safety-reviewer", "complexity-reviewer"],
        "mobile" => vec!["logic-reviewer", "mobile-reviewer", "frontend-reviewer", "type-safety-reviewer", "performance-reviewer", "complexity-reviewer"],
        "motion" => vec!["frontend-reviewer", "visual-reviewer", "interaction-reviewer", "ui-ux-auditor"],
        _ => vec!["logic-reviewer", "security-auditor", "type-safety-reviewer", "complexity-reviewer"],
    };

    // Adaptive wave sizing by tier
    let max_count = match tier {
        1 => 3,  // Express: top 3 reviewers
        2 => 6,  // Targeted: top 6 reviewers
        3 => all_reviewers.len(), // Gauntlet: all domain reviewers
        _ => 0,
    };

    all_reviewers.into_iter()
        .take(max_count)
        .map(|s| s.to_string())
        .collect()
}

// ── Main Classification ─────────────────────────────────────────────────────

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
    let domain_hint = detect_domain_from_files(files, task);

    if clamped_score < 0.15 && !is_critical {
        let recommended_reviewers = get_reviewers_for_domain(&domain_hint, 0);
        ImpactResult {
            tier: 0,
            score: clamped_score,
            require_gate: false,
            max_reviewers: 0,
            fast_pass: true,
            reasoning,
            recommended_reviewers,
            domain_hint,
        }
    } else if clamped_score < 0.35 && !is_critical {
        let recommended_reviewers = get_reviewers_for_domain(&domain_hint, 1);
        let max_reviewers = recommended_reviewers.len();
        ImpactResult {
            tier: 1,
            score: clamped_score,
            require_gate: false,
            max_reviewers,
            fast_pass: false,
            reasoning,
            recommended_reviewers,
            domain_hint,
        }
    } else if clamped_score < 0.70 && !is_critical {
        let recommended_reviewers = get_reviewers_for_domain(&domain_hint, 2);
        let max_reviewers = recommended_reviewers.len();
        ImpactResult {
            tier: 2,
            score: clamped_score,
            require_gate: true,
            max_reviewers,
            fast_pass: false,
            reasoning,
            recommended_reviewers,
            domain_hint,
        }
    } else {
        let recommended_reviewers = get_reviewers_for_domain(&domain_hint, 3);
        let max_reviewers = recommended_reviewers.len();
        ImpactResult {
            tier: 3,
            score: clamped_score,
            require_gate: true,
            max_reviewers,
            fast_pass: false,
            reasoning,
            recommended_reviewers,
            domain_hint,
        }
    }
}

// ── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_domain_hint_from_extension() {
        let files = vec!["src/components/Header.tsx".to_string()];
        let result = classify_impact(&files, 20, "refactor header component");
        assert_eq!(result.domain_hint, "frontend");
    }

    #[test]
    fn test_domain_hint_database() {
        let files = vec!["prisma/schema.prisma".to_string()];
        let result = classify_impact(&files, 50, "add user table migration");
        assert_eq!(result.domain_hint, "database");
    }

    #[test]
    fn test_recommended_reviewers_backend() {
        let files = vec!["src/api/users.ts".to_string()];
        let result = classify_impact(&files, 50, "add user API endpoint");
        assert_eq!(result.domain_hint, "backend");
        assert!(result.recommended_reviewers.contains(&"logic-reviewer".to_string()));
        assert!(result.recommended_reviewers.contains(&"security-auditor".to_string()));
    }

    #[test]
    fn test_tier0_no_reviewers() {
        let files = vec!["README.md".to_string()];
        let result = classify_impact(&files, 2, "fix typo in readme");
        assert_eq!(result.tier, 0);
        assert!(result.recommended_reviewers.is_empty());
        assert!(result.fast_pass);
    }

    #[test]
    fn test_tier3_critical_all_reviewers() {
        let files = vec!["src/auth/login.ts".to_string()];
        let result = classify_impact(&files, 200, "refactor auth flow security");
        assert_eq!(result.tier, 3);
        assert!(result.recommended_reviewers.len() >= 4);
        assert!(result.require_gate);
    }

    #[test]
    fn test_security_domain_from_task() {
        let files = vec!["src/utils/helper.ts".to_string()];
        let result = classify_impact(&files, 30, "fix SQL injection vulnerability");
        assert_eq!(result.domain_hint, "security");
    }
}

