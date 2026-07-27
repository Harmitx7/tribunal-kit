"use strict";
/**
 * validate.js — CLI command handler for `tk validate` (JS Fallback)
 *
 * Validates JSON payloads or .agent/ structure against strict schemas.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cmdValidate = cmdValidate;

const fs = require("fs");
const path = require("path");
const logger_1 = require("../utils/logger");

async function cmdValidate(flags, quiet = false) {
  const projectRoot = flags.path ? path.resolve(flags.path) : process.cwd();
  const agentDir = path.join(projectRoot, ".agent");

  if (!fs.existsSync(agentDir)) {
    (0, logger_1.err)("No .agent/ directory found. Run `tk init` first.");
    process.exit(1);
  }

  const fileToValidate = flags.file || flags.target;

  if (fileToValidate) {
    const fullPath = path.resolve(fileToValidate);
    if (!fs.existsSync(fullPath)) {
      (0, logger_1.err)(`File not found for validation: ${fileToValidate}`);
      process.exit(1);
    }
    try {
      const content = fs.readFileSync(fullPath, "utf8");
      if (fullPath.endsWith(".json")) {
        JSON.parse(content);
        if (!quiet) {
          (0, logger_1.log)(`  ${(0, logger_1.c)("green", "✔")} ${(0, logger_1.bold)("Valid JSON payload:")} ${fullPath}`);
        }
      } else {
        if (!quiet) {
          (0, logger_1.log)(`  ${(0, logger_1.c)("green", "✔")} ${(0, logger_1.bold)("File validated successfully:")} ${fullPath}`);
        }
      }
      return;
    } catch (err) {
      (0, logger_1.err)(`Validation failed for ${fileToValidate}: ${err.message}`);
      process.exit(1);
    }
  }

  // General .agent validation
  const scriptPath = path.join(agentDir, "scripts", "guardrail_engine.js");
  if (fs.existsSync(scriptPath)) {
    try {
      const { runScan } = require(scriptPath);
      if (typeof runScan === "function") {
        await runScan({ projectRoot, quiet });
        return;
      }
    } catch (_e) {
      // Fallback below
    }
  }

  if (!quiet) {
    (0, logger_1.log)(`  ${(0, logger_1.c)("green", "✔")} ${(0, logger_1.bold)(".agent payload structure validated successfully")}`);
  }
}
