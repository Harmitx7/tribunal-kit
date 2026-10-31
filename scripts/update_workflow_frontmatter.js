const fs = require('fs');
const path = require('path');

const workflowsDir = path.resolve(__dirname, '..', '.agent', 'workflows');

const updates = {
  'arch.md': {
    target: /^---[\r\n]+description: Tribunal Architecture Intelligence[^\n]*[\r\n]+---/m,
    replacement: `---
description: Tribunal Architecture Intelligence — Autonomous architecture extraction, zero-trust verification, blast radius simulation, semantic diffing, and health auditing.
required-skills:
  - architecture-intelligence
  - architecture
  - architecture-drift
  - clean-code
scripts-binding:
  - .agent/scripts/architecture_extractor.js
  - .agent/scripts/architecture_verifier.js
  - .agent/scripts/blast_radius_engine.js
  - .agent/scripts/architecture_diff.js
  - .agent/scripts/architecture_health.js
  - .agent/scripts/architecture_visualizer.js
---`
  },
  'assimilate.md': {
    target: /^---[\r\n]+name: assimilate[\r\n]+description: ['"]Trigger the learning pipeline[^\n]*[\r\n]+version: 1.1.0[\r\n]+---/m,
    replacement: `---
name: assimilate
description: "Trigger the learning pipeline to extract, validate, and store Tribunal Instincts."
version: 1.1.0
required-skills:
  - assimilate
  - tribunal-instincts-memory
  - clean-code
scripts-binding:
  - .agent/scripts/memory_archivist.js
  - .agent/scripts/engineering_memory.js
---`
  },
  'htop.md': {
    target: /^---[\r\n]+name: htop[\r\n]+description: ['"]Inspect active agent[^\n]*[\r\n]+version: 1.0.0[\r\n]+---/m,
    replacement: `---
name: htop
description: "Inspect active agent execution metrics, task telemetry, and syscall status."
version: 1.0.0
required-skills:
  - htop
  - agent-syscall-guidelines
scripts-binding:
  - .agent/scripts/session_logger.js
  - .agent/scripts/harness_manager.js
---`
  },
  'resume.md': {
    target: /^---[\r\n]+name: resume[\r\n]+description: ['"]Resume a recoverable[^\n]*[\r\n]+version: 1.1.0[\r\n]+---/m,
    replacement: `---
name: resume
description: "Resume a recoverable Tribunal Kit session from the durable event log."
version: 1.1.0
required-skills:
  - resume
  - agent-recovery-and-resume-auditor
scripts-binding:
  - .agent/scripts/session_manager.js
---`
  },
  'team-mode.md': {
    target: /^---[\r\n]+name: team-mode[\r\n]+description: ['"]Enable dynamic multi-agent[^\n]*[\r\n]+version: 1.1.0[\r\n]+---/m,
    replacement: `---
name: team-mode
description: "Enable dynamic multi-agent task execution, DAG routing, and parallel reviews."
version: 1.1.0
required-skills:
  - team-mode
  - agent-organizer
  - parallel-agents
  - swarm
scripts-binding:
  - .agent/scripts/swarm_dispatcher.js
---`
  },
  'understand.md': {
    target: /^---[\r\n]+description: Codebase Intelligence[^\n]*[\r\n]+---/m,
    replacement: `---
description: Codebase Intelligence & Developer Onboarding — Autonomous architectural exploration, feature flow tracing, dependency analysis, change blast radius impact, dead-code detection, guided onboarding, and change preparation.
required-skills:
  - codebase-intelligence
  - repository-reconnaissance
  - architecture-mapping
  - execution-flow-tracing
  - code-relevance-analysis
  - change-impact-analysis
  - evidence-backed-onboarding
scripts-binding:
  - .agent/scripts/codebase_intelligence.js
  - .agent/scripts/architecture_extractor.js
  - .agent/scripts/architecture_mapper.js
  - .agent/scripts/blast_radius_engine.js
  - .agent/scripts/trace_engine.js
---`
  }
};

for (const [file, conf] of Object.entries(updates)) {
  const filePath = path.join(workflowsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  if (!conf.target.test(content)) {
    console.error('Target pattern did not match for ' + file);
    process.exit(1);
  }
  const updated = content.replace(conf.target, conf.replacement);
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log('Successfully updated ' + file);
}
console.log('All 6 workflows updated successfully.');

