---
name: git-pro
description: Use when Industry-level Git & GitHub mastery. Advanced Git internals (bisect, worktrees, reflog), monorepo strategies (Turborepo/Nx), semantic-release, OIDC-based GitHub Actions auth (no static AWS secrets), CODEOWNERS, matrix builds, reusable workflows, and release engineering. Use when advanced Git operations, complex branching strategies, or production-grade CI/CD workflow authoring is required.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - github-operations
  - cicd-pro
  - bash-linux
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Git Pro — Industry-Level Mastery

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `git-pro` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Industry-level Git & GitHub mastery. Advanced Git internals (bisect, worktrees, reflog), monorepo strategies (Turborepo/Nx), semantic-release, OIDC-based GitHub Actions auth (no static AWS secrets), CODEOWNERS, matrix builds, reusable workflows, and release engineering. Use when advanced Git operations, complex branching strategies, or production-grade CI/CD workflow authoring is required.
- **DO NOT activate when:** The task falls outside the `git-pro` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass       | Phase            | Core Action                                                                                  |
| :--------- | :--------------- | :------------------------------------------------------------------------------------------- |
| **Pass 1** | **Understand**   | Deconstruct the user's explicit objective, implicit requirements, and platform constraints.  |
| **Pass 2** | **Plan**         | Decompose the task into smallest logical steps; map dependencies and required tool calls.    |
| **Pass 3** | **Execute**      | Implement the solution with production-grade craft, zero placeholders, and strict typing.    |
| **Pass 4** | **Verify**       | Run linters, unit tests, or compiler checks to validate structural correctness.              |
| **Pass 5** | **Attack**       | Perform an adversarial review searching for edge-case failures, race conditions, and traps.  |
| **Pass 6** | **Improve**      | Eliminate discovered friction, optimize performance, and harden error boundaries.            |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

---

## Hallucination Traps (Read First)

- ❌ `git push --force` on shared branches → ✅ Always use `git push --force-with-lease` (fails if remote has new commits you haven't seen)
- ❌ Rebasing already-pushed commits → ✅ Only rebase LOCAL, un-pushed commits. Rebasing rewrites history and breaks teammates.
- ❌ `git pull` (default merge) on feature branches → ✅ Use `git pull --rebase` to maintain linear history
- ❌ Using `${{ secrets.GITHUB_TOKEN }}` for cross-repo operations → ✅ Use a GitHub App token or PAT with correct scopes
- ❌ `git reset --hard` without confirming you want to discard work → ✅ Always `git stash` first as a safety net

---

## 1. Advanced Git Internals

### Reflog Recovery (Your Safety Net)

The reflog records every HEAD movement for 90 days. Nothing is truly lost.

```bash
# See all recent HEAD movements
git reflog

# Output:
# abc1234 HEAD@{0}: commit: feat(auth): add OAuth login
# def5678 HEAD@{1}: reset: moving to HEAD~1
# ghi9012 HEAD@{2}: commit: fix(api): handle null user

# Recover a "lost" commit after bad reset
git checkout -b recovery-branch HEAD@{2}

# Or cherry-pick just that commit
git cherry-pick ghi9012
```

### Git Bisect (Automated Bug Hunting)

Find the exact commit that introduced a bug using binary search — O(log n) instead of manual investigation.

```bash
# Start bisect
git bisect start

# Mark current state as bad
git bisect bad

# Mark last known good state
git bisect good v2.3.0

# Git automatically checks out midpoint commits
# After each checkout, test your app, then:
git bisect good   # if this commit is fine
git bisect bad    # if this commit has the bug

# Git narrows down and reports the culprit commit
# When done:
git bisect reset

# Automate with a test script
git bisect run npm test -- --testPathPattern=auth.test.ts
```

### Git Worktrees (Parallel Work Without Stashing)

Work on multiple branches simultaneously without switching contexts.

```bash
# Create a worktree for a hotfix while working on a feature
git worktree add ../hotfix-v2.3.1 hotfix/v2.3.1

# Now you have two checkouts:
# /my-project         → your feature branch
# /hotfix-v2.3.1      → the hotfix branch

# List worktrees
git worktree list

# Remove when done
git worktree remove ../hotfix-v2.3.1
```

---

## 2. Monorepo Strategies

### Turborepo (Node.js Monorepos)

```json
// turbo.json — task pipeline definition
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"], // ← ^ means "build dependencies first"
      "outputs": ["dist/**", ".next/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "inputs": ["src/**/*.ts", "tests/**/*.ts"]
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

```bash
# Build only packages affected by recent changes
turbo build --filter=[HEAD^1]

# Build specific package and its dependencies
turbo build --filter=@myapp/web...

# Run tests in parallel across all packages
turbo test --parallel
```

### Sparse Checkouts (Large Monorepos)

Only checkout the packages you need — dramatically reduces clone time on large repos.

```bash
git clone --no-checkout https://github.com/org/monorepo.git
cd monorepo
git sparse-checkout init --cone
git sparse-checkout set packages/api packages/shared
git checkout main
```

---

## 3. Release Engineering

### Semantic Release (Automated Versioning)

```javascript
// release.config.js
export default {
  branches: ['main', { name: 'beta', prerelease: true }],
  plugins: [
    '@semantic-release/commit-analyzer', // reads conventional commits
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog', // updates CHANGELOG.md
    '@semantic-release/npm', // bumps package.json version
    '@semantic-release/github', // creates GitHub Release
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json'],
        message: 'chore(release): ${nextRelease.version} [skip ci]',
      },
    ],
  ],
};
```

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]
jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write # create GitHub releases
      issues: write # comment on released issues
      pull-requests: write # comment on released PRs
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # full history required for semantic-release
          persist-credentials: false
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npx semantic-release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## 4. Advanced GitHub Actions

### OIDC-Based AWS Auth (Zero Static Secrets)

Never store `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` as GitHub secrets. Use OIDC tokens instead.

```yaml
# Step 1: Create IAM Role in AWS (Terraform)
# resources.tf
resource "aws_iam_role" "github_actions" {
name = "github-actions-deploy"

assume_role_policy = jsonencode({
Version = "2012-10-17"
Statement = [{
Effect = "Allow"
Principal = {
Federated = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"
}
Action = "sts:AssumeRoleWithWebIdentity"
Condition = {
StringEquals = {
"token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
}
StringLike = {
"token.actions.githubusercontent.com:sub" = "repo:MyOrg/my-repo:*"
}
}
}]
})
}
```

```yaml
# Step 2: Use in GitHub Actions workflow
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write # REQUIRED for OIDC
      contents: read
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/github-actions-deploy
          aws-region: us-east-1
          # No AWS_ACCESS_KEY_ID needed!

      - name: Deploy
        run: aws ecs update-service --cluster prod --service api --force-new-deployment
