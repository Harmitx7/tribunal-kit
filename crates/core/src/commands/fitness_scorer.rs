//! Skill Fitness Scoring Engine for Tribunal Kit v10 — Sovereign Intelligence Drop 1
//!
//! Computes a composite fitness score (0.0–1.0) for any SKILL.md file by analyzing:
//! 1. Coverage Score — % of 8 critical architectural sections present
//! 2. Specificity Score — domain-specific rules vs generic boilerplate
//! 3. Dedup Score — inverse similarity to sibling skills in the same domain
//! 4. Trap Density — LLM-specific traps per 1000 tokens
//! 5. Recency Score — freshness based on `last-updated` frontmatter field
//! 6. Section Depth — average content depth per section

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

// ── Structs ─────────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FitnessReport {
    pub skill_name: String,
    pub coverage_score: f64,
    pub specificity_score: f64,
    pub dedup_score: f64,
    pub trap_density: f64,
    pub recency_score: f64,
    pub section_depth: f64,
    pub composite_fitness: f64,
    pub total_tokens_estimate: usize,
    pub recommendations: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct FitnessSummary {
    pub success: bool,
    pub total_skills: usize,
    pub scored_skills: usize,
    pub average_fitness: f64,
    pub top_skills: Vec<FitnessReport>,
    pub bottom_skills: Vec<FitnessReport>,
    pub reports: Vec<FitnessReport>,
}

// ── Critical Sections ───────────────────────────────────────────────────────

const CRITICAL_SECTIONS: &[&str] = &[
    "## Mandatory Pre-Flight Context Inspection",
    "## Activation Boundaries",
    "Multi-Pass Execution Protocol",
    "Technical Architecture",
    "Edge-Case",
    "LLM-Specific Traps",
    "Tribunal Verification",
    "Verification-Before-Completion",
];

// ── Generic Filler Phrases (penalize these) ─────────────────────────────────

const GENERIC_PHRASES: &[&str] = &[
    "best practices",
    "ensure quality",
    "follow guidelines",
    "industry standard",
    "as needed",
    "when appropriate",
    "consider using",
    "it depends",
    "use your judgment",
    "be careful",
    "make sure to",
    "don't forget to",
    "always remember",
    "keep in mind",
];

// ── Domain-Specific Indicators (reward these) ───────────────────────────────

const SPECIFIC_INDICATORS: &[&str] = &[
    "```",          // Code blocks
    "z.object",     // Zod schemas
    "Pydantic",     // Python validation
    "EXPLAIN ANALYZE", // SQL
    "useEffect",    // React hooks
    "async fn",     // Rust async
    "SELECT ",      // SQL
    "npm ",         // Package manager commands
    "cargo ",       // Rust tooling
    "pytest",       // Python testing
    "jest",         // JS testing
    "ARIA",         // Accessibility
    "WCAG",         // Web content accessibility
    "OWASP",        // Security
    "WebSocket",    // Real-time
    "gRPC",         // RPC protocol
    "GraphQL",      // Query language
    "Prisma",       // ORM
    "Drizzle",      // ORM
    "FastAPI",      // Python web framework
    "Next.js",      // React framework
    "Reanimated",   // React Native animation
    "transform:",   // CSS
    "opacity:",     // CSS animation
    "border-radius",// CSS
    "prefers-reduced-motion", // Accessibility
];

// ── Levenshtein (reuse pattern from optimize.rs) ────────────────────────────

fn levenshtein(a: &str, b: &str) -> usize {
    let a_chars: Vec<char> = a.chars().collect();
    let b_chars: Vec<char> = b.chars().collect();
    let m = a_chars.len();
    let n = b_chars.len();

    if m == 0 { return n; }
    if n == 0 { return m; }

    let mut dp = vec![vec![0usize; n + 1]; m + 1];
    for i in 0..=m { dp[i][0] = i; }
    for j in 0..=n { dp[0][j] = j; }

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
    if a_len == 0 && b_len == 0 { return 1.0; }
    let max_len = std::cmp::max(a_len, b_len);
    1.0 - (levenshtein(a, b) as f64 / max_len as f64)
}

// ── Frontmatter Parsing ─────────────────────────────────────────────────────

