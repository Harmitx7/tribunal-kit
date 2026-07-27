#!/usr/bin/env node
/**
 * Tribunal-Kit Core Wrapper
 *
 * This script routes commands to the ultra-fast Rust binary if available and supported.
 * For legacy commands (or if the binary isn't available/compiled yet), it gracefully
 * falls back to the original JavaScript implementation.
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const os = require("os");

// Commands that have been fully ported to Rust so far
const RUST_COMMANDS = new Set([
  "init",
  "validate",
  "status",
  "sync",
  "hook",
  "uninstall",
  "memory",
  "min-context",
  "dag-schedule",
  "context-compress",
  "optimize-step",
]);


// Determine the path to the compiled Rust binary
// In a full production release, this checks optionalDependencies in node_modules
// For development, it checks the local target/release folder
function getBinaryPath() {
  if (process.env.TRIBUNAL_FORCE_JS === "1") {
    return null;
  }

  if (process.env.TRIBUNAL_CORE_PATH && fs.existsSync(process.env.TRIBUNAL_CORE_PATH)) {
    return process.env.TRIBUNAL_CORE_PATH;
  }

  const isWindows = os.platform() === "win32";
  const ext = isWindows ? ".exe" : "";
  const platform = os.platform();
  const arch = os.arch();

  // First, try production resolution (from optionalDependencies)
  const pkgName = `@tribunal-kit/core-${platform}-${arch}`;
  try {
    const pkgPath = require.resolve(`${pkgName}/package.json`);
    const pkgDir = path.dirname(pkgPath);
    const binPath = path.resolve(pkgDir, `bin/tribunal-core${ext}`);
    if (fs.existsSync(binPath)) {
      return binPath;
    }
    const rootBinPath = path.resolve(pkgDir, `tribunal-core${ext}`);
    if (fs.existsSync(rootBinPath)) {
      return rootBinPath;
    }
  } catch {
    // Package not found, ignore and fall back to local dev targets
  }

  // Second, try to find the binary in local dev target directories
  const candidatePaths = [
    path.resolve(__dirname, "..", "target", "release", `tribunal-core${ext}`),
    path.resolve(__dirname, "..", "target", "debug", `tribunal-core${ext}`),
    path.resolve(__dirname, "..", "..", "target", "release", `tribunal-core${ext}`),
    path.resolve(__dirname, "..", "..", "target", "debug", `tribunal-core${ext}`),
    path.resolve(process.cwd(), "target", "release", `tribunal-core${ext}`),
    path.resolve(process.cwd(), "target", "debug", `tribunal-core${ext}`),
    path.resolve(process.cwd(), "tribunal-kit", "target", "release", `tribunal-core${ext}`),
    path.resolve(process.cwd(), "tribunal-kit", "target", "debug", `tribunal-core${ext}`),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Third, attempt on-demand compilation if Cargo.toml exists locally and cargo is installed
  const cargoTomlPath = path.resolve(__dirname, "..", "Cargo.toml");
  if (fs.existsSync(cargoTomlPath)) {
    try {
      const buildResult = spawnSync("cargo", ["build", "--release"], {
        cwd: path.resolve(__dirname, ".."),
        stdio: "ignore",
      });
      if (buildResult.status === 0) {
        const releasePath = candidatePaths[0];
        if (fs.existsSync(releasePath)) {
          return releasePath;
        }
      }
    } catch {
      // cargo not available or build failed, fallback gracefully
    }
  }

  return null;
}


function runRustBinary(binPath, args) {
  const stdio = [
    "inherit",
    "inherit",
    "inherit",
  ];
  const result = spawnSync(binPath, args, {
    stdio: stdio,
    env: process.env,
  });

  if (result.error) {
    console.error(
      `\x1b[91m✖ Failed to execute Rust engine:\x1b[0m ${result.error.message}`,
    );
    process.exit(1);
  }

  process.exit(result.status || 0);
}

function runLegacyFallback() {
  // Use the modular dist/ CLI with lazy-loaded commands for faster cold-start.
  // Each command module is require()'d only when invoked (~70% fewer files loaded).
  const { main } = require("../dist/cli.js");
  main();
}

function main() {
  // Skip 'node' and 'wrapper.js'
  const args = process.argv.slice(2);

  // Extract the command (the first non-flag argument)
  const command = args.find((a) => !a.startsWith("-"));

  if (command && RUST_COMMANDS.has(command)) {
    const binPath = getBinaryPath();

    if (binPath) {
      // For the init command, Rust needs to know where the .agent template folder is.
      if (command === "init") {
        const sourceDir = path.resolve(__dirname, "..", ".agent");
        args.push("--source-dir", sourceDir);
      }

      // Route to Rust engine
      // console.log('\x1b[90m⚡ Executing via Rust Core Engine\x1b[0m');
      runRustBinary(binPath, args);
      return;
    } else {
      // Warn if Rust command was requested but binary is missing
      console.warn(
        "\x1b[93m⚠ Rust binary not found in target/. Falling back to JS engine.\x1b[0m",
      );
    }
  }

  // Fall back to JS logic for un-ported commands (e.g. `learn`, `case`, `marathon`)
  runLegacyFallback();
}

main();
