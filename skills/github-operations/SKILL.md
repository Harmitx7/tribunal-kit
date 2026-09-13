---
name: github-operations
description: Use when Git and GitHub workflow mastery. Branching strategies (Git Flow, trunk-based), commit message conventions, interactive rebase, merge conflict resolution, pull request best practices, GitHub Actions, branch protection rules, monorepo strategies, and git hooks. Use when working with Git, GitHub Actions, or any version control operations.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - git-pro
  - cicd-pro
  - bash-linux
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# GitHub Operations — Git & CI/CD Workflow Mastery

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `github-operations` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Git and GitHub workflow mastery. Branching strategies (Git Flow, trunk-based), commit message conventions, interactive rebase, merge conflict resolution, pull request best practices, GitHub Actions, branch protection rules, monorepo strategies, and git hooks. Use when working with Git, GitHub Actions, or any version control operations.
- **DO NOT activate when:** The task falls outside the `github-operations` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass | Phase | Core Action |
|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. |
| **Pass 2** | **Plan** | Decompose the task into smallest logical steps; map dependencies and required tool calls. |
| **Pass 3** | **Execute** | Implement the solution with production-grade craft, zero placeholders, and strict typing. |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. |
| **Pass 5** | **Attack** | Perform an adversarial review searching for edge-case failures, race conditions, and traps. |
| **Pass 6** | **Improve** | Eliminate discovered friction, optimize performance, and harden error boundaries. |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

---


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

| Before         | After         |
| -------------- | ------------- |
| ![before](url) | ![after](url) |

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
  extends: ['@commitlint/config-conventional'],
};
```

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Mitigation Strategy |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Hallucinated Tool Capabilities** | Assuming an external library or CLI command exists without verification | Run a verification check or verify package.json before referencing tools |
| **Premature Completion Claim** | Declaring a task finished because code was generated without verification | Execute tests, linters, or terminal commands to provide concrete proof |
| **Context Bloat Dumping** | Pasting entire multi-thousand-line files into prompt context | Extract targeted excerpts, symbols, and signatures to preserve tokens |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `orchestrator` · `agent-organizer` · `logic-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Did I deconstruct the root objective before proposing architecture?
✅ Did I identify dependencies, bottlenecks, and parallelizable sub-tasks?
✅ Did I avoid over-engineering and select the simplest effective pattern?
✅ Did I verify assumptions with concrete file reads instead of speculation?
✅ Did I establish measurable verification criteria before completion?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
