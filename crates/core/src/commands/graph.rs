use anyhow::Result;
use ignore::WalkBuilder;
use oxc_allocator::Allocator;
use oxc_ast::ast::*;
use oxc_parser::Parser;
use oxc_span::SourceType;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Serialize, Deserialize, Debug)]
pub struct GraphNode {
    pub file_path: String,
    pub imports: Vec<String>,
    pub exports: Vec<String>,
    pub functions: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug)]
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

            let mut imports = Vec::new();
            let mut exports = Vec::new();
            let mut functions = Vec::new();

            for stmt in &ret.program.body {
                match stmt {
                    Statement::ImportDeclaration(import) => {
                        imports.push(import.source.value.to_string());
                    }
                    Statement::ExportNamedDeclaration(export) => {
                        if let Some(source) = &export.source {
                            imports.push(source.value.to_string());
                        }
                        if let Some(Declaration::FunctionDeclaration(func)) = &export.declaration {
                            if let Some(id) = &func.id {
                                exports.push(id.name.to_string());
                                functions.push(id.name.to_string());
                            }
                        }
                    }
                    Statement::ExportAllDeclaration(export) => {
                        imports.push(export.source.value.to_string());
                    }
                    Statement::FunctionDeclaration(func) => {
                        if let Some(id) = &func.id {
                            functions.push(id.name.to_string());
                        }
                    }
                    _ => {}
                }
            }

            nodes.push(GraphNode {
                file_path: p.display().to_string().replace("\\", "/"),
                imports,
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_graph_with_sample_files() {
        let temp_dir = std::env::temp_dir().join(format!("graph_test_{}", std::process::id()));
        fs::create_dir_all(&temp_dir).unwrap();

        let sample_ts = temp_dir.join("service.ts");
        let code = r#"
            import { db } from "./db";
            export function handleService() {
                return 42;
            }
            function internalHelper() {}
        "#;
        fs::write(&sample_ts, code).unwrap();

        let res_json = generate_graph(temp_dir.to_str().unwrap()).unwrap();
        let res: serde_json::Value = serde_json::from_str(&res_json).unwrap();

        assert_eq!(res["success"], true);
        assert_eq!(res["nodes"], 1);

        let graph_file = temp_dir.join(".tribunal").join("graph.json");
        assert!(graph_file.exists());

        let graph_content = fs::read_to_string(&graph_file).unwrap();
        let graph: SemanticGraph = serde_json::from_str(&graph_content).unwrap();

        assert_eq!(graph.nodes.len(), 1);
        let node = &graph.nodes[0];
        assert!(node.imports.contains(&"./db".to_string()));
        assert!(node.exports.contains(&"handleService".to_string()));
        assert!(node.functions.contains(&"handleService".to_string()));
        assert!(node.functions.contains(&"internalHelper".to_string()));

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_generate_graph_empty_directory() {
        let temp_dir = std::env::temp_dir().join(format!("graph_empty_{}", std::process::id()));
        fs::create_dir_all(&temp_dir).unwrap();

        let res_json = generate_graph(temp_dir.to_str().unwrap()).unwrap();
        let res: serde_json::Value = serde_json::from_str(&res_json).unwrap();

        assert_eq!(res["success"], true);
        assert_eq!(res["nodes"], 0);

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
