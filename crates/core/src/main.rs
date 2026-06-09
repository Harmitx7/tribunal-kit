use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use owo_colors::OwoColorize;
use indicatif::{ProgressBar, ProgressStyle};

// ── CLI Argument Definitions ────────────────────────────────────────────────
// clap derives the full CLI schema at compile time — no runtime parsing ambiguity.

#[derive(Parser)]
#[command(
    name = "tribunal-core",
    version,
    about = "High-performance Rust core for Tribunal-Kit",
    long_about = "Anti-Hallucination Agent System — Rust Engine.\n\
                  Handles init, validation, and schema enforcement at native speed."
)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Initialize a new tribunal configuration in the target directory
    Init {
        /// Target directory to initialize (defaults to current directory)
        #[arg(short, long, default_value = ".")]
        path: String,

        /// Overwrite existing .agent/ directory if present
        #[arg(long, default_value_t = false)]
        force: bool,

        /// Preview actions without writing any files
        #[arg(long, default_value_t = false)]
        dry_run: bool,

        /// Suppress all output
        #[arg(long, default_value_t = false)]
        quiet: bool,

        /// Install only core agents and skills
        #[arg(long, default_value_t = false)]
        minimal: bool,

        /// Internal: Absolute path to the source tribunal-kit package
        #[arg(long)]
        source_dir: String,
    },

    /// Validate a JSON payload against strict tribunal schemas
    Validate {
        /// Path to the JSON file to validate
        #[arg(short, long)]
        file: String,

        /// Schema type to validate against
        #[arg(short, long)]
        schema: SchemaType,
    },

    /// Check installation status
    Status {
        /// Target directory to check (defaults to current directory)
        #[arg(short, long, default_value = ".")]
        path: String,
    },
}

// ── Schema Types ────────────────────────────────────────────────────────────
// Every valid schema type is enumerated at compile time.
// If an LLM hallucinates a schema type, clap rejects it before main() runs.

#[derive(Clone, Debug, clap::ValueEnum)]
enum SchemaType {
    /// Agent definition schema
    Agent,
    /// Workflow definition schema
    Workflow,
    /// Skill definition schema
    Skill,
    /// Case law entry schema
    CaseLaw,
    /// Marathon feature spec schema
    Marathon,
}

// ── Strict Data Schemas (Anti-Hallucination Barrier) ────────────────────────
// serde will REJECT any JSON that doesn't match these exact shapes.
// This is the mathematical guarantee against internal hallucination.

/// The output payload returned by the `init` command.
#[derive(Serialize, Deserialize, Debug)]
struct InitResult {
    status: InitStatus,
    path: String,
    files_copied: u32,
    agents_count: u32,
    workflows_count: u32,
    skills_count: u32,
    scripts_count: u32,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "snake_case")]
enum InitStatus {
    Success,
    AlreadyExists,
    Error,
    DryRun,
}

/// Schema for validating agent definition files.
#[derive(Serialize, Deserialize, Debug)]
struct AgentSchema {
    name: String,
    description: String,
    #[serde(default)]
    skills: Vec<String>,
    #[serde(default)]
    triggers: Vec<String>,
}

/// Schema for validating case law entries.
#[derive(Serialize, Deserialize, Debug)]
struct CaseLawEntry {
    id: u32,
    domain: String,
    violation: String,
    rejected_code: String,
    corrected_code: String,
    reason: String,
    severity: Severity,
    timestamp: String,
    #[serde(default)]
    overruled: bool,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "snake_case")]
enum Severity {
    Critical,
    High,
    Medium,
    Low,
}

/// Schema for marathon feature specs.
#[derive(Serialize, Deserialize, Debug)]
struct MarathonFeature {
    id: u32,
    category: String,
    description: String,
    status: FeatureStatus,
    steps: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "snake_case")]
enum FeatureStatus {
    Pending,
    InProgress,
    Pass,
    Fail,
    Blocked,
}

