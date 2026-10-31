#!/usr/bin/env node

const { initializeGlobalStore } = require('./global-store');
const { startProxyServer } = require('./proxy-server');
const { spawnAgent } = require('./spawn-agent');

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    const isHelp = args.includes('--help') || args.includes('-h');
    const out = isHelp ? console.log : console.error;
    out('Usage: tk-proxy <command> [args...]');
    out('Example: tk-proxy claude-code');
    process.exit(isHelp ? 0 : 1);
  }

  // 1. Initialize the global rules database
  initializeGlobalStore();

  // 2. Start the local API proxy server
  // Port 0 will pick an available random port
  try {
    const port = await startProxyServer(0);

    // 3. Spawn the target CLI agent preserving arguments array
    spawnAgent(args, port);
  } catch (e) {
    console.error('[Tribunal Proxy] Fatal error starting proxy:', e);
    process.exit(1);
  }
}

main();
