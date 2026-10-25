use anyhow::{anyhow, Result};
use std::path::{Component, Path, PathBuf};

/// Strips Windows verbatim extended-length prefixes (\\?\ and \\?\UNC\, as well as forward-slash variants)
pub fn strip_verbatim_prefix(path: &Path) -> PathBuf {
    let s = path.to_string_lossy();
    if let Some(stripped) = s.strip_prefix(r"\\?\UNC\") {
        PathBuf::from(format!(r"\\{}", stripped))
    } else if let Some(stripped) = s.strip_prefix(r"\\?\unc\") {
        PathBuf::from(format!(r"\\{}", stripped))
    } else if let Some(stripped) = s.strip_prefix("//?/UNC/") {
        PathBuf::from(format!("//{}", stripped))
    } else if let Some(stripped) = s.strip_prefix("//?/unc/") {
        PathBuf::from(format!("//{}", stripped))
    } else if let Some(stripped) = s.strip_prefix(r"\\?\") {
        PathBuf::from(stripped)
    } else if let Some(stripped) = s.strip_prefix("//?/") {
        PathBuf::from(stripped)
    } else {
        path.to_path_buf()
    }
}

/// Asserts that target path is strictly contained within the authorized root directory.
/// Defeats parent traversal ('..'), absolute path escapes, and symlink breakout.
pub fn assert_within_root(root: &Path, target: &Path) -> Result<PathBuf> {
    if root.as_os_str().is_empty() {
        return Err(anyhow!(
            "Security Violation: Invalid root directory specified."
        ));
    }
    let root_str = root.to_string_lossy();
    let target_str = target.to_string_lossy();
    if root_str.contains('\0') || target_str.contains('\0') {
        return Err(anyhow!("Security Violation: Null byte detected in path."));
    }

    // Resolve canonical root (or absolute current_dir joined root if nonexistent)
    let canonical_root = if root.exists() {
        strip_verbatim_prefix(&root.canonicalize().unwrap_or_else(|_| root.to_path_buf()))
    } else if root.is_absolute() {
        strip_verbatim_prefix(root)
    } else {
        let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
        strip_verbatim_prefix(&cwd.join(root))
    };

    // Form initial combined target
    let raw_target = strip_verbatim_prefix(target);
    let full_target = if raw_target.is_absolute() {
        raw_target
    } else {
        canonical_root.join(raw_target)
    };

    // Lexical component normalization
    let mut normalized = PathBuf::new();
    for comp in full_target.components() {
        match comp {
            Component::Prefix(p) => normalized.push(p.as_os_str()),
            Component::RootDir => normalized.push(std::path::MAIN_SEPARATOR.to_string()),
            Component::CurDir => {}
            Component::ParentDir => {
                if !normalized.pop() {
                    return Err(anyhow!(
                        "Path security violation: Path traversal detected. Target '{:?}' escapes root '{:?}'",
                        target,
                        root
                    ));
                }
            }
            Component::Normal(c) => normalized.push(c),
        }
    }

    // Verify lexical containment
    #[cfg(windows)]
    {
        let norm_str = normalized
            .to_string_lossy()
            .to_lowercase()
            .replace('/', "\\");
        let root_str = canonical_root
            .to_string_lossy()
            .to_lowercase()
            .replace('/', "\\");
        let root_prefix = if root_str.ends_with('\\') {
            root_str
        } else {
            format!("{}\\", root_str)
        };
        if norm_str != root_prefix.trim_end_matches('\\') && !norm_str.starts_with(&root_prefix) {
            return Err(anyhow!(
                "Path security violation: Path traversal detected. Target '{:?}' escapes root '{:?}'",
                target,
                root
            ));
        }
    }
    #[cfg(not(windows))]
    {
        if !normalized.starts_with(&canonical_root) {
            return Err(anyhow!(
                "Path security violation: Path traversal detected. Target '{:?}' escapes root '{:?}'",
                target,
                root
            ));
        }
    }

    // If target exists on filesystem, verify canonical realpath does not escape root (symlinks)
    if target.exists() {
        if let Ok(real_target) = target.canonicalize() {
            let real_target = strip_verbatim_prefix(&real_target);
            #[cfg(windows)]
            {
                let real_str = real_target
                    .to_string_lossy()
                    .to_lowercase()
                    .replace('/', "\\");
                let root_str = canonical_root
                    .to_string_lossy()
                    .to_lowercase()
                    .replace('/', "\\");
                let root_prefix = if root_str.ends_with('\\') {
                    root_str
                } else {
                    format!("{}\\", root_str)
                };
                if real_str != root_prefix.trim_end_matches('\\')
                    && !real_str.starts_with(&root_prefix)
                {
                    return Err(anyhow!(
                        "Path security violation: Symlink target '{:?}' escapes root '{:?}'",
                        real_target,
                        canonical_root
                    ));
                }
            }
            #[cfg(not(windows))]
            {
                if !real_target.starts_with(&canonical_root) {
                    return Err(anyhow!(
                        "Path security violation: Symlink target '{:?}' escapes root '{:?}'",
                        real_target,
                        canonical_root
                    ));
                }
            }
        }
    }

    Ok(normalized)
}

