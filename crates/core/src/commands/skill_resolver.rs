//! Skill Dependency Resolution Engine for Tribunal Kit v10 — Sovereign Intelligence Drop 1
//!
//! Parses all SKILL.md frontmatter YAML across `.agent/skills/`, builds a dependency
//! graph from `co-requires`, `supersedes`, and `conflicts-with` metadata, then resolves
//! the minimal, deduplicated skill set for a given task.
//!
//! Resolution Algorithm:
//! 1. Parse all SKILL.md frontmatter in skills_dir
//! 2. Build adjacency graph from co-requires edges
//! 3. For each requested skill:
//!    a. Check if a pro-tier skill supersedes it → swap
//!    b. Resolve co-requires transitively (BFS)
//!    c. Check for conflicts-with violations → warn
//! 4. Deduplicate final skill list
//! 5. Estimate total token cost
//! 6. Return ResolvedSkillSet as JSON

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet, VecDeque};
use std::fs;
use std::path::Path;

// ── Structs ─────────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SkillNode {
    pub name: String,
    pub domain: String,
    pub tier: String,
    pub co_requires: Vec<String>,
    pub supersedes: Option<String>,
    pub conflicts_with: Vec<String>,
    pub file_size_bytes: usize,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SkillGraph {
    pub success: bool,
    pub total_skills: usize,
    pub nodes: Vec<SkillNode>,
    pub edges_co_requires: usize,
    pub edges_supersedes: usize,
    pub edges_conflicts: usize,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ResolvedSkillSet {
    pub success: bool,
    pub primary_skills: Vec<String>,
    pub auto_loaded: Vec<String>,
    pub superseded: Vec<String>,
    pub conflicts_detected: Vec<String>,
    pub total_skills: usize,
    pub estimated_tokens: usize,
}

// ── Frontmatter Parsing ─────────────────────────────────────────────────────

fn parse_skill_frontmatter(content: &str, skill_name: &str, file_size: usize) -> Option<SkillNode> {
    if !content.starts_with("---") {
        return None;
    }
    let end_idx = content[3..].find("\n---")?;
    let frontmatter = &content[3..3 + end_idx];

    let mut domain = String::from("meta");
    let mut tier = String::from("basic");
    let mut co_requires: Vec<String> = Vec::new();
    let mut supersedes: Option<String> = None;
    let mut conflicts_with: Vec<String> = Vec::new();

    // Parse YAML-like frontmatter line by line
    let mut current_key = String::new();
    let mut in_list = false;
    let mut in_routing = false;

    for line in frontmatter.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }

        // Detect routing: block
        if trimmed == "routing:" {
            in_routing = true;
            continue;
        }

        // Handle indented routing sub-keys
        if in_routing && line.starts_with("  ") && !line.starts_with("    ") {
            let inner = trimmed;
            if let Some(rest) = inner.strip_prefix("domain:") {
                domain = rest.trim().to_string();
            } else if let Some(rest) = inner.strip_prefix("tier:") {
                tier = rest.trim().to_string();
            } else if let Some(rest) = inner.strip_prefix("supersedes:") {
                let val = rest.trim().to_string();
                if !val.is_empty() {
                    supersedes = Some(val);
                }
            } else if inner == "co-requires:" || inner == "co_requires:" {
                current_key = "co_requires".to_string();
                in_list = true;
            } else if inner == "conflicts-with:" || inner == "conflicts_with:" {
                current_key = "conflicts_with".to_string();
                in_list = true;
            } else {
                in_list = false;
            }
            continue;
        }

        // Handle list items within routing block
        if in_routing && line.starts_with("    ") && in_list {
            if trimmed.starts_with('-') {
                let item = trimmed[1..].trim().trim_matches(|c| c == '\'' || c == '"').to_string();
                if !item.is_empty() {
                    match current_key.as_str() {
                        "co_requires" => co_requires.push(item),
                        "conflicts_with" => conflicts_with.push(item),
                        _ => {}
                    }
                }
            }
            continue;
        }

        // Top-level keys
        if !line.starts_with(' ') && !line.starts_with('\t') {
            in_routing = false;
            in_list = false;

            if let Some(rest) = trimmed.strip_prefix("skills:") {
                let val = rest.trim();
                if val.is_empty() {
                    current_key = "skills".to_string();
                    in_list = true;
                }
            }
        }

        // Handle top-level skills list items (these act as co-requires)
        if in_list && current_key == "skills" && trimmed.starts_with('-') {
            let item = trimmed[1..].trim().trim_matches(|c| c == '\'' || c == '"').to_string();
            if !item.is_empty() {
                co_requires.push(item);
            }
        }
    }

    // If domain not set in routing block, detect from name
    if domain == "meta" {
        domain = detect_domain_from_name(skill_name);
    }

    Some(SkillNode {
        name: skill_name.to_string(),
        domain,
        tier,
        co_requires,
        supersedes,
        conflicts_with,
        file_size_bytes: file_size,
    })
}

