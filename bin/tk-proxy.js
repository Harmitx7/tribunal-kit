#!/usr/bin/env node

const { initializeGlobalStore } = require('./global-store');
const { startProxyServer } = require('./proxy-server');
const { spawnAgent } = require('./spawn-agent');

function parseProxyArgs(rawArgs) {
  let upstream = process.env.TK_PROXY_UPSTREAM;
  let interceptPath = process.env.TK_PROXY_INTERCEPT_PATH;
  const agentArgs = [];

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg === '--upstream' && i + 1 < rawArgs.length) {
      upstream = rawArgs[++i];
    } else if (arg.startsWith('--upstream=')) {
      upstream = arg.slice('--upstream='.length);
    } else if (arg === '--intercept-path' && i + 1 < rawArgs.length) {
      interceptPath = rawArgs[++i];
    } else if (arg.startsWith('--intercept-path=')) {
      interceptPath = arg.slice('--intercept-path='.length);
    } else {
      agentArgs.push(arg);
    }
  }

  return { upstream, interceptPath, agentArgs };
}

async function main() {
  const rawArgs = process.argv.slice(2);

  if (rawArgs.length === 0 || rawArgs.includes('--help') || rawArgs.includes('-h')) {
    const isHelp = rawArgs.includes('--help') || rawArgs.includes('-h');
    const out = isHelp ? console.log : console.error;
    out('Usage: tk-proxy [options] <command> [args...]');
    out('');
    out('Options:');
    out(
      '  --upstream <url>          Upstream AI API endpoint (default: https://api.anthropic.com, env: TK_PROXY_UPSTREAM)',
    );
    out(
      '  --intercept-path <path>   API path to intercept for rules injection (default: /v1/messages, env: TK_PROXY_INTERCEPT_PATH)',
    );
    out('  --help, -h                Show this help message');
    out('');
    out('Example: tk-proxy claude-code');
    out('         tk-proxy --upstream https://api.anthropic.com claude-code');
    process.exit(isHelp ? 0 : 1);
  }

  const { upstream, interceptPath, agentArgs } = parseProxyArgs(rawArgs);

  if (agentArgs.length === 0) {
    console.error('Error: No target command specified to execute.');
    console.error('Run tk-proxy --help for usage.');
    process.exit(1);
  }

  // 1. Initialize the global rules database
  initializeGlobalStore();

  // 2. Start the local API proxy server
  // Port 0 will pick an available random port
  try {
    const port = await startProxyServer(0, { upstream, interceptPath });

    // 3. Spawn the target CLI agent preserving arguments array
    spawnAgent(agentArgs, port, { upstream });
  } catch (e) {
    console.error('[Tribunal Proxy] Fatal error starting proxy:', e);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  parseProxyArgs,
  main,
};
