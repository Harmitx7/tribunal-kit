use anyhow::{Context, Result};
use oxc_allocator::Allocator;
use oxc_ast::ast::*;
use oxc_parser::Parser;
use oxc_span::SourceType;
use serde::Serialize;
use std::fs;
use std::path::Path;

#[derive(Serialize, Debug, Clone)]
pub struct ExtractedImport {
    pub source: String,
    pub specifiers: String,
}

#[derive(Serialize, Debug, Clone)]
pub struct ExtractedSymbol {
    pub kind: String,
    pub name: String,
    pub signature: String,
}

#[derive(Serialize, Debug, Clone)]
pub struct ExtractedComment {
    pub line: usize,
    pub content: String,
}

#[derive(Serialize, Debug)]
pub struct AstExtractionResult {
    pub success: bool,
    pub file_path: String,
    pub imports: Vec<ExtractedImport>,
    pub exports: Vec<ExtractedSymbol>,
    pub types: Vec<ExtractedSymbol>,
    pub landmines: Vec<ExtractedComment>,
}

pub fn extract_ast(file_path: &str) -> Result<String> {
    let path = Path::new(file_path);
    if !path.exists() || !path.is_file() {
        anyhow::bail!("File not found: {}", file_path);
    }

    let source_text = fs::read_to_string(path).context("Failed to read file")?;
    let allocator = Allocator::default();
    let source_type = SourceType::from_path(path).unwrap_or_default();

    // Parse the file
    let ret = Parser::new(&allocator, &source_text, source_type).parse();

    let mut imports = Vec::new();
    let mut exports = Vec::new();
    let mut types = Vec::new();
    let mut landmines = Vec::new();

    // Scan for comments (landmines)
    for comment in ret.trivias.comments() {
        let text = comment.1.source_text(&source_text);
        let upper = text.to_uppercase();
        if upper.contains("VERIFY")
            || upper.contains("NOTE")
            || upper.contains("HACK")
            || upper.contains("CAUTION")
            || upper.contains("INVARIANT")
            || upper.contains("DO NOT")
        {
            // Approximate line number by counting newlines before the comment
            let prefix = &source_text[..comment.1.start as usize];
            let line = prefix.chars().filter(|&c| c == '\n').count() + 1;
            landmines.push(ExtractedComment {
                line,
                content: text.trim().to_string(),
            });
        }
    }

    // Resilient fallback: If parsing errors prevented comment trivia recovery,
    // scan source lines directly so critical landmines/invariants are never dropped.
    if landmines.is_empty() {
        for (idx, line) in source_text.lines().enumerate() {
            let upper = line.to_uppercase();
            if (line.contains("//") || line.contains("/*") || line.trim_start().starts_with('*'))
                && (upper.contains("VERIFY")
                    || upper.contains("NOTE")
                    || upper.contains("HACK")
                    || upper.contains("CAUTION")
                    || upper.contains("INVARIANT")
                    || upper.contains("DO NOT"))
            {
                landmines.push(ExtractedComment {
                    line: idx + 1,
                    content: line.trim().to_string(),
                });
            }
        }
    }

    for stmt in &ret.program.body {
        match stmt {
            Statement::ImportDeclaration(import) => {
                let source = import.source.value.to_string();
                let mut specifiers = String::new();
                if let Some(specs) = &import.specifiers {
                    for spec in specs {
                        match spec {
                            ImportDeclarationSpecifier::ImportSpecifier(s) => {
                                specifiers.push_str(s.imported.name().as_ref());
                                specifiers.push_str(", ");
                            }
                            ImportDeclarationSpecifier::ImportDefaultSpecifier(s) => {
                                specifiers.push_str(s.local.name.as_ref());
                                specifiers.push_str(", ");
                            }
                            ImportDeclarationSpecifier::ImportNamespaceSpecifier(s) => {
                                specifiers.push_str("* as ");
                                specifiers.push_str(s.local.name.as_ref());
                                specifiers.push_str(", ");
                            }
                        }
                    }
                }
                let specifiers = specifiers.trim_end_matches(", ").to_string();
                imports.push(ExtractedImport { source, specifiers });
            }
            Statement::ExportNamedDeclaration(export) => {
                if let Some(decl) = &export.declaration {
                    match decl {
                        Declaration::FunctionDeclaration(func) => {
                            if let Some(id) = &func.id {
                                exports.push(ExtractedSymbol {
                                    kind: "function".to_string(),
                                    name: id.name.to_string(),
                                    signature: format!("function {}", id.name),
                                });
                            }
                        }
                        Declaration::VariableDeclaration(var) => {
                            for decl in &var.declarations {
                                if let BindingPatternKind::BindingIdentifier(id) = &decl.id.kind {
                                    exports.push(ExtractedSymbol {
                                        kind: "variable".to_string(),
                                        name: id.name.to_string(),
                                        signature: format!("const {}", id.name),
                                    });
                                }
                            }
                        }
                        Declaration::ClassDeclaration(cls) => {
                            if let Some(id) = &cls.id {
                                exports.push(ExtractedSymbol {
                                    kind: "class".to_string(),
                                    name: id.name.to_string(),
                                    signature: format!("class {}", id.name),
                                });
                            }
                        }
                        Declaration::TSTypeAliasDeclaration(t) => {
                            types.push(ExtractedSymbol {
                                kind: "type".to_string(),
                                name: t.id.name.to_string(),
                                signature: format!("type {}", t.id.name),
                            });
                        }
                        Declaration::TSInterfaceDeclaration(i) => {
                            types.push(ExtractedSymbol {
                                kind: "interface".to_string(),
                                name: i.id.name.to_string(),
                                signature: format!("interface {}", i.id.name),
                            });
                        }
                        _ => {}
                    }
                }
            }
            Statement::ExportDefaultDeclaration(export) => match &export.declaration {
                ExportDefaultDeclarationKind::FunctionDeclaration(func) => {
                    if let Some(id) = &func.id {
                        exports.push(ExtractedSymbol {
                            kind: "function".to_string(),
                            name: id.name.to_string(),
                            signature: format!("default function {}", id.name),
                        });
                    } else {
                        exports.push(ExtractedSymbol {
                            kind: "function".to_string(),
                            name: "default".to_string(),
                            signature: "default function".to_string(),
                        });
                    }
                }
                ExportDefaultDeclarationKind::ClassDeclaration(cls) => {
                    if let Some(id) = &cls.id {
                        exports.push(ExtractedSymbol {
                            kind: "class".to_string(),
                            name: id.name.to_string(),
                            signature: format!("default class {}", id.name),
                        });
                    }
                }
                _ => {}
            },
            _ => {}
        }
    }

    let result = AstExtractionResult {
        success: true,
        file_path: file_path.to_string(),
        imports,
        exports,
        types,
        landmines,
    };

    Ok(serde_json::to_string(&result)?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn test_extract_ast_full_typescript() {
        let temp_dir = std::env::temp_dir().join(format!("ast_test_{}", std::process::id()));
        fs::create_dir_all(&temp_dir).unwrap();
        let file_path = temp_dir.join("sample.ts");

        let code = r#"
            // NOTE: Initial setup comment
            import defaultHelper, { namedA, namedB as aliasB } from "./helper";
            import * as utils from "./utils";

            // VERIFY: Ensure invariant holds
            export function processTask(id: string): boolean {
                return true;
            }

            // HACK: Temporary workaround
            export const MAX_RETRY = 5;

            // CAUTION: Thread safety
            export class WorkerPool {}

            export default function runMain() {}

            // INVARIANT: Positive numbers only
            export type UserId = string | number;

            // DO NOT: Remove this interface
            export interface ConfigOptions {
                timeout: number;
            }
        "#;

        let mut f = fs::File::create(&file_path).unwrap();
        f.write_all(code.as_bytes()).unwrap();
        drop(f);

        let res_json = extract_ast(file_path.to_str().unwrap()).unwrap();
        let res: serde_json::Value = serde_json::from_str(&res_json).unwrap();

        assert_eq!(res["success"], true);
        assert_eq!(res["file_path"], file_path.to_str().unwrap());

        // Verify imports
        let imports = res["imports"].as_array().unwrap();
        assert_eq!(imports.len(), 2);
        assert!(imports.iter().any(|i| i["source"] == "./helper"));
        assert!(imports.iter().any(|i| i["source"] == "./utils"));

        // Verify exports
        let exports = res["exports"].as_array().unwrap();
        assert!(exports
            .iter()
            .any(|e| e["name"] == "processTask" && e["kind"] == "function"));
        assert!(exports
            .iter()
            .any(|e| e["name"] == "MAX_RETRY" && e["kind"] == "variable"));
        assert!(exports
            .iter()
            .any(|e| e["name"] == "WorkerPool" && e["kind"] == "class"));
        assert!(exports
            .iter()
            .any(|e| e["name"] == "runMain" && e["kind"] == "function"));

        // Verify types
        let types = res["types"].as_array().unwrap();
        assert!(types
            .iter()
            .any(|t| t["name"] == "UserId" && t["kind"] == "type"));
        assert!(types
            .iter()
            .any(|t| t["name"] == "ConfigOptions" && t["kind"] == "interface"));

        // Verify landmines
        let landmines = res["landmines"].as_array().unwrap();
        assert_eq!(landmines.len(), 6);
        assert!(landmines
            .iter()
            .any(|l| l["content"].as_str().unwrap().contains("NOTE:")));
        assert!(landmines
            .iter()
            .any(|l| l["content"].as_str().unwrap().contains("VERIFY:")));
        assert!(landmines
            .iter()
            .any(|l| l["content"].as_str().unwrap().contains("HACK:")));
        assert!(landmines
            .iter()
            .any(|l| l["content"].as_str().unwrap().contains("CAUTION:")));
        assert!(landmines
            .iter()
            .any(|l| l["content"].as_str().unwrap().contains("INVARIANT:")));
        assert!(landmines
            .iter()
            .any(|l| l["content"].as_str().unwrap().contains("DO NOT:")));

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_extract_ast_empty_file() {
        let temp_dir = std::env::temp_dir().join(format!("ast_test_empty_{}", std::process::id()));
        fs::create_dir_all(&temp_dir).unwrap();
        let file_path = temp_dir.join("empty.js");
        fs::write(&file_path, "").unwrap();

        let res_json = extract_ast(file_path.to_str().unwrap()).unwrap();
        let res: serde_json::Value = serde_json::from_str(&res_json).unwrap();

        assert_eq!(res["success"], true);
        assert_eq!(res["imports"].as_array().unwrap().len(), 0);
        assert_eq!(res["exports"].as_array().unwrap().len(), 0);
        assert_eq!(res["types"].as_array().unwrap().len(), 0);
        assert_eq!(res["landmines"].as_array().unwrap().len(), 0);

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_extract_ast_missing_file() {
        let res = extract_ast("non_existent_file_ast_xyz.ts");
        assert!(res.is_err());
        assert!(res.unwrap_err().to_string().contains("File not found"));
    }

    #[test]
    fn test_extract_ast_syntax_error_resilience() {
        let temp_dir = std::env::temp_dir().join(format!("ast_test_syntax_{}", std::process::id()));
        fs::create_dir_all(&temp_dir).unwrap();
        let file_path = temp_dir.join("broken.js");
        fs::write(
            &file_path,
            "function broken( { let x = ; // VERIFY: still alive",
        )
        .unwrap();

        let res_json = extract_ast(file_path.to_str().unwrap()).unwrap();
        let res: serde_json::Value = serde_json::from_str(&res_json).unwrap();

        assert_eq!(res["success"], true);
        let landmines = res["landmines"].as_array().unwrap();
        assert!(landmines
            .iter()
            .any(|l| l["content"].as_str().unwrap().contains("VERIFY:")));

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
