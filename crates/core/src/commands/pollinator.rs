use anyhow::Result;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::Path;

pub fn pollinate_skills(skills_dir: &str) -> Result<String> {
    let dir = Path::new(skills_dir);
    if !dir.exists() || !dir.is_dir() {
        anyhow::bail!("Skills directory not found: {}", skills_dir);
    }

    // Map of domain -> list of traps
    let mut domain_traps: HashMap<String, HashSet<String>> = HashMap::new();
    let mut skill_files = Vec::new();

    // 1. Scan all SKILL.md files and extract traps
    for entry in walkdir::WalkDir::new(dir).into_iter().filter_map(|e| e.ok()) {
        if entry.file_name() == "SKILL.md" {
            let path = entry.path().to_path_buf();
            skill_files.push(path.clone());
            
            if let Ok(content) = fs::read_to_string(&path) {
                let domain = extract_primary_domain(&content).unwrap_or_else(|| "global".to_string());
                
                let traps = extract_traps(&content);
                let entry = domain_traps.entry(domain).or_default();
                for trap in traps {
                    entry.insert(trap);
                }
            }
        }
    }

    let mut updated_count = 0;
    let mut reports = Vec::new();

    // 2. Cross-pollinate traps back to skills in the same domain
    for path in skill_files {
        if let Ok(content) = fs::read_to_string(&path) {
            let domain = extract_primary_domain(&content).unwrap_or_else(|| "global".to_string());
            if let Some(domain_pool) = domain_traps.get(&domain) {
                let existing_traps = extract_traps(&content);
                
                // Find traps in the domain pool that are NOT in this skill
                let mut new_traps: Vec<&String> = domain_pool
                    .iter()
                    .filter(|t| !existing_traps.contains(*t))
                    .collect();
                
                if !new_traps.is_empty() {
                    new_traps.sort(); // Deterministic ordering
                    let mut updated_content = content.clone();
                    
                    // Append to the file
                    if !updated_content.contains("## Epistemic Traps") {
                        if !updated_content.ends_with('\n') {
                            updated_content.push('\n');
                        }
                        updated_content.push_str("\n## Epistemic Traps\n\n");
                    } else {
                        if !updated_content.ends_with('\n') {
                            updated_content.push('\n');
                        }
                    }

                    for trap in new_traps.iter() {
                        updated_content.push_str(trap);
                        updated_content.push('\n');
                    }

                    if fs::write(&path, &updated_content).is_ok() {
                        updated_count += 1;
                        let skill_name = path.parent().unwrap().file_name().unwrap().to_str().unwrap();
                        reports.push(format!("Pollinated {} new traps into {}", new_traps.len(), skill_name));
                    }
                }
            }
        }
    }

    let report_json = serde_json::json!({
        "success": true,
        "domains_processed": domain_traps.len(),
        "skills_updated": updated_count,
        "reports": reports
    });

    Ok(serde_json::to_string_pretty(&report_json)?)
}

fn extract_primary_domain(content: &str) -> Option<String> {
    if !content.starts_with("---") {
        return None;
    }
    let end_idx = content[3..].find("\n---")?;
    let frontmatter = &content[3..3 + end_idx];

    for line in frontmatter.lines() {
        let trimmed = line.trim();
        if let Some(rest) = trimmed.strip_prefix("domain:") {
            return Some(rest.trim().trim_matches('"').trim_matches('\'').to_string());
        }
        if let Some(rest) = trimmed.strip_prefix("tags:") {
            // grab the first tag
            let tags_str = rest.trim().trim_start_matches('[').trim_end_matches(']');
            if let Some(first_tag) = tags_str.split(',').next() {
                let tag = first_tag.trim().trim_matches('"').trim_matches('\'');
                if !tag.is_empty() {
                    return Some(tag.to_string());
                }
            }
        }
    }
    None
}

fn extract_traps(content: &str) -> HashSet<String> {
    let mut traps = HashSet::new();
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.contains("// VERIFY") || trimmed.contains("❌") || trimmed.contains("✅") {
            traps.insert(trimmed.to_string());
        }
    }
    traps
}
