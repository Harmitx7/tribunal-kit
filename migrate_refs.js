const fs = require('fs');
const path = require('path');

const filesToUpdate = [
    ".agent/workflows/swarm.md",
    ".agent/workflows/session.md",
    ".agent/rules/GEMINI.md",
    ".agent/ARCHITECTURE.md",
    ".agent/agents/swarm-worker-contracts.md",
    "AGENT_FLOW.md",
    "CHANGELOG.md"
];

let totalChanges = 0;

for (const filepath of filesToUpdate) {
    if (!fs.existsSync(filepath)) continue;
    let content = fs.readFileSync(filepath, 'utf8');
    
    // Explicit python calls
    content = content.replace(/python \.agent\/scripts\/swarm_dispatcher\.py/g, 'node .agent/scripts/swarm_dispatcher.js');
    content = content.replace(/python \.agent\/scripts\/session_manager\.py/g, 'node .agent/scripts/session_manager.js');
    content = content.replace(/python \.agent\/scripts\/minify_context\.py/g, 'node .agent/scripts/minify_context.js');
    content = content.replace(/python \.agent\/scripts\/test_swarm_dispatcher\.py/g, 'npx jest test/integration/swarm_dispatcher.test.js');
    
    // General filename references
    content = content.replace(/swarm_dispatcher\.py/g, 'swarm_dispatcher.js');
    content = content.replace(/session_manager\.py/g, 'session_manager.js');
    content = content.replace(/minify_context\.py/g, 'minify_context.js');
    content = content.replace(/test_swarm_dispatcher\.py/g, 'swarm_dispatcher.test.js');

    fs.writeFileSync(filepath, content, 'utf8');
    totalChanges++;
}
console.log(`Updated ${totalChanges} files.`);
