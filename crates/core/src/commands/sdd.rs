use anyhow::{anyhow, Context, Result};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

/// Find repository root by checking git rev-parse or walking up looking for .git
pub fn find_repo_root() -> Result<PathBuf> {
    if let Ok(output) = Command::new("git").args(["rev-parse", "--show-toplevel"]).output() {
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

/// Extract task brief out-of-band to prevent coordinator context saturation
pub fn sdd_brief(plan_file: &str, task_num: u32, out_file: Option<&str>) -> Result<PathBuf> {
    let plan_path = Path::new(plan_file);
    if !plan_path.exists() {
        return Err(anyhow!("Plan file not found: {}", plan_file));
    }

    let content = fs::read_to_string(plan_path)
        .with_context(|| format!("Failed to read plan file: {}", plan_file))?;

    let target_out = match out_file {
        Some(path) => PathBuf::from(path),
        None => {
            let ws = sdd_workspace(plan_file)?;
            ws.join(format!("task-{}-brief.md", task_num))
        }
    };

    let mut in_target_task = false;
    let mut in_code_block = false;
    let mut extracted_lines = Vec::new();

    let target_prefix = format!("Task {}", task_num);
    let target_prefix_colon = format!("Task {}:", task_num);

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("```") {
            in_code_block = !in_code_block;
        }

        if !in_code_block && trimmed.starts_with('#') {
            // Check header level and heading text
            let heading_text = trimmed.trim_start_matches('#').trim();
            if heading_text.starts_with(&target_prefix_colon)
                || heading_text.starts_with(&target_prefix)
                || heading_text == target_prefix
            {
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
pub fn sdd_diff(plan_file: &str, base: &str, head: &str, out_file: Option<&str>) -> Result<PathBuf> {
    let target_out = match out_file {
        Some(path) => PathBuf::from(path),
        None => {
            let ws = sdd_workspace(plan_file)?;
            let short_base = if base.len() > 7 { &base[..7] } else { base };
            let short_head = if head.len() > 7 { &head[..7] } else { head };
            ws.join(format!("review-{}..{}.diff", short_base, short_head))
        }
    };

    // Verify revisions exist
    let verify_base = Command::new("git")
        .args(["rev-parse", "--verify", "--quiet", base])
        .output()
        .context("Failed to run git rev-parse for base")?;
    if !verify_base.status.success() {
        return Err(anyhow!("Invalid BASE git revision: {}", base));
    }

    let verify_head = Command::new("git")
        .args(["rev-parse", "--verify", "--quiet", head])
        .output()
        .context("Failed to run git rev-parse for head")?;
    if !verify_head.status.success() {
        return Err(anyhow!("Invalid HEAD git revision: {}", head));
    }

    // git log --oneline base..head
    let range = format!("{}..{}", base, head);
    let log_out = Command::new("git")
        .args(["log", "--oneline", &range])
        .output()
        .context("Failed to run git log")?;
    let log_str = String::from_utf8_lossy(&log_out.stdout);

    // git diff --stat base..head
    let stat_out = Command::new("git")
        .args(["diff", "--stat", &range])
        .output()
        .context("Failed to run git diff --stat")?;
    let stat_str = String::from_utf8_lossy(&stat_out.stdout);

    // git diff -U10 base..head
    let diff_out = Command::new("git")
        .args(["diff", "-U10", &range])
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

### Task 3: Final Verification
- [ ] Step 1: Run tests
"#;

        let mut f = fs::File::create(&plan_file).unwrap();
        f.write_all(content.as_bytes()).unwrap();

        let out_file = temp_dir.join("task-2-brief.md");
        let result = sdd_brief(plan_file.to_str().unwrap(), 2, Some(out_file.to_str().unwrap())).unwrap();

        assert!(result.exists());
        let brief = fs::read_to_string(result).unwrap();
        assert!(brief.contains("Task 2: Implement User API"));
        assert!(!brief.contains("Task 1: Initialize Database"));
        assert!(!brief.contains("Task 3: Final Verification"));

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