fn extract_frontmatter_field(content: &str, field: &str) -> Option<String> {
    if !content.starts_with("---") {
        return None;
    }
    let end_idx = content[3..].find("\n---")?;
    let frontmatter = &content[3..3 + end_idx];

    for line in frontmatter.lines() {
        let trimmed = line.trim();
        if let Some(rest) = trimmed.strip_prefix(field) {
            let rest = rest.trim_start();
            if let Some(value) = rest.strip_prefix(':') {
                return Some(value.trim().to_string());
            }
        }
    }
    None
}

fn extract_body(content: &str) -> &str {
    if !content.starts_with("---") {
        return content;
    }
    if let Some(end_idx) = content[3..].find("\n---") {
        let body_start = 3 + end_idx + 4; // skip past "\n---"
        if body_start < content.len() {
            return &content[body_start..];
        }
    }
    content
}

// ── Scoring Functions ───────────────────────────────────────────────────────

fn compute_coverage(body: &str) -> (f64, Vec<String>) {
    let body_lower = body.to_lowercase();
    let mut found = 0;
    let mut missing = Vec::new();

    for section in CRITICAL_SECTIONS {
        if body_lower.contains(&section.to_lowercase()) {
            found += 1;
        } else {
            missing.push(format!("Missing section: {}", section));
        }
    }

    let score = found as f64 / CRITICAL_SECTIONS.len() as f64;
    (score, missing)
}

fn compute_specificity(body: &str) -> f64 {
    let body_lower = body.to_lowercase();
    let total_words = body.split_whitespace().count().max(1) as f64;

    let generic_count: usize = GENERIC_PHRASES.iter()
        .map(|phrase| {
            let phrase_lower = phrase.to_lowercase();
            body_lower.matches(&phrase_lower).count()
        })
        .sum();

    let specific_count: usize = SPECIFIC_INDICATORS.iter()
        .map(|indicator| body.matches(indicator).count())
        .sum();

    // Ratio: specific indicators vs generic phrases, normalized
    let generic_density = generic_count as f64 / total_words * 100.0;
    let specific_density = specific_count as f64 / total_words * 100.0;

    // Specificity = specific / (specific + generic), clamped 0-1
    if specific_count + generic_count == 0 {
        return 0.5; // neutral
    }
    let raw = specific_density / (specific_density + generic_density + 0.001);
    raw.max(0.0).min(1.0)
}

fn compute_trap_density(body: &str) -> f64 {
    let total_tokens = body.len().max(1) as f64 / 4.0; // approx 4 chars/token

    // Count trap indicators
    let trap_markers = [
        "❌", "✅", "Anti-Pattern", "What AI Commonly Does Wrong",
        "VERIFY:", "// VERIFY", "hallucinate", "Hallucination",
        "trap", "Trap", "forbidden", "NEVER",
    ];

    let trap_count: usize = trap_markers.iter()
        .map(|marker| body.matches(marker).count())
        .sum();

    // Normalize: traps per 1000 tokens, clamped to 0-1
    let density = (trap_count as f64 / total_tokens) * 1000.0;
    (density / 20.0).max(0.0).min(1.0) // 20 traps per 1000 tokens = perfect score
}

fn compute_recency(content: &str) -> f64 {
    let last_updated = extract_frontmatter_field(content, "last-updated")
        .unwrap_or_default();

    // Parse YYYY-MM-DD format
    if last_updated.len() >= 10 {
        let parts: Vec<&str> = last_updated.split('-').collect();
        if parts.len() >= 3 {
            if let (Ok(year), Ok(month)) = (parts[0].parse::<u32>(), parts[1].parse::<u32>()) {
                // Score based on how recent (2026 is current year)
                let age_months = if year >= 2026 {
                    (2026u32.saturating_sub(year)) * 12 + 9u32.saturating_sub(month)
                } else {
                    (2026 - year) * 12 + 9
                };
                return (1.0 - (age_months as f64 / 24.0)).max(0.0).min(1.0);
            }
        }
    }
    0.3 // Unknown recency defaults to moderate penalty
}

fn compute_section_depth(body: &str) -> f64 {
    // Split by ## headers, measure average content per section
    let sections: Vec<&str> = body.split("\n## ").collect();
    if sections.len() <= 1 {
        return 0.1;
    }

    let depths: Vec<usize> = sections.iter()
        .skip(1) // skip content before first ##
        .map(|s| s.lines().count())
        .collect();

    if depths.is_empty() {
        return 0.1;
    }

    let avg_depth = depths.iter().sum::<usize>() as f64 / depths.len() as f64;
    // Normalize: 20+ lines per section = excellent
    (avg_depth / 20.0).max(0.0).min(1.0)
}

