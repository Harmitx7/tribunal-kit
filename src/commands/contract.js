"use strict";

/**
 * contract.js — CLI command handler for `tk contract`
 *
 * Commands:
 *   tk contract init                         → Scaffold .tribunal/contracts/ with starter rules
 *   tk contract verify                       → Run contract checks against target/modified files
 *   tk contract verify --file <path>         → Run contract checks against a single file
 *   tk contract list                         → List loaded contracts and details
 *   tk contract trace list                   → List captured failure context snapshots
 *   tk contract replay <id>                  → Replay failure trace snapshot in CLI
 *   tk contract generate --from-case <id>    → Auto-generate a contract from a Case Law entry
 */

Object.defineProperty(exports, "__esModule", { value: true });
exports.cmdContract = cmdContract;

const fs = require("fs");
const path = require("path");
const logger_1 = require("../utils/logger");

async function cmdContract(flags, argv, quiet = false) {
  const projectRoot = flags.path ? path.resolve(flags.path) : process.cwd();
  const rawArgs = argv.slice(3);
  const subCmd = rawArgs[0] || "verify";

  if (subCmd === "help" || subCmd === "--help" || subCmd === "-h") {
    showContractHelp(quiet);
    return;
  }

  const contractEngineScript = path.join(
    projectRoot,
    ".agent",
    "scripts",
    "contract_engine.js",
  );
  const traceEngineScript = path.join(
    projectRoot,
    ".agent",
    "scripts",
    "trace_engine.js",
  );

  const contractEngine = fs.existsSync(contractEngineScript)
    ? require(contractEngineScript)
    : null;
  const traceEngine = fs.existsSync(traceEngineScript)
    ? require(traceEngineScript)
    : null;

  switch (subCmd) {
    case "init":
      scaffoldContracts(projectRoot, quiet);
      break;

    case "list":
      if (!contractEngine) {
        (0, logger_1.err)("contract_engine.js not found. Run `tk init` first.");
        process.exit(1);
      }
      listContracts(projectRoot, contractEngine, quiet);
      break;

    case "verify":
      if (!contractEngine) {
        (0, logger_1.err)("contract_engine.js not found. Run `tk init` first.");
        process.exit(1);
      }
      runVerify(projectRoot, contractEngine, traceEngine, argv, flags, quiet);
      break;

    case "trace":
      if (!traceEngine) {
        (0, logger_1.err)("trace_engine.js not found. Run `tk init` first.");
        process.exit(1);
      }
      runTraceList(projectRoot, traceEngine, quiet);
      break;

    case "replay":
      if (!traceEngine) {
        (0, logger_1.err)("trace_engine.js not found. Run `tk init` first.");
        process.exit(1);
      }
      runReplay(projectRoot, traceEngine, rawArgs[1], quiet);
      break;

    case "generate":
      generateFromCase(projectRoot, rawArgs, quiet);
      break;

    default:
      if (fs.existsSync(subCmd) || subCmd.startsWith("--")) {
        // Treat as verify with arguments
        runVerify(projectRoot, contractEngine, traceEngine, argv, flags, quiet);
      } else {
        (0, logger_1.err)(`Unknown contract subcommand: "${subCmd}"`);
        showContractHelp(quiet);
        process.exit(1);
      }
  }
}

// ── Subcommand Implementations ───────────────────────────────────────────────

