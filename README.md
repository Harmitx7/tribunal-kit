<!-- PROJECT HEADER -->
<div align="center">
  <br>
  <img src="https://raw.githubusercontent.com/Harmitx7/tribunal-kit/main/docs/tribunalkit_no_bg.png" alt="TribunalKit Logo" width="380" style="margin-bottom: 20px;" />

  <h1 style="font-size: 3.5em; font-weight: 800; letter-spacing: -2px; margin: 0; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    TRIBUNAL KIT
  </h1>

  <p style="font-size: 1.35em; color: #ffffff; font-weight: 600; margin: 15px 0 8px 0;">
    Your AI writes code that doesn't exist. Tribunal Kit stops it.
  </p>
  <p style="font-size: 1.0em; color: #88888b; font-weight: 400; letter-spacing: 0.5px; margin: 0 0 25px 0;">
    The zero-dependency governance layer for AI coding agents — 52 specialists, 28 reviewers, compiled Rust core.
  </p>

  <!-- BADGES -->
  <div style="margin-bottom: 25px;">
    <a href="https://www.npmjs.com/package/tribunal-kit">
      <img src="https://img.shields.io/npm/v/tribunal-kit?style=for-the-badge&logo=npm&logoColor=white&color=ff1637" alt="NPM Version" />
    </a>
    <a href="https://github.com/Harmitx7/tribunal-kit">
      <img src="https://img.shields.io/github/stars/Harmitx7/tribunal-kit?style=for-the-badge&logo=github&logoColor=white&color=111111&label=Stars" alt="GitHub Stars" />
    </a>
    <a href="https://www.npmjs.com/package/tribunal-kit">
      <img src="https://img.shields.io/npm/dw/tribunal-kit?style=for-the-badge&logo=npm&logoColor=white&color=1a1a1f&label=Downloads" alt="NPM Downloads" />
    </a>
    <a href="https://github.com/Harmitx7/tribunal-kit/actions/workflows/ci.yml">
      <img src="https://img.shields.io/github/actions/workflow/status/Harmitx7/tribunal-kit/ci.yml?style=for-the-badge&logo=githubactions&logoColor=white&label=CI" alt="CI Status" />
    </a>
    <br>
    <a href="LICENSE">
      <img src="https://img.shields.io/badge/License-MIT-1a1a1f?style=for-the-badge&color=2d2d30" alt="License" />
    </a>
    <a href="CHANGELOG.md">
      <img src="https://img.shields.io/badge/Release-v9.0.0-ccff00?style=for-the-badge&color=111111&logo=github&logoColor=ccff00" alt="Release Version" />
    </a>
    <a href="package.json">
      <img src="https://img.shields.io/badge/Dependencies-0-ccff00?style=for-the-badge&color=111111&logoColor=111" alt="Zero Dependencies" />
    </a>
    <a href="crates/core">
      <img src="https://img.shields.io/badge/Core-Rust_10ms-DEA584?style=for-the-badge&logo=rust&logoColor=white" alt="Rust Core" />
    </a>
    <a href="mcp_config.json">
      <img src="https://img.shields.io/badge/MCP-Ready-00c2ff?style=for-the-badge&logo=openai&logoColor=111" alt="MCP Server" />
    </a>
    <a href="SECURITY.md">
      <img src="https://img.shields.io/badge/Security-Strict_Sandbox-ff1637?style=for-the-badge" alt="Security Policy" />
    </a>
  </div>

  <p>
    <strong>Universal Compatibility:</strong>
    <code>Cursor</code> • <code>Claude Code</code> • <code>Windsurf</code> • <code>VS Code</code> • <code>Aider</code> • <code>Devin</code>
  </p>
</div>

<br>

<!-- THE PROBLEM -->
<div style="background: linear-gradient(145deg, #1a0a0a, #16161c); border: 1px solid #3a1a1a; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
  <div style="display: flex; align-items: center; margin-bottom: 12px;">
    <span style="background-color: #ff1637; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75em; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-right: 10px;">The Problem</span>
    <strong style="color: #ffffff; font-size: 1.15em;">AI coding agents hallucinate. Constantly.</strong>
  </div>
  <p style="color: #c9c9d1; font-size: 0.95em; line-height: 1.6; margin: 0;">
    They import phantom packages that don't exist on npm. They invent deprecated framework hooks. They hallucinate database columns not in your schema. They bloat system prompts with static rules models ignore, and repeat the exact syntax bug you fixed 20 minutes ago.
    <br><br>
    <strong>No linter catches this. No typechecker catches this.</strong> Linters only run <em>after</em> code is written and cannot understand semantic intent. Until now, nothing governed your AI in real time.
  </p>