fn detect_domain_from_name(name: &str) -> String {
    let n = name.to_lowercase();
    if n.contains("anim") || n.contains("motion") || n.contains("gsap") { return "motion".to_string(); }
    if n.contains("react") || n.contains("ui") || n.contains("css") || n.contains("frontend") || n.contains("vue") { return "frontend".to_string(); }
    if n.contains("sql") || n.contains("db") || n.contains("data") || n.contains("supabase") { return "database".to_string(); }
    if n.contains("security") || n.contains("audit") || n.contains("vulnerab") { return "security".to_string(); }
    if n.contains("test") || n.contains("qa") || n.contains("playwright") { return "testing".to_string(); }
    if n.contains("devops") || n.contains("ci") || n.contains("cloud") || n.contains("docker") { return "devops".to_string(); }
    if n.contains("mobile") || n.contains("swift") || n.contains("expo") { return "mobile".to_string(); }
    if n.contains("python") || n.contains("rust") || n.contains("backend") || n.contains("node") { return "backend".to_string(); }
    "meta".to_string()
}

// ── Build Skill Graph ───────────────────────────────────────────────────────

pub fn build_skill_graph(skills_dir: &str) -> Result<String> {
    let skills_path = Path::new(skills_dir);
    if !skills_path.exists() || !skills_path.is_dir() {
        anyhow::bail!("Skills directory not found: {}", skills_dir);
    }

    let mut nodes: Vec<SkillNode> = Vec::new();
    let mut edges_co_requires = 0usize;
    let mut edges_supersedes = 0usize;
    let mut edges_conflicts = 0usize;

    let entries = fs::read_dir(skills_path)
        .with_context(|| format!("Failed to read skills directory: {}", skills_dir))?;

    for entry in entries.flatten() {
        if !entry.path().is_dir() {
            continue;
        }
        let skill_md = entry.path().join("SKILL.md");
        if !skill_md.exists() {
            continue;
        }

        let skill_name = entry.file_name().to_string_lossy().to_string();
        if let Ok(content) = fs::read_to_string(&skill_md) {
            let file_size = content.len();
            if let Some(node) = parse_skill_frontmatter(&content, &skill_name, file_size) {
                edges_co_requires += node.co_requires.len();
                if node.supersedes.is_some() { edges_supersedes += 1; }
                edges_conflicts += node.conflicts_with.len();
                nodes.push(node);
            }
        }
    }

    let graph = SkillGraph {
        success: true,
        total_skills: nodes.len(),
        nodes,
        edges_co_requires,
        edges_supersedes,
        edges_conflicts,
    };

    Ok(serde_json::to_string_pretty(&graph)?)
}

// ── Resolve Skills ──────────────────────────────────────────────────────────

