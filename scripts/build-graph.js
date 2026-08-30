const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

async function buildSemanticGraph(targetPath = process.cwd()) {
  return new Promise((resolve, reject) => {
    // Determine platform-specific binary
    const platform = os.platform();
    const _arch = os.arch();

    let binaryName = 'tribunal-core';
    if (platform === 'win32') binaryName += '.exe';

    // For development, try to use the locally compiled debug/release binary
    let binaryPath = path.join(__dirname, '..', 'target', 'release', binaryName);
    if (!fs.existsSync(binaryPath)) {
      binaryPath = path.join(__dirname, '..', 'target', 'debug', binaryName);
    }

    if (!fs.existsSync(binaryPath)) {
      console.error("Tribunal Core binary not found. Please run 'npm run build:core'.");
      return reject(new Error('Tribunal Core binary not found.'));
    }

    console.log(`Building Semantic Context Graph for ${targetPath}...`);

    const coreProcess = spawn(binaryPath, ['graph', targetPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdoutData = '';
    let stderrData = '';

    coreProcess.stdout.on('data', data => {
      stdoutData += data.toString();
    });

    coreProcess.stderr.on('data', data => {
      stderrData += data.toString();
    });

    coreProcess.on('close', code => {
      if (code !== 0) {
        console.error(`Graph generation failed with code ${code}`);
        console.error(stderrData);
        return reject(new Error(`Graph generation failed: ${stderrData}`));
      }

      try {
        const result = JSON.parse(stdoutData.trim());
        console.log(`Graph built successfully: ${result.nodes} nodes parsed.`);
        console.log(`Graph saved to: ${result.graph_path}`);
        resolve(result);
      } catch (err) {
        console.error('Failed to parse core engine output:', stdoutData);
        reject(err);
      }
    });
  });
}

// Allow running directly from CLI
if (require.main === module) {
  const targetDir = process.argv[2] || process.cwd();
  buildSemanticGraph(targetDir).catch(_err => {
    process.exit(1);
  });
}

module.exports = { buildSemanticGraph };