</div>

<!-- THE SOLUTION -->
<div style="background: linear-gradient(145deg, #0a1a0a, #16161c); border: 1px solid #1a3a1a; border-radius: 12px; padding: 24px; margin-bottom: 35px;">
  <div style="display: flex; align-items: center; margin-bottom: 12px;">
    <span style="background-color: #ccff00; color: #111; padding: 4px 8px; border-radius: 4px; font-size: 0.75em; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-right: 10px;">The Solution</span>
    <strong style="color: #ffffff; font-size: 1.15em;">One command. Your AI stops lying.</strong>
  </div>
  <p style="color: #c9c9d1; font-size: 0.95em; line-height: 1.6; margin: 0;">
    Tribunal Kit wraps your coding agents in an active <strong>neurosymbolic verification envelope</strong> — 52 specialist agents, 28 parallel reviewers, 185 skills, and a native compiled Rust core. It intercepts AI output in <strong>&lt; 12ms</strong>, validates it against your live repository AST, and blocks hallucinated code before it ever touches disk.
  </p>
</div>

<!-- VISUAL DEMONSTRATION -->
### ⚡ The Real-Time Difference

```text
  WITHOUT TRIBUNAL KIT                               WITH TRIBUNAL KIT
─────────────────────────────────────────────      ─────────────────────────────────────────────
$ cursor "Build a file upload Server Action"        $ cursor "Build a file upload Server Action"

AI Output:                                         AI Output:
  import { useFormStatus } from 'react-dom';         import { useActionState } from 'react';
  import { uploadFile } from 'ghost-s3-uploader';    import { put } from '@vercel/blob';

Runtime Result:                                    Tribunal Core Intercept (9ms):
  ❌ Error: Cannot find module 'ghost-s3-uploader'    🛡️ [BLOCKED] 'ghost-s3-uploader' is a PHANTOM PACKAGE
  ❌ Warning: useFormStatus deprecated in React 19   ⚖️ [CASE LAW] Enforcing Next.js 15 Server Action rules
                                                    ✅ [APPROVED] Verified against package.json & AST
  💥 45 minutes wasted debugging                      ⚡ 0 minutes wasted. 100% working code shipped.
```

---

<!-- QUICKSTART -->

## ⚡ 30-Second Quickstart

Install the governance layer in any repository with one command:

```bash
npx tribunal-kit init    # Scaffolds .agent/ and auto-detects Cursor, Windsurf, VS Code
npx tribunal-kit sync    # Synchronizes active governance rules across all IDEs
npx tribunal-kit status  # Verifies repository health and rule integrity
```

### 🔌 Universal CLI Agent Adapter (Claude Code, Aider, Cline)

Tribunal Kit includes native plugins and adapter hooks for terminal agents:

```bash
npx tribunal-kit tk-adapt           # Auto-detect and install for all active CLI agents
npx tribunal-kit tk-adapt claude    # Install directly for Claude Code
npx tribunal-kit tk-adapt aider     # Install directly for Aider
npx tribunal-kit tk-adapt --global  # Install globally to ~/.tribunal-kit/
```

### 🛡️ Pre-Push Supply Chain Protection

Catch hallucinated imports and ghost packages before code ever reaches your remote:

```bash
npx tribunal-kit hook       # Installs automated Git pre-push governance hook
npx tribunal-kit guardrail  # Manually scans changes for phantom packages & // VERIFY tags
```

<br>
<hr style="height: 1px; border: none; background: linear-gradient(to right, transparent, #33333f, transparent); margin: 40px 0;" />

<!-- NATIVE PLUGINS ECOSYSTEM -->

## 🔌 First-Class Native Plugins & Ecosystem Integrations

Tribunal Kit ships with pre-configured native plugins and extensions across the AI engineering landscape:

<div style="overflow-x: auto; margin-top: 20px; border-radius: 8px; border: 1px solid #222225;">
  <table style="width: 100%; border-collapse: collapse; text-align: left; background-color: #111115;">
    <thead>
      <tr style="border-bottom: 2px solid #22222f; background-color: #16161d; color: #ffffff;">
        <th style="padding: 12px 16px; font-weight: 600;">Environment / Agent</th>
        <th style="padding: 12px 16px; font-weight: 600;">Integration Type</th>
        <th style="padding: 12px 16px; font-weight: 600;">One-Line Activation</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom: 1px solid #222225;">
        <td style="padding: 12px 16px; font-weight: 600; color: #ffffff;">Anthropic Claude Code</td>
        <td style="padding: 12px 16px; color: #ccff00;">Native Marketplace Plugin (<code>.claude-plugin/</code>)</td>
        <td style="padding: 12px 16px;"><code>/plugin marketplace add Harmitx7/tribunal-kit</code> or <code>tk-adapt claude</code></td>
      </tr>
      <tr style="border-bottom: 1px solid #222225;">
        <td style="padding: 12px 16px; font-weight: 600; color: #ffffff;">OpenCode.ai</td>
        <td style="padding: 12px 16px; color: #ccff00;">Native Plugin Config (<code>.opencode/</code>)</td>
        <td style="padding: 12px 16px;">Add <code>"plugin": ["tribunal-kit@latest"]</code> in <code>opencode.json</code></td>
      </tr>
      <tr style="border-bottom: 1px solid #222225;">
        <td style="padding: 12px 16px; font-weight: 600; color: #ffffff;">Cursor IDE</td>
        <td style="padding: 12px 16px; color: #ccff00;">Plugin & Rule Bridge (<code>.cursor-plugin/</code>)</td>
        <td style="padding: 12px 16px;"><code>npx tribunal-kit sync</code></td>
      </tr>
      <tr style="border-bottom: 1px solid #222225;">
        <td style="padding: 12px 16px; font-weight: 600; color: #ffffff;">Cognition Devin</td>
        <td style="padding: 12px 16px; color: #ccff00;">Devin Native Plugin (<code>.devin-plugin/</code>)</td>
        <td style="padding: 12px 16px;">Auto-detected via <code>.devin-plugin/plugin.json</code></td>
      </tr>
      <tr style="border-bottom: 1px solid #222225;">
        <td style="padding: 12px 16px; font-weight: 600; color: #ffffff;">Google Gemini CLI</td>
        <td style="padding: 12px 16px; color: #ccff00;">Extension Manifest (<code>gemini-extension.json</code>)</td>
        <td style="padding: 12px 16px;">Auto-registered via <code>gemini-extension.json</code></td>
      </tr>
      <tr style="border-bottom: 1px solid #222225;">
        <td style="padding: 12px 16px; font-weight: 600; color: #ffffff;">Moonshot Kimi & Hermes</td>
        <td style="padding: 12px 16px; color: #ccff00;">Native Plugin Bundles (<code>.kimi-plugin</code>, <code>.hermes-plugin</code>)</td>
        <td style="padding: 12px 16px;">Packaged out-of-the-box with manifest bindings</td>
      </tr>
      <tr style="border-bottom: 1px solid #222225;">
        <td style="padding: 12px 16px; font-weight: 600; color: #ffffff;">Aider CLI & Codex</td>
        <td style="padding: 12px 16px; color: #ccff00;">Conventions & Agents Bridge</td>
        <td style="padding: 12px 16px;"><code>npx tribunal-kit tk-adapt aider</code></td>
      </tr>
    </tbody>
  </table>
</div>

<br>
<hr style="height: 1px; border: none; background: linear-gradient(to right, transparent, #33333f, transparent); margin: 40px 0;" />

<!-- WHAT YOU GET -->

### 📦 What's Inside