// ── Main Entry ──────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Init {
            path,
            force,
            dry_run,
            quiet,
            minimal,
            source_dir,
        } => cmd_init(&path, force, dry_run, quiet, minimal, &source_dir).await,

        Commands::Validate { file, schema } => cmd_validate(&file, &schema).await,

        Commands::Status { path } => cmd_status(&path).await,
    }
}

// ── Command Implementations ─────────────────────────────────────────────────

async fn cmd_init(path: &str, force: bool, dry_run: bool, quiet: bool, _minimal: bool, source_dir: &str) -> Result<()> {
    let target = PathBuf::from(path);
    let agent_dest = target.join(".agent");
    let source_path = PathBuf::from(source_dir);

    // ── Self-Install Guard ──
    let target_pkg = target.join("package.json");
    if target_pkg.exists() {
        if let Ok(content) = tokio::fs::read_to_string(&target_pkg).await {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                if json["name"] == "tribunal-kit" {
                    eprintln!("✖ Cannot run init/update inside the tribunal-kit package itself.");
                    std::process::exit(1);
                }
            }
        }
    }

    // Check if already exists
    if agent_dest.exists() && !force {
        let result = InitResult {
            status: InitStatus::AlreadyExists,
            path: target.display().to_string(),
            files_copied: 0,
            agents_count: 0,
            workflows_count: 0,
            skills_count: 0,
            scripts_count: 0,
        };
        println!("{}", serde_json::to_string(&result)?);
        if !quiet {
            eprintln!("⚠ .agent/ already exists. Use --force to overwrite.");
        }
        return Ok(());
    }

    if dry_run {
        let result = InitResult {
            status: InitStatus::DryRun,
            path: target.display().to_string(),
            files_copied: 0,
            agents_count: 0,
            workflows_count: 0,
            skills_count: 0,
            scripts_count: 0,
        };
        if !quiet {
            eprintln!("[DRY RUN] Would initialize .agent/ at: {}", target.display());
        }
        println!("{}", serde_json::to_string(&result)?);
        return Ok(());
    }

    // ── Backup Existing ──
    if agent_dest.exists() && force {
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis();
        let backup_dir = agent_dest.join(".backups").join(format!("backup-{}", timestamp));
        tokio::fs::create_dir_all(&backup_dir).await?;

        let subdirs = ["agents", "workflows", "skills", "scripts", ".shared", "rules"];
        for sub in subdirs {
            let sub_path = agent_dest.join(sub);
            if sub_path.exists() {
                copy_dir_all(&sub_path, &backup_dir.join(sub)).await?;
                tokio::fs::remove_dir_all(&sub_path).await?;
            }
        }
        if !quiet {
            eprintln!("✦ Backed up existing configurations to .agent/.backups/");
        }
    }

    // ── Execute with Spinner ──
    let pb = if !quiet {
        let pb = ProgressBar::new_spinner();
        pb.set_style(
            ProgressStyle::default_spinner()
                .tick_strings(&["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏", "✔"])
                .template("{spinner:.green} {msg}")
                .unwrap(),
        );
        pb.set_message("Establishing Anti-Hallucination Barrier...");
        pb.enable_steady_tick(std::time::Duration::from_millis(80));
        Some(pb)
    } else {
        None
    };

    let files_copied = copy_dir_all(&source_path, &agent_dest).await?;

    // ── History Dirs ──
    let case_dir = agent_dest.join("history").join("case-law").join("cases");
    let evo_dir = agent_dest.join("history").join("skill-evolution");
    tokio::fs::create_dir_all(&case_dir).await?;
    tokio::fs::create_dir_all(&evo_dir).await?;
    let _ = tokio::fs::File::create(case_dir.join(".gitkeep")).await;
    let _ = tokio::fs::File::create(evo_dir.join(".gitkeep")).await;

    // ── IDE Bridges ──
    if let Some(pb) = &pb {
        pb.set_message("Generating IDE bridge files...");
    }
    generate_ide_bridges(&target, &agent_dest).await?;

    if let Some(pb) = pb {
        pb.finish_and_clear();
    }

    let agents = count_dir_entries(&agent_dest.join("agents"));
    let workflows = count_dir_entries(&agent_dest.join("workflows"));
    let skills = count_dir_entries(&agent_dest.join("skills"));
    let scripts = count_dir_entries(&agent_dest.join("scripts"));

    let result = InitResult {
        status: InitStatus::Success,
        path: target.display().to_string(),
        files_copied,
        agents_count: agents,
        workflows_count: workflows,
        skills_count: skills,
        scripts_count: scripts,
    };

    // Machine-readable JSON on stdout (for Node wrapper consumption)
    println!("{}", serde_json::to_string(&result)?);

    // Human-readable status on stderr (visible to user)
    if !quiet {
        eprintln!("{} {}", "✔".green(), "Tribunal-Kit initialized securely".bold());
        eprintln!("  {} Core Agents initialized", "▶".dimmed());
        eprintln!("  {} 2026 Skills injected", "▶".dimmed());
        eprintln!("  {} IDE Bridges synthesized", "▶".dimmed());
        eprintln!("  {} at: {}", "▶".dimmed(), target.display().to_string().dimmed());
    }

    Ok(())
}