function scaffoldContracts(projectRoot, quiet) {
  const contractsDir = path.join(projectRoot, ".tribunal", "contracts");
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  const starters = [
    {
      file: "no-console-log.yaml",
      content: `name: "No console.log in production code"
description: "Prevents debug logging from reaching production"
scope: "src/**/*.ts, src/**/*.tsx, src/**/*.js"
exclude: "**/*.test.*, **/*.spec.*, scripts/**"
when: file_modified
severity: warn
must_not:
  - pattern: "console.log"
    message: "Use a structured logger instead of console.log"
`,
    },
    {
      file: "no-any-type.yaml",
      content: `name: "No TypeScript 'any' escape hatch"
description: "Enforces strict typing in TypeScript files"
scope: "src/**/*.ts, src/**/*.tsx"
exclude: "**/*.d.ts"
when: file_modified
severity: warn
must_not:
  - pattern: "regex:: any[;,\\\\s\\\\)\\\\]]"
    message: "Avoid 'any' type annotations — use unknown or a specific type"
`,
    },
    {
      file: "require-error-handling.yaml",
      content: `name: "Async functions must handle errors"
description: "Every async function should have error handling"
scope: "src/**/*.ts, src/**/*.tsx"
when: file_modified
severity: info
must:
  - pattern: "regex:(try\\\\s*\\\\{|.catch\\\\(|\\\\.catch\\\\s*\\\\()"
    message: "Async functions should include try/catch or .catch() for error handling"
metadata:
  tags: ["resilience", "error-handling"]
`,
    },
  ];

  let createdCount = 0;
  for (const starter of starters) {
    const filePath = path.join(contractsDir, starter.file);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, starter.content, "utf8");
      createdCount++;
    }
  }

  if (!quiet) {
    console.log();
    (0, logger_1.log)(
      `  ${(0, logger_1.c)("green", "✔")} Scaffolded .tribunal/contracts/ with ${createdCount} starter behavioral contracts.`,
    );
    (0, logger_1.log)(
      `  ${(0, logger_1.c)("gray", "▸")} Edit files in .tribunal/contracts/ or run \`tk contract verify\` to enforce.`,
    );
    console.log();
  }
}

function listContracts(projectRoot, contractEngine, quiet) {
  const contracts = contractEngine.loadContracts(projectRoot);
  if (quiet) return;

  console.log();
  (0, logger_1.log)(
    `  ${(0, logger_1.c)("cyan", "📜")}  ${(0, logger_1.bold)("Loaded Behavioral Contracts")}`,
  );
  (0, logger_1.log)(`  ${(0, logger_1.c)("gray", "─".repeat(50))}`);

  if (contracts.length === 0) {
    (0, logger_1.log)(
      `  No contracts found in .tribunal/contracts/. Run \`tk contract init\` to create starter rules.`,
    );
    console.log();
    return;
  }

  for (const c of contracts) {
    const sevColor =
      c.severity === "block" ? "red" : c.severity === "warn" ? "yellow" : "blue";
    const rulesCount = (c.must?.length || 0) + (c.must_not?.length || 0);

    (0, logger_1.log)(
      `  ${(0, logger_1.c)("cyan", "•")} ${(0, logger_1.bold)(c.name)} [${(0, logger_1.c)(sevColor, c.severity.toUpperCase())}]`,
    );
    (0, logger_1.log)(`    Scope: ${(0, logger_1.c)("gray", c.scope || "*")}`);
    (0, logger_1.log)(
      `    Rules: ${(0, logger_1.c)("white", String(rulesCount))} (${c.must?.length || 0} must, ${c.must_not?.length || 0} must_not)`,
    );
    if (c.description) {
      (0, logger_1.log)(`    Note:  ${(0, logger_1.c)("gray", c.description)}`);
    }
    console.log();
  }
}