| Layer | Count | What It Does |
| :--- | :--- | :--- |
| **Specialist Agents** | 52 | Domain-specific reasoning (Frontend, Backend, Security, Database, Mobile, DevOps) |
| **Tribunal Reviewers** | 28 | Parallel review pipeline that intercepts logic and security defects before disk write |
| **Reusable Skills** | 184 | Deep knowledge packs (React 19, Next.js 15, Rust, Python, Vue, Animations, A11y) |
| **Slash Workflows** | 41 | One-command operations (`/generate`, `/debug`, `/audit`, `/deploy`, `/refactor`) |
| **Native Plugins** | 9+ | First-class plugins for Claude Code, Cursor, OpenCode, Devin, Kimi, Hermes, Pi, and Gemini CLI |
| **Compiled Rust Core** | 1 | Native binary for AOT Semantic Graph extraction, AST parsing, hashing, and deduping |
| **MCP Server** | 1 | Model Context Protocol integration with `query_semantic_graph` capabilities |
| **Supreme Court Precedents** | ∞ | Permanent repository memory that records AI mistakes so they are never repeated |

<br>
<hr style="height: 1px; border: none; background: linear-gradient(to right, transparent, #33333f, transparent); margin: 40px 0;" />

<!-- COMPARATIVE ANALYSIS -->

## 📈 Comparative Analysis: Tribunal Kit vs. Alternatives

AI engineering requires active verification, not passive prompt text:

<div style="overflow-x: auto; margin-top: 20px; border-radius: 8px; border: 1px solid #222225;">
  <table style="width: 100%; border-collapse: collapse; text-align: left; background-color: #111115;">
    <thead>
      <tr style="border-bottom: 2px solid #22222f; background-color: #16161d;">
        <th style="padding: 14px 18px; color: #ffffff; font-weight: 600;">Dimension / Capability</th>
        <th style="padding: 14px 18px; color: #ccff00; font-weight: 600;">Tribunal Kit 🛡️</th>
        <th style="padding: 14px 18px; color: #a0a0a5; font-weight: 600;">Static <code>.cursorrules</code></th>
        <th style="padding: 14px 18px; color: #a0a0a5; font-weight: 600;">AST Linters (ESLint)</th>
        <th style="padding: 14px 18px; color: #a0a0a5; font-weight: 600;">Manual System Prompts</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom: 1px solid #222228;">
        <td style="padding: 14px 18px; font-weight: 600; color: #ffffff;">Hallucination Interception</td>
        <td style="padding: 14px 18px; color: #ccff00; font-weight: 600; background-color: #1a2211;">Active check gates (<code>tk guardrail</code>)</td>
        <td style="padding: 14px 18px; color: #c9c9d1;">None (passive text only)</td>
        <td style="padding: 14px 18px; color: #c9c9d1;">None (misses semantic intent)</td>
        <td style="padding: 14px 18px; color: #c9c9d1;">None (models drift)</td>
      </tr>
      <tr style="border-bottom: 1px solid #222228;">
        <td style="padding: 14px 18px; font-weight: 600; color: #ffffff;">Context Window Overhead</td>
        <td style="padding: 14px 18px; color: #ccff00; font-weight: 600; background-color: #1a2211;">Budget-gated recall & MCP tools</td>
        <td style="padding: 14px 18px; color: #c9c9d1;">Severe (bloats with entire files)</td>
        <td style="padding: 14px 18px; color: #c9c9d1;">N/A (runs post-edit)</td>
        <td style="padding: 14px 18px; color: #c9c9d1;">High (burns context budget)</td>
      </tr>
      <tr style="border-bottom: 1px solid #222228;">
        <td style="padding: 14px 18px; font-weight: 600; color: #ffffff;">Cross-Session Memory</td>
        <td style="padding: 14px 18px; color: #ccff00; font-weight: 600; background-color: #1a2211;">Supreme Court Case Law (<code>tk case</code>)</td>
        <td style="padding: 14px 18px; color: #c9c9d1;">None (forgets every prompt)</td>
        <td style="padding: 14px 18px; color: #c9c9d1;">None</td>
        <td style="padding: 14px 18px; color: #c9c9d1;">None</td>
      </tr>
      <tr style="border-bottom: 1px solid #222228;">
        <td style="padding: 14px 18px; font-weight: 600; color: #ffffff;">Self-Evolution</td>
        <td style="padding: 14px 18px; color: #ccff00; font-weight: 600; background-color: #1a2211;">Git diff learning & SkillOpt</td>
        <td style="padding: 14px 18px; color: #c9c9d1;">Manual editing</td>
        <td style="padding: 14px 18px; color: #c9c9d1;">Manual config edits</td>
        <td style="padding: 14px 18px; color: #c9c9d1;">Manual prompt tuning</td>
      </tr>
      <tr style="border-bottom: 1px solid #222228;">
        <td style="padding: 14px 18px; font-weight: 600; color: #ffffff;">IDE & CLI Universal Support</td>
        <td style="padding: 14px 18px; color: #ccff00; font-weight: 600; background-color: #1a2211;">Cursor, Windsurf, VSCode, Claude, Aider</td>
        <td style="padding: 14px 18px; color: #c9c9d1;">Cursor/Windsurf only</td>
        <td style="padding: 14px 18px; color: #c9c9d1;">Independent</td>
        <td style="padding: 14px 18px; color: #c9c9d1;">Hand-copied</td>
      </tr>
      <tr style="border-bottom: 1px solid #222228;">
        <td style="padding: 14px 18px; font-weight: 600; color: #ffffff;">Execution Performance</td>
        <td style="padding: 14px 18px; color: #ccff00; font-weight: 600; background-color: #1a2211;">Compiled Rust Core (<code>tribunal-core</code>)</td>
        <td style="padding: 14px 18px; color: #c9c9d1;">N/A (static)</td>
        <td style="padding: 14px 18px; color: #c9c9d1;">Slow Node processes</td>
        <td style="padding: 14px 18px; color: #c9c9d1;">Slow API calls</td>
      </tr>
    </tbody>
  </table>
