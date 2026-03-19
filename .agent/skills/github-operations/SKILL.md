---
name: github-operations
description: Complete Git and GitHub workflow orchestration. Handles branching, committing, pushing, pull requests, conflict resolution, and repository management. Use when working with Git repositories, GitHub Actions, or any version control operations.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
version: 1.0.0
last-updated: 2026-03-19
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# GitHub Operations Skill

> Git is a communication tool as much as a version control tool. Commit messages are letters to your future self and your team.

---

## Ground Rules

1. **Never force-push to `main` or `master`** — use feature branches
2. **Always check `git status` before staging** — know what you are committing
3. **One logical change per commit** — atomic commits are easier to revert
4. **Pull before push** — always sync with remote first to avoid conflicts
5. **Never commit secrets** — use `.gitignore` and environment variables

---

## Core Workflow Patterns

### Standard Feature Branch Workflow

```bash
# 1. Always start from an up-to-date main
git checkout main
git pull origin main

# 2. Create a descriptive feature branch
git checkout -b feat/your-feature-name

# 3. Make changes, then stage selectively
git add -p                    # Interactive: review each hunk before staging
git add path/to/specific/file # Or stage specific files

# 4. Commit with a meaningful message
git commit -m "feat(scope): short summary of change

- Detail 1: what was added/changed and why
- Detail 2: any side effects or dependencies"

# 5. Push and create PR
git push -u origin feat/your-feature-name
```

### Commit Message Convention (Conventional Commits)

```
<type>(<scope>): <short summary>

[optional body: explain WHY, not what]

[optional footer: BREAKING CHANGE, closes #issue]
```

**Types:**
| Type | Use When |
|------|----------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code restructure, no behavior change |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests |
| `chore` | Build, CI, dependency updates |
| `style` | Formatting, whitespace (no logic) |

**Example commit messages:**
```
feat(auth): add JWT refresh token rotation
fix(api): handle null response from external service
docs(readme): add installation and usage sections
chore(deps): upgrade typescript to 5.4
```

---

## Common Operations

### Fast Git Status Check

```bash
git status --short        # Compact view
git diff --stat           # What changed and how much
git log --oneline -10     # Last 10 commits, one line each
git log --oneline --graph --all  # Full branch graph
```

### Staging Strategies

```bash
# Stage everything (use only when you know all changes are correct)
git add -A

# Stage interactively — review each change hunk
git add -p

# Stage a full directory
git add src/

# Stage individual files
git add file1.ts file2.ts

# Unstage a file (keep changes, remove from staging)
git restore --staged file.ts
```

### Undoing Mistakes

```bash
# Undo last commit, keep changes staged
git reset --soft HEAD~1

# Undo last commit, keep changes unstaged
git reset HEAD~1

# Discard all local changes (DESTRUCTIVE — cannot undo)
git restore .

# Revert a commit (creates a new "undo" commit — safe for shared branches)
git revert <commit-hash>

# Remove a file from git tracking but keep it locally
git rm --cached file.txt
echo "file.txt" >> .gitignore
```

### Resolving Merge Conflicts

```bash
# Pull with rebase (cleaner history than merge)
git pull --rebase origin main

# If rebase conflicts occur:
# 1. Fix conflicts in editor (look for <<<<<<, =======, >>>>>>>)
# 2. Stage resolved files
git add resolved-file.ts
# 3. Continue rebase
git rebase --continue

# If rebase is a mess, abort and start over
git rebase --abort
```

### Working with Remotes

```bash
# Show all remotes
git remote -v

# Add a remote
git remote add origin https://github.com/user/repo.git

# Change remote URL
git remote set-url origin https://github.com/user/new-repo.git

# Fetch all remotes without merging
git fetch --all

# Push and set upstream tracking
git push -u origin branch-name

# Delete a remote branch
git push origin --delete branch-name
```

### GitHub CLI (gh) Operations

