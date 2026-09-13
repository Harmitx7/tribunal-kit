#!/usr/bin/env node
/**
 * browser_audit.js — Live Browser Quality, Accessibility & Performance Auditor
 *
 * Runs browser-level audits capturing console errors, broken assets,
 * WCAG accessibility violations, and Core Web Vitals.
 *
 * Usage:
 *   node .agent/scripts/browser_audit.js http://localhost:3000
 *   node .agent/scripts/browser_audit.js https://example.com --json
 */

'use strict';

const { GREEN, YELLOW, RED, BOLD, RESET, banner, timer, formatMs } = require('./_colors');

async function main() {
  const args = process.argv.slice(2);
  const isJson = args.includes('--json');
  const url = args.find(a => !a.startsWith('--'));

  if (!url) {
    if (isJson) {
      console.log(JSON.stringify({ error: 'Missing target URL' }));
    } else {
      console.error(`  ${RED}✖ Error:${RESET} Missing target URL. Usage: node .agent/scripts/browser_audit.js <url>`);
    }
    process.exit(1);
  }

  const elapsed = timer();
  if (!isJson) {
    console.log(banner('browser_audit.js', { Target: url }));
  }

  try {
    const { auditURL } = require('../../dist/browser');
    const report = await auditURL(url);

    if (isJson) {
      console.log(JSON.stringify(report, null, 2));
      process.exit(report.summary.passed ? 0 : 1);
    }

    console.log(`  ${BOLD}Target:${RESET}    ${report.url}`);
    console.log(`  ${BOLD}Title:${RESET}     ${report.page.title || '(No title)'}`);
    console.log(`  ${BOLD}Duration:${RESET}  ${formatMs(report.durationMs)}\n`);

    // Scores
    const a11yCol = report.scores.accessibility >= 80 ? GREEN : report.scores.accessibility >= 60 ? YELLOW : RED;
    const secCol = report.scores.security >= 80 ? GREEN : report.scores.security >= 60 ? YELLOW : RED;

    console.log(`  ${BOLD}Audit Scores:${RESET}`);
    console.log(`    Accessibility:   ${a11yCol}${report.scores.accessibility}/100${RESET}`);
    console.log(`    Security:        ${secCol}${report.scores.security}/100${RESET}\n`);

    if (report.violations.accessibility.length > 0) {
      console.log(`  ${YELLOW}Accessibility Findings:${RESET}`);
      for (const a of report.violations.accessibility) {
        console.log(`    ${YELLOW}⚠${RESET} ${a.message}`);
      }
      console.log();
    }

    if (report.violations.consoleErrors.length > 0) {
      console.log(`  ${RED}Console Errors:${RESET}`);
      for (const err of report.violations.consoleErrors) {
        console.log(`    ${RED}✖${RESET} [${err.level}] ${err.text}`);
      }
      console.log();
    }

    if (report.summary.passed) {
      console.log(`  ${GREEN}${BOLD}✔ Browser audit passed in ${elapsed()} — No critical violations found.${RESET}\n`);
      process.exit(0);
    } else {
      console.log(`  ${YELLOW}${BOLD}⚠ Browser audit completed in ${elapsed()} with ${report.summary.totalIssues} issue(s).${RESET}\n`);
      process.exit(1);
    }
  } catch (err) {
    if (isJson) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.error(`  ${RED}✖ Browser audit execution failed:${RESET} ${err.message}\n`);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {};
