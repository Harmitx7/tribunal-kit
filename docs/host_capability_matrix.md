# Tribunal-Kit Host Capability & Compatibility Matrix (Phase 9)

## Overview

This matrix establishes the verified capabilities, integration mechanisms, output constraints, and fallback policies for every execution environment supported by Tribunal-Kit.

The conclusions in this matrix are grounded in direct repository source code, integration bridges, automated tests, and protocol specifications.

---

## 1. Verified Host Capability Matrix

| Host Environment | Integration Mechanism | Output Formats | HTML `<details>` | ANSI Escapes | Unicode Glyphs | Progress Telemetry | Known Constraints & Fallback |
|---|---|---|---|---|---|---|---|
| **Antigravity** (Google DeepMind) | `.gemini/settings.json`, `.gemini/GEMINI.md`, rules bridge | Markdown, Structured JSON | Supported | Stripped (0 ANSI) | Full UTF-8 (`›`, `✔`, `⚠`) | Chat Activity blocks, unmetered fallback | Output rendered in web chat UI; ANSI codes strictly stripped to prevent escape leakage. |
| **Claude Code** (Anthropic CLI) | `.claude/CLAUDE.md`, CLI tool execution, MCP | Markdown, Terminal, PlainText | Unsupported (plain lists) | Supported in TTY, Stripped when piped | Full UTF-8 (`›`, `✔`, `✖`) | Ephemeral progress lines | Subprocess execution often runs in non-TTY pipe; must automatically suppress interactive spinners when piped. |
| **Cursor** (Anysphere) | `.cursorrules`, IDE rules bridge, MCP stdio | Markdown, Structured MCP | Supported | Stripped in chat, Supported in terminal | Full UTF-8 (`✦`, `✔`, `─`) | Status badges, compact pipelines | Narrow sidebars (250px–400px); requires compact line wrapping and short path formatting. |
| **Windsurf** (Codeium) | `.windsurfrules`, IDE rules bridge, MCP stdio | Markdown, Structured MCP | Supported | Stripped in chat | Full UTF-8 (`◆`, `✔`) | Cascade steps | Cascade chat window renders standard GFM; terminal output handled via integrated shell. |
| **GitHub Copilot** | `.github/copilot-instructions.md`, CLI extension | Markdown (Chat), PlainText (CLI) | Unsupported in CLI | Stripped in CLI | UTF-8 in IDE, ASCII in CLI | Non-streaming summary | CLI extension pipes output; must fall back to plain ASCII glyphs (`>`, `[OK]`, `[WARN]`). |
| **OpenAI Codex** | `AGENTS.md`, master instructions | Markdown, PlainText | Unsupported (plain lists) | Stripped | Full UTF-8 | Static milestone text | LLM context injection; strictly requires clean Markdown without terminal control characters. |
| **Direct CLI (TTY)** | `bin/tribunal-kit.js`, `src/cli.js`, TUI engine | Terminal, TrueColor ANSI | N/A (Terminal UI) | Full 24-bit TrueColor / 256 / 16 | Dynamic (UTF-8 or ASCII fallback) | Interactive progress bars & shimmer | Full interactive terminal with live reviewer grid and box panel geometries. |
| **CI / Non-Interactive** | GitHub Actions, GitLab CI, headless scripts | PlainText, Structured JSON | N/A | Stripped unless `FORCE_COLOR` | ASCII fallback (`+`, `!`, `x`, `*`) | Single-line milestone summaries | `process.env.CI=1` or non-TTY suppresses spinners and animated updates. |
| **Piped / Redirection** | Shell pipes (`tk validate \| grep ...`) | PlainText, Structured JSON | N/A | Stripped (0 ANSI) | ASCII or UTF-8 | Suppressed | Detected via `!process.stdout.isTTY`; raw output without decorative borders or ANSI codes. |
| **MCP Consumers** | `bin/mcp-server.js` (stdio JSON-RPC 2.0) | Structured JSON, Text content | N/A | Strictly Stripped | Full UTF-8 | JSON-RPC notifications (optional) | `stdout` strictly reserved for JSON-RPC messages; all logging redirected to `stderr`. |

---

## 2. Capability Resolution Precedence Order

When resolving host capabilities and determining the appropriate renderer, Tribunal-Kit enforces a deterministic 4-tier precedence hierarchy:

```
┌─────────────────────────────────────────────────────────────┐
│ Tier 1: Explicit Caller Option                              │
│ options.environment ('markdown' | 'terminal' | 'plaintext') │
│ CLI flags: --json, --terminal, --plain                      │
└──────────────────────────────┬──────────────────────────────┘
                               │ (if unset)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Tier 2: Verified Integration Context                        │
│ isMcpServer === true        ──► Structured JSON / MCP       │
│ isTestRunner === true       ──► Mocked Host Fixture         │
└──────────────────────────────┬──────────────────────────────┘
                               │ (if unset)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Tier 3: Reliable Runtime Signals                            │
│ process.env.TRIBUNAL_ENV                                    │
│ process.env.CURSOR_AGENT    ──► Cursor (Markdown / compact) │
│ process.env.CLAUDE_CODE     ──► Claude Code (Markdown / noHtml)
│ process.env.CI              ──► CI (PlainText / ASCII)      │
│ !process.stdout.isTTY       ──► Piped (PlainText / NO_COLOR)│
└──────────────────────────────┬──────────────────────────────┘
                               │ (if unset)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Tier 4: Safe Default Fallback                               │
│ Interactive TTY             ──► Terminal (Full TUI)         │
│ Non-Interactive / Unknown   ──► Markdown (Universal GFM)   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Host-Specific Degradation Paths

When an execution environment does not support a high-level presentation feature, the event is adapted without altering its underlying semantics:

1. **HTML `<details>` Progressive Disclosure**:
   - *Supported*: Antigravity, Cursor, Windsurf $\to$ `<details><summary>...</summary>...</details>`.
   - *Unsupported*: Claude Code, Copilot, Codex, CI $\to$ Flattened Markdown indented list (`- ... and N more findings`).
2. **Terminal ANSI Color & SGR Sequences**:
   - *Supported*: Interactive TTY terminals with TrueColor / 256 colors.
   - *Unsupported*: Chat windows, CI logs without `FORCE_COLOR`, `NO_COLOR=1`, piped stdout $\to$ Colors stripped via `stripAnsi()`, plain text retained.
3. **Unicode Glyphs & Braille Spinners**:
   - *Supported*: Modern UTF-8 terminals (`isUtf8 === true`).
   - *Unsupported*: Windows cmd.exe legacy codepages, non-UTF-8 streams $\to$ Swapped to ASCII tokens (`[OK]`, `[FAIL]`, `[WARN]`, `[GATE]`).
4. **Interactive Progress Bars**:
   - *Supported*: Interactive TTY with cursor control.
   - *Unsupported*: Chat windows, piped logs $\to$ Textual summary (`Progress: 45/100 steps (45%) · 55 pending`) or indeterminate badge (`Status: In progress (unmetered)`).

---

## 4. Verification Evidence & Source References

- **Canonical Event Types & Glyphs**: [`src/activity/types.js`](file:///c:/Users/sunrise/Desktop/pfojects/cli%20project/tribunal-kit/src/activity/types.js)
- **Sanitization & Secret Redaction**: [`src/activity/schema.js`](file:///c:/Users/sunrise/Desktop/pfojects/cli%20project/tribunal-kit/src/activity/schema.js)
- **Markdown Presentation System**: [`src/activity/renderers/markdown.js`](file:///c:/Users/sunrise/Desktop/pfojects/cli%20project/tribunal-kit/src/activity/renderers/markdown.js)
- **Terminal Presentation System**: [`src/activity/renderers/terminal.js`](file:///c:/Users/sunrise/Desktop/pfojects/cli%20project/tribunal-kit/src/activity/renderers/terminal.js)
- **PlainText Presentation System**: [`src/activity/renderers/plaintext.js`](file:///c:/Users/sunrise/Desktop/pfojects/cli%20project/tribunal-kit/src/activity/renderers/plaintext.js)
- **Structured JSON Presentation System**: [`src/activity/renderers/structured.js`](file:///c:/Users/sunrise/Desktop/pfojects/cli%20project/tribunal-kit/src/activity/renderers/structured.js)
- **Terminal Theme & Geometry**: [`src/tui/theme.js`](file:///c:/Users/sunrise/Desktop/pfojects/cli%20project/tribunal-kit/src/tui/theme.js)
- **MCP Response Optimization**: [`src/mcp/response_optimizer.js`](file:///c:/Users/sunrise/Desktop/pfojects/cli%20project/tribunal-kit/src/mcp/response_optimizer.js)
- **Bridge Generation**: [`src/commands/init.js`](file:///c:/Users/sunrise/Desktop/pfojects/cli%20project/tribunal-kit/src/commands/init.js)