// ── Main Scoring Functions ──────────────────────────────────────────────────

pub fn score_skill(skill_path: &str) -> Result<String> {
    let path = Path::new(skill_path);
    let content = fs::read_to_string(path)
        .with_context(|| format!("Failed to read skill file: {}", skill_path))?;

    let skill_name = path.parent()
        .and_then(|p| p.file_name())
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    let body = extract_body(&content);
    let total_tokens = content.len() / 4;

    let (coverage_score, mut recommendations) = compute_coverage(body);
    let specificity_score = compute_specificity(body);
    let trap_density = compute_trap_density(body);
    let recency_score = compute_recency(&content);
    let section_depth = compute_section_depth(body);

    // Dedup score defaults to 1.0 for single skill scoring
    // (requires sibling context for proper computation)
    let dedup_score = 1.0;

    // Add recommendations based on scores
    if specificity_score < 0.4 {
        recommendations.push("Low specificity: Add more concrete code examples and framework-specific patterns".to_string());
    }
    if trap_density < 0.3 {
        recommendations.push("Low trap density: Add more LLM-specific anti-pattern traps with ❌/✅ pairs".to_string());
    }
    if recency_score < 0.5 {
        recommendations.push("Stale skill: Update `last-updated` field and refresh content for current framework versions".to_string());
    }
    if section_depth < 0.3 {
        recommendations.push("Shallow sections: Expand sections with deeper technical content and code examples".to_string());
    }

    // Composite weighted average
    let composite_fitness =
        0.25 * coverage_score
        + 0.20 * specificity_score
        + 0.15 * dedup_score
        + 0.15 * trap_density
        + 0.10 * recency_score
        + 0.15 * section_depth;

    let report = FitnessReport {
        skill_name,
        coverage_score,
        specificity_score,
        dedup_score,
        trap_density,
        recency_score,
        section_depth,
        composite_fitness,
        total_tokens_estimate: total_tokens,
        recommendations,
    };

    Ok(serde_json::to_string_pretty(&report)?)
}

pub fn score_all_skills(skills_dir: &str, repo_path: &str) -> Result<String> {
    let skills_path = Path::new(skills_dir);
    if !skills_path.exists() || !skills_path.is_dir() {
        anyhow::bail!("Skills directory not found: {}", skills_dir);
    }

    let mut reports: Vec<FitnessReport> = Vec::new();
    let mut domain_contents: HashMap<String, Vec<(String, String)>> = HashMap::new();

    // Phase 1: Read all skills and group by domain
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
        if let Ok(content) = fs::read_to_string(&skill_md) {
            let skill_name = entry.file_name().to_string_lossy().to_string();
            let domain = detect_domain(&skill_name);
            domain_contents.entry(domain).or_default()
                .push((skill_name, content));
        }
    }

    // Phase 2: Score each skill with dedup awareness
    for (domain, skills) in &domain_contents {
        for (i, (skill_name, content)) in skills.iter().enumerate() {
            let body = extract_body(content);
            let total_tokens = content.len() / 4;

            let (coverage_score, mut recommendations) = compute_coverage(body);
            let specificity_score = compute_specificity(body);
            let trap_density = compute_trap_density(body);
            let recency_score = compute_recency(content);
            let section_depth = compute_section_depth(body);

            // Compute dedup score: max similarity against all siblings in same domain
            let mut max_similarity: f64 = 0.0;
            for (j, (_, other_content)) in skills.iter().enumerate() {
                if i == j { continue; }
                let other_body = extract_body(other_content);
                // Compare first 500 chars for efficiency
                let a_sample: String = body.chars().take(500).collect();
                let b_sample: String = other_body.chars().take(500).collect();
                let sim = normalized_similarity(&a_sample, &b_sample);
                if sim > max_similarity {
                    max_similarity = sim;
                }
            }
            let dedup_score = 1.0 - max_similarity; // Lower similarity = higher dedup

            if specificity_score < 0.4 {
                recommendations.push("Low specificity: Add concrete code examples".to_string());
            }
            if trap_density < 0.3 {
                recommendations.push("Low trap density: Add LLM anti-pattern traps".to_string());
            }
            if dedup_score < 0.3 {
                recommendations.push(format!("High duplication detected in domain '{}'", domain));
            }

            let composite_fitness =
                0.25 * coverage_score
                + 0.20 * specificity_score
                + 0.15 * dedup_score
                + 0.15 * trap_density
                + 0.10 * recency_score
                + 0.15 * section_depth;

            reports.push(FitnessReport {
                skill_name: skill_name.clone(),
                coverage_score,
                specificity_score,
                dedup_score,
                trap_density,
                recency_score,
                section_depth,
                composite_fitness,
                total_tokens_estimate: total_tokens,
                recommendations,
            });
        }
    }

    // Sort by composite fitness descending
    reports.sort_by(|a, b| b.composite_fitness.partial_cmp(&a.composite_fitness).unwrap_or(std::cmp::Ordering::Equal));

    let total_skills = reports.len();
    let average_fitness = if total_skills > 0 {
        reports.iter().map(|r| r.composite_fitness).sum::<f64>() / total_skills as f64
    } else {
        0.0
    };

    let top_skills: Vec<FitnessReport> = reports.iter().take(10).cloned().collect();
    let bottom_skills: Vec<FitnessReport> = reports.iter().rev().take(10).cloned().collect();

    // Write individual fitness files
    let fitness_dir = Path::new(repo_path).join(".tribunal").join("fitness");
    fs::create_dir_all(&fitness_dir)
        .with_context(|| "Failed to create .tribunal/fitness/ directory")?;

    for report in &reports {
        let report_path = fitness_dir.join(format!("{}.json", report.skill_name));
        let json = serde_json::to_string_pretty(report)?;
        fs::write(&report_path, json)?;
    }

    let summary = FitnessSummary {
        success: true,
        total_skills,
        scored_skills: total_skills,
        average_fitness,
        top_skills,
        bottom_skills,
        reports,
    };

    // Write summary
    let summary_json = serde_json::to_string_pretty(&summary)?;
    fs::write(fitness_dir.join("fitness-summary.json"), &summary_json)?;

    Ok(summary_json)
}