pub fn resolve_skills(skills_dir: &str, requested_skills: &[String]) -> Result<String> {
    // Build the full graph first
    let graph_json = build_skill_graph(skills_dir)?;
    let graph: SkillGraph = serde_json::from_str(&graph_json)?;

    // Index nodes by name for fast lookup
    let mut node_map: HashMap<String, &SkillNode> = HashMap::new();
    let mut supersedes_map: HashMap<String, String> = HashMap::new(); // basic → pro

    for node in &graph.nodes {
        node_map.insert(node.name.clone(), node);
        if let Some(ref base) = node.supersedes {
            supersedes_map.insert(base.clone(), node.name.clone());
        }
    }

    let mut primary_skills: Vec<String> = Vec::new();
    let mut auto_loaded: Vec<String> = Vec::new();
    let mut superseded: Vec<String> = Vec::new();
    let mut conflicts_detected: Vec<String> = Vec::new();
    let mut resolved_set: HashSet<String> = HashSet::new();

    // Phase 1: Apply supersedes (basic → pro upgrade)
    let mut effective_requests: Vec<String> = Vec::new();
    for skill in requested_skills {
        if let Some(pro_skill) = supersedes_map.get(skill) {
            // A pro skill supersedes this basic one
            if node_map.contains_key(pro_skill) {
                superseded.push(format!("{} → superseded by {}", skill, pro_skill));
                effective_requests.push(pro_skill.clone());
                continue;
            }
        }
        effective_requests.push(skill.clone());
    }

    // Phase 2: BFS to resolve co-requires transitively
    let mut queue: VecDeque<String> = VecDeque::new();
    for skill in &effective_requests {
        if resolved_set.insert(skill.clone()) {
            queue.push_back(skill.clone());
            primary_skills.push(skill.clone());
        }
    }

    while let Some(current) = queue.pop_front() {
        if let Some(node) = node_map.get(&current) {
            for dep in &node.co_requires {
                if resolved_set.insert(dep.clone()) {
                    // Check if this dep exists in the graph
                    if node_map.contains_key(dep) {
                        queue.push_back(dep.clone());
                        auto_loaded.push(dep.clone());
                    }
                    // If dep doesn't exist, silently skip (lenient mode)
                }
            }
        }
    }

    // Phase 3: Detect conflicts
    let all_resolved: Vec<&String> = resolved_set.iter().collect();
    for i in 0..all_resolved.len() {
        if let Some(node) = node_map.get(all_resolved[i]) {
            for conflict in &node.conflicts_with {
                if resolved_set.contains(conflict) {
                    conflicts_detected.push(format!(
                        "⚠ Conflict: '{}' conflicts with '{}' — both are in the resolved set",
                        node.name, conflict
                    ));
                }
            }
        }
    }

    // Phase 4: Estimate token cost
    let estimated_tokens: usize = resolved_set.iter()
        .filter_map(|name| node_map.get(name))
        .map(|node| node.file_size_bytes / 4) // ~4 chars per token
        .sum();

    let result = ResolvedSkillSet {
        success: true,
        primary_skills,
        auto_loaded,
        superseded,
        conflicts_detected,
        total_skills: resolved_set.len(),
        estimated_tokens,
    };

    Ok(serde_json::to_string_pretty(&result)?)
}

// ── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn create_skill(dir: &Path, name: &str, frontmatter: &str) {
        let skill_dir = dir.join(name);
        fs::create_dir_all(&skill_dir).unwrap();
        let content = format!("---\n{}\n---\n\n# {}\n\nSome content here.\n", frontmatter, name);
        fs::write(skill_dir.join("SKILL.md"), content).unwrap();
    }

    #[test]
    fn test_basic_resolution() {
        let temp_dir = std::env::temp_dir().join(format!("resolver_basic_{}", std::process::id()));
        fs::create_dir_all(&temp_dir).unwrap();

        create_skill(&temp_dir, "skill-a", "name: skill-a\ndescription: Test skill A");

        let result = resolve_skills(
            temp_dir.to_str().unwrap(),
            &["skill-a".to_string()],
        ).unwrap();
        let resolved: ResolvedSkillSet = serde_json::from_str(&result).unwrap();

        assert!(resolved.success);
        assert_eq!(resolved.total_skills, 1);
        assert!(resolved.primary_skills.contains(&"skill-a".to_string()));
        assert!(resolved.auto_loaded.is_empty());

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_co_requires_transitive() {
        let temp_dir = std::env::temp_dir().join(format!("resolver_trans_{}", std::process::id()));
        fs::create_dir_all(&temp_dir).unwrap();

        create_skill(&temp_dir, "skill-a", "name: skill-a\nskills:\n  - skill-b");
        create_skill(&temp_dir, "skill-b", "name: skill-b\nskills:\n  - skill-c");
        create_skill(&temp_dir, "skill-c", "name: skill-c\ndescription: Leaf skill");

        let result = resolve_skills(
            temp_dir.to_str().unwrap(),
            &["skill-a".to_string()],
        ).unwrap();
        let resolved: ResolvedSkillSet = serde_json::from_str(&result).unwrap();

        assert!(resolved.success);
        assert_eq!(resolved.total_skills, 3);
        assert!(resolved.primary_skills.contains(&"skill-a".to_string()));
        assert!(resolved.auto_loaded.contains(&"skill-b".to_string()));
        assert!(resolved.auto_loaded.contains(&"skill-c".to_string()));

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_supersedes() {
        let temp_dir = std::env::temp_dir().join(format!("resolver_super_{}", std::process::id()));
        fs::create_dir_all(&temp_dir).unwrap();

        create_skill(&temp_dir, "basic-skill", "name: basic-skill\ndescription: Basic");
        create_skill(&temp_dir, "pro-skill", "name: pro-skill\nrouting:\n  tier: pro\n  supersedes: basic-skill");

        let result = resolve_skills(
            temp_dir.to_str().unwrap(),
            &["basic-skill".to_string()],
        ).unwrap();
        let resolved: ResolvedSkillSet = serde_json::from_str(&result).unwrap();

        assert!(resolved.success);
        assert!(resolved.primary_skills.contains(&"pro-skill".to_string()));
        assert!(!resolved.primary_skills.contains(&"basic-skill".to_string()));
        assert!(!resolved.superseded.is_empty());

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_conflict_detection() {
        let temp_dir = std::env::temp_dir().join(format!("resolver_conflict_{}", std::process::id()));
        fs::create_dir_all(&temp_dir).unwrap();

        create_skill(&temp_dir, "skill-x", "name: skill-x\nrouting:\n  conflicts-with:\n    - skill-y");
        create_skill(&temp_dir, "skill-y", "name: skill-y\ndescription: Conflicting skill");

        let result = resolve_skills(
            temp_dir.to_str().unwrap(),
            &["skill-x".to_string(), "skill-y".to_string()],
        ).unwrap();
        let resolved: ResolvedSkillSet = serde_json::from_str(&result).unwrap();

        assert!(resolved.success);
        assert!(!resolved.conflicts_detected.is_empty());

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_circular_dependency() {
        let temp_dir = std::env::temp_dir().join(format!("resolver_circular_{}", std::process::id()));
        fs::create_dir_all(&temp_dir).unwrap();

        // A requires B, B requires A — should not infinite loop
        create_skill(&temp_dir, "cycle-a", "name: cycle-a\nskills:\n  - cycle-b");
        create_skill(&temp_dir, "cycle-b", "name: cycle-b\nskills:\n  - cycle-a");

        let result = resolve_skills(
            temp_dir.to_str().unwrap(),
            &["cycle-a".to_string()],
        ).unwrap();
        let resolved: ResolvedSkillSet = serde_json::from_str(&result).unwrap();

        // BFS with HashSet prevents infinite loop
        assert!(resolved.success);
        assert_eq!(resolved.total_skills, 2);

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_build_skill_graph() {
        let temp_dir = std::env::temp_dir().join(format!("resolver_graph_{}", std::process::id()));
        fs::create_dir_all(&temp_dir).unwrap();

        create_skill(&temp_dir, "alpha", "name: alpha\nskills:\n  - beta");
        create_skill(&temp_dir, "beta", "name: beta\ndescription: Beta skill");
        create_skill(&temp_dir, "gamma", "name: gamma\nrouting:\n  supersedes: beta");

        let result = build_skill_graph(temp_dir.to_str().unwrap()).unwrap();
        let graph: SkillGraph = serde_json::from_str(&result).unwrap();

        assert!(graph.success);
        assert_eq!(graph.total_skills, 3);
        assert!(graph.edges_co_requires >= 1);
        assert!(graph.edges_supersedes >= 1);

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
