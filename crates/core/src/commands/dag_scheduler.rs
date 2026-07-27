use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TaskNode {
    pub id: String,
    pub dependencies: Option<Vec<String>>,
    pub tier: Option<String>, // "fast" | "deep"
}

#[derive(Serialize, Deserialize, Debug)]
pub struct DagScheduleResult {
    pub success: bool,
    pub total_tasks: usize,
    pub total_waves: usize,
    pub waves: Vec<Vec<String>>,
    pub is_cyclic: bool,
}

/// Compute concurrent execution waves for agent tasks using Kahn's topological sort
pub fn schedule_dag(tasks_json: &str) -> Result<String> {
    let tasks: Vec<TaskNode> = serde_json::from_str(tasks_json)
        .with_context(|| "Failed to parse task nodes JSON for DAG scheduling")?;

    let mut in_degree: HashMap<String, usize> = HashMap::new();
    let mut adj_list: HashMap<String, Vec<String>> = HashMap::new();
    let mut all_ids: HashSet<String> = HashSet::new();

    for task in &tasks {
        all_ids.insert(task.id.clone());
        in_degree.entry(task.id.clone()).or_insert(0);
        adj_list.entry(task.id.clone()).or_default();
    }

    for task in &tasks {
        if let Some(deps) = &task.dependencies {
            for dep in deps {
                if all_ids.contains(dep) {
                    adj_list.entry(dep.clone()).or_default().push(task.id.clone());
                    *in_degree.entry(task.id.clone()).or_insert(0) += 1;
                }
            }
        }
    }

    let mut waves: Vec<Vec<String>> = Vec::new();
    let mut current_wave: Vec<String> = in_degree
        .iter()
        .filter(|(_, &deg)| deg == 0)
        .map(|(id, _)| id.clone())
        .collect();

    // Sort current wave alphabetically for deterministic execution order
    current_wave.sort();

    let mut processed_count = 0;

    while !current_wave.is_empty() {
        processed_count += current_wave.len();
        let mut next_candidates = Vec::new();

        for node_id in &current_wave {
            if let Some(neighbors) = adj_list.get(node_id) {
                for neighbor in neighbors {
                    if let Some(deg) = in_degree.get_mut(neighbor) {
                        *deg -= 1;
                        if *deg == 0 {
                            next_candidates.push(neighbor.clone());
                        }
                    }
                }
            }
        }

        waves.push(current_wave);
        next_candidates.sort();
        next_candidates.dedup();
        current_wave = next_candidates;
    }

    let is_cyclic = processed_count < tasks.len();
    let result = DagScheduleResult {
        success: !is_cyclic,
        total_tasks: tasks.len(),
        total_waves: waves.len(),
        waves,
        is_cyclic,
    };

    Ok(serde_json::to_string_pretty(&result)?)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dag_schedule_linear() {
        let json = r#"[
            {"id": "lint-runner", "dependencies": []},
            {"id": "type-safety", "dependencies": ["lint-runner"]},
            {"id": "security-auditor", "dependencies": ["type-safety"]}
        ]"#;

        let res_str = schedule_dag(json).unwrap();
        let res: DagScheduleResult = serde_json::from_str(&res_str).unwrap();

        assert!(res.success);
        assert_eq!(res.total_waves, 3);
        assert_eq!(res.waves[0], vec!["lint-runner"]);
        assert_eq!(res.waves[1], vec!["type-safety"]);
        assert_eq!(res.waves[2], vec!["security-auditor"]);
    }

    #[test]
    fn test_dag_schedule_parallel() {
        let json = r#"[
            {"id": "lint-runner", "dependencies": []},
            {"id": "type-safety", "dependencies": []},
            {"id": "security-auditor", "dependencies": ["lint-runner", "type-safety"]}
        ]"#;

        let res_str = schedule_dag(json).unwrap();
        let res: DagScheduleResult = serde_json::from_str(&res_str).unwrap();

        assert!(res.success);
        assert_eq!(res.total_waves, 2);
        assert_eq!(res.waves[0], vec!["lint-runner", "type-safety"]);
        assert_eq!(res.waves[1], vec!["security-auditor"]);
    }
}
