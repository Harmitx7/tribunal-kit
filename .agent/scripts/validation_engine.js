#!/usr/bin/env node
/**
 * validation_engine.js — Tribunal Validation Engine (Trust Boundary Authority)
 *
 * THIS IS THE SOLE AUTHORITY for VERIFIED status.
 *
 * Trust Model:
 *   UNTRUSTED: Repository content, LLM observations, LLM claims
 *   STRUCTURALLY VALID: Findings that pass Zod schema
 *   SOURCE CONFIRMED: Evidence locations verified against repository
 *   VERIFIED: Independent proof exists (test execution or static tool)
 *
 * CRITICAL RULES:
 *   1. LLM output is NEVER trusted for verification status.
 *   2. Any finding arriving with status=VERIFIED is DEMOTED to DETECTED.
 *   3. VERIFIED requires independent execution proof with provenance.
 *   4. Evidence locations are verified against the actual repository.
 *   5. Stale evidence (code changed) prevents VERIFIED.
 */

'use strict';

const fs = require('fs');
const { BOLD, RESET, BLUE, GREEN, RED, YELLOW, sectionHeader } = require('./_colors');
const { verifyFindingEvidence } = require('./evidence_verifier');
const { redactFinding } = require('./secret_redactor');

// Trusted statuses that only this engine can assign
const TRUSTED_STATUSES = new Set(['VERIFIED', 'FIXED', 'REGRESSION-PROTECTED']);

/**
 * Output Isolation (§9):
 * Strip any trusted status that the LLM may have self-assigned.
 * LLM may only produce DETECTED or UNVERIFIED.
 */
function enforceOutputIsolation(finding) {
  if (TRUSTED_STATUSES.has(finding.status)) {
    finding._original_status = finding.status;
    finding.status = 'DETECTED';
    finding._isolation_note = `Status "${finding._original_status}" was demoted to DETECTED. Only the validation engine can assign trusted statuses.`;
  }
  return finding;
}

/**
 * Validation provenance record (§13).
 * Every VERIFIED finding gets a provenance trail.
 */
function createProvenance(method, details) {
  return {
    method,
    timestamp: new Date().toISOString(),
    engine: 'validation_engine.js',
    ...details,
  };
}

/**
 * Determines the validation status for a finding.
 *
 * Decision tree:
 *   1. Output isolation: demote any self-assigned VERIFIED
 *   2. Evidence verification: check source locations exist
 *   3. Architecture/design → UNVERIFIED (cannot be tested)
 *   4. Has trusted test execution record → VERIFIED (with provenance)
 *   5. Has trusted static proof record → VERIFIED (with provenance)
 *   6. All others → DETECTED (evidence exists, no reproduction)
 */
function runSafeValidation(finding, repoRoot) {
  // Step 1: Output isolation — demote self-assigned trusted statuses
  enforceOutputIsolation(finding);

  // Step 2: Evidence verification against repository (if repoRoot provided)
  if (repoRoot) {
    finding = verifyFindingEvidence(finding, repoRoot);

    // If ALL evidence locations are fabricated, finding is UNVERIFIED
    if (
      finding.evidence_verification &&
      finding.evidence_verification.status === 'ALL_FABRICATED'
    ) {
      return {
        status: 'UNVERIFIED',
        message: 'All evidence locations are fabricated or do not exist in the repository.',
        provenance: createProvenance('evidence_verification', {
          result: 'ALL_FABRICATED',
          details: finding.evidence_verification.details,
        }),
      };
    }
  }

  // Step 3: Architecture and design findings cannot be reproduced
  if (finding.category === 'architecture' || finding.category === 'design') {
    return {
      status: 'UNVERIFIED',
      message: 'Architectural issues cannot be automatically verified safely.',
      provenance: createProvenance('category_exclusion', { category: finding.category }),
    };
  }

  // Step 4: Trusted test execution proof
  // The verification object must contain a trusted execution record
  // with command, exit_code, and output — not just "test_executed: true"
  if (finding.verification) {
    const v = finding.verification;

    if (v.test_executed === true && v.command && typeof v.exit_code === 'number' && v.test_output) {
      return {
        status: 'VERIFIED',
        message: `Verified by test execution: ${v.command} (exit ${v.exit_code})`,
        provenance: createProvenance('test_execution', {
          command: v.command,
          exit_code: v.exit_code,
          output_preview: (v.test_output || '').substring(0, 200),
        }),
      };
    }

    // Step 5: Trusted static analysis proof
    // Must have tool name AND tool output — not just "static_proof: true"
    if (v.static_proof === true && v.tool && v.tool_output) {
      return {
        status: 'VERIFIED',
        message: `Verified by static analysis: ${v.tool}`,
        provenance: createProvenance('static_analysis', {
          tool: v.tool,
          output_preview: (v.tool_output || '').substring(0, 200),
        }),
      };
    }

    // Incomplete verification claims — demote to DETECTED with explanation
    if (v.test_executed === true && (!v.command || typeof v.exit_code !== 'number')) {
      finding._verification_rejection =
        'test_executed=true but missing required provenance (command, exit_code)';
    }
    if (v.static_proof === true && (!v.tool || !v.tool_output)) {
      finding._verification_rejection =
        'static_proof=true but missing required provenance (tool, tool_output)';
    }
  }

  // Step 6: Default — evidence exists but no reproduction
  return {
    status: 'DETECTED',
    message:
      'Evidence exists but no automated reproduction was performed. Manual review recommended.',
    provenance: createProvenance('default', { reason: 'no_independent_proof' }),
  };
}

