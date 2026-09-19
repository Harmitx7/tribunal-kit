---
name: clarify
description: "Use when Improve UX microcopy, label optimization, error messages, and cognitive clarity. Use when text in a UI is confusing, wordy, ambiguous, or unhelpful."
version: 5.0.0
last-updated: 2026-09-13
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

## 🛠️ Technical Architecture & Reference Recipes

---

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