/// Validates that a git revision identifier does not contain option injection prefixes or shell metacharacters
pub fn validate_git_revision(rev: &str, param_name: &str) -> Result<()> {
    if rev.is_empty() {
        return Err(anyhow!(
            "Security Violation: Missing required git revision for {}",
            param_name
        ));
    }
    if rev.starts_with('-') {
        return Err(anyhow!(
            "Security Violation: Invalid {} git revision '{}': cannot start with hyphen (option injection)",
            param_name,
            rev
        ));
    }
    if rev.contains(|c: char| {
        c.is_whitespace()
            || c == '\0'
            || c == '\r'
            || c == '\n'
            || c == ';'
            || c == '&'
            || c == '|'
            || c == '$'
            || c == '`'
            || c == '<'
            || c == '>'
    }) {
        return Err(anyhow!(
            "Security Violation: Invalid {} git revision '{}': disallowed metacharacters",
            param_name,
            rev
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_assert_within_root_valid() {
        let temp_dir = std::env::temp_dir().join("tribunal_sec_test_root");
        let _ = std::fs::create_dir_all(&temp_dir);
        let result = assert_within_root(&temp_dir, Path::new("sub/file.txt"));
        assert!(result.is_ok());
        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_assert_within_root_reject_parent_traversal() {
        let temp_dir = std::env::temp_dir().join("tribunal_sec_test_traversal");
        let _ = std::fs::create_dir_all(&temp_dir);
        let result = assert_within_root(&temp_dir, Path::new("../../etc/passwd"));
        assert!(result.is_err());
        let err_msg = result.unwrap_err().to_string();
        assert!(err_msg.contains("Path security violation"));
        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_assert_within_root_reject_null_byte() {
        let temp_dir = std::env::temp_dir().join("tribunal_sec_test_null");
        let result = assert_within_root(&temp_dir, Path::new("foo\0bar"));
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Null byte"));
    }

    #[test]
    fn test_validate_git_revision_valid() {
        assert!(validate_git_revision("HEAD", "BASE").is_ok());
        assert!(validate_git_revision("main", "HEAD").is_ok());
        assert!(validate_git_revision("v1.0.0", "TAG").is_ok());
        assert!(validate_git_revision("a1b2c3d4e5", "SHA").is_ok());
    }

    #[test]
    fn test_validate_git_revision_reject_option_injection() {
        assert!(validate_git_revision("-o/tmp/evil", "BASE").is_err());
        assert!(validate_git_revision("--help", "HEAD").is_err());
        assert!(validate_git_revision("-v", "REV").is_err());
    }

    #[test]
    fn test_validate_git_revision_reject_metacharacters() {
        assert!(validate_git_revision("HEAD; rm -rf /", "BASE").is_err());
        assert!(validate_git_revision("HEAD && evil", "BASE").is_err());
        assert!(validate_git_revision("HEAD\0null", "BASE").is_err());
    }

    #[test]
    fn test_strip_verbatim_prefix() {
        assert_eq!(
            strip_verbatim_prefix(Path::new(r"\\?\C:\project\file.txt")),
            PathBuf::from(r"C:\project\file.txt")
        );
        assert_eq!(
            strip_verbatim_prefix(Path::new("//?/C:/project/file.txt")),
            PathBuf::from("C:/project/file.txt")
        );
        assert_eq!(
            strip_verbatim_prefix(Path::new(r"\\?\UNC\server\share\file.txt")),
            PathBuf::from(r"\\server\share\file.txt")
        );
        assert_eq!(
            strip_verbatim_prefix(Path::new("//?/UNC/server/share/file.txt")),
            PathBuf::from("//server/share/file.txt")
        );
        assert_eq!(
            strip_verbatim_prefix(Path::new("/normal/unix/path")),
            PathBuf::from("/normal/unix/path")
        );
        assert_eq!(
            strip_verbatim_prefix(Path::new(r"C:\normal\win\path")),
            PathBuf::from(r"C:\normal\win\path")
        );
    }
}
