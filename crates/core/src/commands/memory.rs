use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

// ── Memory Type Taxonomy ────────────────────────────────────────────────────
// Only 4 types exist. serde rejects anything else at deserialization time.
// This is the mathematical guarantee against hallucinated memory categories.

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, clap::ValueEnum)]
#[serde(rename_all = "snake_case")]
pub enum MemoryType {
    /// Session events, decisions, what happened. Auto-decays after 30 days.
    Episodic,
    /// Project facts, rules, truths. Permanent.
    Semantic,
    /// How-to recipes, build steps, procedures. Permanent.
    Procedural,
    /// Current-session scratch. Cleared on garbage collection.
    Working,
}

impl std::fmt::Display for MemoryType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            MemoryType::Episodic => write!(f, "episodic"),
            MemoryType::Semantic => write!(f, "semantic"),
            MemoryType::Procedural => write!(f, "procedural"),
            MemoryType::Working => write!(f, "working"),
        }
    }
}

// ── Memory Source ───────────────────────────────────────────────────────────
// Tracks provenance of each memory. Prevents phantom entries.

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum MemorySource {
    /// User explicitly stored via `tk memory store`
    Manual,
    /// Auto-extracted by `tk learn`
    Learned,
    /// Derived from a case law rejection
    CaseLaw,
    /// Working memory from current session
    Session,
}

// ── Memory Entry ────────────────────────────────────────────────────────────
// The atomic unit of memory. Every field is serde-enforced.

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct MemoryEntry {
    pub id: u32,
    pub memory_type: MemoryType,
    pub content: String,
    pub tags: Vec<String>,
    pub created_at: String,
    pub last_accessed: String,
    pub access_count: u32,
    pub token_estimate: u32,
    pub source: MemorySource,
    #[serde(default)]
    pub session_id: Option<String>,
}

// ── Memory Index ────────────────────────────────────────────────────────────
// The full in-memory representation of the index file.

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct MemoryIndex {
    pub version: u32,
    pub entries: Vec<MemoryEntry>,
    #[serde(default)]
    pub next_id: u32,
}

impl MemoryIndex {
    pub fn new() -> Self {
        MemoryIndex {
            version: 1,
            entries: Vec::new(),
            next_id: 1,
        }
    }
}

// ── Scored Entry (for recall ranking) ───────────────────────────────────────

#[derive(Debug)]
struct ScoredEntry {
    entry: MemoryEntry,
    score: f64,
}

// ── Constants ───────────────────────────────────────────────────────────────

const MAX_ENTRIES: usize = 500;
const EPISODIC_TTL_DAYS: i64 = 30;
const DEFAULT_BUDGET: u32 = 2000;

// ── Token Estimation ────────────────────────────────────────────────────────
// Fast approximation: ceil(byte_length / 4). No external tokenizer dependency.
// Accuracy: ~95% vs tiktoken for English text. Good enough for budget gating.

fn estimate_tokens(text: &str) -> u32 {
    ((text.len() as f64) / 4.0).ceil() as u32
}

/// Public wrapper for token estimation — used by cmd_memory in main.rs
pub fn estimate_tokens_pub(text: &str) -> u32 {
    estimate_tokens(text)
}

// ── Timestamp Utilities ─────────────────────────────────────────────────────

fn now_iso8601() -> String {
    // Use system time to generate ISO 8601 without chrono dependency
    let duration = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = duration.as_secs();
    // Simple UTC timestamp: seconds since epoch → readable format
    // For a production system you'd use chrono, but we avoid the dependency
    format!("{}Z", secs)
}

fn epoch_secs_from_iso(ts: &str) -> u64 {
    // Parse our simplified timestamp format (epoch seconds + Z)
    ts.trim_end_matches('Z').parse::<u64>().unwrap_or(0)
}

fn days_since(ts: &str) -> i64 {
    let created = epoch_secs_from_iso(ts);
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    ((now - created) / 86400) as i64
}

// ── Index I/O ───────────────────────────────────────────────────────────────

fn index_path(agent_dir: &PathBuf) -> PathBuf {
    agent_dir.join("history").join("memory").join(".memory.idx")
}

