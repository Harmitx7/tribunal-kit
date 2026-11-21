'use strict';

/**
 * cmdCompareWeb — Visual Regression Comparison Command
 *
 * Usage:
 *   tk compare-web http://localhost:3000 https://example.com
 *   tk compare-web https://staging.site.com https://prod.site.com --max-diff 2.0
 */

const { compareURLs } = require('../browser');
const { ensureBrowserAvailable } = require('../browser/discovery');
const { c } = require('../utils/logger');
const { banner, extractPositionalArgs } = require('../utils/helpers');

async function cmdCompareWeb(flags = {}, processArgs = process.argv, quiet = false) {
  const positionals = extractPositionalArgs(processArgs, 'compare-web', [
    '--max-diff',
    '--maxDiff',
    '--width',
    '--height',
    '--url1',
    '--url2',
  ]);
  const url1 = flags.url1 || positionals[0];
  const url2 = flags.url2 || positionals[1];

  if (!url1 || !url2) {
    console.error(
      `  ${c('red', '✖ Error:')} Missing target URLs. Usage: tk compare-web <url1> <url2>`,
    );
    process.exit(1);
  }

  try {
    ensureBrowserAvailable();
  } catch (browserErr) {
    console.error(`  ${c('red', '✖ Browser unavailable:')} ${browserErr.message}`);
    process.exit(1);
  }

  const maxDiff = flags.maxDiff ? parseFloat(flags.maxDiff) : 1.0;

  if (!quiet && !flags.json) {
    banner(quiet);
    console.log(`  ${c('cyan', '📸 Comparing Visual Viewports:')}`);
    console.log(`    URL 1: ${c('white', url1)}`);
    console.log(`    URL 2: ${c('white', url2)}\n`);
  }

  try {
    const result = await compareURLs(url1, url2, { maxDiffPercent: maxDiff });

    if (flags.json) {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.passed ? 0 : 1);
    }

    const diffColor = result.passed ? 'green' : 'red';

    console.log(
      `  Visual Mismatch: ${c(diffColor, `${result.diffPercentage}%`)} (Allowed Threshold: ${maxDiff}%)`,
    );
    console.log(`  Compared Bytes:  ${result.totalPixelsCompared}`);

    if (result.passed) {
      console.log(
        `\n  ${c('green', '✔ Visual comparison passed')} — Difference is within acceptable threshold.\n`,
      );
      process.exit(0);
    } else {
      console.log(
        `\n  ${c('red', '✖ Visual regression detected!')} Diff ${result.diffPercentage}% exceeds max allowed ${maxDiff}%.\n`,
      );
      process.exit(1);
    }
  } catch (err) {
    console.error(`  ${c('red', '✖ Comparison failed:')} ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  cmdCompareWeb,
};
