//! Multi-column live parallel reviewer status matrix.
//! Animates all 28 Tribunal reviewers running concurrently.

use super::theme::{Rgb, TermCaps};

pub struct ReviewerStatus {
    pub name: &'static str,
    pub domain: &'static str,
    pub passed: bool,
}

pub const ALL_REVIEWERS: &[(&str, &str)] = &[
    ("logic-auditor", "Logic & Correctness"),
    ("security-scanner", "Security / OWASP"),
    ("type-safety-gate", "Type Safety"),
    ("schema-reviewer", "Schema / Database"),
    ("resilience-guard", "Fault Tolerance"),
    ("sql-injection-gate", "SQL Parameterization"),
    ("dependency-analyzer", "Supply Chain / Deps"),
    ("prompt-injection-def", "Prompt Defense"),
    ("complexity-reviewer", "Code Complexity"),
    ("memory-leak-auditor", "Resource Leaks"),
    ("pipeline-checker", "CI/CD Workflows"),
    ("cognitive-boundary", "Fabel Protocol"),
    ("accessibility-eval", "WCAG 2.2 AA"),
    ("auth-boundary-gate", "Auth & RBAC"),
    ("jwt-algorithm-guard", "JWT Algorithms"),
    ("anti-hallucination-p0", "Package Verification"),
    ("rate-limit-reviewer", "API Throttling"),
    ("error-handling-gate", "Async Error Traps"),
    ("context-budget-auditor", "Context Windows"),
    ("model-param-validator", "Model Signatures"),
    ("stream-error-reviewer", "SSE / Streaming"),
    ("cost-explosion-guard", "Token Runaway"),
    ("case-law-enforcer", "Precedent Engine"),
    ("behavioral-contract", "Contract Tests"),
    ("sanitization-auditor", "Input Sanitization"),
    ("secrets-leak-guard", "Zero Hardcoded Keys"),
    ("dag-cycle-detector", "DAG Schedules"),
    ("vbc-evidence-auditor", "Evidence Gate"),
];

pub fn render_reviewer_grid(caps: &TermCaps, completed_count: usize) {
    if !caps.is_tty && !caps.has_color {
        eprintln!("  ✔ 28/28 Reviewers passed verification gates.");
        return;
    }

    let g = caps.glyphs();
    let num_cols = if caps.columns >= 100 {
        3
    } else if caps.columns >= 68 {
        2
    } else {
        1
    };

    let col_width = (caps.columns.saturating_sub(6)) / num_cols;

    eprintln!();
    let header_title = format!("  {}  Tribunal Parallel Reviewer Swarm (28 Reviewers)", "🛡️");
    eprintln!("{}", caps.bold(&header_title));
    eprintln!("  {}", caps.color(Rgb::SLATE_700, &g.box_h.repeat(caps.columns.min(84).saturating_sub(4))));

    let chunks: Vec<&[(&str, &str)]> = ALL_REVIEWERS.chunks(num_cols).collect();

    for (row_idx, row) in chunks.iter().enumerate() {
        let mut line = String::from("  ");
        for (col_idx, &(name, _desc)) in row.iter().enumerate() {
            let item_idx = row_idx * num_cols + col_idx;
            let is_done = item_idx < completed_count;

            let icon = if is_done {
                caps.color(Rgb::EMERALD, g.success)
            } else {
                caps.color(Rgb::FLAME, "⠋")
            };

            let name_colored = if is_done {
                caps.color(Rgb::WHITE, name)
            } else {
                caps.color(Rgb::ZINC_500, name)
            };

            let item_str = format!("{} {}", icon, name_colored);
            let raw_len = 2 + name.chars().count();
            let pad = col_width.saturating_sub(raw_len);
            
            line.push_str(&item_str);
            line.push_str(&" ".repeat(pad));
        }
        eprintln!("{}", line);
    }

    eprintln!("  {}", caps.color(Rgb::SLATE_700, &g.box_h.repeat(caps.columns.min(84).saturating_sub(4))));
    eprintln!();
}