</div>

<br>
<hr style="height: 1px; border: none; background: linear-gradient(to right, transparent, #33333f, transparent); margin: 40px 0;" />

<!-- SECTION: 4 SUPERPOWERS -->

## 🏛️ The 4 Core Superpowers

### 1. ⚖️ Supreme Court Case Law & Memory (`tk case`)
**Your AI will never make the same mistake twice.** Whenever your coding assistant introduces an antipattern or bug, record it as a legal precedent:

```bash
# Add an AI mistake precedent
tk case add

# Search case law database
tk case search "postgres deadlock"
```

The `precedence-reviewer` actively checks this database during generation. If the agent attempts the same antipattern, Tribunal Kit rules it unconstitutional and blocks the write.

### 2. 🛡️ Phantom Package & Schema Guardrails (`tk guardrail`)
AI models frequently hallucinate libraries that sound plausible but do not exist, exposing developers to **AI Package Hallucination Exploits (Slopsquatting)**:

```bash
# Scan workspace changes for unverified dependencies and // VERIFY tags
npx tribunal-kit guardrail
```

### 3. 🧬 SkillOpt: Autonomous Self-Evolution Engine
Stop manually re-prompting. SkillOpt mutates, token-checks, and benchmarks instruction skills directly against real test harnesses:

```bash
# Optimize a skill against a test harness
tk optimize-skill --target ./skills/auth-security.md "npm run test:auth" --epochs 5 --candidates 3
```

- **Proposal Generation**: The LLM suggests micro-patches for instruction files.
- **Rust Deduplication**: Normalized Levenshtein similarity (default `0.85`) filters redundant proposals.
- **Genetic Promotion**: Passing harness tests promote winning candidates as the new baseline.

### 4. ⚡ Compiled Rust Core (`tribunal-core`)
Heavy computation is delegated to a native Rust binary:
- **Zero-Latency Hash Manifests**: File synchronization uses SHA-256 incremental hash diffs, speeding up CLI sync by **95%**.
- **Semaphore-Bounded Parallelism**: Fully concurrent thread pools (64 in Rust, 32 in Node.js) eliminate resource starvation in massive monorepos.

<br>
<hr style="height: 1px; border: none; background: linear-gradient(to right, transparent, #33333f, transparent); margin: 40px 0;" />

<!-- PIPELINE MERMAID -->

## ⚖️ The Tribunal Pipeline — Mitigating AI Code Hallucinations

Code generation is solved. **Code correctness is the frontier.**

The Tribunal Pipeline intercepts raw agent generation and routes it through a parallel suite of **28 domain-specific reviewers** before presenting changes to the developer:

```mermaid
graph TD
    A[User Request] -->|Intent Parsed| B(Context Broker)
    B --> C{Inner-Loop Validator}

    C -->|Syntax & Secrets Check| D[Parallel Tribunal Review]
    C -.->|Failed| E[Maker Auto-Correction]
    E -.-> C

    D -->|28 Domain Reviewers| F[Human Gate]
    F -->|Approved| G((Committed to Disk))

    classDef default fill:#1a1a1a,stroke:#333,stroke-width:2px,color:#fff;
    classDef critical fill:#ff1637,stroke:#fff,stroke-width:2px,color:#fff;
    classDef success fill:#ccff00,stroke:#fff,stroke-width:2px,color:#1a1a1a;

    class D critical;
    class G success;
```

### Reviewer Swarms Include:
- **`logic-reviewer`** · Semantic soundness & impossible logic checks.
- **`security-auditor`** · Payload boundaries, injection & OWASP scanning.
- **`resilience-reviewer`** · Async error boundaries and retry logic.
- **`ui-ux-auditor`** · Structural accessibility (WCAG 2.2 AA) & premium animations.
- **`schema-reviewer`** · Type narrowing, Prisma/Drizzle integrity checks.

<br>
<hr style="height: 1px; border: none; background: linear-gradient(to right, transparent, #33333f, transparent); margin: 40px 0;" />

<!-- SOVEREIGN CONTRACTS -->

## 📜 Sovereign Covenant Protocol — Behavioral Contract Testing (`tk contract`)

Declare repo invariants in declarative YAML rules stored in `.tribunal/contracts/`:

```yaml
name: 'No console.log in production code'
scope: 'src/**/*.ts, src/**/*.tsx'
severity: block
must_not:
  - pattern: 'console.log'
    message: 'Use structured logger instead of console.log'
```

```bash
# Scaffold starter contracts
npx tribunal-kit contract init

# Verify contract invariants against modified files
npx tribunal-kit contract verify

# Replay failure trace snapshot
npx tribunal-kit contract replay <trace_id>
```

<br>
<hr style="height: 1px; border: none; background: linear-gradient(to right, transparent, #33333f, transparent); margin: 40px 0;" />

<!-- MCP SERVER -->

## 🔌 Model Context Protocol (MCP) Server Integration

Tribunal Kit hosts an out-of-the-box **MCP server** via stdio. Connect it to Cursor, VSCode, Windsurf, or Claude Desktop to allow coding agents to query tools dynamically.

### Config Snippet (`mcp_config.json` / Claude Desktop)

```json
{
  "mcpServers": {
    "tribunal-kit": {
      "command": "npx",
      "args": ["-y", "tribunal-kit", "mcp"]
    }
  }
}
```

### Exposed MCP Tools:
- `query_semantic_graph` — Queries active project AST and dependency edges.
- `verify_contracts` — Verifies proposed code against team contract rules before writing to disk.
- `get_tribunal_skill` — Dynamically injects skills without overloading system prompts.

<br>
<hr style="height: 1px; border: none; background: linear-gradient(to right, transparent, #33333f, transparent); margin: 40px 0;" />

<!-- COMMAND REFERENCE -->

## 💻 Complete CLI Command Reference

Below is the structured list of all core commands available via `npx tribunal-kit <command>` (or `tk <command>`):

