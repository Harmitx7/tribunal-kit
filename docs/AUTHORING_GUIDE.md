# Authoring Guide — Custom Agents, Skills, and Workflows

This guide explains how to extend `tribunal-kit` by authoring custom Specialist Agents, Skills, and Workflows.

---

## 1. Creating Custom Agents (`.agent/agents/*.md`)

Agents are markdown files placed in `.agent/agents/` with YAML frontmatter.

```markdown
---
name: backend-security-specialist
description: Audits Node.js and SQL APIs for OWASP Top 10 vulnerabilities.
tools: Read, Grep, Edit, Write
skills:
  - backend-security-expert
  - vulnerability-scanner
version: 3.0.0
---

# Backend Security Specialist

## Core Rules
1. Every SQL query must be parameterized.
2. Every async route must have error handling middleware.
```

---

## 2. Creating Custom Skills (`.agent/skills/<skill-name>/SKILL.md`)

Skills reside in `.agent/skills/<skill-name>/` and contain instructions, scripts, or examples.

```markdown
---
name: my-custom-skill
description: Teaches best practices for company-specific API patterns.
version: 3.0.0
script: scripts/validate_api.js
---

# My Custom Skill

## Pre-Flight Checklist
- Check endpoint URL structure
- Verify JWT header parsing
```

---

## 3. Creating Workflows (`.agent/workflows/*.md`)

Workflows provide step-by-step guidance triggered by slash commands (e.g. `/my-workflow`).

```markdown
# /my-workflow — Custom Workflow

1. Perform impact analysis
2. Run test suite
3. Request human gate approval
```
