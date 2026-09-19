use anyhow::{Context, Result};
use oxc_allocator::Allocator;
use oxc_parser::Parser;
use oxc_span::SourceType;
use oxc_ast::ast::*;
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
        if upper.contains("VERIFY") || upper.contains("NOTE") || upper.contains("HACK") || upper.contains("CAUTION") || upper.contains("INVARIANT") || upper.contains("DO NOT") {
                // Approximate line number by counting newlines before the comment
                let prefix = &source_text[..comment.1.start as usize];
                let line = prefix.chars().filter(|&c| c == '\n').count() + 1;
                landmines.push(ExtractedComment {
                    line,
                    content: text.trim().to_string(),
                });
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
                                specifiers.push_str(&s.imported.name().to_string());
                                specifiers.push_str(", ");
                            }
                            ImportDeclarationSpecifier::ImportDefaultSpecifier(s) => {
                                specifiers.push_str(&s.local.name.to_string());
                                specifiers.push_str(", ");
                            }
                            ImportDeclarationSpecifier::ImportNamespaceSpecifier(s) => {
                                specifiers.push_str("* as ");
                                specifiers.push_str(&s.local.name.to_string());
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
            Statement::ExportDefaultDeclaration(export) => {
                match &export.declaration {
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
                }
            }
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