function runVerify(projectRoot, contractEngine, traceEngine, argv, flags, quiet) {
  const jsonMode = argv.includes("--json");
  const fileArg = extractFileArg(argv);

  let targetFiles = null;
  if (fileArg) {
    const resolved = path.resolve(fileArg);
    if (!fs.existsSync(resolved)) {
      (0, logger_1.err)(`File not found: ${fileArg}`);
      process.exit(1);
    }
    targetFiles = [resolved];
  }

  const results = contractEngine.verifyWorkspace(projectRoot, targetFiles);

  // Capture failure context snapshots for block/warn violations if traceEngine exists
  if (traceEngine && results.violations.length > 0) {
    for (const v of results.violations) {
      if (v.severity === "block" || v.severity === "warn") {
        try {
          traceEngine.captureSnapshot(projectRoot, v);
        } catch {
          // Non-critical snapshot capture fallback
        }
      }
    }
  }

  if (jsonMode) {
    console.log(JSON.stringify(results, null, 2));
    process.exit(results.blocked ? 1 : 0);
  }

  if (quiet) {
    process.exit(results.blocked ? 1 : 0);
  }

  console.log();
  (0, logger_1.log)(
    `  ${(0, logger_1.c)("cyan", "📜")}  ${(0, logger_1.bold)("Contract Verification Report")}`,
  );
  (0, logger_1.log)(`  ${(0, logger_1.c)("gray", "─".repeat(50))}`);
  (0, logger_1.log)(
    `  Contracts loaded: ${(0, logger_1.c)("white", String(results.contracts_loaded))}`,
  );
  (0, logger_1.log)(
    `  Files scanned:    ${(0, logger_1.c)("white", String(results.files_checked))}`,
  );
  (0, logger_1.log)(
    `  Total violations: ${results.violations.length > 0 ? (0, logger_1.c)("yellow", String(results.violations.length)) : (0, logger_1.c)("green", "0")}`,
  );
  (0, logger_1.log)(`  ${(0, logger_1.c)("gray", "─".repeat(50))}`);

  if (results.violations.length > 0) {
    for (const v of results.violations) {
      const icon =
        v.severity === "block"
          ? (0, logger_1.c)("red", "✖ BLOCK")
          : v.severity === "warn"
            ? (0, logger_1.c)("yellow", "⚠ WARN")
            : (0, logger_1.c)("blue", "ℹ INFO");

      const lineInfo = v.line ? `:${v.line}` : "";
      (0, logger_1.log)(
        `  ${icon} [${(0, logger_1.bold)(v.contract)}] ${(0, logger_1.c)("cyan", v.file + lineInfo)}`,
      );
      (0, logger_1.log)(`        ${(0, logger_1.c)("white", v.message)}`);
      if (v.snippet) {
        (0, logger_1.log)(`        ${(0, logger_1.c)("gray", "Snippet:")} ${(0, logger_1.c)("gray", v.snippet)}`);
      }
    }
  } else {
    (0, logger_1.log)(
      `  ${(0, logger_1.c)("green", "✅")} All contracts satisfied. Zero behavioral violations detected.`,
    );
  }

  console.log();
  process.exit(results.blocked ? 1 : 0);
}

function runTraceList(projectRoot, traceEngine, quiet) {
  const snapshots = traceEngine.listSnapshots(projectRoot);
  if (quiet) return;

  console.log();
  (0, logger_1.log)(
    `  ${(0, logger_1.c)("cyan", "🎥")}  ${(0, logger_1.bold)("Failure Context Snapshots")}`,
  );
  (0, logger_1.log)(`  ${(0, logger_1.c)("gray", "─".repeat(50))}`);

  if (snapshots.length === 0) {
    (0, logger_1.log)(`  No failure context snapshots recorded.`);
    console.log();
    return;
  }

  for (const s of snapshots.slice(0, 10)) {
    const sevColor = s.severity === "block" ? "red" : "yellow";
    (0, logger_1.log)(
      `  ${(0, logger_1.c)("cyan", "•")} ${(0, logger_1.bold)(s.id)} [${(0, logger_1.c)(sevColor, s.severity.toUpperCase())}]`,
    );
    (0, logger_1.log)(`    Contract: ${s.contract}`);
    (0, logger_1.log)(`    Target:   ${(0, logger_1.c)("gray", s.target_file)}`);
    (0, logger_1.log)(`    Time:     ${(0, logger_1.c)("gray", s.timestamp)}`);
    console.log();
  }
}

