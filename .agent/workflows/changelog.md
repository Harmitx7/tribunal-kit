---
description: Auto-generate changelogs from git history. Categorizes changes by type and follows Keep a Changelog format.
---

# /changelog — Generate Change History

$ARGUMENTS

---

This command generates a structured changelog from git history. It reads real commits and categorizes them — it never invents changes that don't exist.

---

## When to Use This

- Before a release to document what changed
- When preparing release notes for stakeholders
- To create or update `CHANGELOG.md`
- To summarize work completed in a sprint or between two tags

---

## What Happens

### Stage 1 — Determine Range

Default range: commits since the last tag. Override with:

```bash
# Default: since last tag
// turbo
git log $(git describe --tags --abbrev=0)..HEAD --oneline --format="%h %ad %s" --date=short

# Last N commits
git log -n 20 --oneline --format="%h %ad %s" --date=short

# Between specific tags
git log v1.0.0..v2.0.0 --oneline --format="%h %ad %s" --date=short

# Since a date
git log --since="2025-01-01" --oneline --format="%h %ad %s" --date=short
```

If no tags exist: default to last 20 commits and flag no tags found.

### Stage 2 — Collect and Categorize

Read the git log and categorize each commit by prefix:

| Commit Prefix | Category | Icon |
|---|---|---|
| `feat:`, `feature:`, `add:` | Features | ✨ |
| `fix:`, `bugfix:`, `hotfix:` | Fixes | 🐛 |
| `refactor:`, `cleanup:` | Refactors | ♻️ |
| `docs:`, `doc:` | Documentation | 📝 |
| `test:`, `tests:` | Tests | ✅ |
| `chore:`, `build:`, `ci:` | Maintenance | 🔧 |
| `perf:`, `performance:` | Performance | ⚡ |
| `security:`, `sec:` | Security | 🔒 |
| `BREAKING:`, `breaking:`, `!` after scope | Breaking Changes | 💥 |
| (no recognized prefix) | Other | 📦 |

### Stage 3 — Generate Output

Output follows [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
# Changelog

## [Unreleased] — YYYY-MM-DD

### 💥 Breaking Changes
- `abc1234` — Description of breaking change

### ✨ Features
- `def5678` — Description of new feature

### 🐛 Fixes
- `ghi9012` — Description of bug fix

### ⚡ Performance
- `jkl3456` — Description of performance improvement

### 🔒 Security
- `mno7890` — Description of security fix

### ♻️ Refactors
- `pqr1234` — Description of refactor

### 📝 Documentation
- `stu5678` — Description of docs change

### 🔧 Maintenance
- `vwx9012` — Description of chore/dependency bump
```

### Stage 4 — Review and Save

Present the generated summary before writing:

```
📋 Generated changelog from [range]:
  💥 1 breaking change
  ✨ 3 features
  🐛 5 fixes
  📦 2 uncategorized commits

Save to CHANGELOG.md? [Y = append | N = cancel | S = stdout only]
```

> ⏸️ **Human Gate** — CHANGELOG.md is not written without confirmation.

---

## Hallucination Guard

- **Only include commits that actually exist** in git history — read from `git log`, never invent
- **Never summarize or paraphrase** ambiguous commit messages — include verbatim if unclear
- **Always show the commit hash** for traceability beside each entry
- **Never infer intent** from a commit message — report what was written, not what it "probably meant"
- Breaking changes need to be explicitly labeled in the commit — never infer breakage from code

---

## Cross-Workflow Navigation

| After /changelog reveals... | Go to |
|---|---|
| Many uncategorized commits | Enforce commit conventions in the team |
| Breaking changes need documentation | Update API docs or migration guides |
| Ready for release | `/deploy` to complete the release pipeline |

---

## Usage

```
/changelog since the last release
/changelog for the last 50 commits
/changelog between v1.0 and v2.0
/changelog generate and save to CHANGELOG.md
/changelog sprint summary since 2025-03-01
```
