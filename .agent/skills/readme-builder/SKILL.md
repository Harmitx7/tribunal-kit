---
name: readme-builder
description: Interactive README.md generation specialist. Creates professional, structured README files with badges, installation guides, usage examples, screenshots, and contribution guidelines. Use when asked to create, update, or improve a README file.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-03-19
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

## Hallucination Traps (Read First)
- ❌ Starting a README with the project name as the only heading -> ✅ Lead with what the project DOES, not just what it IS
- ❌ Skipping installation and quick-start sections -> ✅ Users need to run the project in under 60 seconds or they leave
- ❌ Using screenshots without alt text -> ✅ All images need descriptive alt text for accessibility and broken image fallback

---


# README Builder Skill

---

## Ground Rules

1. **Always scan the project first** — read `package.json`, `pyproject.toml`, source files before writing a single line
2. **No placeholder content** — every section must have real, specific information
3. **Lead with value** — the first 3 lines must communicate what the project does and who it's for
4. **Runnable examples** — every code block must be copy-paste ready and tested against the actual project

---

## Discovery Phase (Mandatory Before Writing)

Before generating any README content, answer these questions by scanning the project:

```
1. What does this project do? (single sentence)
2. Who is the target user? (developer / end-user / enterprise)
3. What problem does it solve?
4. What are the installation prerequisites?
5. What is the primary command or API entry point?
6. Does it have a license file?
7. Are there screenshots, demos, or GIFs available?
8. Is there a CONTRIBUTING.md or CODE_OF_CONDUCT.md?
9. What CI/CD badges are relevant? (GitHub Actions, npm, PyPI, etc.)
10. What is the current version?
```

---

## README Structure Template

```markdown
# [Project Name]

[One-line tagline: what it does and for whom]

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/npm/v/package-name)](https://www.npmjs.com/package/package-name)
[![Build Status](https://github.com/user/repo/workflows/CI/badge.svg)](https://github.com/user/repo/actions)

[Optional: Screenshot or GIF Demo]

---

## ✨ Features

- **Feature 1** — specific, concrete description
- **Feature 2** — specific, concrete description
- **Feature 3** — specific, concrete description

---

## 📋 Prerequisites

- Node.js 18+ / Python 3.11+ / etc.
- [Any specific tool or account required]

---

## 🚀 Installation

```bash
# npm
npm install package-name

# or yarn
yarn add package-name

# or global CLI install
npm install -g package-name
```

---

## 💻 Usage

### Basic Example

```bash
# One-liner that shows the most common use case
package-name --flag value
```

### Advanced Example

```bash
# More complex real-world usage
package-name init --config ./config.json --output ./dist
```

---

## ⚙️ Configuration

|Option|Type|Default|Description|
|--------|------|---------|-------------|
|`option1`|`string`|`"default"`|What it controls|
|`option2`|`boolean`|`false`|What it controls|

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit changes: `git commit -m "feat: add your feature"`
4. Push to branch: `git push origin feat/your-feature`
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## 📄 License

[MIT](LICENSE) © [Author Name]
```

---

## Badge Reference

### Common Badges (GitHub-hosted project)

```markdown
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/PACKAGE-NAME.svg)](https://badge.fury.io/js/PACKAGE-NAME)
[![npm downloads](https://img.shields.io/npm/dm/PACKAGE-NAME.svg)](https://www.npmjs.com/package/PACKAGE-NAME)
[![GitHub stars](https://img.shields.io/github/stars/USER/REPO.svg?style=social)](https://github.com/USER/REPO)
[![GitHub issues](https://img.shields.io/github/issues/USER/REPO.svg)](https://github.com/USER/REPO/issues)
[![CI](https://github.com/USER/REPO/workflows/CI/badge.svg)](https://github.com/USER/REPO/actions)
[![Coverage](https://img.shields.io/codecov/c/github/USER/REPO)](https://codecov.io/gh/USER/REPO)
```

---

## Section Writing Guidelines

### Hero Section (Lines 1–5)
- Project name as `# H1` — only one per README
- Tagline in a `> blockquote` — punchy, one sentence
- Badges immediately after — visual trust signals

### Features Section
- Use emoji bullets for scannability
- Each bullet = one concrete capability, not a vague claim
- ❌ "Powerful and flexible" → ✅ "Processes 10k records/sec with zero config"

### Installation Section
- Always show the most direct path first (e.g., `npm install`)
- Show alternatives (yarn, pnpm, brew) as secondary options
- If there are post-install steps (env vars, migrations), list them explicitly

### Usage Section
- Start with the simplest 1-line example
- Progress to realistic examples with real flag names
- If it's a library, show import + function call pattern

### Configuration Table
- Every environment variable or config key goes here
- Include: name, type, default, description
- Mark required fields with `*` in the Description column

---

## Project-Type Specific Additions

### CLI Tools
Add a dedicated `## Commands` section:

```markdown
## Commands

|Command|Description|
|---------|-------------|
|`tool init`|Initialize a new project|
|`tool build`|Compile and bundle|
|`tool deploy`|Deploy to production|
|`tool --help`|Show all available options|
```

### Libraries / SDKs
Add a `## API Reference` section with function signatures:

```markdown
## API Reference

### `functionName(param1, param2)`

Returns: `ReturnType`

|Parameter|Type|Description|
|-----------|------|-------------|
|`param1`|`string`|Description|
|`param2`|`options`|Optional config|
```

### Monorepos
Add a `## Packages` table:

```markdown
## Packages

|Package|Version|Description|
|---------|---------|-------------|
|[`@org/core`](packages/core)|[![npm](https://img.shields.io/npm/v/@org/core)](https://npm.im/@org/core)|Core engine|
|[`@org/cli`](packages/cli)|[![npm](https://img.shields.io/npm/v/@org/cli)](https://npm.im/@org/cli)|CLI interface|
```

---

## Output Format

When this skill generates or reviews a README, structure your response as:

```
━━━ README Builder Report ━━━━━━━━━━━━━━━━━━━━━━━━━
Skill:       readme-builder
Project:     [project name / type detected]
Sections:    [list of sections generated]
─────────────────────────────────────────────────────
✅ Included: [sections that are complete]
⚠️  Missing:  [sections that should be added]
❌ Blocked:  [issues preventing completion]
─────────────────────────────────────────────────────
VBC status:  PENDING → VERIFIED
Evidence:    [file written at path / content reviewed]
```

---


---

## 🤖 LLM-Specific Traps

AI coding assistants often fall into specific bad habits when dealing with this domain. These are strictly forbidden:

1. **Over-engineering:** Proposing complex abstractions or distributed systems when a simpler approach suffices.
2. **Hallucinated Libraries/Methods:** Using non-existent methods or packages. Always `// VERIFY` or check `package.json` / `requirements.txt`.
3. **Skipping Edge Cases:** Writing the "happy path" and ignoring error handling, timeouts, or data validation.
4. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.
5. **Silent Degradation:** Catching and suppressing errors without logging or re-raising.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit

Review these questions before confirming output:
```
✅ Did I rely ONLY on real, verified tools and methods?
✅ Is this solution appropriately scoped to the user's constraints?
✅ Did I handle potential failure modes and edge cases?
✅ Have I avoided generic boilerplate that doesn't add value?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
