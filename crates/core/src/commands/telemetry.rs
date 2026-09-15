//! Dispatch Telemetry Collector for Tribunal Kit v10 — Sovereign Intelligence Drop 1
//!
//! Local-only event logging for every agent dispatch outcome.
//! Records events to `.tribunal/telemetry/dispatch.jsonl` (append-only JSONL).
//! Provides aggregation for per-agent performance statistics.
//! Zero network calls. Strictly local. Privacy-first.

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::{BufRead, Write};
use std::path::Path;

// ── Event Schema ────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DispatchEvent {
    pub timestamp: String,
    pub agent_name: String,
    #[serde(default)]
    pub skills_loaded: Vec<String>,
    #[serde(default)]
    pub task_classification: String,
    #[serde(default)]
    pub impact_tier: u8,
    pub outcome: String,
    #[serde(default)]
    pub revision_count: u32,
    #[serde(default)]
    pub token_budget_used: u32,
    #[serde(default)]
    pub duration_ms: u64,
}

// ── Summary Schema ──────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AgentStat {
    pub agent_name: String,
    pub dispatch_count: usize,
    pub success_rate: f64,
    pub avg_duration_ms: f64,
    pub avg_revisions: f64,
    pub total_tokens: u64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TelemetrySummary {
    pub success: bool,
    pub total_dispatches: usize,
    pub unique_agents: usize,
    pub avg_approval_rate: f64,
    pub avg_duration_ms: f64,
    pub agent_stats: Vec<AgentStat>,
    pub classification_breakdown: HashMap<String, usize>,
    pub outcome_breakdown: HashMap<String, usize>,
    pub tier_breakdown: HashMap<String, usize>,
}

// ── Telemetry Directory ─────────────────────────────────────────────────────

fn ensure_telemetry_dir(repo_path: &str) -> Result<std::path::PathBuf> {
    let telemetry_dir = Path::new(repo_path).join(".tribunal").join("telemetry");
    if !telemetry_dir.exists() {
        fs::create_dir_all(&telemetry_dir)
            .with_context(|| format!("Failed to create telemetry directory: {:?}", telemetry_dir))?;
    }
    Ok(telemetry_dir)
}

fn get_dispatch_log_path(repo_path: &str) -> Result<std::path::PathBuf> {
    let telemetry_dir = ensure_telemetry_dir(repo_path)?;
    Ok(telemetry_dir.join("dispatch.jsonl"))
}

// ── Record a Dispatch Event ─────────────────────────────────────────────────

pub fn record_dispatch(event_json: &str, repo_path: &str) -> Result<String> {
    // Validate the event JSON
    let event: DispatchEvent = serde_json::from_str(event_json)
        .with_context(|| "Failed to parse dispatch event JSON")?;

    let log_path = get_dispatch_log_path(repo_path)?;

    // Append to JSONL log (one JSON object per line)
    let mut file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .with_context(|| format!("Failed to open dispatch log: {:?}", log_path))?;

    let line = serde_json::to_string(&event)?;
    writeln!(file, "{}", line)?;

    let result = serde_json::json!({
        "success": true,
        "event_recorded": true,
        "agent": event.agent_name,
        "outcome": event.outcome,
        "log_path": log_path.display().to_string()
    });

    Ok(serde_json::to_string(&result)?)
}

// ── Summarize Telemetry ─────────────────────────────────────────────────────

