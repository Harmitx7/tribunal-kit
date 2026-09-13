---
description: Live website audit using native browser automation. Audits accessibility (WCAG 2.2), console errors, network failures, Core Web Vitals, and security headers. Passes findings through Tribunal's Maker-Reviewer pipeline before proposing fixes.
tools: Read, Grep, Glob, Bash, Edit, Write
version: 1.0.0
last-updated: 2026-09-13
required-skills:
  - browser-audit
  - web-quality-audit
  - audit-and-fix
scripts-binding:
  - .agent/scripts/browser_audit.js
  - .agent/scripts/checklist.js
---

# /audit-live — Live Website Health & Accessibility Audit

$ARGUMENTS

---

## 1. Objective

Audits a running local server (`http://localhost:3000`) or live staging URL using Tribunal Kit's native browser automation engine.

## 2. Execution Pipeline

```
1. Ingest URL from arguments
      │
2. Execute Browser Audit
   node .agent/scripts/browser_audit.js <url> --json
      │
3. Multi-Reviewer Fan-Out Analysis:
   - web-quality-audit: Evaluates WCAG 2.2 AA contrast & labels
   - frontend-specialist: Analyzes heading hierarchy & layout shifts
   - security-auditor: Checks CSP and security headers
      │
4. Synthesize Prioritized Action Plan:
   - P0: Fatal console errors & unhandled promise rejections
   - P1: Form labels, missing alt text, keyboard focus
   - P2: Security headers & performance optimizations
      │
5. Human Gate Approval:
   Present proposed code fixes to human before editing files.
```

## 3. Human Gate Verification

No code is modified on disk without explicit approval. Findings are presented as:
* Issue Description & Location
* Proposed Fix (Code diff)
* Re-test command to verify resolution.