<div style="overflow-x: auto; margin-top: 20px; border-radius: 8px; border: 1px solid #222225;">
  <table style="width: 100%; border-collapse: collapse; text-align: left; background-color: #111115;">
    <thead>
      <tr style="border-bottom: 2px solid #22222f; background-color: #16161d; color: #ffffff;">
        <th style="padding: 12px 16px; font-weight: 600;">Command</th>
        <th style="padding: 12px 16px; font-weight: 600;">Action / Arguments</th>
        <th style="padding: 12px 16px; font-weight: 600;">Description</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom: 1px solid #222225;">
        <td style="padding: 12px 16px;"><kbd style="background: #1c1c24; border: 1px solid #333; padding: 2px 6px; border-radius: 4px; color: #ffffff;">init</kbd></td>
        <td style="padding: 12px 16px; color: #c9c9d1;"><code>[--force] [--path &lt;dir&gt;]</code></td>
        <td style="padding: 12px 16px; color: #a0a0a5;">Initializes the <code>.agent/</code> configuration payload.</td>
      </tr>
      <tr style="border-bottom: 1px solid #222225;">
        <td style="padding: 12px 16px;"><kbd style="background: #1c1c24; border: 1px solid #333; padding: 2px 6px; border-radius: 4px; color: #ffffff;">sync</kbd></td>
        <td style="padding: 12px 16px; color: #c9c9d1;">—</td>
        <td style="padding: 12px 16px; color: #a0a0a5;">Syncs <code>.agent</code> rules with Cursor, Windsurf, and VSCode configs.</td>
      </tr>
      <tr style="border-bottom: 1px solid #222225;">
        <td style="padding: 12px 16px;"><kbd style="background: #1c1c24; border: 1px solid #333; padding: 2px 6px; border-radius: 4px; color: #ffffff;">status</kbd></td>
        <td style="padding: 12px 16px; color: #c9c9d1;">—</td>
        <td style="padding: 12px 16px; color: #a0a0a5;">Evaluates workspace rules and manifest counts for violations.</td>
      </tr>
      <tr style="border-bottom: 1px solid #222225;">
        <td style="padding: 12px 16px;"><kbd style="background: #1c1c24; border: 1px solid #333; padding: 2px 6px; border-radius: 4px; color: #ffffff;">guardrail</kbd></td>
        <td style="padding: 12px 16px; color: #c9c9d1;"><code>[--file &lt;path&gt;]</code></td>
        <td style="padding: 12px 16px; color: #a0a0a5;">Scans workspace changes for phantom packages and <code>// VERIFY</code> tags.</td>
      </tr>
      <tr style="border-bottom: 1px solid #222225;">
        <td style="padding: 12px 16px;"><kbd style="background: #1c1c24; border: 1px solid #333; padding: 2px 6px; border-radius: 4px; color: #ffffff;">tk-adapt</kbd></td>
        <td style="padding: 12px 16px; color: #c9c9d1;"><code>[claude|aider|--global]</code></td>
        <td style="padding: 12px 16px; color: #a0a0a5;">Universal CLI agent adapter installer for Claude Code & Aider.</td>
      </tr>
      <tr style="border-bottom: 1px solid #222225;">
        <td style="padding: 12px 16px;"><kbd style="background: #1c1c24; border: 1px solid #333; padding: 2px 6px; border-radius: 4px; color: #ffffff;">hook</kbd></td>
        <td style="padding: 12px 16px; color: #c9c9d1;">—</td>
        <td style="padding: 12px 16px; color: #a0a0a5;">Installs an automated Git pre-push governance check hook.</td>
      </tr>
      <tr style="border-bottom: 1px solid #222225;">
        <td style="padding: 12px 16px;"><kbd style="background: #1c1c24; border: 1px solid #333; padding: 2px 6px; border-radius: 4px; color: #ffffff;">optimize-skill</kbd></td>
        <td style="padding: 12px 16px; color: #c9c9d1;"><code>--target &lt;file&gt; "&lt;cmd&gt;"</code></td>
        <td style="padding: 12px 16px; color: #a0a0a5;">Launches a self-evolving prompt optimization sequence.</td>
      </tr>
      <tr style="border-bottom: 1px solid #222225;">
        <td style="padding: 12px 16px;"><kbd style="background: #1c1c24; border: 1px solid #333; padding: 2px 6px; border-radius: 4px; color: #ffffff;">align</kbd></td>
        <td style="padding: 12px 16px; color: #c9c9d1;"><code>[--file &lt;path&gt;]</code></td>
        <td style="padding: 12px 16px; color: #a0a0a5;">Align outputs, strip intro/conclusion slop, enforce framework bounds.</td>
      </tr>
      <tr style="border-bottom: 1px solid #222225;">
        <td style="padding: 12px 16px;"><kbd style="background: #1c1c24; border: 1px solid #333; padding: 2px 6px; border-radius: 4px; color: #ffffff;">learn</kbd></td>
        <td style="padding: 12px 16px; color: #c9c9d1;"><code>[--dry-run]</code></td>
        <td style="padding: 12px 16px; color: #a0a0a5;">Analyzes Git diff logs to automatically distill project idioms.</td>
      </tr>
      <tr style="border-bottom: 1px solid #222225;">
        <td style="padding: 12px 16px;"><kbd style="background: #1c1c24; border: 1px solid #333; padding: 2px 6px; border-radius: 4px; color: #ffffff;">case</kbd></td>
        <td style="padding: 12px 16px; color: #c9c9d1;"><code>add | search &lt;q&gt; | export</code></td>
        <td style="padding: 12px 16px; color: #a0a0a5;">Records, searches, or compiles AI mistake precedents.</td>
      </tr>
      <tr style="border-bottom: 1px solid #222225;">
        <td style="padding: 12px 16px;"><kbd style="background: #1c1c24; border: 1px solid #333; padding: 2px 6px; border-radius: 4px; color: #ffffff;">memory</kbd></td>
        <td style="padding: 12px 16px; color: #c9c9d1;"><code>store | recall | gc</code></td>
        <td style="padding: 12px 16px; color: #a0a0a5;">Manages 4-type persistent memory with budget-gated recall.</td>
      </tr>
      <tr style="border-bottom: 1px solid #222225;">
        <td style="padding: 12px 16px;"><kbd style="background: #1c1c24; border: 1px solid #333; padding: 2px 6px; border-radius: 4px; color: #ffffff;">marathon</kbd></td>
        <td style="padding: 12px 16px; color: #c9c9d1;"><code>init | status | next</code></td>
        <td style="padding: 12px 16px; color: #a0a0a5;">Sets up and executes long-running autonomous development.</td>
      </tr>
      <tr style="border-bottom: 1px solid #222225;">
        <td style="padding: 12px 16px;"><kbd style="background: #1c1c24; border: 1px solid #333; padding: 2px 6px; border-radius: 4px; color: #ffffff;">contract</kbd></td>
        <td style="padding: 12px 16px; color: #c9c9d1;"><code>init | verify | list | trace | replay</code></td>
        <td style="padding: 12px 16px; color: #a0a0a5;">AI Agent Behavioral Contract Testing and failure context trace replay.</td>
      </tr>
    </tbody>
  </table>
