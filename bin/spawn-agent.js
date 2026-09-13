const { spawn } = require('child_process');

function spawnAgent(agentCommand, proxyPort) {
  const proxyUrl = `http://localhost:${proxyPort}`;
  console.log(`[Tribunal Proxy] Launching ${agentCommand} with proxy ${proxyUrl}`);

  // Split command and arguments. e.g. "claude-code" or "npx claude-code"
  const args = agentCommand.split(' ');
  const command = args.shift();

  // Inject proxy environment variables
  // ANTHROPIC_BASE_URL is commonly respected by Anthropic-based CLI tools
  const env = {
    ...process.env,
    ANTHROPIC_BASE_URL: proxyUrl,
    // Note: If using HTTPS_PROXY, it would look like this:
    // HTTPS_PROXY: proxyUrl,
    // NODE_TLS_REJECT_UNAUTHORIZED: "0"
  };

  const isWin = process.platform === 'win32';
  const child = spawn(command, args, {
    stdio: 'inherit', // Pass stdin, stdout, stderr directly to the TTY
    env,
    shell: isWin,
  });

  child.on('close', (code, signal) => {
    console.log(`[Tribunal Proxy] ${command} exited with code ${code !== null ? code : signal}`);
    if (code !== null) {
      process.exit(code);
    } else {
      process.exit(signal ? 128 : 1);
    }
  });

  child.on('error', err => {
    console.error(`[Tribunal Proxy] Failed to start ${command}:`, err);
    process.exit(1);
  });
}

module.exports = {
  spawnAgent,
};