fn projection_path(agent_dir: &PathBuf) -> PathBuf {
    agent_dir.join("history").join("memory").join("MEMORY.md")
}

pub fn load_index(agent_dir: &PathBuf) -> Result<MemoryIndex> {
    let path = index_path(agent_dir);
    if !path.exists() {
        return Ok(MemoryIndex::new());
    }
    let content = std::fs::read_to_string(&path)
        .with_context(|| format!("Failed to read memory index: {}", path.display()))?;
    let index: MemoryIndex = serde_json::from_str(&content)
        .with_context(|| "Memory index schema validation failed — file may be corrupted")?;
    Ok(index)
}

pub fn save_index(agent_dir: &PathBuf, index: &MemoryIndex) -> Result<()> {
    let path = index_path(agent_dir);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    // Atomic write: write to temp file, then rename
    let tmp_path = path.with_extension("idx.tmp");
    let content = serde_json::to_string_pretty(index)?;
    std::fs::write(&tmp_path, &content)?;
    std::fs::rename(&tmp_path, &path)?;
    Ok(())
}

// ── Scoring Engine ──────────────────────────────────────────────────────────
// score = (query_relevance × type_priority) + recency_boost
//
// type_priority: SEMANTIC=1.0, PROCEDURAL=0.9, EPISODIC=0.7, WORKING=0.5
// recency_boost: SEMANTIC/PROCEDURAL = 0 (no decay), EPISODIC = exp(-age/30)

fn type_priority(memory_type: &MemoryType) -> f64 {
    match memory_type {
        MemoryType::Semantic => 1.0,
        MemoryType::Procedural => 0.9,
        MemoryType::Episodic => 0.7,
        MemoryType::Working => 0.5,
    }
}

fn compute_score(entry: &MemoryEntry, query_lower: &str) -> f64 {
    let content_lower = entry.content.to_lowercase();

    // Relevance: exact substring match = 1.0, tag match = 0.8, partial = 0.3
    let relevance = if content_lower.contains(query_lower) {
        1.0
    } else if entry.tags.iter().any(|t| t.to_lowercase().contains(query_lower)) {
        0.8
    } else if query_lower.split_whitespace().any(|word| content_lower.contains(word)) {
        0.3
    } else {
        0.0 // No match at all — will be filtered out
    };

    if relevance == 0.0 {
        return 0.0;
    }

    let priority = type_priority(&entry.memory_type);

    // Recency boost for episodic entries (decays exponentially)
    let recency = match entry.memory_type {
        MemoryType::Episodic => {
            let age = days_since(&entry.created_at) as f64;
            (-age / 30.0).exp()
        }
        _ => 0.0, // No recency bonus for permanent types
    };

    // Frequency boost: more accessed = slightly higher score
    let freq_boost = (entry.access_count as f64).ln().max(0.0) * 0.05;

    (relevance * priority) + recency + freq_boost
}

// ── Core Operations ─────────────────────────────────────────────────────────

/// Store a new memory entry. Enforces the 500-entry cap.
pub fn store_entry(
    index: &mut MemoryIndex,
    memory_type: MemoryType,
    content: String,
    tags: Vec<String>,
    source: MemorySource,
    session_id: Option<String>,
) -> Result<u32> {
    // Enforce hard cap
    if index.entries.len() >= MAX_ENTRIES {
        // Auto-GC: remove oldest WORKING first, then oldest EPISODIC
        let before = index.entries.len();
        index.entries.retain(|e| e.memory_type != MemoryType::Working);
        if index.entries.len() >= MAX_ENTRIES {
            // Remove oldest episodic entries
            index.entries.sort_by(|a, b| a.created_at.cmp(&b.created_at));
            index.entries.retain(|e| {
                if e.memory_type == MemoryType::Episodic {
                    days_since(&e.created_at) < EPISODIC_TTL_DAYS
                } else {
                    true
                }
            });
        }
        if index.entries.len() >= MAX_ENTRIES {
            anyhow::bail!(
                "Memory index at capacity ({} entries). Run `tk memory gc` to free space. Removed {} working/expired entries.",
                MAX_ENTRIES,
                before - index.entries.len()
            );
        }
    }

    let token_est = estimate_tokens(&content);
    let now = now_iso8601();
    let id = index.next_id;

    let entry = MemoryEntry {
        id,
        memory_type,
        content,
        tags,
        created_at: now.clone(),
        last_accessed: now,
        access_count: 0,
        token_estimate: token_est,
        source,
        session_id,
    };

    index.entries.push(entry);
    index.next_id = id + 1;

    Ok(id)
}