</div>

<br>
<hr style="height: 1px; border: none; background: linear-gradient(to right, transparent, #33333f, transparent); margin: 40px 0;" />

<!-- VIRAL BADGE SECTION -->

## 🌐 Spread the Shield (Add to Your Repository)

Help protect the open-source ecosystem from AI hallucinations. Embed this badge in your repository's `README.md`:

```markdown
[![Protected by Tribunal Kit](https://img.shields.io/badge/Protected%20by-Tribunal%20Kit-ccff00?style=for-the-badge&logo=shield&logoColor=black)](https://github.com/Harmitx7/tribunal-kit)
```

**Renders as:**  
[![Protected by Tribunal Kit](https://img.shields.io/badge/Protected%20by-Tribunal%20Kit-ccff00?style=for-the-badge&logo=shield&logoColor=black)](https://github.com/Harmitx7/tribunal-kit)

<br>
<hr style="height: 1px; border: none; background: linear-gradient(to right, transparent, #33333f, transparent); margin: 40px 0;" />

<!-- FOOTER -->

## 🤝 Contributing & Security

- **Security Policy**: Zero network runtime dependencies, zero dynamic `eval`, and sandboxed file paths. Review [SECURITY.md](SECURITY.md).
- **Contributing Guide**: We welcome community-authored agents, skills, and Rust core optimizations. See [CONTRIBUTING.md](CONTRIBUTING.md).

<div align="center" style="background: #111115; border: 1px solid #22222a; border-radius: 8px; padding: 25px; margin-top: 50px;">
  <img src="https://img.shields.io/badge/Status-Active_&_Secured-ccff00?style=for-the-badge&logoColor=1a1a1a" alt="Status" />
  <br><br>
  <span style="font-style: italic; color: #c9c9d1; font-size: 0.95em;">"Never guess database schemas. Verify every async boundary. Welcome to the Tribunal."</span><br><br>
  <sub style="color: #6b6b75;"><b>MIT Licensed</b> • Engineered for ultimate AI code governance.</sub>
</div>
