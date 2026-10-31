# Tribunal-Kit Workflow & Instruction Modernization (Phase 7)

## Overview

Phase 7 modernizes Tribunal-Kit's instructions, workflows, skill references, and host-specific rule files (`AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `.windsurfrules`, `.github/copilot-instructions.md`, `kernel.md`, `GEMINI.md`).

It establishes a lean instruction hierarchy that cuts turn-0 token overhead by over 75% for host IDE environments, eliminates contradictory reviewer and skill counts, resolves deprecated directory paths (`runners/`), and enforces deterministic structural validation without weakening core anti-hallucination or security guarantees.

---

## 1. Operating Principles & Instruction Hierarchy

The modernized instruction system operates across five deliberate tiers:

```
┌─────────────────────────────────────────────────────────────┐
│ Tier 1: Core Safety & Evidence Invariants                   │
│ • Anti-Hallucination Protocol (P0)                          │
│ • Fabel Protocol & Epistemic Confidence L1–L5 (P0)          │
│ • Human Approval Gates & Controlled Writes                  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Tier 2: Universal Governance Kernel (kernel.md)             │
│ • Lean context budget (< 5,000 bytes / ~1,200 tokens)       │
│ • Specialist Agent Routing & Universal Activity Protocol    │
│ • Subagent-Driven Development (SDD) & Iron Law of TDD / VBC │
│ • Serves as authoritative source for all IDE bridge files   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Tier 3: Comprehensive Master Rules (GEMINI.md)              │
│ • In-depth architectural checklists, OWASP security rules   │
│ • Domain guidelines, error recovery, and failure taxonomies │
│ • Consulted on-demand; not injected into every bridge turn  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Tier 4: Task-Specific Workflows (.agent/workflows/)         │
│ • 52 execution flows with verified frontmatter & bindings   │
│ • Explicit required-skills and scripts-binding resolution   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Tier 5: Domain Skills (.agent/skills/)                      │
│ • 320 deep skills registered in .agent/skill_topic_map.json │
│ • 39 verified domain reference specifications               │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Key Modernizations & Verified Fixes

### A. Lean Kernel Context Budget (< 5,000 bytes)
Previously, host bridge files (`AGENTS.md`, `CLAUDE.md`, `.cursorrules`, etc.) were populated with the entire 24.3KB `GEMINI.md` file, forcing AI coding agents (Claude, Codex, Cursor, Windsurf) to burn ~6,000 tokens on every single turn. Furthermore, when running in environments like Antigravity that load both `AGENTS.md` and `.agent/rules/GEMINI.md`, duplicate rules consumed over 12,000 tokens.

- **Solution**: Streamlined `kernel.md` to 4,851 bytes (total bridge size: 4,979 bytes).
- **Result**: Fits within the `< 5,000` byte budget while preserving all 15 Activity Protocol states, 4 evidence invariants, 8 anti-hallucination rules, 5 Fabel confidence levels, 12 specialist routing domains, and SDD/TDD protocols.
- **Context Savings**: ~4,800 tokens saved per turn (~80% token reduction in bridge files).

### B. Reviewer Count Invariant Parity (28 Reviewers)
- **Problem**: Multiple rule files (`GEMINI.md`, `AGENTS.md`, `CLAUDE.md`, `.cursorrules`) claimed `/tribunal-full (all 31 reviewers)`, contradicting `tribunal-full.md`, `system-prompt.md`, and `reviewer-grid.js` which enforce 28 reviewers.
- **Solution**: Standardized all governance files to **28 reviewers**.

### C. Skill Count Parity (320 Skills)
- **Problem**: Outdated documentation referenced `185 skills`, `219 deep skill modules`, and `235 skills`.
- **Solution**: Verified and aligned all references to the active repository count of **320 skills** across `kernel.md`, `system-prompt.md`, `generate.md`, and `skill-enhancement-engine.md`.

### D. Deprecated Directory Path Correction (`runners/`)
- **Problem**: `skill-enhancement-engine.md` and related skill documents instructed invoking `node runners/skill_enhancement_engine.js`, `runners/validate-payload.js`, and `runners/audit_skill_sdo.js`—a non-existent directory.
- **Solution**: Corrected all execution commands to point to their verified locations in `scripts/`.

### E. Elimination of Legacy Status Announcements
- **Problem**: Legacy announcement syntax (`🤖 Applying knowledge of @[agent-name]...`) remained in `.cursorrules`, `.windsurfrules`, and `.github/copilot-instructions.md`.
- **Solution**: Replaced all occurrences with the standardized context-aware format:
  ```markdown
  › **Activated** `@[agent-name]` · [Domain / Mandate]
    [1-line context-aware summary of what is being inspected and why it matters]
  ```

---

## 3. Automated Instruction Validation (`validate-instructions.js`)

Phase 7 introduces a deterministic instruction validator (`scripts/validate-instructions.js`) that verifies:

1. **Workflow Frontmatter & Integrity**: Checks all 52 workflow files for valid YAML frontmatter, non-empty descriptions, valid `required-skills`, and valid `scripts-binding`.
2. **Path & Invariant Defense**: Flags any usage of deprecated directories (`runners/`), stale reviewer counts (`31 reviewers`), or legacy announcement strings (`Applying knowledge of @`).
3. **Context Budget Compliance**: Asserts that `kernel.md` remains `< 5,000` bytes when wrapped in IDE bridge headers.
4. **Registry Parity**: Verifies 100% mutual consistency between `.agent/skills/` (320 skills) and `skill_topic_map.json`, as well as disk presence for all 39 domain references.

```bash
# Run standalone instruction audit
node scripts/validate-instructions.js
```

---

## 4. Test Verification Matrix

All Phase 7 capabilities and invariants are covered by dedicated automated tests:

- **Unit Test Suite**: `test/unit/instruction_modernization_phase7.test.js` (14 tests)
- **Integration Test Suite**: `test/integration/bridges.test.js` (8 tests, verifying `< 5,000` byte bridge generation)
- **Regression Suite**: All 10 test suites (206 total tests) pass with zero failures.
- **Type Checking**: `npx tsc --noEmit` exits `0` with zero typing errors.

