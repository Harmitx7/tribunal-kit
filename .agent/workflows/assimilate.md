---
name: assimilate
description: "Trigger the learning pipeline to extract, validate, and store Tribunal Instincts."
version: 1.0.0
---

# ASSIMILATE (LEARNING PIPELINE)

## Invocation
`/assimilate` or `/learn`

## Behavior
Instead of learning in real-time and bloating the execution path, learning is an offline batch job.

1. **Extraction**: Invokes the `memory_archivist.js` which reads the most recent session logs.
2. **Analysis**: Searches for repeated errors, test failures, and ultimate successful fixes.
3. **Validation**: Converts successful fixes into candidate "Tribunal Instincts".
4. **Storage**: Saves the verified evidence-backed instinct into `instincts.json` where `context_broker.js` can retrieve it for future related tasks.

## Limits
Do not trigger this workflow automatically after every prompt. Use it specifically after a long debugging session or a complex architectural setup to persist the hard-earned lessons.
