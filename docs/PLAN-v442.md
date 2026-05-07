# Implementation Plan: Tribunal-Kit v4.4.2 - "Parallel & Incremental" Engine

## Goal
Achieve a 20%+ execution speed improvement and instantaneous snapshot generation for large repositories by implementing incremental SHA-1 caching and multi-core parallel processing using built-in Node.js `worker_threads`, with zero new external dependencies.

## User Review Required
> [!IMPORTANT]
> - Implementing `worker_threads` increases architecture complexity in `graph_builder.js`.
> - Content hashing (SHA-1) will replace simple timestamp checks to avoid cache invalidation on basic checkouts/pulls.
> - Ensure Node.js minimum version supports standard `worker_threads` (>= v12, which is already a baseline for the toolkit).

## Research Findings
- `graph_builder.js` currently parses files sequentially.
- Snapshot generation writes all JSON blobs synchronously in a loop.
- Built-in `crypto` is available and `worker_threads` is available natively without changing `package.json`.

## Proposed Changes

### Wave 1 — Foundation (Caching)
#### [MODIFY] `.agent/scripts/graph_builder.js`
- Import built-in `crypto` module.
- Implement a hashing function `getFileHash(filePath)` to generate SHA-1 hashes of file contents.
- Update the cache validation logic to skip parsing if the file hash matches the stored hash in `architecture-graph.yaml` or cache index.

### Wave 2 — Core (Parallelization)
#### [MODIFY] `.agent/scripts/graph_builder.js`
- Refactor the AST extraction and graph node generation into a `worker_threads` compatible script.
- Distribute the parsing workload across available CPU cores (using `os.cpus().length`).
- Merge worker results back into the main `graphData` object.

### Wave 3 — Integration (Snapshots & Visualizer)
#### [MODIFY] `.agent/scripts/graph_builder.js`
- Ensure Context Snapshots are only written to `.agent/history/snapshots/` if the file hash has changed (Incremental writes).
#### [MODIFY] `bin/tribunal-kit.js` (or related runner)
- Provide verbose output confirming cache hits vs misses so the user sees the speed difference.

## Out of Scope (This Version)
- Replacing the YAML dependency structure entirely.
- Adding third-party caching tools (e.g., Redis or file-caching libraries).
- Rewriting the visualizer from scratch.

## Verification Plan
- [ ] `node .agent/scripts/graph_builder.js` executes without errors.
- [ ] Second run of `graph_builder.js` finishes in a fraction of the original time (verifying cache hit).
- [ ] Changing a single file only generates 1 new snapshot instead of regenerating all.
- [ ] `node .agent/scripts/verify_all.js` passes (all 142 tests pass) to ensure no architectural breakage.
