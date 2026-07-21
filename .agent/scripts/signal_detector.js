/**
 * signal_detector.js — Tribunal Kit Signal Detector
 * ====================================================
 * Parses runtime log files, test logs, and build transcripts to extract
 * structured "Improvement Signals" (errors, bottlenecks, gaps).
 *
 * Supported log sources/patterns:
 *   - JS/TS Node Stack Traces
 *   - Python Stack Traces
 *   - Rust Compiler Errors
 *   - Jest/Vitest Test Failures
 *   - ESLint Warnings/Errors
 *   - Performance measurements (e.g. "Slow query", "duration: 1200ms")
 */

"use strict";

const _fs = require("fs");
const path = require("path");

const SIGNAL_TYPES = {
  ERROR: "log_error",
  PERF: "perf_bottleneck",
  GAP: "capability_gap",
};

/**
 * Parses a string log and extracts list of typed signals.
 * @param {string} logText
 * @returns {Array<{type: string, file: string|null, line: number|null, message: string, context: string}>}
 */
function detectSignals(logText) {
  const signals = [];
  const lines = logText.split(/\r?\n/);

  // 1. Check for stack traces and syntax/runtime errors
  // JS/TS stack trace line: "    at Object.foo (src/utils.js:12:45)" or "    at src/utils.js:12:45"
  const jsStackRegex = /\bat\s+(?:async\s+)?(?:[^(]+\()?([^:()\s]+):(\d+):(\d+)\)?/;
  // Python File location: '  File "src/main.py", line 12, in <module>'
  const pyStackRegex = /File\s+"([^"]+)"\s*,\s*line\s*(\d+)/;
  // Rust location: '  --> src/main.rs:12:34'
  const rustRegex = /-->\s*([^:\s]+):(\d+):(\d+)/;
  // ESLint standard line: '  /path/to/file.js:12:34: error: Message' or '  12:34  error  Message'
  // But ESLint often has file heading first. So let's handle inline: 'file.js: line 12, col 34, Error - Message'
  const eslintInlineRegex = /([^:\s]+):\s*line\s*(\d+)\s*,\s*col\s*\d+,\s*(?:Error|Warning)\s*-\s*(.+)/i;
  // Also standard unix format: '/path/to/file.js:12:34: error message'
  const unixErrorRegex = /^([^:\s\(\)]+):(\d+):(?:\d+:)?\s*(error|warning|info):?\s*(.+)/i;

  // Let's also scan for performance bottlenecks
  const slowQueryRegex = /slow\s+query|duration:\s*(\d+)ms|execution\s+time:\s*(\d+)ms|response\s+time\s*>\s*(\d+)ms/i;

  let currentFile = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect Jest/Vitest file heading: "FAIL  src/utils.test.js"
    if (line.startsWith("FAIL ")) {
      const match = line.match(/^FAIL\s+(\S+)/);
      if (match) {
        currentFile = match[1];
        signals.push({
          type: SIGNAL_TYPES.ERROR,
          file: currentFile,
          line: null,
          message: `Test suite failed: ${path.basename(currentFile)}`,
          context: lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 5)).join("\n"),
        });
      }
      continue;
    }

    // JS Stack Trace Match
    const jsMatch = line.match(jsStackRegex);
    if (jsMatch && !line.includes("node_modules")) {
      const filePath = jsMatch[1].replace(/\\/g, "/");
      signals.push({
        type: SIGNAL_TYPES.ERROR,
        file: filePath,
        line: parseInt(jsMatch[2], 10),
        message: `Stack Trace Error: ${line.trim()}`,
        context: lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3)).join("\n"),
      });
      continue;
    }

    // Python Stack Trace Match
    const pyMatch = line.match(pyStackRegex);
    if (pyMatch) {
      const filePath = pyMatch[1].replace(/\\/g, "/");
      signals.push({
        type: SIGNAL_TYPES.ERROR,
        file: filePath,
        line: parseInt(pyMatch[2], 10),
        message: `Python Exception: ${lines[i+1] ? lines[i+1].trim() : line.trim()}`,
        context: lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 4)).join("\n"),
      });
      continue;
    }

    // Rust Compiler Error Match
    const rustMatch = line.match(rustRegex);
    if (rustMatch) {
      const filePath = rustMatch[1].replace(/\\/g, "/");
      signals.push({
        type: SIGNAL_TYPES.ERROR,
        file: filePath,
        line: parseInt(rustMatch[2], 10),
        message: `Rust compilation failure: ${lines[Math.max(0, i - 1)].trim()}`,
        context: lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 5)).join("\n"),
      });
      continue;
    }

    // ESLint Inline Match
    const eslintMatch = line.match(eslintInlineRegex);
    if (eslintMatch) {
      signals.push({
        type: SIGNAL_TYPES.ERROR,
        file: eslintMatch[1].replace(/\\/g, "/"),
        line: parseInt(eslintMatch[2], 10),
        message: `Linter Violation: ${eslintMatch[3]}`,
        context: line.trim(),
      });
      continue;
    }

    // Unix Error Format Match
    const unixMatch = line.match(unixErrorRegex);
    if (unixMatch && !line.includes("node_modules")) {
      const filePath = unixMatch[1].replace(/\\/g, "/");
      signals.push({
        type: SIGNAL_TYPES.ERROR,
        file: filePath,
        line: parseInt(unixMatch[2], 10),
        message: `${unixMatch[3].toUpperCase()}: ${unixMatch[4]}`,
        context: line.trim(),
      });
      continue;
    }

    // Slow Query/Performance Match
    const slowMatch = line.match(slowQueryRegex);
    if (slowMatch) {
      signals.push({
        type: SIGNAL_TYPES.PERF,
        file: currentFile || null,
        line: null,
        message: `Performance warning: ${line.trim()}`,
        context: lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 2)).join("\n"),
      });
      continue;
    }
  }

  // Deduplicate near-identical signals (same file, line, and message type)
  const unique = [];
  const keys = new Set();
  for (const s of signals) {
    const key = `${s.type}:${s.file}:${s.line}:${s.message.substring(0, 40)}`;
    if (!keys.has(key)) {
      keys.add(key);
      unique.push(s);
    }
  }

  return unique;
}

module.exports = {
  detectSignals,
  SIGNAL_TYPES,
};
