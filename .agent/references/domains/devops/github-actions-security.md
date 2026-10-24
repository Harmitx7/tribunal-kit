# GitHub Actions Workflow Security & Hardening Reference

> **Authority**: GitHub Security Best Practices & OpenSSF Scorecard  
> **Applicable Domains**: DevOps, CI/CD Pipelines, Cloud Infrastructure  
> **Status**: Verified Production Specification  

---

## 1. Top Vulnerabilities & Invariants

### 1. Script Injection in `run:` Expressions
Never interpolate untrusted context directly inside inline shell scripts:
```yaml
# ❌ VULNERABLE: Direct injection allows arbitrary code execution via PR title
- run: echo "Processing PR: ${{ github.event.pull_request.title }}"

# ✅ SECURE: Pass context through environment variables
- run: echo "Processing PR: $PR_TITLE"
  env:
    PR_TITLE: ${{ github.event.pull_request.title }}
```

### 2. The `pull_request_target` Attack Vector
- `pull_request` runs with the code of the incoming pull request, but with read-only permissions and **no secrets access**.
- `pull_request_target` runs with repository write permissions and **full access to repository secrets**.
- **Rule**: Never checkout untrusted pull request code in a `pull_request_target` workflow before running build scripts or tests!

---

## 2. Least Privilege Permissions

Always enforce a minimal top-level permissions block at the start of every workflow file:

```yaml
permissions:
  contents: read

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write # Only assign permissions required by the specific job
```

---

## 3. OIDC Authentication (Zero Long-Lived Secrets)

Eliminate long-lived cloud API keys by exchanging GitHub's OpenID Connect token for short-lived cloud credentials:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write # Required for requesting the OIDC JWT
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubDeployRole
          aws-region: us-east-1
```

---

## 4. Full-Length Commit SHA Pinning
Pin third-party GitHub Actions to immutable full commit SHAs to prevent supply chain poisoning:
```yaml
# ✅ Immutable SHA Pinning
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
```
