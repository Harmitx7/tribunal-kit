# Tribunal Kit: Detailed Execution Flows

**Document:** `docs/EXECUTION_FLOWS.md`  
**Version:** `9.5.0` [VERIFIED: `package.json`]  
**Audit Standard:** Verified Source-Code Call Graph & Data Flow Tracing

---

## Flow 1: CLI Ingress & Dual-Engine Dispatch

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer / Agent
    participant Wrap as bin/wrapper.js
    participant Native as crates/core (tribunal-core)
    participant JS as src/cli.js
    participant Cmd as src/commands/<cmd>.js

    Dev->>Wrap: tk <command> [argv]
    Wrap->>Wrap: getBinaryPath()
    alt Command in RUST_COMMANDS & Binary Exists & TRIBUNAL_FORCE_JS != 1
        Wrap->>Native: spawnSync(tribunal-core, [cmd, ...argv])
        Native-->>Dev: Exit Code & Fast Output (<10ms)
    else Fallback to Node.js
        Wrap->>JS: node src/cli.js [cmd, ...argv]
        JS->>JS: loadCmd('./commands/' + cmd, 'cmd' + Cmd)
        JS->>Cmd: Execute lazy-loaded handler
        Cmd-->>Dev: Standard Output & Exit Code
    end
```

### Trace Details:

1. **Entry Point:** `bin/wrapper.js` [VERIFIED: `bin/wrapper.js#L1-L45`].
2. **Path Resolution:** Checks `process.env.TRIBUNAL_CORE_PATH`, then local `target/release/tribunal-core`, then optional platform packages `@tribunal-kit/core-<os>-<arch>`.
3. **Execution Decision:** If command is in `RUST_COMMANDS` (`init`, `status`, `memory`, `dag-schedule`, `context-compress`, `impact-tier`, etc.), executes the native Rust binary via `child_process.spawnSync`.
4. **Fallback:** If binary is absent or command is JavaScript-only (`understand`, `activity`, `align`, `audit-web`, `review`), loads `src/cli.js`.

---

## Flow 2: Codebase Intelligence Exploration (`tk understand`)

```mermaid
sequenceDiagram
    autonumber
    actor Agent as AI Coding Agent
    participant Cmd as src/commands/understand.js
    participant Core as .agent/scripts/codebase_intelligence.js
    participant Extractor as architecture_extractor.js
    participant Mapper as architecture_mapper.js
    participant Blast as blast_radius_engine.js

    Agent->>Cmd: tk understand impact src/security/boundary.js
    Cmd->>Core: runCodebaseIntelligenceCli(['impact', 'src/security/boundary.js'])
    Core->>Extractor: extractArchitectureFacts() (In-Memory AST)
    Extractor-->>Core: Imports, Routes, Workspaces
    Core->>Mapper: buildDependencyTopology(facts)
    Mapper-->>Core: Inbound Callers & Outbound Targets
    Core->>Blast: calculateBlastRadius('src/security/boundary.js', topology)
    Blast-->>Core: Concentric Rings (R1, R2, R3) + Risk Tier: 🔴 CRITICAL
    Core-->>Cmd: Schema 2.0.0 Analytical Envelope
    Cmd-->>Agent: Token-bounded System Topology Dossier (<2,500 tokens)
```

### Trace Details:

1. **Safety Contract:** Read-only AST extraction. The target repository hash is verified before and after execution to guarantee zero mutations (`SHA-256` oracle).
2. **Recursion Guard:** Depth-limited visited set prevents stack overflow on circular import cycles.
3. **Token Bounding:** Results are pruned to fit within LLM prompt limits without truncation.

---

## Flow 3: 28-Reviewer Wave Audit (`/tribunal-full`)

```mermaid
sequenceDiagram
    autonumber
    actor Maker as Maker Subagent
    participant Orchestrator as src/execution/pipeline.js
    participant W1 as Wave 1: Core Integrity
    participant W2 as Wave 2: Security & Types
    participant W3 as Wave 3: UI & Performance
    participant Gate as Human Approval Gate

    Maker->>Orchestrator: Submit Diff / Feature Branch
    Orchestrator->>W1: Run Wave 1 (Precedences, Logic, Schema, Resilience)
    alt Any Wave 1 Reviewer Fails
        W1-->>Orchestrator: ❌ REJECTED (Halt)
        Orchestrator-->>Maker: Return Specific Defect & Precedent Citations
    else Wave 1 Passes
        W1->>W2: Forward to Wave 2
        Orchestrator->>W2: Run Wave 2 (Security, Dependency, Type-Safety, Complexity, SQL)
        alt Any Wave 2 Reviewer Fails
            W2-->>Orchestrator: ❌ REJECTED (Halt)
            Orchestrator-->>Maker: Return Security / Type Remediation Instructions
        else Wave 2 Passes
            W2->>W3: Forward to Wave 3
            Orchestrator->>W3: Run Wave 3 (Frontend, Vitals, Accessibility, Animations, Mobile)
            alt Any Wave 3 Reviewer Fails
                W3-->>Orchestrator: ❌ REJECTED
                Orchestrator-->>Maker: Return UI / Performance Optimization Tasks
            else All 28 Reviewers Pass
                W3->>Gate: Submit Certified Proposal
                Gate-->>Maker: ✔ Approved to Write to Disk
            end
        end
    end
```

---

## Flow 4: Model Context Protocol Tool Invocation

```mermaid
sequenceDiagram
    autonumber
    actor Host as Claude / Cursor
    participant Mcp as bin/mcp-server.js
    participant Zod as Zod Schema Validator
    participant Handler as Subsystem Handler
    participant Opt as McpResponseOptimizer

    Host->>Mcp: JSON-RPC tools/call ("tribunal_understand", args)
    Mcp->>Zod: parse(args)
    alt Invalid Arguments
        Zod-->>Host: JSON-RPC Error (-32602: Invalid params)
    else Valid Arguments
        Mcp->>Handler: Execute tool logic
        Handler-->>Opt: Raw result payload
        Opt->>Opt: Strip secrets, estimate tokens, paginate if >16KB
        Opt-->>Mcp: Optimized payload (Zero double-encoding)
        Mcp-->>Host: JSON-RPC Result Envelope
    end
```

---

## Flow 5: Local Proxy Interception & Rule Injection

```mermaid
sequenceDiagram
    autonumber
    actor Agent as CLI Agent (claude-code / aider)
    participant Proxy as bin/tk-proxy.js / proxy-server.js
    participant Rules as .agent/rules/GEMINI.md
    participant Upstream as Anthropic / OpenAI API

    Agent->>Proxy: POST http://localhost:8080/v1/messages
    Proxy->>Proxy: Inspect route & parse payload
    Proxy->>Rules: Read active master rules & case law precedents
    Proxy->>Proxy: Inject rules into system messages array (isolated block)
    Proxy->>Upstream: Forward enriched payload
    Upstream-->>Proxy: Streaming SSE response
    Proxy-->>Agent: Pass-through streaming response
```