function runReplay(projectRoot, traceEngine, traceId, quiet) {
  if (!traceId) {
    (0, logger_1.err)("Missing trace ID. Usage: tk contract replay <trace_id>");
    process.exit(1);
  }

  const snapshot = traceEngine.replaySnapshot(projectRoot, traceId);
  if (!snapshot) {
    (0, logger_1.err)(`Trace snapshot not found: "${traceId}"`);
    process.exit(1);
  }

  if (quiet) return;

  console.log();
  (0, logger_1.log)(
    `  ${(0, logger_1.c)("cyan", "🎬")}  ${(0, logger_1.bold)("Replaying Failure Trace Snapshot")}`,
  );
  (0, logger_1.log)(`  ${(0, logger_1.c)("gray", "─".repeat(50))}`);
  (0, logger_1.log)(`  ID:       ${(0, logger_1.c)("white", snapshot.id)}`);
  (0, logger_1.log)(`  Contract: ${(0, logger_1.bold)(snapshot.contract)}`);
  (0, logger_1.log)(`  Severity: ${(0, logger_1.c)(snapshot.severity === "block" ? "red" : "yellow", snapshot.severity.toUpperCase())}`);
  (0, logger_1.log)(`  Target:   ${(0, logger_1.c)("cyan", snapshot.target_file)}`);
  (0, logger_1.log)(`  Time:     ${snapshot.timestamp}`);
  (0, logger_1.log)(`  ${(0, logger_1.c)("gray", "─".repeat(50))}`);
  (0, logger_1.log)(
    `  ${(0, logger_1.c)("red", "Violation:")} ${snapshot.violation.message}`,
  );
  if (snapshot.violation.snippet) {
    (0, logger_1.log)(
      `  ${(0, logger_1.c)("yellow", "Code Snippet:")} ${snapshot.violation.snippet}`,
    );
  }
  console.log();
}

function generateFromCase(projectRoot, rawArgs, quiet) {
  const caseIdx = rawArgs.indexOf("--from-case");
  const caseId = caseIdx !== -1 ? rawArgs[caseIdx + 1] : null;

  if (!caseId) {
    (0, logger_1.err)(
      "Missing case ID. Usage: tk contract generate --from-case <id>",
    );
    process.exit(1);
  }

  const contractsDir = path.join(projectRoot, ".tribunal", "contracts");
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  const contractFileName = `case-${caseId}-rule.yaml`;
  const contractPath = path.join(contractsDir, contractFileName);

  const content = `name: "Contract from Case #${caseId}"
description: "Auto-generated behavioral contract to prevent recurrence of Case #${caseId}"
scope: "src/**/*.ts, src/**/*.js"
when: file_modified
severity: block
must_not:
  - pattern: "UNVERIFIED_API_PATTERN"
    message: "Precedent Case #${caseId} violation prevented by contract"
metadata:
  generated_from_case: "${caseId}"
  created: "${new Date().toISOString().split("T")[0]}"
`;

  fs.writeFileSync(contractPath, content, "utf8");

  if (!quiet) {
    console.log();
    (0, logger_1.log)(
      `  ${(0, logger_1.c)("green", "✔")} Auto-generated contract template from Case #${caseId}:`,
    );
    (0, logger_1.log)(`    ${(0, logger_1.c)("cyan", contractPath)}`);
    console.log();
  }
}

function extractFileArg(argv) {
  const idx = argv.indexOf("--file");
  if (idx !== -1 && argv[idx + 1]) return argv[idx + 1];
  return null;
}

function showContractHelp(quiet) {
  if (quiet) return;
  console.log();
  (0, logger_1.log)(
    `  ${(0, logger_1.bold)("Tribunal Behavioral Contract Engine (tk contract)")}`,
  );
  (0, logger_1.log)(`  ${(0, logger_1.c)("gray", "─".repeat(50))}`);
  (0, logger_1.log)(
    `  ${(0, logger_1.c)("cyan", "init")}                       Scaffold .tribunal/contracts/ with starter rules`,
  );
  (0, logger_1.log)(
    `  ${(0, logger_1.c)("cyan", "verify")}                     Verify code against loaded contracts`,
  );
  (0, logger_1.log)(
    `  ${(0, logger_1.c)("cyan", "verify --file <path>")}         Verify a specific target file`,
  );
  (0, logger_1.log)(
    `  ${(0, logger_1.c)("cyan", "list")}                       List all active contracts`,
  );
  (0, logger_1.log)(
    `  ${(0, logger_1.c)("cyan", "trace list")}                 List recorded failure context snapshots`,
  );
  (0, logger_1.log)(
    `  ${(0, logger_1.c)("cyan", "replay <id>")}                Replay failure context trace snapshot`,
  );
  (0, logger_1.log)(
    `  ${(0, logger_1.c)("cyan", "generate --from-case <id>")}   Generate contract template from Case Law`,
  );
  console.log();
}