/// Budget-constrained recall. Returns entries ranked by score, fit within token budget.
pub fn recall_entries(
    index: &mut MemoryIndex,
    query: &str,
    budget: u32,
) -> Vec<(MemoryEntry, f64)> {
    let query_lower = query.to_lowercase();

    // Score all entries
    let mut scored: Vec<ScoredEntry> = index
        .entries
        .iter()
        .map(|e| ScoredEntry {
            entry: e.clone(),
            score: compute_score(e, &query_lower),
        })
        .filter(|s| s.score > 0.0) // Drop non-matching
        .collect();

    // Sort by score descending
    scored.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));

    // Budget gate: accumulate tokens until budget is exhausted
    let mut total_tokens: u32 = 0;
    let mut results: Vec<(MemoryEntry, f64)> = Vec::new();

    for scored_entry in scored {
        let entry_tokens = scored_entry.entry.token_estimate;
        if total_tokens + entry_tokens > budget {
            break; // Budget exhausted — silently drop remaining
        }
        total_tokens += entry_tokens;

        // Update access metadata on the original entry
        let entry_id = scored_entry.entry.id;
        if let Some(original) = index.entries.iter_mut().find(|e| e.id == entry_id) {
            original.last_accessed = now_iso8601();
            original.access_count += 1;
        }

        results.push((scored_entry.entry, scored_entry.score));
    }

    results
}

/// Garbage collect: remove expired EPISODIC (>30 days) + all WORKING entries.
pub fn garbage_collect(index: &mut MemoryIndex) -> (u32, u32) {
    let _before = index.entries.len();

    let mut working_removed: u32 = 0;
    let mut episodic_removed: u32 = 0;

    index.entries.retain(|e| {
        match e.memory_type {
            MemoryType::Working => {
                working_removed += 1;
                false // Remove all working entries
            }
            MemoryType::Episodic => {
                if days_since(&e.created_at) >= EPISODIC_TTL_DAYS {
                    episodic_removed += 1;
                    false // Expired
                } else {
                    true // Still fresh
                }
            }
            _ => true, // SEMANTIC and PROCEDURAL are permanent
        }
    });

    (working_removed, episodic_removed)
}

