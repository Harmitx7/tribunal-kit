#!/usr/bin/env node
/**
 * findings_validator.js — Validates reviewer output against the finding contract.
 * Malformed output is quarantined, and only valid findings are passed forward.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { validateFinding } = require('./finding_schema');
const { BOLD, RESET, RED, YELLOW, GREEN } = require('./_colors');
const { assertWithinRoot } = require('./_utils');

function main() {
  const args = process.argv.slice(2);
  const rawIn = args
    .find(a => a.startsWith('--in='))
    ?.split('=')
    .slice(1)
    .join('=');
  const rawOut = args
    .find(a => a.startsWith('--out='))
    ?.split('=')
    .slice(1)
    .join('=');
  const rawQuarantineArg = args
    .find(a => a.startsWith('--quarantine='))
    ?.split('=')
    .slice(1)
    .join('=');
  const hasQuarantineArg = rawQuarantineArg !== undefined;
  const rawQuarantine = rawQuarantineArg || 'quarantined_findings.json';

  const rawRoot = args
    .find(
      a =>
        a.startsWith('--root=') ||
        a.startsWith('--projectRoot=') ||
        a.startsWith('--project-root=') ||
        a.startsWith('--baseDir='),
    )
    ?.split('=')
    .slice(1)
    .join('=');

  if (!rawIn || !rawOut) {
    console.log(
      RED +
        'Usage: node findings_validator.js --in=<file> --out=<file> [--quarantine=<file>] [--root=<dir>]' +
        RESET,
    );
    process.exit(1);
  }

  // Reject lexical traversal (..) or null bytes in any path argument
  const pathsToCheck = [rawIn, rawOut, rawQuarantine];
  for (const p of pathsToCheck) {
    if (typeof p !== 'string' || p.includes('\0')) {
      console.error(RED + 'Security Violation: Null byte detected in path argument.' + RESET);
      process.exit(1);
    }
    const normalized = p.replace(/\\/g, '/');
    if (normalized.split('/').includes('..')) {
      console.error(
        RED +
          `Security Violation: Path traversal detected. Target "${p}" contains forbidden parent directory reference.` +
          RESET,
      );
      process.exit(1);
    }
  }

  // Anchor path containment to projectRoot: explicit --root, or dirname(rawIn) if absolute, else process.cwd()
  let projectRoot;
  if (rawRoot) {
    projectRoot = path.resolve(rawRoot);
  } else if (path.isAbsolute(rawIn)) {
    projectRoot = path.dirname(path.resolve(rawIn));
  } else {
    projectRoot = process.cwd();
  }

  let inputPath, outPath, quarantinePath;
  try {
    inputPath = assertWithinRoot(projectRoot, rawIn);
    outPath = assertWithinRoot(projectRoot, rawOut);
    quarantinePath = assertWithinRoot(projectRoot, rawQuarantine);
  } catch (err) {
    console.error(RED + `Security Violation: ${err.message}` + RESET);
    process.exit(1);
  }

  console.log(`${BOLD}Tribunal — Findings Schema Validator${RESET}`);
  console.log(`Validating: ${inputPath}`);

  if (!fs.existsSync(inputPath)) {
    console.log(YELLOW + `Input file not found: ${inputPath}. Emitting empty valid array.` + RESET);
    fs.writeFileSync(outPath, JSON.stringify({ findings: [] }, null, 2));
    process.exit(0);
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  } catch (e) {
    console.error(RED + `Failed to parse JSON: ${e.message}` + RESET);
    console.log(YELLOW + `Quarantining entire file.` + RESET);
    fs.writeFileSync(
      quarantinePath,
      JSON.stringify({ error: e.message, raw: fs.readFileSync(inputPath, 'utf8') }, null, 2),
    );
    fs.writeFileSync(outPath, JSON.stringify({ findings: [] }, null, 2));
    if (hasQuarantineArg) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  }

  const rawFindings = Array.isArray(data) ? data : data.findings || [];
  const validFindings = [];
  const quarantinedFindings = [];

  // Resource limits (§18)
  const MAX_FINDINGS = 5000;
  const MAX_EVIDENCE_PER_FINDING = 100;
  const MAX_STRING_LENGTH = 10240; // 10KB

  if (rawFindings.length > MAX_FINDINGS) {
    console.log(
      YELLOW +
        `WARNING: ${rawFindings.length} findings exceed limit of ${MAX_FINDINGS}. Processing first ${MAX_FINDINGS}.` +
        RESET,
    );
    quarantinedFindings.push({
      finding: {
        _diagnostic: `${rawFindings.length - MAX_FINDINGS} findings exceeded limit and were dropped`,
      },
      errors: [{ path: 'findings', message: `Exceeded maximum of ${MAX_FINDINGS} findings` }],
    });
  }

  const processable = rawFindings.slice(0, MAX_FINDINGS);

  for (const finding of processable) {
    // Check evidence array size limit
    if (
      finding.evidence &&
      Array.isArray(finding.evidence) &&
      finding.evidence.length > MAX_EVIDENCE_PER_FINDING
    ) {
      quarantinedFindings.push({
        finding,
        errors: [
          {
            path: 'evidence',
            message: `${finding.evidence.length} evidence items exceeds limit of ${MAX_EVIDENCE_PER_FINDING}`,
          },
        ],
      });
      continue;
    }

    // Check string length limits
    const stringFields = ['title', 'impact', 'remediation', 'description'];
    let oversized = false;
    for (const field of stringFields) {
      if (
        finding[field] &&
        typeof finding[field] === 'string' &&
        finding[field].length > MAX_STRING_LENGTH
      ) {
        quarantinedFindings.push({
          finding,
          errors: [
            {
              path: field,
              message: `${field} length ${finding[field].length} exceeds limit of ${MAX_STRING_LENGTH}`,
            },
          ],
        });
        oversized = true;
        break;
      }
    }
    if (oversized) continue;

    const result = validateFinding(finding);
    if (result.valid) {
      validFindings.push(result.data);
    } else {
      quarantinedFindings.push({
        finding,
        errors: result.errors,
      });
    }
  }

  fs.writeFileSync(outPath, JSON.stringify({ findings: validFindings }, null, 2));

  if (quarantinedFindings.length > 0) {
    fs.writeFileSync(quarantinePath, JSON.stringify({ quarantined: quarantinedFindings }, null, 2));
    console.log(
      YELLOW +
        `Quarantined ${quarantinedFindings.length} invalid findings to ${quarantinePath}` +
        RESET,
    );
  }

  console.log(GREEN + `Passed ${validFindings.length} valid findings to ${outPath}` + RESET);
}

module.exports = { main };

if (require.main === module) {
  main();
}
