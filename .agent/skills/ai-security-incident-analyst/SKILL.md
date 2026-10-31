---
name: ai-security-incident-analyst
description: "Use when triaging suspected agent security incidents, tracing execution timelines, identifying entry points, and providing defensive containment plans."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - clean-code
  - data-validation-schemas
tools: Read, Grep, Glob, Bash
scripts-binding:
  - src/security/threat_model_schemas.js
  - src/security/index.js
inputs:
  incident_logs: "array"
  timeline_scope: "object"
outputs:
  incident_triage: "object"
  compromised_boundaries: "array"
  containment_steps: "array"
trigger:
  - "agent security incident"
  - "ai incident triage"
  - "agent breach analysis"
  - "contain agent incident"
  - "agent compromise analysis"
  - "ai-security-incident-analyst"
---

# AI Security Incident Analyst

## Mandatory Pre-Flight Context Inspection
Before triaging a suspected or confirmed AI agent security incident, inspect these 5 critical parameters:
1. **Immediate Containment**: Revoke compromised credentials, disconnect network or MCP sockets, and suspend active agent loops.
2. **Timeline & Ingress Reconstruction**: Reconstruct chronological event logs from user input, through model reasoning, to tool execution sinks.
3. **Entry Point Identification**: Determine whether the compromise originated via direct injection, indirect poisoned repository content, malicious tool output, or compromised dependencies.
4. **Trust Boundary Blast Radius**: Identify which trust boundaries (Zone 0 through Zone 3) were traversed or compromised during the incident.
5. **Incident Artifact Validation**: Structure incident findings using `SecurityIncidentSchema`, detailing affected assets and verifiable containment steps.

## Activation Boundaries
- **Activate when:** An agent behaves unexpectedly, leaks credentials, executes prohibited commands, accesses unauthorized files, or exhibits signs of prompt hijacking.
- **DO NOT activate when:** Conducting routine threat modeling prior to development (use `ai-agent-threat-modeler`).

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Telemetry Ingestion** | Ingest execution logs, tool parameters, terminal outputs, and model responses. | Fast / Standard / Deep |
| **Pass 2** | **Timeline Reconstruction** | Build chronological sequence of actions; identify initial ingress trigger. | All Modes |
| **Pass 3** | **Threat Classification** | Correlate observed behaviors to canonical Threat IDs (THREAT-01 to THREAT-16). | Standard / Deep |
| **Pass 4** | **Blast Radius Evaluation** | Assess compromised files, environment variables, credentials, or outbound requests. | All Modes |
| **Pass 5** | **Containment Plan** | Formulate actionable, step-by-step containment and regression-prevention actions. | Standard / Deep |

## Verification Command
```bash
node -e "const { validateSecurityIncident } = require('./src/security'); console.log('Incident schema verified');"
```