```bash
# Create a pull request
gh pr create --title "feat: my feature" --body "Description of changes" --base main

# List open PRs
gh pr list

# Check PR status + reviews
gh pr status

# Merge PR (squash recommended for features)
gh pr merge --squash

# Create a release
gh release create v1.0.0 --title "v1.0.0 - Initial Release" --notes "Release notes here"

# Clone a repo
gh repo clone owner/repo-name

# View repo in browser
gh repo view --web
```

---

## Advanced Patterns

### Stashing Work in Progress

```bash
# Stash changes with a label
git stash push -m "WIP: half-done auth feature"

# List all stashes
git stash list

# Apply most recent stash (keep it in stash list)
git stash apply

# Apply a specific stash
git stash apply stash@{2}

# Apply and drop at once
git stash pop

# Drop a specific stash
git stash drop stash@{0}
```

### Tagging Releases

```bash
# Create an annotated tag (preferred for releases)
git tag -a v1.2.0 -m "Release version 1.2.0 — added X, fixed Y"

# Push tags to remote
git push origin --tags

# List existing tags
git tag -l

# Delete a tag locally and remotely
git tag -d v1.2.0
git push origin --delete v1.2.0
```

### Squashing Commits Before PR

```bash
# Interactive rebase to squash last N commits
git rebase -i HEAD~3

# In the editor: change 'pick' to 'squash' (or 's') for commits to merge
# Keep the first as 'pick', squash the rest into it
```

---

## README Generation (Quick Pattern)

When adding or updating a README, use this checklist:

```
## README Checklist
- [ ] Project name and one-line description at the top
- [ ] Badges: build status, version, license
- [ ] Quick demo or screenshot
- [ ] Requirements / prerequisites
- [ ] Installation (copy-paste commands, no ambiguity)
- [ ] Usage with examples
- [ ] Configuration / environment variables table
- [ ] Contributing guidelines link
- [ ] License declaration
```

---

## .gitignore Templates

### Node.js / TypeScript

```gitignore
node_modules/
dist/
build/
.env
.env.local
.env.*.local
*.log
.DS_Store
Thumbs.db
coverage/
.nyc_output/
```

### Python

```gitignore
__pycache__/
*.py[cod]
*.egg-info/
dist/
build/
.venv/
venv/
.env
*.log
.pytest_cache/
```

---

## Output Format

When this skill produces git operations or reviews them, structure your output as:

```
━━━ GitHub Operations Report ━━━━━━━━━━━━━━━━━━━━━━━
Skill:       github-operations
Scope:       [repo name / branch]
Operation:   [commit / push / PR / merge / etc.]
─────────────────────────────────────────────────────
✅ Passed:   [checks that passed, or "All clean"]
⚠️  Warnings: [non-blocking issues, or "None"]
❌ Blocked:  [blocking issues requiring fix, or "None"]
─────────────────────────────────────────────────────
VBC status:  PENDING → VERIFIED
Evidence:    [git output / push confirmation / PR link]
```

**VBC (Verification-Before-Completion) is mandatory.**
Do not mark status as VERIFIED until concrete terminal evidence (e.g., push success, PR link) is provided.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/review` or `/audit`**
**Active reviewers: `logic` · `security` · `devops`**

### ❌ Forbidden AI Tropes in GitHub Operations

1. **Inventing commit hashes** — never fabricate SHA hashes; always use `git log` to retrieve real ones.
2. **Assuming branch names** — always confirm the current branch with `git branch --show-current` before operating.
3. **Silently force-pushing** — never suggest `git push --force` without explicitly warning about history rewrite risks.
4. **Hallucinating `gh` subcommands** — only use `gh` commands from the official GitHub CLI docs.
5. **Skipping `git pull` before push** — always sync with remote first, especially on shared branches.

### ✅ Pre-Flight Self-Audit

Review these questions before any git operation:

```
✅ Did I check `git status` before staging changes?
✅ Is the commit message following Conventional Commits format?
✅ Did I verify the correct branch is active with `git branch --show-current`?
✅ Did I pull from remote before pushing to avoid conflicts?
✅ Are there any secrets, API keys, or credentials in the staged diff?
✅ If force-pushing, did I explicitly warn the user about history rewrite?
```
