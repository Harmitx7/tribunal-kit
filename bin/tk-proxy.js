#!/usr/bin/env node

const { initializeGlobalStore } = require('./global-store');
const { startProxyServer } = require('./proxy-server');
const { spawnAgent } = require('./spawn-agent');

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error("Usage: tk-proxy <command>");
    console.error("Example: tk-proxy claude-code");
    process.exit(1);
  }

  const targetCommand = args.join(' ');
  
  // 1. Initialize the global rules database
  initializeGlobalStore();

  // 2. Start the local API proxy server
  // Port 0 will pick an available random port
  try {
    const port = await startProxyServer(0);
    
    // 3. Spawn the target CLI agent
    spawnAgent(targetCommand, port);
    
  } catch (e) {
    console.error("[Tribunal Proxy] Fatal error starting proxy:", e);
    process.exit(1);
  }
}

main();
