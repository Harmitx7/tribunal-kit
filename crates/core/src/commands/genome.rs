use anyhow::{Context, Result};
use owo_colors::OwoColorize;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::f64::consts::PI;
use std::fs;
use std::path::Path;

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

pub fn generate_genome_svg(skills_dir: &str, repo_path: &str) -> Result<String> {
    let graph_json = crate::commands::skill_resolver::build_skill_graph(skills_dir)
        .context("Failed to build skill graph for genome visualization")?;
    let graph: SkillGraph = serde_json::from_str(&graph_json)?;

    let genome_dir = Path::new(repo_path).join(".tribunal").join("genome");
    fs::create_dir_all(&genome_dir)?;

    let svg_width = 1200.0;
    let svg_height = 1200.0;
    let center_x = svg_width / 2.0;
    let center_y = svg_height / 2.0;
    let radius = 500.0;

    let mut svg = String::new();
    svg.push_str(&format!(
        r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" style="background-color: #0f172a; font-family: sans-serif;">"#,
        width = svg_width,
        height = svg_height
    ));

    svg.push_str(r##"
        <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#475569" />
            </marker>
        </defs>
    "##);

    let total_nodes = graph.nodes.len();
    let mut node_positions: HashMap<String, (f64, f64)> = HashMap::new();

    // Group by domain to put them close to each other
    let mut sorted_nodes = graph.nodes.clone();
    sorted_nodes.sort_by(|a, b| a.domain.cmp(&b.domain));

    for (i, node) in sorted_nodes.iter().enumerate() {
        let angle = (i as f64 / total_nodes as f64) * 2.0 * PI;
        let x = center_x + radius * angle.cos();
        let y = center_y + radius * angle.sin();
        node_positions.insert(node.name.clone(), (x, y));
    }

    // Draw Edges First (so they appear underneath)
    for node in &sorted_nodes {
        let &(x1, y1) = node_positions.get(&node.name).unwrap();

        // Co-requires edges
        for target in &node.co_requires {
            if let Some(&(x2, y2)) = node_positions.get(target) {
                svg.push_str(&format!(
                    r##"<line x1="{}" y1="{}" x2="{}" y2="{}" stroke="#334155" stroke-width="1.5" marker-end="url(#arrowhead)" opacity="0.6" />"##,
                    x1, y1, x2, y2
                ));
            }
        }

        // Supersedes edges
        if let Some(target) = &node.supersedes {
            if let Some(&(x2, y2)) = node_positions.get(target) {
                svg.push_str(&format!(
                    r##"<line x1="{}" y1="{}" x2="{}" y2="{}" stroke="#8b5cf6" stroke-width="2" stroke-dasharray="5,5" marker-end="url(#arrowhead)" opacity="0.8" />"##,
                    x1, y1, x2, y2
                ));
            }
        }
        
        // Conflicts edges
        for target in &node.conflicts_with {
            if let Some(&(x2, y2)) = node_positions.get(target) {
                svg.push_str(&format!(
                    r##"<line x1="{}" y1="{}" x2="{}" y2="{}" stroke="#ef4444" stroke-width="1" opacity="0.5" />"##,
                    x1, y1, x2, y2
                ));
            }
        }
    }

    // Draw Nodes
    for node in &sorted_nodes {
        let &(x, y) = node_positions.get(&node.name).unwrap();
        
        let color = match node.domain.as_str() {
            "frontend" => "#3b82f6", // blue
            "backend" => "#10b981", // green
            "database" => "#f59e0b", // yellow
            "motion" => "#8b5cf6", // purple
            "testing" => "#f43f5e", // rose
            "security" => "#ef4444", // red
            "devops" => "#06b6d4", // cyan
            "meta" => "#94a3b8", // slate
            _ => "#64748b", // slate
        };

        svg.push_str(&format!(
            r##"<circle cx="{}" cy="{}" r="6" fill="{}" stroke="#1e293b" stroke-width="2" />"##,
            x, y, color
        ));

        // Label
        svg.push_str(&format!(
            r##"<text x="{}" y="{}" fill="#cbd5e1" font-size="10" text-anchor="middle" alignment-baseline="middle">{}</text>"##,
            x, y - 12.0, node.name
        ));
    }

    svg.push_str("</svg>");

    let out_path = genome_dir.join("skill-genome.svg");
    fs::write(&out_path, &svg)?;

    println!("{}", format!("🧬 Skill Genome generated at {}", out_path.display()).bright_magenta());

    Ok(svg)
}