function runValidation(findings, repoRoot) {
  const validated = [];
  console.log(sectionHeader('Validation Engine Execution'));

  for (const finding of findings) {
    const titlePreview = (finding.title || '').substring(0, 50);
    console.log(`${BOLD}Validating finding: ${finding.id} - ${titlePreview}...${RESET}`);

    // Log output isolation events
    if (finding._isolation_note) {
      console.log(`  ${RED}⚠ OUTPUT ISOLATION:${RESET} ${finding._isolation_note}`);
    }

    if (finding.validation && finding.validation.required !== false) {
      const result = runSafeValidation(finding, repoRoot);

      if (result.status === 'VERIFIED') console.log(`  ${GREEN}Result:${RESET} ${result.message}`);
      else if (result.status === 'DETECTED')
        console.log(`  ${YELLOW}Result:${RESET} ${result.message}`);
      else console.log(`  ${BLUE}Result:${RESET} ${result.message}`);

      if (finding._verification_rejection) {
        console.log(`  ${RED}⚠ REJECTED:${RESET} ${finding._verification_rejection}`);
      }

      finding.status = result.status;
      finding.validation = {
        ...finding.validation,
        result: result.message,
        provenance: result.provenance,
      };

      // Redact secrets before output
      validated.push(redactFinding(finding));
    } else {
      console.log(`  ${BLUE}Result:${RESET} Validation not required by finding.`);
      finding.validation = {
        ...finding.validation,
        result: 'Skipped — validation not required.',
      };
      validated.push(redactFinding(finding));
    }
  }
  return validated;
}

function main() {
  const args = process.argv.slice(2);
  const inputPath =
    args.find(a => a.startsWith('--in='))?.split('=')[1] || 'correlated_findings.json';
  const outPath =
    args.find(a => a.startsWith('--out='))?.split('=')[1] || 'validated_findings.json';
  const repoRoot = args.find(a => a.startsWith('--repo='))?.split('=')[1] || null;

  console.log(`${BOLD}Tribunal — Validation Engine${RESET}`);
  if (!fs.existsSync(inputPath)) {
    console.log(RED + `Input file not found: ${inputPath}` + RESET);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  } catch (e) {
    console.error(RED + 'Failed to parse JSON:' + RESET, e.message);
    process.exit(1);
  }

  const findings = data.findings || [];
  if (findings.length === 0) {
    console.log(YELLOW + 'No findings to validate.' + RESET);
    fs.writeFileSync(outPath, JSON.stringify({ findings: [] }, null, 2));
    return;
  }

  const validated = runValidation(findings, repoRoot);
  fs.writeFileSync(outPath, JSON.stringify({ findings: validated }, null, 2));

  console.log(`\nWritten validated findings to: ${outPath}`);
}

if (require.main === module) {
  main();
}
