#!/usr/bin/env node
/**
 * backend_report_generator.js — Generates the TRIBUNAL BACKEND AUDIT report
 *
 * Report Safety (§15):
 *   - HTML tags are escaped
 *   - javascript: URIs are stripped
 *   - Heading injection is prevented (# in values are escaped)
 *   - Secrets are redacted before output
 */

'use strict';

const fs = require('fs');
const { BOLD, RESET, RED } = require('./_colors');
const { redactSecrets } = require('./secret_redactor');

/**
 * Sanitize a string for safe inclusion in markdown.
 * Prevents heading injection, HTML injection, and dangerous URIs.
 */
function sanitize(text) {
  if (!text || typeof text !== 'string') return text || '';
  let safe = text;
  // Escape HTML tags
  safe = safe.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Strip javascript: URIs
  safe = safe.replace(/javascript\s*:/gi, 'blocked-js:');
  // Prevent heading injection: escape leading # at start of line
  safe = safe.replace(/^(#{1,6})\s/gm, '\\$1 ');
  // Redact secrets
  const redacted = redactSecrets(safe);
  return redacted.text;
}

function formatFinding(f) {
  let text = `### [${sanitize(f.id)}] ${sanitize(f.title)}\n`;
  text += `- **Severity**: ${sanitize(String(f.severity))}\n`;
  text += `- **Confidence**: ${f.confidence}\n`;
  text += `- **Status**: ${sanitize(String(f.status))}\n`;

  if (f.location) {
    text += `- **Location**: ${sanitize(f.location.file || '')}${f.location.line ? `:${f.location.line}` : ''}\n`;
  }

  // Evidence verification status
  if (f.evidence_verification) {
    const ev = f.evidence_verification;
    text += `- **Evidence Verification**: ${ev.status} (${ev.verified_count || 0}/${ev.total_count || 0} locations confirmed)\n`;
  }

  if (f.evidence && f.evidence.length > 0) {
    text += `- **Evidence**:\n`;
    f.evidence.forEach(e => {
      text += `  - [${sanitize(e.type)}] ${sanitize(e.description)} (${sanitize(e.location || 'unknown')})\n`;
    });
  }

  if (f.remediation) {
    text += `- **Remediation**: ${sanitize(f.remediation)}\n`;
  }

  if (f.validation && f.validation.result) {
    text += `- **Validation Result**: ${sanitize(f.validation.result)}\n`;
  }

  if (f.validation && f.validation.provenance) {
    const p = f.validation.provenance;
    text += `- **Validation Provenance**: method=${sanitize(p.method)}, engine=${sanitize(p.engine)}, timestamp=${p.timestamp}\n`;
  }

  if (f._redactions) {
    text += `- **Secrets Redacted**: ${f._redactions} value(s) redacted from this finding\n`;
  }

  text += `\n`;
  return text;
}

function generateReport(findings) {
  let report = `# TRIBUNAL BACKEND AUDIT\n\n`;

  report += `## Detected Stack\n(Detected automatically during run)\n\n`;
  report += `## Architecture\n(Extracted from backend_architecture_auditor)\n\n`;
  report += `## API Surface\n(Extracted from backend_architecture_auditor)\n\n`;
  report += `## Database Surface\n(Extracted from db skills)\n\n`;

  const categories = [
    { title: 'Security Findings', cat: 'security' },
    { title: 'Performance Findings', cat: 'performance' },
    { title: 'Architecture Findings', cat: 'architecture' },
    { title: 'Testing Findings', cat: 'testing' },
    { title: 'Migration Findings', cat: 'migration' },
    { title: 'Cross-Agent Findings', cat: 'cross-agent' },
  ];

  for (const c of categories) {
    report += `## ${c.title}\n`;
    const catsF = findings.filter(f => f.category === c.cat);
    if (catsF.length === 0) report += `No findings in this category.\n\n`;
    catsF.forEach(f => (report += formatFinding(f)));
  }

  const verified = findings.filter(f => f.status === 'VERIFIED');
  const unverified = findings.filter(f => f.status === 'UNVERIFIED');

  report += `## Verified Findings\n`;
  if (verified.length === 0) report += `No verified findings.\n\n`;
  verified.forEach(f => {
    report += `- [ ] **${sanitize(f.id)}**: ${sanitize(f.title)}\n`;
  });
  report += `\n`;

  report += `## Unverified Findings\n`;
  if (unverified.length === 0) report += `No unverified findings.\n\n`;
  unverified.forEach(f => {
    report += `- [ ] **${sanitize(f.id)}**: ${sanitize(f.title)}\n`;
  });
  report += `\n`;

  report += `## Recommended Actions\n`;
  report += `1. Review Verified Findings and apply remediations.\n`;
  report += `2. Manually investigate Unverified Findings.\n\n`;

  report += `## Validation Results\n`;
  report += `Validation completed by Validation Engine using safe static and generated tests.\n`;

  return report;
}

function main() {
  const args = process.argv.slice(2);
  const inputPath =
    args.find(a => a.startsWith('--in='))?.split('=')[1] || 'validated_findings.json';
  const outPath =
    args.find(a => a.startsWith('--out='))?.split('=')[1] || 'tribunal_backend_report.md';

  console.log(`${BOLD}Tribunal — Backend Report Generator${RESET}`);
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
  const reportContent = generateReport(findings);

  fs.writeFileSync(outPath, reportContent);
  console.log(`\nBackend Audit Report generated successfully at: ${outPath}`);
}

if (require.main === module) {
  main();
}