// ── Domain Detection (mirrors skill_enhancement_engine.js heuristics) ───────

fn detect_domain(skill_name: &str) -> String {
    let name = skill_name.to_lowercase();
    if name.contains("anim") || name.contains("motion") || name.contains("gsap") || name.contains("lottie") || name.contains("spring") {
        "motion".to_string()
    } else if name.contains("react") || name.contains("ui") || name.contains("css") || name.contains("design") || name.contains("frontend") || name.contains("vue") || name.contains("landing") || name.contains("typography") {
        "frontend".to_string()
    } else if name.contains("sql") || name.contains("db") || name.contains("data") || name.contains("supabase") || name.contains("prisma") || name.contains("vector") {
        "database".to_string()
    } else if name.contains("security") || name.contains("audit") || name.contains("vulnerab") || name.contains("red-team") || name.contains("passkey") || name.contains("injection") {
        "security".to_string()
    } else if name.contains("test") || name.contains("qa") || name.contains("playwright") || name.contains("tdd") {
        "testing".to_string()
    } else if name.contains("devops") || name.contains("ci") || name.contains("cloud") || name.contains("bash") || name.contains("docker") || name.contains("terraform") {
        "devops".to_string()
    } else if name.contains("mobile") || name.contains("swift") || name.contains("expo") || name.contains("flutter") {
        "mobile".to_string()
    } else if name.contains("api") || name.contains("python") || name.contains("rust") || name.contains("backend") || name.contains("node") || name.contains("csharp") {
        "backend".to_string()
    } else {
        "meta".to_string()
    }
}

// ── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn create_well_formed_skill(dir: &Path) {
        let skill_dir = dir.join("test-skill");
        fs::create_dir_all(&skill_dir).unwrap();
        let content = r#"---
name: test-skill
description: Use when testing skill fitness scoring
version: 5.0.0
last-updated: 2026-09-13
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Test Skill Engineering

## Mandatory Pre-Flight Context Inspection

Before generating code, inspect these 5 parameters:

1. **System Boundaries**: Verify dependencies exist in package.json
2. **Runtime Context**: Confirm target platform (Node.js, Browser)
3. **Execution Guardrails**: Identify side-effects
4. **Validation**: Validate input schemas with Zod
5. **Observability**: Ensure tests produce output

## Activation Boundaries

- **Activate when:** Testing skill scoring
- **DO NOT activate when:** Unrelated domain

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action |
|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct objectives |
| **Pass 2** | **Plan** | Decompose into steps |
| **Pass 3** | **Execute** | Implement with zero placeholders |

## 🛠️ Technical Architecture & Reference Recipes

```typescript
const schema = z.object({ name: z.string() });
```

