use anyhow::{Context, Result};
use std::fs;
use std::path::Path;

use super::skill_resolver::build_skill_graph;

pub fn cmd_compile(skills_dir: &str, target_skills_raw: &str) -> Result<()> {
    let target_skills: Vec<String> = target_skills_raw
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();

    if target_skills.is_empty() {
        anyhow::bail!("No skills provided for compilation");
    }

    // 1. Build the graph to get all nodes
    let graph_json = build_skill_graph(skills_dir)?;
    let graph: super::skill_resolver::SkillGraph = serde_json::from_str(&graph_json)
        .context("Failed to parse skill graph for compilation")?;

    // We don't do full dependency resolution here for simplicity,
    // assuming the input `target_skills` are already resolved by the caller.
    // We just find them in the graph and compile them.
    let mut compiled_yaml = String::from("compiled_super_prompt:\n");
    compiled_yaml.push_str("  version: '1.0'\n");
    compiled_yaml.push_str("  skills:\n");

    for skill_name in target_skills {
        if let Some(node) = graph.nodes.iter().find(|n| n.name == skill_name) {
            let skill_file_path = Path::new(skills_dir)
                .join(&node.name)
                .join("SKILL.md");

            if let Ok(content) = fs::read_to_string(&skill_file_path) {
                let compressed = compress_skill_markdown(&content, &node.name);
                compiled_yaml.push_str(&compressed);
            }
        }
    }

    // Output the YAML to stdout
    println!("{}", compiled_yaml);

    Ok(())
}

fn compress_skill_markdown(markdown: &str, skill_name: &str) -> String {
    let mut out = format!("    - name: {}\n", skill_name);
    
    let mut in_traps = false;
    let mut in_rules = false;
    let mut has_traps = false;
    let mut has_rules = false;

    let mut traps_block = String::new();
    let mut rules_block = String::new();

    for line in markdown.lines() {
        let trimmed = line.trim();
        
        // Headers trigger mode switches
        if trimmed.starts_with("##") {
            let lower = trimmed.to_lowercase();
            if lower.contains("hallucination trap") || lower.contains("epistemic trap") {
                in_traps = true;
                in_rules = false;
                continue;
            } else if lower.contains("invariant") || lower.contains("rule") || lower.contains("core api") {
                in_rules = true;
                in_traps = false;
                continue;
            } else {
                in_traps = false;
                in_rules = false;
            }
        }

        if in_traps {
            if trimmed.starts_with("- ❌") || trimmed.starts_with("- ") {
                let clean = trimmed.trim_start_matches("- ").replace("\"", "\\\"");
                traps_block.push_str(&format!("        - \"{}\"\n", clean));
                has_traps = true;
            }
        } else if in_rules {
            if trimmed.starts_with(|c: char| c.is_ascii_digit()) || trimmed.starts_with("- ") {
                let clean = trimmed.replace("\"", "\\\"");
                rules_block.push_str(&format!("        - \"{}\"\n", clean));
                has_rules = true;
            }
        }
    }

    if has_traps {
        out.push_str("      traps:\n");
        out.push_str(&traps_block);
    }
    if has_rules {
        out.push_str("      rules:\n");
        out.push_str(&rules_block);
    }

    // If neither traps nor rules were parsed, fallback to just acknowledging it was loaded
    if !has_traps && !has_rules {
        out.push_str("      loaded: true\n");
    }

    out
}
