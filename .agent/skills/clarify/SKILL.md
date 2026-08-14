---
name: clarify
description: Improve UX microcopy, label optimization, error messages, and cognitive clarity. Use when text in a UI is confusing, wordy, ambiguous, or unhelpful.
version: 3.0.0
last-updated: 2026-07-30
skills:
  - distill
  - shape
  - baseline-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Clarify — UX Microcopy & Cognitive Clarity

---

## Mandatory Pre-Flight Context Inspection

Before optimizing UI text or error messages, you MUST inspect:

1. Target UI labels & modals → Check for vague "Submit" or "OK" buttons and passive corporate jargon
2. Active Verb Rules (Section 24) → Ensure action buttons start with specific verbs describing outcomes (e.g. _Save changes_, _Download export_)
3. Actionable Error Messages (Section 30) → Pair error descriptions with explicit resolution steps

Optimize user interface text, button labels, error messaging, and helper copy for maximum clarity and minimum cognitive friction.

---

## 4 UX Copy Rules

### 1. Active & Action-Oriented Verbs

- Action buttons MUST begin with strong, specific verbs describing the result.
  - ❌ _Submit_ → ✅ _Save changes_
  - ❌ _Click here_ → ✅ _Download export_
  - ❌ _OK_ → ✅ _Delete project_

### 2. Actionable & Helpful Error Messages

- Error messages MUST explain what happened AND how to resolve it.
  - ❌ _Invalid input._
  - ✅ _Invalid email format. Enter an email like user@example.com._
  - ❌ _Error 403._
  - ✅ _You don't have permission to edit this document. Request access from the owner._

### 3. Eliminate Passive Jargon

- Remove internal technical jargon and passive phrasing.
  - ❌ _Your request has been processed successfully by the system queue._
  - ✅ _Settings updated._

### 4. Direct Confirmation Dialogs

- Modal headers must state the explicit consequence. Modal action buttons must match the title verb.
  - Title: _Delete workspace?_
  - Body: _All projects, keys, and member permissions in this workspace will be permanently removed._
  - Primary Button: _Delete workspace_ (Destructive red)
  - Secondary Button: _Cancel_

---

## 🤖 LLM-Specific Traps

1. **Generic OK/Cancel Modals**: Writing modal dialogs with generic "OK" buttons that obscure the action consequence.
2. **Snarky or Overly Clever Copy**: Using cute or humorous error messages when users are frustrated by a failure.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `ui-ux-auditor`**

### ✅ Pre-Flight Self-Audit

```
✅ Does every button start with an explicit action verb?
✅ Do error messages clearly instruct the user how to resolve the issue?
✅ Is passive corporate jargon completely eliminated?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
