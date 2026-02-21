---
description: Auto-generate changelogs from git history. Categorizes changes by type and follows Keep a Changelog format.
---

# /changelog — Generate Change History

$ARGUMENTS

---

This command generates a structured changelog from git history. It categorizes commits into features, fixes, refactors, and breaking changes.

---

## When to Use This

- Before a release to document what changed
- When preparing release notes
- To create a CHANGELOG.md for the project
- To summarize work between two commits or tags

---

## What Happens

### Stage 1 — Determine Range

```
What is the range? Options:
  - Last N commits: git log -n 20
  - Between tags: git log v1.0.0..v2.0.0
  - Since a date: git log --since="2025-01-01"
  - All commits: git log (full history)
```

If no range is specified, default to commits since the last tag. If no tags exist, use the last 20 commits.

### Stage 2 — Collect and Categorize

Read the git log and categorize each commit:

| Prefix | Category |
|---|---|
| `feat:`, `feature:`, `add:` | ✨ Features |
| `fix:`, `bugfix:`, `hotfix:` | 🐛 Fixes |
| `refactor:`, `cleanup:` | ♻️ Refactors |
| `docs:`, `doc:` | 📝 Documentation |
| `test:`, `tests:` | ✅ Tests |
| `chore:`, `build:`, `ci:` | 🔧 Maintenance |
| `BREAKING:`, `breaking:` | 💥 Breaking Changes |
| (no prefix) | 📦 Other |

### Stage 3 — Generate Output

Output follows [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
# Changelog

## [Unreleased] — YYYY-MM-DD

### 💥 Breaking Changes
- Description of breaking change

### ✨ Features
- Description of new feature

### 🐛 Fixes
- Description of bug fix

### ♻️ Refactors
- Description of refactor

### 📝 Documentation
- Description of docs change

### 🔧 Maintenance
- Description of chore
```

### Stage 4 — Review and Save

Present the generated changelog to the user:

```
📋 Generated changelog from [range]:
  - 3 features, 5 fixes, 2 refactors, 1 breaking change

Save to CHANGELOG.md? [y/n]
```

> ⏸️ **Human Gate** — do not write CHANGELOG.md without confirmation.

---

## Git Commands Used

```bash
# Last tag
git describe --tags --abbrev=0

# Log since last tag
git log $(git describe --tags --abbrev=0)..HEAD --oneline

# Log between tags
git log v1.0.0..v2.0.0 --oneline --format="%h %s"

# Full log with dates
git log --oneline --format="%h %ad %s" --date=short
```

---

## Hallucination Rules

- Only include commits that actually exist in git history
- Never invent or summarize commits that weren't made
- If a commit message is unclear, include it verbatim rather than interpreting it
- Always show the raw commit hash for traceability

---

## Usage

```
/changelog since the last release
/changelog for the last 50 commits
/changelog between v1.0 and v2.0
/changelog generate and save to CHANGELOG.md
```