```

### Reusable Workflows

```yaml
# .github/workflows/_deploy.yml (reusable — note leading underscore convention)
name: Deploy (Reusable)
on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
      image-tag:
        required: true
        type: string
    secrets:
      AWS_ROLE_ARN:
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1
      - name: Update ECS service
        run: |
          aws ecs update-service \
            --cluster ${{ inputs.environment }} \
            --service api \
            --force-new-deployment
```

```yaml
# .github/workflows/cd.yml (caller)
name: CD
on:
  push:
    branches: [main]
jobs:
  deploy-staging:
    uses: ./.github/workflows/_deploy.yml
    with:
      environment: staging
      image-tag: ${{ github.sha }}
    secrets:
      AWS_ROLE_ARN: ${{ secrets.STAGING_AWS_ROLE_ARN }}

  deploy-production:
    needs: deploy-staging
    uses: ./.github/workflows/_deploy.yml
    with:
      environment: production
      image-tag: ${{ github.sha }}
    secrets:
      AWS_ROLE_ARN: ${{ secrets.PROD_AWS_ROLE_ARN }}
```

### Matrix Builds

```yaml
jobs:
  test:
    strategy:
      fail-fast: false # ← don't cancel other matrix jobs on first failure
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node: [20, 22]
        exclude:
          - os: windows-latest
            node: 20 # skip this combination
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm ci && npm test
```

---

## 5. Security Hardening

### CODEOWNERS

```
# .github/CODEOWNERS
# Global owners (required reviewers on all PRs)
*                           @org/core-team

# Infrastructure changes require DevOps approval
.github/workflows/          @org/devops
terraform/                  @org/devops
Dockerfile*                 @org/devops

# API security-sensitive files
src/auth/                   @org/security-team
src/middleware/             @org/security-team

# Frontend team owns UI
apps/web/                   @org/frontend-team
```

### Branch Protection Rules (via Terraform)

```hcl
resource "github_branch_protection" "main" {
  repository_id = github_repository.app.node_id
  pattern       = "main"

  required_status_checks {
    strict   = true    # branch must be up to date before merging
    contexts = ["CI / lint-and-test", "CI / build"]
  }

  required_pull_request_reviews {
    required_approving_review_count = 1
    dismiss_stale_reviews           = true
    require_code_owner_reviews      = true
  }

  restrict_pushes {
    push_allowances = []   # nobody can push directly — PR only
  }

  require_signed_commits    = true
  require_linear_history    = true   # squash merge only
}
```

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario                               | Risk                                                 | Mitigation Strategy                                                             |
| :------------------------------------- | :--------------------------------------------------- | :------------------------------------------------------------------------------ |
| **Empty or Null Inputs**               | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers   |
| **Network Timeout / Latency**          | Hanging operations or duplicate side-effects         | Implement bounded abort controllers, exponential backoff, and idempotency keys  |
| **Concurrency / Race Conditions**      | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls          |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection      | Validate boundary payloads with Zod/Pydantic schemas prior to execution         |
| **Resource / Memory Saturation**       | OOM errors, frame drops, or memory leaks             | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern                       | What AI Commonly Does Wrong                                               | What Is Actually Correct                                                 |
| :--------------------------------- | :------------------------------------------------------------------------ | :----------------------------------------------------------------------- |
| **Hallucinated Tool Capabilities** | Assuming an external library or CLI command exists without verification   | Run a verification check or verify package.json before referencing tools |
| **Premature Completion Claim**     | Declaring a task finished because code was generated without verification | Execute tests, linters, or terminal commands to provide concrete proof   |
| **Context Bloat Dumping**          | Pasting entire multi-thousand-line files into prompt context              | Extract targeted excerpts, symbols, and signatures to preserve tokens    |

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
