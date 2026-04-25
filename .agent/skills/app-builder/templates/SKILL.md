---
name: templates
description: Project scaffolding templates for new applications. Use when creating new projects from scratch. Contains 12 templates for various tech stacks.
allowed-tools: Read, Glob, Grep
---

# Project Templates

---

## 🎯 Selective Reading Rule

**Read ONLY the template matching user's project type!**

|Template|Tech Stack|When to Use|
|----------|------------|-------------|
|[nextjs-fullstack](nextjs-fullstack/TEMPLATE.md)|Next.js + Prisma|Full-stack web app|
|[nextjs-saas](nextjs-saas/TEMPLATE.md)|Next.js + Stripe|SaaS product|
|[nextjs-static](nextjs-static/TEMPLATE.md)|Next.js + Framer|Landing page|
|[express-api](express-api/TEMPLATE.md)|Express + JWT|REST API|
|[python-fastapi](python-fastapi/TEMPLATE.md)|FastAPI|Python API|
|[react-native-app](react-native-app/TEMPLATE.md)|Expo + Zustand|Mobile app|
|[flutter-app](flutter-app/TEMPLATE.md)|Flutter + Riverpod|Cross-platform|
|[electron-desktop](electron-desktop/TEMPLATE.md)|Electron + React|Desktop app|
|[chrome-extension](chrome-extension/TEMPLATE.md)|Chrome MV3|Browser extension|
|[cli-tool](cli-tool/TEMPLATE.md)|Node.js + Commander|CLI app|
|[monorepo-turborepo](monorepo-turborepo/TEMPLATE.md)|Turborepo + pnpm|Monorepo|
|[astro-static](astro-static/TEMPLATE.md)|Astro + MDX|Blog / Docs|

---

## Usage

1. User says "create [type] app"
2. Match to appropriate template
3. Read ONLY that template's TEMPLATE.md
4. Follow its tech stack and structure

---

## ðŸš¨ LLM Trap Table

|Pattern|What AI Does Wrong|What Is Actually Correct|
|:---|:---|:---|
|[domain-specific trap 1]|[hallucination]|[correct behavior]|
|[domain-specific trap 2]|[hallucination]|[correct behavior]|
|[domain-specific trap 3]|[hallucination]|[correct behavior]|

---

## âœ… Pre-Flight Self-Audit

Before producing any output, verify:
``
âœ… Did I read the actual files before making claims about them?
âœ… Did I verify all method names against official documentation?
âœ… Did I add // VERIFY: on any uncertain API calls?
âœ… Are all imports from packages that actually exist in package.json?
âœ… Did I test my logic with edge cases (null, empty, 0, max)?
âœ… Did I avoid generating code for more than one module at a time?
âœ… Am I working from evidence, not assumption?
``

---

## ðŸ” VBC Protocol (Verify â†’ Build â†’ Confirm)

``
VERIFY:  Read the actual codebase before writing anything
BUILD:   Generate the smallest meaningful unit of code
CONFIRM: Verify the output is correct before presenting
``

---

## ðŸš¨ LLM Trap Table

|Pattern|What AI Does Wrong|What Is Actually Correct|
|:---|:---|:---|
|[domain-specific trap 1]|[hallucination]|[correct behavior]|
|[domain-specific trap 2]|[hallucination]|[correct behavior]|
|[domain-specific trap 3]|[hallucination]|[correct behavior]|

---

## âœ… Pre-Flight Self-Audit

Before producing any output, verify:
``
âœ… Did I read the actual files before making claims about them?
âœ… Did I verify all method names against official documentation?
âœ… Did I add // VERIFY: on any uncertain API calls?
âœ… Are all imports from packages that actually exist in package.json?
âœ… Did I test my logic with edge cases (null, empty, 0, max)?
âœ… Did I avoid generating code for more than one module at a time?
âœ… Am I working from evidence, not assumption?
``

---

## ðŸ” VBC Protocol (Verify â†’ Build â†’ Confirm)

``
VERIFY:  Read the actual codebase before writing anything
BUILD:   Generate the smallest meaningful unit of code
CONFIRM: Verify the output is correct before presenting
``


## Pre-Flight Checklist
- [ ] Have I reviewed the user's specific constraints and requests?
- [ ] Have I checked the environment for relevant existing implementations?

## VBC Protocol (Verification-Before-Completion)
You MUST verify existing code signatures and variables before attempting to modify or call them. No hallucination is permitted.