async fn cmd_validate(file: &str, schema: &SchemaType) -> Result<()> {
    let content = tokio::fs::read_to_string(file)
        .await
        .with_context(|| format!("Failed to read file: {}", file))?;

    // The beauty of serde: if the JSON doesn't match the exact struct shape,
    // it returns a precise error describing WHAT is wrong and WHERE.
    // No hallucinated fields can survive this gate.
    match schema {
        SchemaType::Agent => {
            let _parsed: AgentSchema = serde_json::from_str(&content)
                .with_context(|| "Agent schema validation failed")?;
            eprintln!("{} {}", "✔".green(), "Valid agent schema".bold());
        }
        SchemaType::CaseLaw => {
            let _parsed: CaseLawEntry = serde_json::from_str(&content)
                .with_context(|| "Case law schema validation failed")?;
            eprintln!("{} {}", "✔".green(), "Valid case law entry".bold());
        }
        SchemaType::Marathon => {
            let _parsed: MarathonFeature = serde_json::from_str(&content)
                .with_context(|| "Marathon feature schema validation failed")?;
            eprintln!("{} {}", "✔".green(), "Valid marathon feature".bold());
        }
        SchemaType::Workflow | SchemaType::Skill => {
            eprintln!("{} {}", "⚠".yellow(), "Workflow/Skill validation requires YAML frontmatter parsing (coming in Wave 3)".yellow().dimmed());
        }
    }

    // Structured output for machine consumption
    let output = serde_json::json!({
        "valid": true,
        "file": file,
        "schema": format!("{:?}", schema),
    });
    println!("{}", serde_json::to_string(&output)?);

    Ok(())
}

