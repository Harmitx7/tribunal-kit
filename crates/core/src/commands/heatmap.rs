use anyhow::{Context, Result};
use crate::commands::telemetry::TelemetrySummary;

pub fn generate_heatmap(repo_path: &str) -> Result<String> {
    let summary_json = crate::commands::telemetry::summarize_telemetry(repo_path)
        .context("Failed to get telemetry summary")?;
    
    let summary: TelemetrySummary = serde_json::from_str(&summary_json)
        .context("Failed to parse telemetry summary")?;

    let mut out = String::new();
    out.push_str("\n\x1b[1m\x1b[36m━━━ Tribunal Agent Performance Heatmap ━━━━━━━━━━━━━━━━━━━\x1b[0m\n\n");

    if summary.total_dispatches == 0 {
        out.push_str("  No telemetry data found. Run some tasks first.\n\n");
    } else {
        out.push_str("  \x1b[1mAgent Name                | Dispatches | Success % | Avg Time \x1b[0m\n");
        out.push_str("  --------------------------+------------+-----------+----------\n");

        let mut stats = summary.agent_stats;
        // Sort by dispatch count descending
        stats.sort_by(|a, b| b.dispatch_count.cmp(&a.dispatch_count));

        for stat in stats {
            // Color code the success rate
            let success_color = if stat.success_rate >= 90.0 {
                "\x1b[32m" // Green
            } else if stat.success_rate >= 70.0 {
                "\x1b[33m" // Yellow
            } else {
                "\x1b[31m" // Red
            };

            // Heatmap block representation based on dispatch volume (max 10 blocks)
            let max_dispatches = 50.0; // arbitrary scale for heatmap
            let blocks = ((stat.dispatch_count as f64 / max_dispatches) * 10.0).min(10.0) as usize;
            let heatmap_bar = "█".repeat(blocks) + &"░".repeat(10 - blocks);

            out.push_str(&format!(
                "  \x1b[1m{:<25}\x1b[0m | {:<10} | {}{:>7.1}%\x1b[0m | {:>6.0}ms  {}\n",
                stat.agent_name,
                stat.dispatch_count,
                success_color,
                stat.success_rate,
                stat.avg_duration_ms,
                heatmap_bar
            ));
        }
    }

    out.push_str("\n\x1b[1m\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n");

    // Wrap in JSON for the wrapper to parse if it wants, or just return raw text.
    let report_json = serde_json::json!({
        "success": true,
        "ansi_output": out
    });

    Ok(serde_json::to_string(&report_json)?)
}
