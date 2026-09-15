use anyhow::{Context, Result};
use owo_colors::OwoColorize;
use serde::{Deserialize, Serialize};

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

pub fn render_leaderboard(skills_dir: &str, repo_path: &str, limit: usize) -> Result<String> {
    // 1. Run the fitness scorer to get live scores
    let summary_json = crate::commands::fitness_scorer::score_all_skills(skills_dir, repo_path)
        .context("Failed to run fitness scorer for leaderboard")?;

    let summary: FitnessSummary = serde_json::from_str(&summary_json)?;

    let mut out = String::new();
    out.push_str(&format!(
        "\n{}\n",
        "🏆 Tribunal Kit Skill Leaderboard".bold().bright_magenta()
    ));
    out.push_str(&format!(
        "Total Skills: {} | Avg Fitness: {:.2}\n",
        summary.total_skills.bold().cyan(),
        summary.average_fitness.bold().yellow()
    ));
    
    out.push_str(&"┌────┬──────────────────────────────────────┬───────┬───────┬───────┐\n".to_string());
    out.push_str(&format!(
        "│ {}  │ {:<36} │ {} │ {} │ {} │\n",
        "#".bold(),
        "Skill".bold(),
        "Score".bold(),
        "Traps".bold(),
        "Tokens".bold()
    ));
    out.push_str(&"├────┼──────────────────────────────────────┼───────┼───────┼───────┤\n".to_string());

    let mut rank = 1;
    for report in summary.reports.iter().take(limit) {
        let score_str = format!("{:.2}", report.composite_fitness);
        let score_color = if report.composite_fitness > 0.90 {
            score_str.bright_green().to_string()
        } else if report.composite_fitness > 0.70 {
            score_str.bright_yellow().to_string()
        } else {
            score_str.bright_red().to_string()
        };

        out.push_str(&format!(
            "│ {:<2} │ {:<36} │ {}  │ {:.2}  │ {:<5} │\n",
            rank,
            report.skill_name.cyan(),
            score_color,
            report.trap_density,
            report.total_tokens_estimate
        ));
        rank += 1;
    }

    out.push_str(&"└────┴──────────────────────────────────────┴───────┴───────┴───────┘\n".to_string());

    Ok(out)
}
