# Tribunal-Kit Activity Contract & Renderer Foundation (Phase 1)

## Overview

The Tribunal-Kit Activity Presentation System provides a canonical, validated event representation (`ActivityEvent`) and deterministic rendering layer across four target environments:
1. **Markdown**: High-density, minimalist presentation optimized for AI chat windows (Antigravity, Claude Code, Cursor, Windsurf, Copilot, Codex).
2. **Terminal**: TrueColor ANSI formatting for local CLI terminals, respecting `NO_COLOR` and non-TTY outputs.
3. **PlainText**: Plain ASCII formatting for raw logs and CI environments with zero ANSI or markdown decoration.
4. **Structured**: Machine-readable, secret-safe JSON for MCP tool calls, telemetry streaming, and pipeline integration.

---

## Canonical ActivityEvent Schema (`schemaVersion: "1.0.0"`)

| Field | Type | Required | Description |
|---|---|---|---|
| `schemaVersion` | `'1.0.0'` | **Yes** | Strict contract version. Unsupported versions are rejected. |
| `eventId` | `string` | **Yes** | Alphanumeric identifier (`/^[a-zA-Z0-9_\-\.]{3,64}$/`). |
| `operationId` | `string` | **Yes** | Correlating identifier grouping related lifecycle events. |
| `eventType` | `ActivityEventType` | **Yes** | One of the 14 operational event types. |
| `status` | `ActivityStatus` | **Yes** | Observed reality (`pending`, `running`, `passed`, `failed`, `warning`, `blocked`, `completed`, `cancelled`). |
| `title` | `string` | **Yes** | Non-empty string (1–200 characters). |
| `summary` | `string \| null` | Optional | Context or mandate description (max 2000 characters). |
| `phase` | `string \| null` | Optional | Stage or phase label (e.g., `'Phase 1'`). |
| `agent` | `string \| null` | Optional | Specialist agent identifier (e.g., `'resilience-reviewer'`). |
| `skill` | `string \| null` | Optional | Applied skill identifier (e.g., `'clean-code'`). |
| `domain` | `string \| null` | Optional | Domain specialization focus. |
| `progress` | `ActivityProgress` | Optional | Authoritative execution progress counters. |
| `evidence` | `any` | Optional | Authoritative verification findings. **Mandatory for `validation_passed`**. |
| `error` | `object \| null` | Optional | Failure message, code, and remedy. **Mandatory for `validation_failed`**. |
| `warning` | `object \| null` | Optional | Warning condition and impact assessment. |
| `nextAction` | `string \| null` | Optional | Prescribed next action. |
| `reportReferences` | `string[]` | Optional | Array of file paths to generated artifacts or reports. |
| `timestamps` | `object` | **Yes** | `{ startedAt: string, updatedAt: string, completedAt?: string \| null }`. |

---

## Operational Event Types

1. `operation_started`: Top-level operational task initiated.
2. `skill_activated`: Targeted skill applied to current context.
3. `agent_activated`: Specialist agent activated for task domain.
4. `analysis_started`: Static analysis, parsing, or graph inspection in progress.
5. `tool_execution_started`: Subprocess or tool execution in flight.
6. `progress_updated`: Authoritative progress counter update.
7. `evidence_collected`: Authoritative verification facts assembled.
8. `validation_passed`: Hard invariant or test assertion passed (requires evidence).
9. `validation_failed`: Hard invariant or test assertion failed (requires error details).
10. `warning_detected`: Non-blocking warning condition detected.
11. `approval_required`: Human gate sign-off required prior to mutating disk or state.
12. `operation_blocked`: Task paused due to missing context or unfulfilled prerequisite.
13. `retry_started`: Recovery or retry attempt in flight.
14. `operation_completed`: Operation finished execution.
15. `operation_cancelled`: Operation cancelled by user or timeout.

---

## Evidence Integrity Invariants

1. **Started Is Nonterminal**: An `operation_started` event cannot imply completion.
2. **Completed Is Not Verified**: An `operation_completed` event cannot claim successful verification without explicit evidence.
3. **No Phantom Passes**: An event claiming `validation_passed` without evidence or `verified: true` is strictly rejected by validation.
4. **Failure Preservation**: An event with `validation_failed` must preserve the actual underlying error message.
5. **Anti-Fabrication Progress**: Progress percentages cannot be calculated when `isAuthoritative` is false.
6. **Caller Immutability**: `createActivityEvent` deeply clones caller input; caller-owned objects are never mutated.
7. **Secret-Safe Presentation**: All credentials (API keys, Bearer tokens, JWTs, AWS credentials, DB connection strings, private keys) are redacted prior to rendering.

---

## Public Programmatic API

```javascript
const {
  createActivityEvent,
  validateActivityEvent,
  assertValidActivityEvent,
  sanitizeActivityEvent,
  MarkdownRenderer,
  renderMarkdown,
  TerminalRenderer,
  renderTerminal,
  PlainTextRenderer,
  renderPlainText,
  StructuredRenderer,
  renderStructured,
  renderActivity,
  formatActivity,
  announceAgent,
  announceSkill,
  EVENT_TYPES,
  STATUSES,
} = require('tribunal-kit/src/activity');

// Create validated event
const event = createActivityEvent({
  eventType: EVENT_TYPES.TESTS_RUNNING,
  title: 'Phase 14 Baseline Verification',
  summary: 'Running 12 Codebase Intelligence test suites.',
  progress: { current: 8, total: 12, unit: 'suites', isAuthoritative: true },
  nextAction: 'Capture baseline counts',
});

// Render across environments
const mdOutput = renderMarkdown(event);
const termOutput = renderTerminal(event);
const plainOutput = renderPlainText(event);
const jsonOutput = renderStructured(event);
```

