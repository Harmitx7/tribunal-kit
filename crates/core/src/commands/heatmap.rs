use crate::commands::telemetry::TelemetrySummary;
use anyhow::{Context, Result};

pub fn generate_heatmap(repo_path: &str) -> Result<String> {
    let summary_json = crate::commands::telemetry::summarize_telemetry(repo_path)
        .context("Failed to get telemetry summary")?;

    let summary: TelemetrySummary =
        serde_json::from_str(&summary_json).context("Failed to parse telemetry summary")?;

    let mut out = String::new();
    out.push_str(
        "\n\x1b[1m\x1b[36m━━━ Tribunal Agent Performance Heatmap ━━━━━━━━━━━━━━━━━━━\x1b[0m\n\n",
    );

    if summary.total_dispatches == 0 {
        out.push_str("  No telemetry data found. Run some tasks first.\n\n");
    } else {
        out.push_str(
            "  \x1b[1mAgent Name                | Dispatches | Success % | Avg Time \x1b[0m\n",
        );
        out.push_str("  --------------------------+------------+-----------+----------\n");

        let mut stats = summary.agent_stats;
        // Sort by dispatch count descending
        stats.sort_by_key(|b| std::cmp::Reverse(b.dispatch_count));

        for stat in stats {
            let success_pct = if stat.success_rate <= 1.0 {
                stat.success_rate * 100.0
            } else {
                stat.success_rate
            };

            // Color code the success rate
            let success_color = if success_pct >= 90.0 {
                "\x1b[32m" // Green
            } else if success_pct >= 70.0 {
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
                success_pct,
                stat.avg_duration_ms,
                heatmap_bar
            ));
        }
    }

    out.push_str(
        "\n\x1b[1m\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n",
    );

    // Wrap in JSON for the wrapper to parse if it wants, or just return raw text.
    let report_json = serde_json::json!({
        "success": true,
        "ansi_output": out
    });

    Ok(serde_json::to_string(&report_json)?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_generate_heatmap_empty_repo() {
        let temp_dir = std::env::temp_dir().join(format!("heatmap_empty_{}", std::process::id()));
        fs::create_dir_all(&temp_dir).unwrap();

        let res_json = generate_heatmap(temp_dir.to_str().unwrap()).unwrap();
        let res: serde_json::Value = serde_json::from_str(&res_json).unwrap();

        assert_eq!(res["success"], true);
        assert!(res["ansi_output"]
            .as_str()
            .unwrap()
            .contains("No telemetry data found"));

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_generate_heatmap_with_data() {
        let temp_dir = std::env::temp_dir().join(format!("heatmap_data_{}", std::process::id()));
        let telemetry_dir = temp_dir.join(".tribunal").join("telemetry");
        fs::create_dir_all(&telemetry_dir).unwrap();

        let event1 = r#"{"timestamp":"2026-10-25T10:00:00Z","agent_name":"backend-specialist","outcome":"COMPLETE","duration_ms":120}"#;
        let event2 = r#"{"timestamp":"2026-10-25T10:01:00Z","agent_name":"backend-specialist","outcome":"FAILED","duration_ms":180}"#;
        fs::write(
            telemetry_dir.join("dispatch.jsonl"),
            format!("{}\n{}\n", event1, event2),
        )
        .unwrap();

        let res_json = generate_heatmap(temp_dir.to_str().unwrap()).unwrap();
        let res: serde_json::Value = serde_json::from_str(&res_json).unwrap();

        assert_eq!(res["success"], true);
        let out = res["ansi_output"].as_str().unwrap();
        assert!(out.contains("backend-specialist"));
        assert!(out.contains("50.0%"));

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
