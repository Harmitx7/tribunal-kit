'use strict';

/**
 * cmdAuditWeb — Live Web Quality, Accessibility & Performance Auditor
 *
 * Usage:
 *   tk audit-web https://example.com
 *   tk audit-web http://localhost:3000 --json
 */

const fs = require('fs');
const path = require('path');
const { auditURL } = require('../browser');
const { codifyAuditViolations } = require('../browser/case_bridge');
const { c } = require('../utils/logger');
const { banner } = require('../utils/helpers');

async function cmdAuditWeb(flags, processArgs, quiet = false) {
  const url = processArgs[3] || flags.url;

  if (!url) {
    console.error(`  ${c('red', '✖ Error:')} Missing target URL. Usage: tk audit-web <url>`);
    process.exit(1);
  }

  if (!quiet && !flags.json) {
    banner(quiet);
    console.log(`  ${c('cyan', '🔍 Auditing Web Target:')} ${c('white', url)}...\n`);
  }

  try {
    const report = await auditURL(url, flags);

    let codified = null;
    if (flags.codify || flags['codify-cases'] || flags.c) {
      codified = codifyAuditViolations(report, flags);
    }

    if (flags.json) {
      if (codified) {
        report.codified = codified;
      }
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    if (flags.output) {
      const outDir = path.resolve(flags.output);
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, 'audit-report.json'), JSON.stringify(report, null, 2));
      console.log(`  ${c('gray', 'Report written to:')} ${path.join(outDir, 'audit-report.json')}`);
    }

    console.log(`  ${c('bold', 'Title:')} ${report.page.title || '(No title)'}`);
    console.log(`  ${c('bold', 'Duration:')} ${report.durationMs}ms\n`);

    // Scores
    const a11yColor = report.scores.accessibility >= 80 ? 'green' : report.scores.accessibility >= 60 ? 'yellow' : 'red';
    const secColor = report.scores.security >= 80 ? 'green' : report.scores.security >= 60 ? 'yellow' : 'red';

    console.log(`  ${c('bold', 'Scores:')}`);
    console.log(`    Accessibility:   ${c(a11yColor, `${report.scores.accessibility}/100`)}`);
    console.log(`    Security Headers:${c(secColor, `${report.scores.security}/100`)}`);
    console.log();

    // Issues
    if (report.violations.accessibility.length > 0) {
      console.log(`  ${c('yellow', 'Accessibility Issues:')}`);
      for (const iss of report.violations.accessibility) {
        console.log(`    ${c('yellow', '⚠')} ${iss.message}`);
      }
      console.log();
    }

    if (report.violations.security.length > 0) {
      console.log(`  ${c('yellow', 'Security Advisory:')}`);
      for (const sec of report.violations.security) {
        console.log(`    ${c('yellow', '⚠')} ${sec}`);
      }
      console.log();
    }

    if (report.violations.consoleErrors.length > 0) {
      console.log(`  ${c('red', 'Console Errors:')}`);
      for (const err of report.violations.consoleErrors) {
        console.log(`    ${c('red', '✖')} [${err.level}] ${err.text}`);
      }
      console.log();
    }

    if (report.summary.passed) {
      console.log(`  ${c('green', '✔ Web audit passed')} — Accessibility >= 80 and zero console errors.\n`);
    } else {
      console.log(`  ${c('yellow', '⚠ Web audit completed')} with ${report.summary.totalIssues} issue(s) identified.\n`);
    }

    if (codified) {
      if (codified.codifiedCount > 0) {
        console.log(`  ${c('green', '✔')} Case Law: Codified ${c('bold', String(codified.codifiedCount))} violation(s) into binding precedents in ${c('cyan', '.agent/history/case-law/')}.\n`);
      } else {
        console.log(`  ${c('gray', 'ℹ')} Case Law: No new violations to codify (or all matches already exist in precedents).\n`);
      }
    }
  } catch (err) {
    console.error(`  ${c('red', '✖ Audit failed:')} ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  cmdAuditWeb,
};
