use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Serialize, Deserialize, Debug)]
pub struct MatchedRule {
    pub name: String,
    pub path: String,
    pub category: String,
    pub content: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ContextBrokerResult {
    pub success: bool,
    pub repo_path: String,
    pub target_file: Option<String>,
    pub rules_matched: usize,
    pub skills_matched: usize,
    pub total_tokens_estimate: usize,
    pub rules: Vec<MatchedRule>,
    pub context_snapshot: String,
}

/// Perform fast native scanning of .agent rules, skills, and dependencies for a target file/topic
pub fn resolve_context(repo_path: &str, target_file: Option<&str>) -> Result<String> {
    let base_path = Path::new(repo_path);
    let agent_dir = base_path.join(".agent");

    let mut rules = Vec::new();
    let mut skills_matched = 0;

    let target_ext = target_file.and_then(|tf| {
        Path::new(tf).extension().and_then(|ext| ext.to_str())
    });

    // 1. Scan .agent/rules/
    let rules_dir = agent_dir.join("rules");
    if rules_dir.exists() && rules_dir.is_dir() {
        if let Ok(entries) = fs::read_dir(&rules_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() && path.extension().and_then(|e| e.to_str()) == Some("md") {
                    let file_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                    if let Ok(content) = fs::read_to_string(&path) {
                        rules.push(MatchedRule {
                            name: file_name.clone(),
                            path: path.to_string_lossy().to_string(),
                            category: "rule".to_string(),
                            content,
                        });
                    }
                }
            }
        }
    }

    // 2. Count .agent/skills/
    let skills_dir = agent_dir.join("skills");
    if skills_dir.exists() && skills_dir.is_dir() {
        if let Ok(entries) = fs::read_dir(&skills_dir) {
            for entry in entries.flatten() {
                if entry.path().is_dir() {
                    skills_matched += 1;
                }
            }
        }
    }

    // 3. Assemble compressed context snapshot
    let rules_matched = rules.len();
    let mut snapshot_lines = Vec::new();
    snapshot_lines.push(format!("# Context Snapshot for: {}", target_file.unwrap_or("Global Workspace")));
    if let Some(ext) = target_ext {
        snapshot_lines.push(format!("Target Extension: .{}", ext));
    }
    snapshot_lines.push(format!("Active Governance Rules: {}", rules_matched));

    for rule in &rules {
        snapshot_lines.push(format!("--- Rule: {} ---", rule.name));
        // Include first 15 lines of each rule for token-efficient snapshot
        for line in rule.content.lines().take(15) {
            snapshot_lines.push(line.to_string());
        }
    }

    let context_snapshot = snapshot_lines.join("\n");
    let total_tokens_estimate = context_snapshot.len() / 4; // Approx 4 chars/token

    let result = ContextBrokerResult {
        success: true,
        repo_path: repo_path.to_string(),
        target_file: target_file.map(|s| s.to_string()),
        rules_matched,
        skills_matched,
        total_tokens_estimate,
        rules,
        context_snapshot,
    };

    Ok(serde_json::to_string_pretty(&result)?)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolve_context_empty_dir() {
        let temp_dir = std::env::temp_dir();
        let res_str = resolve_context(temp_dir.to_str().unwrap(), Some("test.ts")).unwrap();
        let res: ContextBrokerResult = serde_json::from_str(&res_str).unwrap();

        assert!(res.success);
        assert_eq!(res.target_file, Some("test.ts".to_string()));
    }

    #[test]
    fn test_resolve_context_with_rules_and_skills() {
        let temp_dir = std::env::temp_dir().join(format!("test_repo_{}", std::process::id()));
        let agent_dir = temp_dir.join(".agent");
        let rules_dir = agent_dir.join("rules");
        let skills_dir = agent_dir.join("skills");
        fs::create_dir_all(&rules_dir).unwrap();
        fs::create_dir_all(&skills_dir.join("skill-1")).unwrap();
        fs::create_dir_all(&skills_dir.join("skill-2")).unwrap();

        let rule_file = rules_dir.join("test_rule.md");
        fs::write(&rule_file, "# Test Rule\nRule content goes here.").unwrap();

        let res_str = resolve_context(temp_dir.to_str().unwrap(), Some("app.tsx")).unwrap();
        let res: ContextBrokerResult = serde_json::from_str(&res_str).unwrap();

        assert!(res.success);
        assert_eq!(res.rules_matched, 1);
        assert_eq!(res.skills_matched, 2);
        assert!(res.context_snapshot.contains("Test Rule"));
        assert_eq!(res.total_tokens_estimate, res.context_snapshot.len() / 4);

        let _ = fs::remove_dir_all(temp_dir);
    }
}
