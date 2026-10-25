#!/usr/bin/env node
/**
 * Tribunal-Kit Core Wrapper
 *
 * This script routes commands to the ultra-fast Rust binary if available and supported.
 * For legacy commands (or if the binary isn't available/compiled yet), it gracefully
 * falls back to the original JavaScript implementation.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const os = require('os');

// Commands that have been fully ported to Rust so far
const RUST_COMMANDS = new Set([
  'init',
  'validate',
  'status',
  'sync',
  'memory',
  'min-context',
  'dag-schedule',
  'context-compress',
  'context-broker',
  'optimize-step',
  'impact-tier',
  'sdd',
  'fitness',
  'telemetry-record',
  'telemetry-summary',
  'resolve-skills',
  'heatmap',
  'pollinate',
  'leaderboard',
  'benchmark',
  'genome',
  'purge',
  'ast-extract',
]);

// Determine the path to the compiled Rust binary
// In a full production release, this checks optionalDependencies in node_modules
// For development, it checks the local target/release folder
let _cachedBinaryPath = undefined;

function getBinaryPath() {
  if (process.env.TRIBUNAL_FORCE_JS === '1' || process.env.TRIBUNAL_FORCE_JS === 'true') {
    return null;
  }

  if (process.env.TRIBUNAL_CORE_PATH && fs.existsSync(process.env.TRIBUNAL_CORE_PATH)) {
    return process.env.TRIBUNAL_CORE_PATH;
  }

  if (_cachedBinaryPath !== undefined) {
    return _cachedBinaryPath;
  }

  const isWindows = os.platform() === 'win32';
  const ext = isWindows ? '.exe' : '';
  const platform = os.platform();
  const arch = os.arch();

  // If running in development repository (Cargo.toml present at root), check local workspace target first
  const cargoTomlPath = path.resolve(__dirname, '..', 'Cargo.toml');
  const isDevRepo = fs.existsSync(cargoTomlPath);

  if (isDevRepo) {
    const devCandidates = [
      path.resolve(__dirname, '..', 'target', 'release', `tribunal-core${ext}`),
      path.resolve(__dirname, '..', 'target', 'debug', `tribunal-core${ext}`),
      path.resolve(__dirname, '..', 'crates', 'core', 'target', 'release', `tribunal-core${ext}`),
      path.resolve(__dirname, '..', 'crates', 'core', 'target', 'debug', `tribunal-core${ext}`),
      path.resolve(__dirname, '..', '..', 'target', 'release', `tribunal-core${ext}`),
      path.resolve(__dirname, '..', '..', 'target', 'debug', `tribunal-core${ext}`),
    ];
    for (const candidate of devCandidates) {
      if (fs.existsSync(candidate)) {
        _cachedBinaryPath = candidate;
        return candidate;
      }
    }
  }

  // Try production resolution (from optionalDependencies)
  const pkgName = `@tribunal-kit/core-${platform}-${arch}`;
  try {
    const pkgPath = require.resolve(`${pkgName}/package.json`);
    const pkgDir = path.dirname(pkgPath);
    const binPath = path.resolve(pkgDir, `bin/tribunal-core${ext}`);
    if (fs.existsSync(binPath)) {
      _cachedBinaryPath = binPath;
      return binPath;
    }
    const rootBinPath = path.resolve(pkgDir, `tribunal-core${ext}`);
    if (fs.existsSync(rootBinPath)) {
      _cachedBinaryPath = rootBinPath;
      return rootBinPath;
    }
  } catch {
    // Package not found, ignore and fall back to local dev targets
  }

  // Second, try to find the binary in local dev target directories
  const candidatePaths = [
    path.resolve(__dirname, '..', 'target', 'release', `tribunal-core${ext}`),
    path.resolve(__dirname, '..', 'target', 'debug', `tribunal-core${ext}`),
    path.resolve(__dirname, '..', 'crates', 'core', 'target', 'release', `tribunal-core${ext}`),
    path.resolve(__dirname, '..', 'crates', 'core', 'target', 'debug', `tribunal-core${ext}`),
    path.resolve(__dirname, '..', '..', 'target', 'release', `tribunal-core${ext}`),
    path.resolve(__dirname, '..', '..', 'target', 'debug', `tribunal-core${ext}`),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      _cachedBinaryPath = candidate;
      return candidate;
    }
  }

  // Third, attempt on-demand compilation if Cargo.toml exists locally and explicitly requested
  if (process.env.TK_AUTO_BUILD === '1' && fs.existsSync(cargoTomlPath)) {
    try {
      console.log('\x1b[90m⚡ Building Rust core engine (TK_AUTO_BUILD=1)...\x1b[0m');
      const buildResult = spawnSync('cargo', ['build', '--release'], {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'inherit',
        timeout: 60000,
      });
      if (buildResult.status === 0) {
        for (const candidate of candidatePaths) {
          if (fs.existsSync(candidate)) {
            return candidate;
          }
        }
      }
    } catch {
      // cargo not available or build failed, fallback gracefully
    }
  }

  return null;
}

function runRustBinary(binPath, args) {
  // On Unix-like platforms, ensure the binary has execute permissions
  if (os.platform() !== 'win32') {
    try {
      fs.chmodSync(binPath, 0o755);
    } catch {
      // Best-effort permission check
    }
  }

  const stdio = ['inherit', 'inherit', 'inherit'];
  const result = spawnSync(binPath, args, {
    stdio: stdio,
    env: process.env,
  });

  if (result.error) {
    // Graceful degradation: fall back to JS engine instead of hard-crashing.
    // Spawn errors include missing binaries, permission denied, corrupted
    // executables, missing shared libraries, and OS-level exec failures.
    console.warn(
      `\x1b[93m⚠ Rust engine failed (${result.error.code || result.error.message}). Falling back to JS engine.\x1b[0m`,
    );
    return false; // Signal caller to fall back
  }

  if (result.signal) {
    const signalCode = os.constants?.signals?.[result.signal] || 1;
    process.exit(128 + signalCode);
  }

  process.exit(result.status !== null && result.status !== undefined ? result.status : 1);
}

function runLegacyFallback() {
  // Use the modular src/ CLI with lazy-loaded commands for faster cold-start.
  // Each command module is require()'d only when invoked (~70% fewer files loaded).
  const { main } = require('../src/cli.js');
  main().catch(err => {
    console.error(`\x1b[91m✖ Fatal Error:\x1b[0m ${err.message || err}`);
    process.exit(1);
  });
}

function main() {
  // Skip 'node' and 'wrapper.js'
  const args = process.argv.slice(2);

  // Immediate version handling if --version or -v is passed
  if (!args.some(a => !a.startsWith('-')) && (args.includes('--version') || args.includes('-v'))) {
    const PKG = require('../package.json');
    console.log(PKG.version);
    return;
  }

  // Extract the command (the first non-flag argument)
  const command = args.find(a => !a.startsWith('-'));

  // SYSTEM-1 LAYA INTERCEPTION
  // If Laya is explicitly enabled globally, route impact-tier to JS fallback
  if (command === 'impact-tier') {
    try {
      const layaConfigPath = path.join(os.homedir(), '.tribunal-kit', 'laya', 'config.json');
      if (fs.existsSync(layaConfigPath)) {
        const layaConfig = JSON.parse(fs.readFileSync(layaConfigPath, 'utf8'));
        if (layaConfig.enabled) {
          RUST_COMMANDS.delete('impact-tier');
        }
      }
    } catch {
      // Safely ignore corrupted config; defaults to Rust path
    }
  }

  if (command && RUST_COMMANDS.has(command)) {
    const binPath = getBinaryPath();

    if (binPath) {
      // Normalize --path <val> or --path=<val> to positional argument ONLY for commands that expect a positional path
      const POSITIONAL_PATH_COMMANDS = new Set(['init', 'status', 'sync', 'hook', 'uninstall', 'graph']);
      if (POSITIONAL_PATH_COMMANDS.has(command)) {
        const pathIdx = args.findIndex(a => a === '--path' || a.startsWith('--path='));
        if (pathIdx !== -1) {
          let pathVal;
          if (args[pathIdx].startsWith('--path=')) {
            pathVal = args[pathIdx].split('=').slice(1).join('=');
            args.splice(pathIdx, 1);
          } else {
            pathVal = args[pathIdx + 1];
            args.splice(pathIdx, 2);
          }
          if (pathVal) {
            args.push(pathVal);
          }
        }
      }

      // For the init command, Rust needs to know where the .agent template folder is.
      if (command === 'init') {
        const sourceDir = path.resolve(__dirname, '..', '.agent');
        args.push('--source-dir', sourceDir);
      }

      // Route to Rust engine
      // console.log('\x1b[90m⚡ Executing via Rust Core Engine\x1b[0m');
      const rustResult = runRustBinary(binPath, args);
      if (rustResult !== false) {
        return; // Rust engine handled it (process.exit was called)
      }
      // rustResult === false means spawn error; fall through to JS fallback
    } else {
      // Warn if Rust command was requested but binary is missing (in verbose mode)
      if (process.env.TK_VERBOSE || process.env.VERBOSE) {
        console.warn(
          '\x1b[93m⚠ Rust binary not found in target/. Falling back to JS engine.\x1b[0m',
        );
      }
    }
  }

  // Fall back to JS logic for un-ported commands (e.g. `learn`, `case`, `marathon`)
  runLegacyFallback();
}

if (require.main === module) {
  main();
}

module.exports = {
  getBinaryPath,
  runRustBinary,
  RUST_COMMANDS,
};