Use `useEffect` with explicit deps. Run `npm test` after changes.
Apply OWASP checks for security. Use Prisma for database access.

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Mitigation |
|:---|:---|:---|
| Empty inputs | Crash | Use optional chaining |

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| ❌ Hallucinated imports | Importing non-existent packages | ✅ Verify in package.json first |

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `logic-reviewer` · `security-auditor`

### 🛑 Verification-Before-Completion (VBC) Protocol

- ❌ **Forbidden:** Declaring complete without tests
- ✅ **Required:** Provide terminal proof
"#;
        fs::write(skill_dir.join("SKILL.md"), content).unwrap();
    }

    fn create_minimal_skill(dir: &Path) {
        let skill_dir = dir.join("minimal-skill");
        fs::create_dir_all(&skill_dir).unwrap();
        let content = r#"---
name: minimal-skill
description: A minimal skill
version: 1.0.0
---

# Minimal Skill

Some basic content without any structured sections.
"#;
        fs::write(skill_dir.join("SKILL.md"), content).unwrap();
    }

    #[test]
    fn test_score_well_formed_skill() {
        let temp_dir = std::env::temp_dir().join(format!("fitness_test_wf_{}", std::process::id()));
        create_well_formed_skill(&temp_dir);
        let skill_path = temp_dir.join("test-skill").join("SKILL.md");

        let result = score_skill(skill_path.to_str().unwrap()).unwrap();
        let report: FitnessReport = serde_json::from_str(&result).unwrap();

        assert!(report.composite_fitness > 0.5, "Well-formed skill should score > 0.5, got {}", report.composite_fitness);
        assert!(report.coverage_score > 0.7, "Coverage should be > 0.7, got {}", report.coverage_score);

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_score_minimal_skill() {
        let temp_dir = std::env::temp_dir().join(format!("fitness_test_min_{}", std::process::id()));
        create_minimal_skill(&temp_dir);
        let skill_path = temp_dir.join("minimal-skill").join("SKILL.md");

        let result = score_skill(skill_path.to_str().unwrap()).unwrap();
        let report: FitnessReport = serde_json::from_str(&result).unwrap();

        assert!(report.composite_fitness < 0.5, "Minimal skill should score < 0.5, got {}", report.composite_fitness);
        assert!(report.recommendations.len() > 0, "Should have recommendations");

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_score_all_skills() {
        let temp_dir = std::env::temp_dir().join(format!("fitness_test_all_{}", std::process::id()));
        let skills_dir = temp_dir.join("skills");
        fs::create_dir_all(&skills_dir).unwrap();

        create_well_formed_skill(&skills_dir);
        create_minimal_skill(&skills_dir);

        let repo_dir = temp_dir.join("repo");
        fs::create_dir_all(&repo_dir).unwrap();

        let result = score_all_skills(
            skills_dir.to_str().unwrap(),
            repo_dir.to_str().unwrap(),
        ).unwrap();
        let summary: FitnessSummary = serde_json::from_str(&result).unwrap();

        assert!(summary.success);
        assert_eq!(summary.total_skills, 2);
        assert!(summary.average_fitness > 0.0);

        // Verify files were written
        assert!(repo_dir.join(".tribunal/fitness/fitness-summary.json").exists());

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_empty_skills_dir() {
        let temp_dir = std::env::temp_dir().join(format!("fitness_test_empty_{}", std::process::id()));
        let skills_dir = temp_dir.join("empty_skills");
        fs::create_dir_all(&skills_dir).unwrap();

        let repo_dir = temp_dir.join("repo");
        fs::create_dir_all(&repo_dir).unwrap();

        let result = score_all_skills(
            skills_dir.to_str().unwrap(),
            repo_dir.to_str().unwrap(),
        ).unwrap();
        let summary: FitnessSummary = serde_json::from_str(&result).unwrap();

        assert!(summary.success);
        assert_eq!(summary.total_skills, 0);

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_recency_scoring() {
        let content_recent = "---\nlast-updated: 2026-09-13\n---\n# Test";
        let content_old = "---\nlast-updated: 2024-01-01\n---\n# Test";
        let content_none = "---\nname: test\n---\n# Test";

        let recent = compute_recency(content_recent);
        let old = compute_recency(content_old);
        let none = compute_recency(content_none);

        assert!(recent > old, "Recent should score higher than old");
        assert_eq!(none, 0.3, "Missing date should default to 0.3");
    }
}
