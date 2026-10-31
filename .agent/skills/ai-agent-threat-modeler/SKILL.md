---
name: ai-agent-threat-modeler
description: "Use when constructing threat models for AI agents, mapping entry points, assets, trust boundaries, tool-to-tool paths, and STRIDE / ATLAS attack categories."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - data-validation-schemas
tools: Read, Grep, Glob, Bash, Write
scripts-binding:
  - src/security/threat_model_schemas.js
  - src/security/index.js
inputs:
  architecture_spec: "object"
  tools_inventory: "array"
outputs:
  threat_register: "array"
  attack_paths: "array"
  residual_risk: "string"
trigger:
  - "agent threat model"
  - "ai threat modeling"
  - "stride atlas agent"
  - "trust boundary modeling"
  - "agent attack surface"
  - "ai-agent-threat-modeler"
---

# AI Agent Threat Modeler

## Mandatory Pre-Flight Context Inspection
Before threat modeling an AI agent or multi-agent swarm, inspect these 5 critical parameters:
1. **Entry Point Identification**: Map all ingress vectors (user chat prompts, PR diffs, RAG documents, web search results, MCP tool outputs).
2. **Trust Boundary Mapping**: Classify assets and components into Zone 0 (Privileged Control), Zone 1 (Enforcement), Zone 2 (Reasoning), and Zone 3 (Untrusted Data).
3. **STRIDE-AI & MITRE ATLAS Mapping**: Correlate each entry point and failure mode to standard STRIDE categories and MITRE ATLAS technique IDs (e.g. AML.T0051 for Prompt Injection).
4. **Tool-to-Tool Attack Paths**: Trace lateral movement vectors where an unprivileged agent influences a privileged agent or tool sink.
5. **Traceable Mitigating Controls**: Ensure every threat maps to an active, executable control and deterministic test reference.

## Activation Boundaries
- **Activate when:** Designing new agent workflows, onboarding external tools or MCP servers, reviewing system prompt changes, or preparing security certification manifests.
- **DO NOT activate when:** Analyzing runtime execution logs during an active breach (use `ai-security-incident-analyst`).

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Ingress Reconnaissance** | Enumerate all user, file, and network input channels into the agent system. | Fast / Standard / Deep |
| **Pass 2** | **Trust Boundary Audit** | Verify that Zone 3 data cannot directly trigger Zone 1/Zone 0 execution sinks. | All Modes |
| **Pass 3** | **ATLAS Threat Mapping** | Map potential abuse cases to canonical Threat IDs (THREAT-01 through THREAT-16) and ATLAS IDs. | Standard / Deep |
| **Pass 4** | **Control Gap Analysis** | Validate each threat record against `ThreatRecordSchema`; flag unmitigated threats. | All Modes |
| **Pass 5** | **Register Synthesis** | Output a verified threat register JSON object with severity distribution. | Standard / Deep |

## Verification Command
```bash
node -e "const { ThreatRecordSchema, buildThreatModelRegister } = require('./src/security'); console.log('Threat model schema verified');"
```

