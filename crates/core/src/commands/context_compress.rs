use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Serialize, Deserialize, Debug)]
pub struct CompressResult {
    pub success: bool,
    pub original_bytes: usize,
    pub compressed_bytes: usize,
    pub compression_ratio: f64,
    pub compressed_content: String,
}

/// Strip redundant comments, whitespace, and empty lines to compress agent context windows
pub fn compress_context(file_path: &str, max_lines: Option<usize>) -> Result<String> {
    let path = Path::new(file_path);
    let raw_content = fs::read_to_string(path)
        .with_context(|| format!("Failed to read file for compression: {}", file_path))?;

    let original_bytes = raw_content.len();
    let is_code = file_path.ends_with(".ts")
        || file_path.ends_with(".js")
        || file_path.ends_with(".rs")
        || file_path.ends_with(".json");

    let mut lines: Vec<String> = Vec::new();

    for line in raw_content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        // Strip single line comments for code contexts
        if is_code {
            if trimmed.starts_with("//") && !trimmed.contains("// VERIFY") {
                continue;
            }
        }

        lines.push(line.to_string());
    }

    if let Some(limit) = max_lines {
        if lines.len() > limit {
            let omitted = lines.len() - limit;
            lines.truncate(limit);
            lines.push(format!("// ... [Truncated {} lines for agent context optimization]", omitted));
        }
    }

    let compressed_content = lines.join("\n");
    let compressed_bytes = compressed_content.len();
    let compression_ratio = if original_bytes == 0 {
        1.0
    } else {
        1.0 - (compressed_bytes as f64 / original_bytes as f64)
    };

    let result = CompressResult {
        success: true,
        original_bytes,
        compressed_bytes,
        compression_ratio,
        compressed_content,
    };

    Ok(serde_json::to_string_pretty(&result)?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use std::io::Write;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn test_compress_context() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let file_path = std::env::temp_dir().join(format!(
            "tribunal-context-compress-{}-{}.js",
            std::process::id(),
            unique
        ));
        let mut file = File::create(&file_path).unwrap();
        writeln!(file, "// Comment to strip").unwrap();
        writeln!(file, "function hello() {{").unwrap();
        writeln!(file, "  // VERIFY: keep this comment").unwrap();
        writeln!(file, "  return 'world';").unwrap();
        writeln!(file, "}}").unwrap();

        drop(file);
        let res_str = compress_context(file_path.to_str().unwrap(), None).unwrap();
        let res: CompressResult = serde_json::from_str(&res_str).unwrap();

        assert!(res.success);
        assert!(res.compressed_bytes < res.original_bytes);
        assert!(res.compressed_content.contains("VERIFY"));
        assert!(!res.compressed_content.contains("// Comment to strip"));
        std::fs::remove_file(file_path).unwrap();
    }
}
