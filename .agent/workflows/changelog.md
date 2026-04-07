---
description: Auto-generate changelogs from git history. Categorizes commits by type (feat/fix/chore/breaking) and follows Keep a Changelog format. Requires conventional commit messages for accurate categorization.
---

# /changelog — Git History to Changelog

$ARGUMENTS

---

## When to Use /changelog

|Use `/changelog` when...||
|:---|:---|
|Preparing a release|Generate for specific version range|
|Documenting recent changes|Generate since last tag|
|Onboarding someone to codebase history|Generate entire history|

---

## Commit Convention (Required for Accuracy)

```
Format: <type>(<scope>): <description>

Types:
  feat:     New functionality (appears in "Added")
  fix:      Bug fix (appears in "Fixed")
  chore:    Maintenance, deps (appears in "Changed")
  docs:     Documentation only
  perf:     Performance improvement (appears in "Changed")
  refactor: Internal restructuring (appears in "Changed")
  test:     Test-only changes
  BREAKING CHANGE: Footer or body annotation (appears in "Breaking Changes")
```

---

## Git Log Commands

```bash
# Since last tag
git log $(git describe --tags --abbrev=0)..HEAD --oneline --no-merges

# Since a specific date
git log --since="2026-01-01" --oneline --no-merges

# Since specific commit
git log abc123def..HEAD --oneline --no-merges

# With full commit message (for BREAKING CHANGE in body)
git log $(git describe --tags --abbrev=0)..HEAD --format="%H %s%n%b"
```

---

## Output Format (Keep a Changelog)

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] — 2026-04-02

### Breaking Changes
- **auth**: JWT token format changed — clients must re-authenticate ([abc123](link))

### Added
- User notification system with email and in-app alerts ([def456](link))
- Pagination on /api/users endpoint with meta.total in response ([ghi789](link))

### Fixed
- JWT verify no longer accepts 'none' algorithm ([jkl012](link))
- Checkout form no longer loses data on page refresh ([mno345](link))

### Changed
- Upgraded Prisma 5 to 6 — findOne calls migrated to findUnique ([pqr678](link))
- Bundle size reduced 64% via dynamic import for chart library ([stu901](link))

## [1.1.0] — 2026-03-15
[...]

[Unreleased]: https://github.com/user/repo/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/user/repo/compare/v1.1.0...v1.2.0
```

---

## Semver Decision Guide

```
MAJOR (1.0.0 → 2.0.0): Any BREAKING CHANGE
MINOR (1.0.0 → 1.1.0): New features, backward-compatible (feat:)  
PATCH (1.0.0 → 1.0.1): Bug fixes only (fix:)
```

---

## Usage Examples

```
/changelog since last release tag
/changelog for version 1.2.0 including all commits since v1.1.0
/changelog since 2026-01-01
/changelog what changed in the authentication module this month
```
