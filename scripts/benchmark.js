#!/usr/bin/env node
/**
 * Tribunal-Kit Performance Benchmark
 *
 * Measures and reports performance metrics for key operations.
 * Run: node scripts/benchmark.js
 */

const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

// ANSI colors
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[91m",
  green: "\x1b[92m",
  yellow: "\x1b[93m",
  cyan: "\x1b[96m",
  white: "\x1b[97m",
  gray: "\x1b[90m",
};

function c(color, text) {
  return `${C[color]}${text}${C.reset}`;
}
function bold(text) {
  return `${C.bold}${text}${C.reset}`;
}

/**
 * Time a command execution in milliseconds.
 * @param {string} label - Description of the benchmark
 * @param {function} fn - Function to benchmark
 * @param {number} [runs=3] - Number of runs for averaging
 * @returns {{ label: string, avg: number, min: number, max: number, runs: number }}
 */
async function benchmark(label, fn, runs = 3) {
  const times = [];
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    times.push(end - start);
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  return { label, avg, min, max, runs };
}

/**
 * Time a shell command.
 */
function benchmarkCommand(label, command, runs = 3) {
  return benchmark(
    label,
    () => {
      spawnSync("node", command.split(" "), {
        stdio: "pipe",
        encoding: "utf8",
        env: { ...process.env, TK_SKIP_UPDATE_CHECK: "1" },
      });
    },
    runs,
  );
}

async function main() {
  console.log();
  console.log(bold(`  ⚡ Tribunal-Kit Performance Benchmark`));
  console.log(c("gray", `  ─────────────────────────────────────────`));
  console.log(c("gray", `  Platform: ${os.platform()} ${os.arch()}`));
  console.log(c("gray", `  Node: ${process.version}`));
  console.log(
    c(
      "gray",
      `  CPUs: ${os.cpus().length}x ${os.cpus()[0]?.model || "unknown"}`,
    ),
  );
  console.log(c("gray", `  ─────────────────────────────────────────`));
  console.log();

  const cliPath = path.resolve(__dirname, "../bin/wrapper.js");
  const tempDir = path.join(os.tmpdir(), `tribunal-bench-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  const results = [];

  // 1. Cold start (help)
  console.log(c("cyan", "  ▸ Benchmarking: CLI cold-start (--help)"));
  const helpResult = await benchmarkCommand(
    "CLI cold-start (--help)",
    `${cliPath} --help`,
    5,
  );
  results.push(helpResult);

  // 2. Status check
  console.log(c("cyan", "  ▸ Benchmarking: tk status"));
  const statusResult = await benchmarkCommand(
    "Status check",
    `${cliPath} status --quiet`,
    5,
  );
  results.push(statusResult);

  // 3. Init (dry-run)
  console.log(c("cyan", "  ▸ Benchmarking: tk init --dry-run"));
  const initResult = await benchmarkCommand(
    "Init (dry-run)",
    `${cliPath} init --dry-run --quiet --skip-update-check --path=${tempDir}`,
    3,
  );
  results.push(initResult);

  // 4. Init (real, to temp dir)
  console.log(c("cyan", "  ▸ Benchmarking: tk init (real copy)"));
  const initRealResult = await benchmark(
    "Init (full copy)",
    () => {
      const runDir = path.join(tempDir, `run-${Date.now()}`);
      fs.mkdirSync(runDir, { recursive: true });
      spawnSync(
        "node",
        [cliPath, "init", "--quiet", "--skip-update-check", `--path=${runDir}`],
        {
          stdio: "pipe",
          encoding: "utf8",
          env: { ...process.env, TK_SKIP_UPDATE_CHECK: "1" },
        },
      );
      // Cleanup
      try {
        fs.rmSync(runDir, { recursive: true, force: true });
      } catch {}
    },
    3,
  );
  results.push(initRealResult);

  // Print results table
  console.log();
  console.log(bold(`  Results`));
  console.log(
    c("gray", `  ─────────────────────────────────────────────────────────`),
  );
  console.log(
    `  ${c("white", "Operation".padEnd(30))} ${c("white", "Avg (ms)".padStart(10))} ${c("white", "Min".padStart(8))} ${c("white", "Max".padStart(8))}`,
  );
  console.log(
    c("gray", `  ─────────────────────────────────────────────────────────`),
  );

  for (const r of results) {
    const avgColor = r.avg < 100 ? "green" : r.avg < 500 ? "yellow" : "red";
    console.log(
      `  ${c("white", r.label.padEnd(30))} ${c(avgColor, String(Math.round(r.avg)).padStart(10))} ${c("gray", String(Math.round(r.min)).padStart(8))} ${c("gray", String(Math.round(r.max)).padStart(8))}`,
    );
  }

  console.log(
    c("gray", `  ─────────────────────────────────────────────────────────`),
  );
  console.log();

  // Write results to JSON for CI/comparison
  const outputPath = path.resolve(__dirname, "../benchmark-results.json");
  const outputData = {
    timestamp: new Date().toISOString(),
    platform: `${os.platform()}-${os.arch()}`,
    node: process.version,
    results: results.map((r) => ({
      label: r.label,
      avg_ms: Math.round(r.avg),
      min_ms: Math.round(r.min),
      max_ms: Math.round(r.max),
      runs: r.runs,
    })),
  };
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
  console.log(c("green", `  ✔ Results saved to benchmark-results.json`));

  // Cleanup temp
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {}
  console.log();
}

main().catch((err) => {
  console.error(`Benchmark failed: ${err.message}`);
  process.exit(1);
});
