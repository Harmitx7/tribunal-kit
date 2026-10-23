# Architecture Map

```mermaid
graph TD
 P[package.json bins/exports] --> W[bin/wrapper.js]
 W --> N[optional native package / tribunal-core]
 W --> J[src/cli.js]
 J --> C[src/commands]
 C --> X[src/execution]
 C --> I[src/intelligence]
 C --> S[src/system1]
 C --> B[src/browser]
 C --> A[.agent payload]
 M[bin/mcp-server.js] --> A
 M --> SB[security boundary/path containment]
 R[crates/core] --> N
 T[test + CI] --> J
 T --> R
```

Observed communication is CommonJS `require`, filesystem configuration/payload data, spawned native executables and MCP stdio. No database or cloud service configuration was found in package manifests. Browser features use local CDP/network capability; `tk-proxy` is the explicit egress control. Error handling is command-specific; process exit and structured errors are used throughout, so end-to-end error propagation remains partially verified.
