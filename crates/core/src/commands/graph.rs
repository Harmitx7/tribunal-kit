use anyhow::Result;
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::fs;
use ignore::WalkBuilder;
use oxc_allocator::Allocator;
use oxc_parser::Parser;
use oxc_span::SourceType;

#[derive(Serialize, Debug)]
pub struct GraphNode {
    pub file_path: String,
    pub exports: Vec<String>,
    pub functions: Vec<String>,
}

#[derive(Serialize, Debug)]
pub struct SemanticGraph {
    pub nodes: Vec<GraphNode>,
}

pub fn generate_graph(path: &str) -> Result<String> {
    let mut nodes = Vec::new();
    let walker = WalkBuilder::new(path).build();

    for result in walker {
        let entry = match result {
            Ok(e) => e,
            Err(_) => continue,
        };
        let p = entry.path();
        if !p.is_file() {
            continue;
        }

        let ext = p.extension().and_then(|s| s.to_str()).unwrap_or("");
        if !matches!(ext, "js" | "ts" | "jsx" | "tsx") {
            continue;
        }

        if let Ok(source_text) = fs::read_to_string(p) {
            let allocator = Allocator::default();
            let source_type = SourceType::from_path(p).unwrap_or_default();
            let ret = Parser::new(&allocator, &source_text, source_type).parse();

            let exports = Vec::new();
            let functions = Vec::new();

            // Note: In a complete implementation we would traverse `ret.program` using oxc_ast::Visit.
            // For now, we return the parsed file node to establish the JSON RPC / MCP connection.
            
            nodes.push(GraphNode {
                file_path: p.display().to_string(),
                exports,
                functions,
            });
        }
    }

    let graph = SemanticGraph { nodes };
    let json = serde_json::to_string(&graph)?;
    
    // Save to .tribunal/graph.json
    let tribunal_dir = Path::new(path).join(".tribunal");
    if !tribunal_dir.exists() {
        fs::create_dir_all(&tribunal_dir)?;
    }
    fs::write(tribunal_dir.join("graph.json"), &json)?;

    // Return structured output for stdout
    let output = serde_json::json!({
        "success": true,
        "nodes": graph.nodes.len(),
        "graph_path": tribunal_dir.join("graph.json").display().to_string()
    });
    
    Ok(serde_json::to_string(&output)?)
}
