---
name: clarify
description: Improve UX microcopy, label optimization, error messages, and cognitive clarity. Use when text in a UI is confusing, wordy, ambiguous, or unhelpful.
version: 1.0.0
last-updated: 2026-07-22
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: UX Writing & Microcopy
  tier: pro
  co-requires: [distill, shape]
  trigger-signals:
    strong: [clarify, UX copy, microcopy, error message copy, button labels, cognitive clarity, clear writing]
    weak: [fix text, rewording, rewrite label]
---

# Clarify — UX Microcopy & Cognitive Clarity

Optimize user interface text, button labels, error messaging, and helper copy for maximum clarity and minimum cognitive friction.

---

## 4 UX Copy Rules

### 1. Active & Action-Oriented Verbs
- Action buttons MUST begin with strong, specific verbs describing the result.
  - ❌ *Submit* → ✅ *Save changes*
  - ❌ *Click here* → ✅ *Download export*
  - ❌ *OK* → ✅ *Delete project*

### 2. Actionable & Helpful Error Messages
- Error messages MUST explain what happened AND how to resolve it.
  - ❌ *Invalid input.*
  - ✅ *Invalid email format. Enter an email like user@example.com.*
  - ❌ *Error 403.*
  - ✅ *You don't have permission to edit this document. Request access from the owner.*

### 3. Eliminate Passive Jargon
- Remove internal technical jargon and passive phrasing.
  - ❌ *Your request has been processed successfully by the system queue.*
  - ✅ *Settings updated.*

### 4. Direct Confirmation Dialogs
- Modal headers must state the explicit consequence. Modal action buttons must match the title verb.
  - Title: *Delete workspace?*
  - Body: *All projects, keys, and member permissions in this workspace will be permanently removed.*
  - Primary Button: *Delete workspace* (Destructive red)
  - Secondary Button: *Cancel*

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