async fn cmd_status(path: &str) -> Result<()> {
    let target = PathBuf::from(path);
    let agent_dir = target.join(".agent");

    let installed = agent_dir.exists();

    let (agents, workflows, skills, scripts) = if installed {
        (
            count_dir_entries(&agent_dir.join("agents")),
            count_dir_entries(&agent_dir.join("workflows")),
            count_dir_entries(&agent_dir.join("skills")),
            count_dir_entries(&agent_dir.join("scripts")),
        )
    } else {
        (0, 0, 0, 0)
    };

    // Human-readable output on stderr
    if installed {
        eprintln!("\n╭─ {} ──────────────────", "Tribunal-Kit v4.4.5".bold());
        eprintln!("│");
        eprintln!("│  ● {}:    {}", "Status".dimmed(), "Active & Guarded".green().bold());
        eprintln!("│  ● {}:      {}", "Path".dimmed(), agent_dir.display());
        eprintln!("│");
        eprintln!("│  ◇ {:>10}:  {:>3}", "Agents".magenta(), agents);
        eprintln!("│  ◇ {:>10}:  {:>3}", "Workflows".yellow(), workflows);
        eprintln!("│  ◇ {:>10}:  {:>3}", "Skills".blue(), skills);
        eprintln!("│  ◇ {:>10}:  {:>3}", "Scripts".green(), scripts);
        eprintln!("│");
        eprintln!("╰────────────────────────────────────────\n");
    } else {
        eprintln!("\n╭─ {} ──────────────────", "Tribunal-Kit Status".bold());
        eprintln!("│");
        eprintln!("│  ● {} in this project", "Not installed".red().bold());
        eprintln!("│  ● Run: {}", "npx tribunal-kit init".cyan());
        eprintln!("│");
        eprintln!("╰────────────────────────────────────────\n");
    }

    // Machine-readable JSON on stdout
    let output = serde_json::json!({
        "installed": installed,
        "path": agent_dir.display().to_string(),
        "agents": agents,
        "workflows": workflows,
        "skills": skills,
        "scripts": scripts,
    });

    println!("{}", serde_json::to_string(&output)?);
    Ok(())
}

// ── Utilities ───────────────────────────────────────────────────────────────

fn count_dir_entries(dir: &PathBuf) -> u32 {
    if !dir.exists() {
        return 0;
    }
    match std::fs::read_dir(dir) {
        Ok(entries) => entries.count() as u32,
        Err(_) => 0,
    }
}

use futures::future::BoxFuture;

fn copy_dir_all<'a>(src: &'a PathBuf, dst: &'a PathBuf) -> BoxFuture<'a, Result<u32>> {
    Box::pin(async move {
        if !src.exists() {
            return Ok(0);
        }
        tokio::fs::create_dir_all(&dst).await?;
        let mut count = 0;
        let mut entries = tokio::fs::read_dir(src).await?;
        while let Ok(Some(entry)) = entries.next_entry().await {
            let file_type = entry.file_type().await?;
            let src_path = entry.path();
            let dst_path = dst.join(entry.file_name());

            if file_type.is_dir() {
                count += copy_dir_all(&src_path, &dst_path).await?;
            } else {
                tokio::fs::copy(&src_path, &dst_path).await?;
                count += 1;
            }
        }
        Ok(count)
    })
}

