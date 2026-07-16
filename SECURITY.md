# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 5.x     | ✅ Active support  |
| 4.x     | ⚠️ Critical fixes only |
| < 4.0   | ❌ End of life     |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please report vulnerabilities privately using one of these methods:

1. **GitHub Security Advisory** (preferred): Use [GitHub's private vulnerability reporting](https://github.com/Harmitx7/tribunal-kit/security/advisories/new) to submit a confidential report.

2. **Email**: Send details to the maintainer via the email listed in the npm package.

### What to include

- Description of the vulnerability
- Steps to reproduce
- Affected versions
- Potential impact
- Suggested fix (if any)

### Response timeline

| Action | Timeline |
| --- | --- |
| Acknowledgment | Within 48 hours |
| Initial assessment | Within 5 business days |
| Fix release (critical) | Within 7 days |
| Fix release (moderate) | Within 30 days |

## Security Design

Tribunal Kit follows these security principles:

- **No network requests at runtime** — The CLI operates entirely offline. The only network call is an optional npm registry version check during `init`/`update`, which can be skipped with `--skip-update-check`.
- **No code execution from user input** — CLI arguments are parsed without `eval()` or shell interpolation. All subprocess spawning uses array-based arguments (never string concatenation).
- **No secrets stored** — Tribunal Kit does not store, read, or transmit API keys, tokens, or credentials.
- **Minimal dependencies** — Zero production dependencies. Only `jest`, `eslint`, and `typescript` as devDependencies.
- **Platform binaries are optional** — The Rust core binary is distributed as optional dependencies. The CLI falls back to pure JavaScript if binaries are unavailable.

## Supply Chain

- All releases are published from CI via GitHub Actions
- Platform binaries are built in GitHub-hosted runners with pinned action versions
- The package uses `npm provenance` for verifiable supply chain attestation
