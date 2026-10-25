use anyhow::{anyhow, Context, Result};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

/// Find repository root by checking git rev-parse or walking up looking for .git
pub fn find_repo_root() -> Result<PathBuf> {
    if let Ok(output) = Command::new("git")
        .args(["rev-parse", "--show-toplevel"])
        .output()
    {
        if output.status.success() {
            let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path_str.is_empty() {
                return Ok(PathBuf::from(path_str));
            }
        }
    }

    let current = std::env::current_dir().context("Failed to get current directory")?;
    let mut dir = current.as_path();
    loop {
        if dir.join(".git").exists() {
            return Ok(dir.to_path_buf());
        }
        match dir.parent() {
            Some(parent) => dir = parent,
            None => break,
        }
    }

    Ok(current)
}

/// Ensure and resolve the plan-scoped SDD workspace directory:
/// `<repo-root>/.tribunal/sdd/<plan-slug>/`
pub fn sdd_workspace(plan_file: &str) -> Result<PathBuf> {
    let plan_path = Path::new(plan_file);
    if !plan_path.exists() {
        return Err(anyhow!("No such plan file: {}", plan_file));
    }

    let file_stem = plan_path
        .file_stem()
        .and_then(|s| s.to_str())
        .ok_or_else(|| anyhow!("Cannot derive workspace name from: {}", plan_file))?;

    let repo_root = find_repo_root()?;
    let base = repo_root.join(".tribunal").join("sdd");
    let workspace = base.join(file_stem);

    fs::create_dir_all(&workspace)
        .with_context(|| format!("Failed to create workspace at {:?}", workspace))?;

    // Self-ignoring gitignore in .tribunal/sdd so plans never leak to git status
    let gitignore_path = base.join(".gitignore");
    if !gitignore_path.exists() {
        let _ = fs::write(&gitignore_path, "*\n");
    }

    Ok(workspace)
}

fn is_matching_task_heading(heading_text: &str, task_num: u32) -> bool {
    let prefix = format!("task {}", task_num);
    let lower = heading_text.to_lowercase();
    if lower == prefix {
        return true;
    }
    if let Some(rest) = lower.strip_prefix(&prefix) {
        if let Some(first_char) = rest.chars().next() {
            return !first_char.is_ascii_digit();
        }
        return true;
    }
    false
}

fn resolve_safe_out_file(plan_path: &Path, out_file: &str) -> Result<PathBuf> {
    let repo_root = find_repo_root().unwrap_or_else(|_| PathBuf::from("."));
    let target = Path::new(out_file);
    let plan_dir = plan_path.parent().unwrap_or(Path::new("."));

    match crate::commands::security::assert_within_root(&repo_root, target) {
        Ok(resolved) => Ok(resolved),
        Err(e) => {
            if plan_dir.exists()
                && crate::commands::security::assert_within_root(plan_dir, target).is_ok()
            {
                crate::commands::security::assert_within_root(plan_dir, target)
            } else {
                Err(e)
            }
        }
    }
}

/// Extract task brief out-of-band to prevent coordinator context saturation
pub fn sdd_brief(plan_file: &str, task_num: u32, out_file: Option<&str>) -> Result<PathBuf> {
    let plan_path = Path::new(plan_file);
    if !plan_path.exists() {
        return Err(anyhow!("Plan file not found: {}", plan_file));
    }

    let content = fs::read_to_string(plan_path)
        .with_context(|| format!("Failed to read plan file: {}", plan_file))?;

    let target_out = match out_file {
        Some(path) => resolve_safe_out_file(plan_path, path)?,
        None => {
            let ws = sdd_workspace(plan_file)?;
            ws.join(format!("task-{}-brief.md", task_num))
        }
    };

    let mut in_target_task = false;
    let mut in_code_block = false;
    let mut extracted_lines = Vec::new();

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("```") {
            in_code_block = !in_code_block;
        }

        if !in_code_block && trimmed.starts_with('#') {
            // Check header level and heading text
            let heading_text = trimmed.trim_start_matches('#').trim();
            if is_matching_task_heading(heading_text, task_num) {
                in_target_task = true;
                extracted_lines.push(line);
                continue;
            } else if in_target_task && heading_text.to_lowercase().starts_with("task ") {
                // Next task reached
                break;
            }
        }

        if in_target_task {
            extracted_lines.push(line);
        }
    }

    if extracted_lines.is_empty() {
        return Err(anyhow!(
            "Task {} not found in {} (no heading matching 'Task {}')",
            task_num,
            plan_file,
            task_num
        ));
    }

    let brief_content = extracted_lines.join("\n") + "\n";
    if let Some(parent) = target_out.parent() {
        let _ = fs::create_dir_all(parent);
    }

    fs::write(&target_out, &brief_content)
        .with_context(|| format!("Failed to write task brief to {:?}", target_out))?;

    Ok(target_out)
}

