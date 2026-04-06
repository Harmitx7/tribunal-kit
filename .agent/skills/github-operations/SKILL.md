---
name: github-operations
description: Git and GitHub workflow mastery. Branching strategies (Git Flow, trunk-based), commit message conventions, interactive rebase, merge conflict resolution, pull request best practices, GitHub Actions, branch protection rules, monorepo strategies, and git hooks. Use when working with Git, GitHub Actions, or any version control operations.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-01
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# GitHub Operations — Git & CI/CD Workflow Mastery

---

## Branching Strategy

### Trunk-Based Development (Recommended)

```
main ────●────●────●────●────●────●────●──→
          \  /      \  /      \  /
           \/        \/        \/
        feat/auth  fix/typo  feat/dashboard

Rules:
- main is always deployable
- Feature branches live < 2 days
- Merge via squash PR
- Deploy on every merge to main
- Use feature flags for incomplete features
```

### Git Flow (For Released Software)

```
main     ────●──────────────●──────────●──→
              \            / \        /
develop  ──●───●──●──●──●───●──●──●──●──→
            \  / \    /       \  /
             \/   \  /         \/
          feature  release   hotfix

Use when:
- Versioned releases (mobile apps, libraries, SDKs)
- Multiple environments (staging, production)
- Long-lived feature development
```

---

## Commit Messages

### Conventional Commits

```
type(scope): description

Body (optional): WHY this change was made, not WHAT

Closes #123

Types:
  feat:     New feature
  fix:      Bug fix
  docs:     Documentation only
  style:    Formatting, whitespace (not CSS)
  refactor: Code change that neither fixes nor adds
  perf:     Performance improvement
  test:     Adding or updating tests
  chore:    Build process, dependencies
  ci:       CI/CD changes

Examples:
✅ feat(auth): add OAuth2 Google login
✅ fix(cart): prevent negative quantities
✅ docs(api): add pagination examples to README
✅ refactor(users): extract validation to separate module
✅ perf(search): add database index for full-text queries
✅ chore(deps): upgrade React to v19

❌ BAD:
❌ "fixed stuff"
❌ "wip"
❌ "updates"
❌ "asdf"
❌ "final fix (for real this time)"
```

### Breaking Changes

```
feat(api)!: rename /users endpoint to /accounts

BREAKING CHANGE: The /api/v1/users endpoint has been renamed to
/api/v1/accounts. All clients must update their API calls.

Migration:
- Replace all /api/v1/users → /api/v1/accounts
- Update API documentation
```

---

## Pull Request Best Practices

```markdown
## PR Template

### What
Brief description of what this PR does.

### Why
Why is this change needed? Link to issue/ticket.

### How
Technical approach. What was the design decision?

### Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] E2E tests passing

### Screenshots (if UI change)
Before | After
--- | ---
![before](url) | ![after](url)

### Checklist
- [ ] Self-reviewed the diff
- [ ] No console.log/debugger statements
- [ ] Types are correct (no `any`)
- [ ] Error cases handled
- [ ] Documentation updated (if needed)
```

```
PR Rules:
1. < 400 lines changed (split larger PRs)
2. One logical change per PR
3. Write a clear title (not "fix things")
4. Link the issue/ticket
5. Self-review before requesting reviews
6. Respond to reviews within 24h
7. Squash merge to main (clean history)
```

---

## Common Git Operations

### Interactive Rebase

```bash
# Clean up messy commits before merge
git rebase -i HEAD~3

# In the editor:
pick abc1234 feat(auth): add login endpoint
squash def5678 fix typo in login
squash ghi9012 add missing test

# Result: One clean commit instead of three

# ❌ HALLUCINATION TRAP: Never rebase commits that are already pushed/shared
# Rebasing rewrites history → force push needed → breaks others' branches
# Only rebase LOCAL, unpushed commits
```

### Merge Conflict Resolution

```bash
# Step 1: Update your branch
git fetch origin
git rebase origin/main

# Step 2: When conflicts appear
# Open conflicted files, look for:
<<<<<<< HEAD
your changes
=======
their changes
main

# Step 3: Resolve, stage, continue
git add resolved-file.ts
git rebase --continue

# If things go wrong:
git rebase --abort  # undo everything, back to before rebase
```

### Stash

```bash
# Save work without committing
git stash push -m "WIP: auth feature"

# List stashes
git stash list

# Apply and remove
git stash pop

# Apply without removing
git stash apply stash@{0}
```

### Undo Mistakes

```bash
# Undo last commit (keep changes staged)
git reset --soft HEAD~1

# Undo last commit (keep changes unstaged)
git reset HEAD~1

# Undo last commit (discard changes) ⚠️ DESTRUCTIVE
git reset --hard HEAD~1

# Undo a specific commit (creates a new commit)
git revert abc1234

# Recover deleted branch
git reflog                    # find the commit
git checkout -b recovered abc1234
```

---

## Branch Protection Rules

```yaml
# Recommended rules for main branch:
Required:
  - Require pull request before merging
  - Require at least 1 approval
  - Dismiss stale reviews on new push
  - Require status checks to pass (CI)
  - Require branches to be up to date
  - Require signed commits (optional, enterprise)

Recommended:
  - Restrict who can push (no direct push to main)
  - Require linear history (squash merge)
  - Auto-delete head branches after merge
```

---

## Git Hooks (Husky + lint-staged)

```json
// package.json
{
  "scripts": {
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml}": ["prettier --write"]
  }
}
```

```bash
# .husky/pre-commit
npx lint-staged

# .husky/commit-msg
npx commitlint --edit $1
```

```javascript
// commitlint.config.js
export default {
  extends: ["@commitlint/config-conventional"],
};
```

---
