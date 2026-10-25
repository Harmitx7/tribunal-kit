use anyhow::{Context, Result};
use std::fs;
use std::path::Path;

use super::fitness_scorer::{score_all_skills, FitnessSummary};

pub fn cmd_purge(skills_dir: &str, dry_run: bool) -> Result<()> {
    println!("🔥 Initiating The Darwinian Purge...");

    // Pass empty repo path since we don't strictly need it for basic scoring if it's just skills
    let summary_json = score_all_skills(skills_dir, "")?;
    let summary: FitnessSummary =
        serde_json::from_str(&summary_json).context("Failed to parse fitness summary")?;

    let skills_path = Path::new(skills_dir);
    let deprecated_dir = skills_path.join("_deprecated");

    if !dry_run && !deprecated_dir.exists() {
        fs::create_dir_all(&deprecated_dir)?;
    }

    let mut purged_count = 0;
    let mut fission_count = 0;

    for report in summary.reports {
        if report.composite_fitness < 0.20 {
            println!(
                "💀 PURGING: {} (Fitness: {:.2})",
                report.skill_name, report.composite_fitness
            );

            if !dry_run {
                // Find the skill directory: check direct child first, then nested subdirectories
                let mut found_path = None;
                let direct_path = skills_path.join(&report.skill_name);
                if direct_path.is_dir() {
                    found_path = Some(direct_path);
                } else if let Ok(entries) = fs::read_dir(skills_path) {
                    for entry in entries.flatten() {
                        if entry.path().is_dir() && entry.file_name() != "_deprecated" {
                            let potential_path = entry.path().join(&report.skill_name);
                            if potential_path.is_dir() {
                                found_path = Some(potential_path);
                                break;
                            }
                        }
                    }
                }

                if let Some(src_path) = found_path {
                    let dest_path = deprecated_dir.join(&report.skill_name);
                    if dest_path.exists() {
                        let _ = fs::remove_dir_all(&dest_path);
                    }
                    if let Err(e) = fs::rename(&src_path, &dest_path) {
                        eprintln!("Failed to move skill {}: {}", report.skill_name, e);
                    } else {
                        purged_count += 1;
                    }
                }
            } else {
                purged_count += 1;
            }
        } else if report.composite_fitness > 0.95 && report.total_tokens_estimate > 4000 {
            println!(
                "⚠️ FISSION RECOMMENDED: {} (Fitness: {:.2}, Tokens: {})",
                report.skill_name, report.composite_fitness, report.total_tokens_estimate
            );
            fission_count += 1;
        }
    }

    println!("---------------------------------------------------");
    println!("Purge Complete.");
    if dry_run {
        println!("(DRY RUN) Skills to purge: {}", purged_count);
    } else {
        println!("Skills purged: {}", purged_count);
    }
    println!("Skills recommending fission: {}", fission_count);

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_low_fitness_skill(dir: &Path, name: &str) {
        let skill_dir = dir.join(name);
        fs::create_dir_all(&skill_dir).unwrap();
        let content = format!(
            "---\nname: {}\nlast-updated: 2020-01-01\n---\n\n# {}\n\nmake sure to ensure quality and follow guidelines as needed.\n",
            name, name
        );
        fs::write(skill_dir.join("SKILL.md"), content).unwrap();
    }

    #[test]
    fn test_purge_dry_run_and_actual() {
        let temp_dir = std::env::temp_dir().join(format!("purge_test_{}", std::process::id()));
        let skills_dir = temp_dir.join("skills");
        fs::create_dir_all(&skills_dir).unwrap();

        create_low_fitness_skill(&skills_dir, "useless-skill");

        // Dry run: should NOT move the skill
        let res_dry = cmd_purge(skills_dir.to_str().unwrap(), true);
        assert!(res_dry.is_ok());
        assert!(skills_dir.join("useless-skill").exists());
        assert!(!skills_dir
            .join("_deprecated")
            .join("useless-skill")
            .exists());

        // Actual run: should move the skill to _deprecated
        let res_actual = cmd_purge(skills_dir.to_str().unwrap(), false);
        assert!(res_actual.is_ok());
        assert!(!skills_dir.join("useless-skill").exists());
        assert!(skills_dir
            .join("_deprecated")
            .join("useless-skill")
            .exists());

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