/// Generate out-of-band diff review package for Tribunal reviewer waves
pub fn sdd_diff(
    plan_file: &str,
    base: &str,
    head: &str,
    out_file: Option<&str>,
) -> Result<PathBuf> {
    let plan_path = Path::new(plan_file);
    let target_out = match out_file {
        Some(path) => resolve_safe_out_file(plan_path, path)?,
        None => {
            let ws = sdd_workspace(plan_file)?;
            let short_base = if base.len() > 7 { &base[..7] } else { base };
            let short_head = if head.len() > 7 { &head[..7] } else { head };
            ws.join(format!("review-{}..{}.diff", short_base, short_head))
        }
    };

    crate::commands::security::validate_git_revision(base, "BASE")?;
    crate::commands::security::validate_git_revision(head, "HEAD")?;

    // Verify revisions exist using -- to prevent option injection
    let verify_base = Command::new("git")
        .args([
            "rev-parse",
            "--verify",
            "--quiet",
            "--",
            &format!("{}^{{commit}}", base),
        ])
        .output()
        .context("Failed to run git rev-parse for base")?;
    if !verify_base.status.success() {
        return Err(anyhow!("Invalid BASE git revision: {}", base));
    }

    let verify_head = Command::new("git")
        .args([
            "rev-parse",
            "--verify",
            "--quiet",
            "--",
            &format!("{}^{{commit}}", head),
        ])
        .output()
        .context("Failed to run git rev-parse for head")?;
    if !verify_head.status.success() {
        return Err(anyhow!("Invalid HEAD git revision: {}", head));
    }

    // git log --oneline -- base..head
    let range = format!("{}..{}", base, head);
    let log_out = Command::new("git")
        .args(["log", "--oneline", "--", &range])
        .output()
        .context("Failed to run git log")?;
    let log_str = String::from_utf8_lossy(&log_out.stdout);

    // git diff --stat -- base..head
    let stat_out = Command::new("git")
        .args(["diff", "--stat", "--", &range])
        .output()
        .context("Failed to run git diff --stat")?;
    let stat_str = String::from_utf8_lossy(&stat_out.stdout);

    // git diff -U10 -- base..head
    let diff_out = Command::new("git")
        .args(["diff", "-U10", "--", &range])
        .output()
        .context("Failed to run git diff -U10")?;
    let diff_str = String::from_utf8_lossy(&diff_out.stdout);

    let package = format!(
        "# Review package: {}..{}\n\n## Commits\n{}\n\n## Files changed\n{}\n\n## Diff\n{}\n",
        base, head, log_str, stat_str, diff_str
    );

    if let Some(parent) = target_out.parent() {
        let _ = fs::create_dir_all(parent);
    }

    fs::write(&target_out, &package)
        .with_context(|| format!("Failed to write review package to {:?}", target_out))?;

    Ok(target_out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn test_sdd_brief_extraction() {
        let temp_dir = std::env::temp_dir().join("tribunal_sdd_test");
        let _ = fs::create_dir_all(&temp_dir);
        let plan_file = temp_dir.join("sample-plan.md");

        let content = r#"# Sample Plan

### Task 1: Initialize Database
**Files:**
- Create: src/db.ts
- [ ] Step 1: Write test

### Task 2: Implement User API
**Files:**
- Create: src/api.ts
- [ ] Step 1: Write API test

### Task 10: Deploy Production Infrastructure
**Files:**
- Create: deploy.tf
- [ ] Step 1: Run terraform

### Task 3: Final Verification
- [ ] Step 1: Run tests
"#;

        let mut f = fs::File::create(&plan_file).unwrap();
        f.write_all(content.as_bytes()).unwrap();

        let out_file = temp_dir.join("task-2-brief.md");
        let result = sdd_brief(
            plan_file.to_str().unwrap(),
            2,
            Some(out_file.to_str().unwrap()),
        )
        .unwrap();

        assert!(result.exists());
        let brief = fs::read_to_string(result).unwrap();
        assert!(brief.contains("Task 2: Implement User API"));
        assert!(!brief.contains("Task 1: Initialize Database"));
        assert!(!brief.contains("Task 10: Deploy Production Infrastructure"));
        assert!(!brief.contains("Task 3: Final Verification"));

        // Verify Task 1 does NOT match Task 10
        let out_file_1 = temp_dir.join("task-1-brief.md");
        let result_1 = sdd_brief(
            plan_file.to_str().unwrap(),
            1,
            Some(out_file_1.to_str().unwrap()),
        )
        .unwrap();
        let brief_1 = fs::read_to_string(result_1).unwrap();
        assert!(brief_1.contains("Task 1: Initialize Database"));
        assert!(!brief_1.contains("Task 10: Deploy Production Infrastructure"));

        // Verify Task 10 extracts cleanly
        let out_file_10 = temp_dir.join("task-10-brief.md");
        let result_10 = sdd_brief(
            plan_file.to_str().unwrap(),
            10,
            Some(out_file_10.to_str().unwrap()),
        )
        .unwrap();
        let brief_10 = fs::read_to_string(result_10).unwrap();
        assert!(brief_10.contains("Task 10: Deploy Production Infrastructure"));
        assert!(!brief_10.contains("Task 1: Initialize Database"));

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_sdd_diff_rejects_option_injection() {
        let temp_dir = std::env::temp_dir().join("tribunal_sdd_sec_diff");
        let _ = fs::create_dir_all(&temp_dir);
        let plan_file = temp_dir.join("plan.md");
        fs::write(&plan_file, "# Plan\n### Task 1: Demo\n").unwrap();

        // Option injection in base
        let err1 = sdd_diff(plan_file.to_str().unwrap(), "-o/tmp/evil", "HEAD", None);
        assert!(err1.is_err());
        assert!(err1
            .unwrap_err()
            .to_string()
            .contains("cannot start with hyphen"));

        // Option injection in head
        let err2 = sdd_diff(plan_file.to_str().unwrap(), "HEAD", "--output=evil", None);
        assert!(err2.is_err());
        assert!(err2
            .unwrap_err()
            .to_string()
            .contains("cannot start with hyphen"));

        // Metacharacter injection
        let err3 = sdd_diff(plan_file.to_str().unwrap(), "HEAD; rm -rf", "HEAD", None);
        assert!(err3.is_err());
        assert!(err3
            .unwrap_err()
            .to_string()
            .contains("disallowed metacharacters"));

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_sdd_brief_rejects_path_traversal() {
        let temp_dir = std::env::temp_dir().join("tribunal_sdd_sec_brief");
        let _ = fs::create_dir_all(&temp_dir);
        let plan_file = temp_dir.join("plan.md");
        fs::write(&plan_file, "# Plan\n### Task 1: Demo\nContent\n").unwrap();

        let malicious_out = "../../outside_root_evil.md";
        let err = sdd_brief(plan_file.to_str().unwrap(), 1, Some(malicious_out));
        assert!(err.is_err());
        assert!(err
            .unwrap_err()
            .to_string()
            .contains("Path security violation"));

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_sdd_diff_rejects_path_traversal() {
        let temp_dir = std::env::temp_dir().join("tribunal_sdd_sec_diff_trav");
        let _ = fs::create_dir_all(&temp_dir);
        let plan_file = temp_dir.join("plan.md");
        fs::write(&plan_file, "# Plan\n### Task 1: Demo\n").unwrap();

        let malicious_out = "../../outside_root_evil.diff";
        let err = sdd_diff(
            plan_file.to_str().unwrap(),
            "HEAD",
            "HEAD",
            Some(malicious_out),
        );
        assert!(err.is_err());
        assert!(err
            .unwrap_err()
            .to_string()
            .contains("Path security violation"));

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