pub fn summarize_telemetry(repo_path: &str) -> Result<String> {
    let log_path = get_dispatch_log_path(repo_path)?;

    if !log_path.exists() {
        let empty_summary = TelemetrySummary {
            success: true,
            total_dispatches: 0,
            unique_agents: 0,
            avg_approval_rate: 0.0,
            avg_duration_ms: 0.0,
            agent_stats: Vec::new(),
            classification_breakdown: HashMap::new(),
            outcome_breakdown: HashMap::new(),
            tier_breakdown: HashMap::new(),
        };
        return Ok(serde_json::to_string_pretty(&empty_summary)?);
    }

    let file = fs::File::open(&log_path)
        .with_context(|| format!("Failed to open dispatch log: {:?}", log_path))?;
    let reader = std::io::BufReader::new(file);

    let mut events: Vec<DispatchEvent> = Vec::new();
    for line in reader.lines() {
        let line = line?;
        let trimmed = line.trim();
        if trimmed.is_empty() { continue; }
        match serde_json::from_str::<DispatchEvent>(trimmed) {
            Ok(event) => events.push(event),
            Err(_) => continue, // Skip malformed lines gracefully
        }
    }

    let total_dispatches = events.len();
    if total_dispatches == 0 {
        let empty_summary = TelemetrySummary {
            success: true,
            total_dispatches: 0,
            unique_agents: 0,
            avg_approval_rate: 0.0,
            avg_duration_ms: 0.0,
            agent_stats: Vec::new(),
            classification_breakdown: HashMap::new(),
            outcome_breakdown: HashMap::new(),
            tier_breakdown: HashMap::new(),
        };
        return Ok(serde_json::to_string_pretty(&empty_summary)?);
    }

    // Per-agent aggregation
    let mut agent_data: HashMap<String, Vec<&DispatchEvent>> = HashMap::new();
    let mut classification_breakdown: HashMap<String, usize> = HashMap::new();
    let mut outcome_breakdown: HashMap<String, usize> = HashMap::new();
    let mut tier_breakdown: HashMap<String, usize> = HashMap::new();

    for event in &events {
        agent_data.entry(event.agent_name.clone()).or_default().push(event);
        *classification_breakdown.entry(event.task_classification.clone()).or_insert(0) += 1;
        *outcome_breakdown.entry(event.outcome.clone()).or_insert(0) += 1;
        *tier_breakdown.entry(format!("tier_{}", event.impact_tier)).or_insert(0) += 1;
    }

    let mut agent_stats: Vec<AgentStat> = Vec::new();
    let mut total_success = 0usize;
    let mut total_duration = 0u64;

    for (agent_name, agent_events) in &agent_data {
        let count = agent_events.len();
        let successes = agent_events.iter().filter(|e| e.outcome == "COMPLETE").count();
        let success_rate = successes as f64 / count as f64;
        let avg_dur = agent_events.iter().map(|e| e.duration_ms).sum::<u64>() as f64 / count as f64;
        let avg_rev = agent_events.iter().map(|e| e.revision_count as f64).sum::<f64>() / count as f64;
        let total_tokens = agent_events.iter().map(|e| e.token_budget_used as u64).sum::<u64>();

        total_success += successes;
        total_duration += agent_events.iter().map(|e| e.duration_ms).sum::<u64>();

        agent_stats.push(AgentStat {
            agent_name: agent_name.clone(),
            dispatch_count: count,
            success_rate,
            avg_duration_ms: avg_dur,
            avg_revisions: avg_rev,
            total_tokens,
        });
    }

    // Sort by dispatch count descending
    agent_stats.sort_by(|a, b| b.dispatch_count.cmp(&a.dispatch_count));

    let avg_approval_rate = total_success as f64 / total_dispatches as f64;
    let avg_duration_ms = total_duration as f64 / total_dispatches as f64;

    let summary = TelemetrySummary {
        success: true,
        total_dispatches,
        unique_agents: agent_data.len(),
        avg_approval_rate,
        avg_duration_ms,
        agent_stats,
        classification_breakdown,
        outcome_breakdown,
        tier_breakdown,
    };

    // Cache summary to disk
    let telemetry_dir = ensure_telemetry_dir(repo_path)?;
    let summary_json = serde_json::to_string_pretty(&summary)?;
    fs::write(telemetry_dir.join("summary.json"), &summary_json)?;

    Ok(summary_json)
}

// ── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_event(agent: &str, outcome: &str, duration: u64) -> String {
        serde_json::json!({
            "timestamp": "2026-09-15T18:00:00Z",
            "agent_name": agent,
            "skills_loaded": ["react-specialist"],
            "task_classification": "BUILD",
            "impact_tier": 2,
            "outcome": outcome,
            "revision_count": 0,
            "token_budget_used": 1500,
            "duration_ms": duration
        }).to_string()
    }

    #[test]
    fn test_record_and_summarize() {
        let temp_dir = std::env::temp_dir().join(format!("telemetry_test_{}", std::process::id()));
        fs::create_dir_all(&temp_dir).unwrap();

        // Record 5 events
        record_dispatch(&sample_event("frontend-specialist", "COMPLETE", 1200), temp_dir.to_str().unwrap()).unwrap();
        record_dispatch(&sample_event("frontend-specialist", "COMPLETE", 800), temp_dir.to_str().unwrap()).unwrap();
        record_dispatch(&sample_event("backend-specialist", "COMPLETE", 600), temp_dir.to_str().unwrap()).unwrap();
        record_dispatch(&sample_event("backend-specialist", "ERROR", 2000), temp_dir.to_str().unwrap()).unwrap();
        record_dispatch(&sample_event("security-auditor", "COMPLETE", 3000), temp_dir.to_str().unwrap()).unwrap();

        // Summarize
        let result = summarize_telemetry(temp_dir.to_str().unwrap()).unwrap();
        let summary: TelemetrySummary = serde_json::from_str(&result).unwrap();

        assert!(summary.success);
        assert_eq!(summary.total_dispatches, 5);
        assert_eq!(summary.unique_agents, 3);
        assert!(summary.avg_approval_rate > 0.7); // 4/5 = 0.8

        // Check agent stats
        let frontend_stat = summary.agent_stats.iter().find(|s| s.agent_name == "frontend-specialist").unwrap();
        assert_eq!(frontend_stat.dispatch_count, 2);
        assert!((frontend_stat.success_rate - 1.0).abs() < 0.001);

        let backend_stat = summary.agent_stats.iter().find(|s| s.agent_name == "backend-specialist").unwrap();
        assert_eq!(backend_stat.dispatch_count, 2);
        assert!((backend_stat.success_rate - 0.5).abs() < 0.001);

        // Verify summary file was cached
        assert!(temp_dir.join(".tribunal/telemetry/summary.json").exists());

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_empty_telemetry() {
        let temp_dir = std::env::temp_dir().join(format!("telemetry_empty_{}", std::process::id()));
        fs::create_dir_all(&temp_dir).unwrap();

        let result = summarize_telemetry(temp_dir.to_str().unwrap()).unwrap();
        let summary: TelemetrySummary = serde_json::from_str(&result).unwrap();

        assert!(summary.success);
        assert_eq!(summary.total_dispatches, 0);
        assert_eq!(summary.unique_agents, 0);

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_malformed_event_json() {
        let result = record_dispatch("not valid json", ".");
        assert!(result.is_err());
    }
}