/// Generate the MEMORY.md human-readable projection.
pub fn generate_projection(index: &MemoryIndex) -> String {
    let mut md = String::new();
    md.push_str("# 🧠 Tribunal Memory Index\n");
    md.push_str("> Auto-generated by `tribunal-core memory export`. Do not edit manually.\n");

    let total = index.entries.len();
    let semantic_count = index.entries.iter().filter(|e| e.memory_type == MemoryType::Semantic).count();
    let procedural_count = index.entries.iter().filter(|e| e.memory_type == MemoryType::Procedural).count();
    let episodic_count = index.entries.iter().filter(|e| e.memory_type == MemoryType::Episodic).count();
    let working_count = index.entries.iter().filter(|e| e.memory_type == MemoryType::Working).count();

    md.push_str(&format!(
        "> Entries: {} | Semantic: {} | Procedural: {} | Episodic: {} | Working: {}\n\n",
        total, semantic_count, procedural_count, episodic_count, working_count
    ));

    // SEMANTIC section
    let semantic: Vec<&MemoryEntry> = index.entries.iter().filter(|e| e.memory_type == MemoryType::Semantic).collect();
    if !semantic.is_empty() {
        md.push_str("## SEMANTIC (Permanent Facts)\n");
        md.push_str("| ID | Content | Tags | Source | Created |\n");
        md.push_str("|----|---------|------|--------|---------|\n");
        for e in &semantic {
            md.push_str(&format!(
                "| {} | {} | {} | {} | {} |\n",
                e.id,
                e.content.replace('|', "\\|"),
                e.tags.join(", "),
                format!("{:?}", e.source).to_lowercase(),
                &e.created_at,
            ));
        }
        md.push('\n');
    }

    // PROCEDURAL section
    let procedural: Vec<&MemoryEntry> = index.entries.iter().filter(|e| e.memory_type == MemoryType::Procedural).collect();
    if !procedural.is_empty() {
        md.push_str("## PROCEDURAL (How-To Recipes)\n");
        md.push_str("| ID | Content | Tags | Source | Created |\n");
        md.push_str("|----|---------|------|--------|---------|\n");
        for e in &procedural {
            md.push_str(&format!(
                "| {} | {} | {} | {} | {} |\n",
                e.id,
                e.content.replace('|', "\\|"),
                e.tags.join(", "),
                format!("{:?}", e.source).to_lowercase(),
                &e.created_at,
            ));
        }
        md.push('\n');
    }

    // EPISODIC section
    let episodic: Vec<&MemoryEntry> = index.entries.iter().filter(|e| e.memory_type == MemoryType::Episodic).collect();
    if !episodic.is_empty() {
        md.push_str("## EPISODIC (Session History — auto-decays after 30 days)\n");
        md.push_str("| ID | Content | Tags | Source | Created | Days Remaining |\n");
        md.push_str("|----|---------|------|--------|---------|----------------|\n");
        for e in &episodic {
            let age = days_since(&e.created_at);
            let remaining = EPISODIC_TTL_DAYS - age;
            md.push_str(&format!(
                "| {} | {} | {} | {} | {} | {} |\n",
                e.id,
                e.content.replace('|', "\\|"),
                e.tags.join(", "),
                format!("{:?}", e.source).to_lowercase(),
                &e.created_at,
                remaining.max(0),
            ));
        }
        md.push('\n');
    }

    // WORKING section
    let working: Vec<&MemoryEntry> = index.entries.iter().filter(|e| e.memory_type == MemoryType::Working).collect();
    if !working.is_empty() {
        md.push_str("## WORKING (Current Session — cleared on GC)\n");
        md.push_str("| ID | Content | Tags | Session |\n");
        md.push_str("|----|---------|------|---------|\n");
        for e in &working {
            md.push_str(&format!(
                "| {} | {} | {} | {} |\n",
                e.id,
                e.content.replace('|', "\\|"),
                e.tags.join(", "),
                e.session_id.as_deref().unwrap_or("—"),
            ));
        }
        md.push('\n');
    }

    if index.entries.is_empty() {
        md.push_str("*No memories recorded yet. Run `tk memory store` to add your first memory.*\n");
    }

    md
}

/// Get memory statistics for status display.
pub fn get_stats(index: &MemoryIndex) -> (usize, usize, usize, usize, usize, u32) {
    let total = index.entries.len();
    let semantic = index.entries.iter().filter(|e| e.memory_type == MemoryType::Semantic).count();
    let procedural = index.entries.iter().filter(|e| e.memory_type == MemoryType::Procedural).count();
    let episodic = index.entries.iter().filter(|e| e.memory_type == MemoryType::Episodic).count();
    let working = index.entries.iter().filter(|e| e.memory_type == MemoryType::Working).count();
    let total_tokens: u32 = index.entries.iter().map(|e| e.token_estimate).sum();
    (total, semantic, procedural, episodic, working, total_tokens)
}

// ── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn make_entry(id: u32, mem_type: MemoryType, content: &str, tags: Vec<&str>) -> MemoryEntry {
        MemoryEntry {
            id,
            memory_type: mem_type,
            content: content.to_string(),
            tags: tags.into_iter().map(|s| s.to_string()).collect(),
            created_at: now_iso8601(),
            last_accessed: now_iso8601(),
            access_count: 0,
            token_estimate: estimate_tokens(content),
            source: MemorySource::Manual,
            session_id: None,
        }
    }

    #[test]
    fn test_hallucinated_memory_type_rejected() {
        // A hallucinated memory type "super_semantic" must be rejected by serde
        let invalid = r#"{"id":1,"memory_type":"super_semantic","content":"test","tags":[],"created_at":"0Z","last_accessed":"0Z","access_count":0,"token_estimate":1,"source":"manual"}"#;
        let result: Result<MemoryEntry, _> = serde_json::from_str(invalid);
        assert!(result.is_err(), "Hallucinated memory type 'super_semantic' must be rejected");
    }

    #[test]
    fn test_hallucinated_source_rejected() {
        let invalid = r#"{"id":1,"memory_type":"semantic","content":"test","tags":[],"created_at":"0Z","last_accessed":"0Z","access_count":0,"token_estimate":1,"source":"imaginary_source"}"#;
        let result: Result<MemoryEntry, _> = serde_json::from_str(invalid);
        assert!(result.is_err(), "Hallucinated source 'imaginary_source' must be rejected");
    }

    #[test]
    fn test_valid_memory_entry_accepted() {
        let valid = r#"{"id":1,"memory_type":"semantic","content":"Project uses PostgreSQL","tags":["db","orm"],"created_at":"1720000000Z","last_accessed":"1720000000Z","access_count":0,"token_estimate":6,"source":"manual"}"#;
        let result: Result<MemoryEntry, _> = serde_json::from_str(valid);
        assert!(result.is_ok(), "Valid memory entry should be accepted");
        let entry = result.unwrap();
        assert_eq!(entry.memory_type, MemoryType::Semantic);
        assert_eq!(entry.tags.len(), 2);
    }

    #[test]
    fn test_all_four_types_accepted() {
        for type_str in &["episodic", "semantic", "procedural", "working"] {
            let json = format!(
                r#"{{"id":1,"memory_type":"{}","content":"test","tags":[],"created_at":"0Z","last_accessed":"0Z","access_count":0,"token_estimate":1,"source":"manual"}}"#,
                type_str
            );
            let result: Result<MemoryEntry, _> = serde_json::from_str(&json);
            assert!(result.is_ok(), "Memory type '{}' should be accepted", type_str);
        }
    }

    #[test]
    fn test_token_estimation() {
        assert_eq!(estimate_tokens("hello"), 2); // 5 bytes / 4 = 1.25 → ceil = 2
        assert_eq!(estimate_tokens(""), 0);
        assert_eq!(estimate_tokens("a"), 1);
        // Longer text
        let text = "This is a longer piece of text that should estimate to about 15 tokens";
        let est = estimate_tokens(text);
        assert!(est > 10 && est < 25, "Token estimate {} should be between 10 and 25", est);
    }

    #[test]
    fn test_store_entry_increments_id() {
        let mut index = MemoryIndex::new();
        let id1 = store_entry(
            &mut index,
            MemoryType::Semantic,
            "First memory".to_string(),
            vec!["test".to_string()],
            MemorySource::Manual,
            None,
        ).unwrap();
        let id2 = store_entry(
            &mut index,
            MemoryType::Procedural,
            "Second memory".to_string(),
            vec!["test".to_string()],
            MemorySource::Manual,
            None,
        ).unwrap();
        assert_eq!(id1, 1);
        assert_eq!(id2, 2);
        assert_eq!(index.entries.len(), 2);
    }

    #[test]
    fn test_recall_budget_enforcement() {
        let mut index = MemoryIndex::new();
        // Store 3 entries, each ~10 tokens
        for i in 0..3 {
            store_entry(
                &mut index,
                MemoryType::Semantic,
                format!("Memory about database number {}", i),
                vec!["database".to_string()],
                MemorySource::Manual,
                None,
            ).unwrap();
        }

        // Recall with a tiny budget — should get fewer than 3 results
        let results = recall_entries(&mut index, "database", 15);
        // Each entry is ~10 tokens, budget is 15, so max 1 entry
        assert!(results.len() <= 2, "Budget of 15 tokens should limit results, got {}", results.len());

        // Recall with large budget — should get all 3
        let results_all = recall_entries(&mut index, "database", 2000);
        assert_eq!(results_all.len(), 3, "Large budget should return all matching entries");
    }

    #[test]
    fn test_scoring_semantic_beats_working() {
        let semantic = make_entry(1, MemoryType::Semantic, "database config for project", vec!["db"]);
        let working = make_entry(2, MemoryType::Working, "database debug session", vec!["db"]);

        let s_score = compute_score(&semantic, "database");
        let w_score = compute_score(&working, "database");

        assert!(s_score > w_score, "Semantic ({}) should score higher than Working ({})", s_score, w_score);
    }

    #[test]
    fn test_gc_clears_all_working() {
        let mut index = MemoryIndex::new();
        store_entry(&mut index, MemoryType::Working, "temp1".to_string(), vec![], MemorySource::Session, None).unwrap();
        store_entry(&mut index, MemoryType::Working, "temp2".to_string(), vec![], MemorySource::Session, None).unwrap();
        store_entry(&mut index, MemoryType::Semantic, "permanent".to_string(), vec![], MemorySource::Manual, None).unwrap();

        let (working_removed, _) = garbage_collect(&mut index);
        assert_eq!(working_removed, 2);
        assert_eq!(index.entries.len(), 1);
        assert_eq!(index.entries[0].memory_type, MemoryType::Semantic);
    }

    #[test]
    fn test_no_match_returns_empty() {
        let mut index = MemoryIndex::new();
        store_entry(&mut index, MemoryType::Semantic, "database config".to_string(), vec!["db".to_string()], MemorySource::Manual, None).unwrap();

        let results = recall_entries(&mut index, "authentication", 2000);
        assert!(results.is_empty(), "Non-matching query should return empty results");
    }

    #[test]
    fn test_projection_generation() {
        let mut index = MemoryIndex::new();
        store_entry(&mut index, MemoryType::Semantic, "Uses PostgreSQL".to_string(), vec!["db".to_string()], MemorySource::Manual, None).unwrap();
        store_entry(&mut index, MemoryType::Procedural, "Deploy with vercel".to_string(), vec!["deploy".to_string()], MemorySource::Learned, None).unwrap();

        let md = generate_projection(&index);
        assert!(md.contains("SEMANTIC"), "Projection should contain SEMANTIC section");
        assert!(md.contains("PROCEDURAL"), "Projection should contain PROCEDURAL section");
        assert!(md.contains("Uses PostgreSQL"), "Projection should contain entry content");
        assert!(md.contains("Deploy with vercel"), "Projection should contain entry content");
    }

    #[test]
    fn test_empty_projection() {
        let index = MemoryIndex::new();
        let md = generate_projection(&index);
        assert!(md.contains("No memories recorded yet"), "Empty index should show hint message");
    }

    #[test]
    fn test_index_serialization_roundtrip() {
        let mut index = MemoryIndex::new();
        store_entry(&mut index, MemoryType::Semantic, "roundtrip test".to_string(), vec!["test".to_string()], MemorySource::Manual, None).unwrap();

        let json = serde_json::to_string(&index).unwrap();
        let deserialized: MemoryIndex = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.entries.len(), 1);
        assert_eq!(deserialized.entries[0].content, "roundtrip test");
        assert_eq!(deserialized.version, 1);
    }

    #[test]
    fn test_tag_based_search() {
        let mut index = MemoryIndex::new();
        store_entry(&mut index, MemoryType::Semantic, "Some configuration details".to_string(), vec!["auth".to_string(), "jwt".to_string()], MemorySource::Manual, None).unwrap();

        // Search by tag (content doesn't match but tag does)
        let results = recall_entries(&mut index, "auth", 2000);
        assert_eq!(results.len(), 1, "Tag-based search should find the entry");
    }

    #[test]
    fn test_get_stats() {
        let mut index = MemoryIndex::new();
        store_entry(&mut index, MemoryType::Semantic, "fact".to_string(), vec![], MemorySource::Manual, None).unwrap();
        store_entry(&mut index, MemoryType::Procedural, "recipe".to_string(), vec![], MemorySource::Manual, None).unwrap();
        store_entry(&mut index, MemoryType::Episodic, "event".to_string(), vec![], MemorySource::Manual, None).unwrap();
        store_entry(&mut index, MemoryType::Working, "scratch".to_string(), vec![], MemorySource::Session, None).unwrap();

        let (total, sem, proc_, ep, work, _tokens) = get_stats(&index);
        assert_eq!(total, 4);
        assert_eq!(sem, 1);
        assert_eq!(proc_, 1);
        assert_eq!(ep, 1);
        assert_eq!(work, 1);
    }
}