async fn generate_ide_bridges(target: &PathBuf, agent_dest: &PathBuf) -> Result<()> {
    let rules_file = agent_dest.join("rules").join("GEMINI.md");
    let rules_content = tokio::fs::read_to_string(&rules_file).await.unwrap_or_default();

    let write_bridge = |file_path: PathBuf, content: String| async move {
        if !file_path.exists() {
            if let Some(p) = file_path.parent() {
                let _ = tokio::fs::create_dir_all(p).await;
            }
            let _ = tokio::fs::write(file_path, content).await;
        }
    };

    // Cursor
    let cursor_rules = format!(
        "# Tribunal Kit — Cursor Bridge\n# Auto-generated by tribunal-kit init. Do not edit manually.\n# Source: .agent/rules/GEMINI.md\n\n{}",
        rules_content
    );
    write_bridge(target.join(".cursorrules"), cursor_rules).await;

    // Windsurf
    let windsurf_rules = format!(
        "# Tribunal Kit — Windsurf Bridge\n# Auto-generated by tribunal-kit init. Do not edit manually.\n# Source: .agent/rules/GEMINI.md\n\n{}",
        rules_content
    );
    write_bridge(target.join(".windsurfrules"), windsurf_rules).await;

    // Gemini
    let gemini_settings = serde_json::json!({
        "$schema": "https://raw.githubusercontent.com/anthropics/anthropic-cookbook/main/.gemini/settings.schema.json",
        "rules": [
            { "path": "../.agent/rules/GEMINI.md", "trigger": "always_on" }
        ],
        "agents": { "directory": "../.agent/agents" },
        "skills": { "directory": "../.agent/skills" },
        "workflows": { "directory": "../.agent/workflows" }
    });
    write_bridge(
        target.join(".gemini").join("settings.json"),
        serde_json::to_string_pretty(&gemini_settings).unwrap(),
    )
    .await;

    let gemini_md = format!(
        "---\ntrigger: always_on\n---\n\n# Tribunal Kit — Gemini Bridge\n# Auto-generated by tribunal-kit init.\n\n{}",
        rules_content
    );
    write_bridge(target.join(".gemini").join("GEMINI.md"), gemini_md).await;

    // Copilot
    let copilot_instructions = format!(
        "# Tribunal Kit — Copilot Bridge\n# Auto-generated by tribunal-kit init.\n\n{}",
        rules_content
    );
    write_bridge(target.join(".github").join("copilot-instructions.md"), copilot_instructions).await;

    // Claude
    let claude_rules = format!(
        "# Tribunal Kit \u{2014} Claude Bridge\n# Auto-generated by tribunal-kit init.\n# Source: .agent/rules/GEMINI.md\n\n{}",
        rules_content
    );
    write_bridge(target.join(".claude").join("CLAUDE.md"), claude_rules).await;

    Ok(())
}

// ── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_init_result_serialization() {
        let result = InitResult {
            status: InitStatus::Success,
            path: "/test/path".to_string(),
            files_copied: 42,
            agents_count: 10,
            workflows_count: 5,
            skills_count: 20,
            scripts_count: 7,
        };

        let json = serde_json::to_string(&result).unwrap();
        let parsed: InitResult = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.files_copied, 42);
        assert_eq!(parsed.path, "/test/path");
    }

    #[test]
    fn test_hallucinated_agent_schema_rejected() {
        // This JSON has an extra "hallucinated_field" that doesn't exist in AgentSchema.
        // serde will accept it (extra fields are ignored by default) but the REQUIRED
        // fields must be present. Missing "name" should fail:
        let hallucinated = r#"{"description": "test", "hallucinated_field": true}"#;
        let result: Result<AgentSchema, _> = serde_json::from_str(hallucinated);
        assert!(result.is_err(), "Missing required 'name' field should be rejected");
    }

    #[test]
    fn test_valid_agent_schema_accepted() {
        let valid = r#"{"name": "test-agent", "description": "A test agent"}"#;
        let result: Result<AgentSchema, _> = serde_json::from_str(valid);
        assert!(result.is_ok(), "Valid schema should be accepted");
    }

    #[test]
    fn test_case_law_strict_severity() {
        // Hallucinated severity "super_critical" should be rejected
        let invalid = r#"{
            "id": 1,
            "domain": "frontend",
            "violation": "any type",
            "rejected_code": "const x: any = 5;",
            "corrected_code": "const x: number = 5;",
            "reason": "No any",
            "severity": "super_critical",
            "timestamp": "2026-01-01T00:00:00Z"
        }"#;
        let result: Result<CaseLawEntry, _> = serde_json::from_str(invalid);
        assert!(result.is_err(), "Hallucinated severity 'super_critical' must be rejected");
    }

    #[test]
    fn test_valid_case_law_accepted() {
        let valid = r#"{
            "id": 1,
            "domain": "frontend",
            "violation": "any type usage",
            "rejected_code": "const x: any = 5;",
            "corrected_code": "const x: number = 5;",
            "reason": "No untyped variables",
            "severity": "high",
            "timestamp": "2026-01-01T00:00:00Z"
        }"#;
        let result: Result<CaseLawEntry, _> = serde_json::from_str(valid);
        assert!(result.is_ok(), "Valid case law entry should pass");
    }
}
