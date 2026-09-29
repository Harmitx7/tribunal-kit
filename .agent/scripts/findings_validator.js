#!/usr/bin/env node
/**
 * findings_validator.js — Validates reviewer output against the finding contract.
 * Malformed output is quarantined, and only valid findings are passed forward.
 */

'use strict';

const fs = require('fs');
const { validateFinding } = require('./finding_schema');
const { BOLD, RESET, RED, YELLOW, GREEN } = require('./_colors');

function main() {
  const args = process.argv.slice(2);
  const inputPath = args.find(a => a.startsWith('--in='))?.split('=')[1];
  const outPath = args.find(a => a.startsWith('--out='))?.split('=')[1];
  const quarantinePath =
    args.find(a => a.startsWith('--quarantine='))?.split('=')[1] || 'quarantined_findings.json';

  if (!inputPath || !outPath) {
    console.log(
      RED +
        'Usage: node findings_validator.js --in=<file> --out=<file> [--quarantine=<file>]' +
        RESET,
    );
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
    process.exit(0);
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
    const stringFields = ['title', 'impact', 'remediation'];
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

if (require.main === module) {
  main();
}
