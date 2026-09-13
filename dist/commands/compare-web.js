'use strict';

/**
 * cmdCompareWeb — Visual Regression Comparison Command
 *
 * Usage:
 *   tk compare-web http://localhost:3000 https://example.com
 *   tk compare-web https://staging.site.com https://prod.site.com --max-diff 2.0
 */

const { compareURLs } = require('../browser');
const { c } = require('../utils/logger');
const { banner } = require('../utils/helpers');

async function cmdCompareWeb(flags, processArgs, quiet = false) {
  const url1 = processArgs[3] || flags.url1;
  const url2 = processArgs[4] || flags.url2;

  if (!url1 || !url2) {
    console.error(`  ${c('red', '✖ Error:')} Missing target URLs. Usage: tk compare-web <url1> <url2>`);
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

    console.log(`  Visual Mismatch: ${c(diffColor, `${result.diffPercentage}%`)} (Allowed Threshold: ${maxDiff}%)`);
    console.log(`  Compared Bytes:  ${result.totalPixelsCompared}`);

    if (result.passed) {
      console.log(`\n  ${c('green', '✔ Visual comparison passed')} — Difference is within acceptable threshold.\n`);
      process.exit(0);
    } else {
      console.log(`\n  ${c('red', '✖ Visual regression detected!')} Diff ${result.diffPercentage}% exceeds max allowed ${maxDiff}%.\n`);
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
