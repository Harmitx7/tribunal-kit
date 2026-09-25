const { MemoryEngine } = require('./memory_engine.js');

async function consolidateMemory(agentDir) {
  console.log(`Starting memory consolidation for workspace: ${agentDir}`);
  
  const engine = new MemoryEngine(agentDir);
  const index = engine.loadIndex();

  const episodics = index.entries.filter(e => e.memory_type === 'episodic');
  const workings = index.entries.filter(e => e.memory_type === 'working');
  
  if (episodics.length === 0 && workings.length === 0) {
    console.log("No Episodic or Working memories to consolidate.");
    return;
  }

  console.log(`Found ${episodics.length} Episodic and ${workings.length} Working memories.`);
  console.log("Submitting to LLM for consolidation into Semantic rules...");

  // Simulation of Tribunal's Maker-Reviewer LLM invocation.
  // In production, this would pass the contexts to the `logic-reviewer` and output a compressed fact.
  const consolidatedContent = `Generalized rule derived from ${episodics.length} episodic events and ${workings.length} working sessions.`;
  
  const semanticId = engine.store({
    type: 'semantic',
    content: consolidatedContent,
    tags: ['consolidated'],
    source: 'learned',
    confidence: 1.0, // Assumes it passed a reviewer gate
  });

  console.log(`Generated new Semantic Memory ID: ${semanticId}`);
  console.log("Consolidation complete. Run `tk memory gc` to clear old working entries.");
}

const dir = process.cwd();
consolidateMemory(dir).catch(console.error);
