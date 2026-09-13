'use strict';

/**
 * cmdBrowse — Token-Efficient Page Navigation & Semantic Extractor
 *
 * Usage:
 *   tk browse https://example.com
 *   tk browse http://localhost:3000 --json
 */

const { browse } = require('../browser');
const { c } = require('../utils/logger');
const { banner } = require('../utils/helpers');

async function cmdBrowse(flags, processArgs, quiet = false) {
  const url = processArgs[3] || flags.url;

  if (!url) {
    console.error(`  ${c('red', '✖ Error:')} Missing target URL. Usage: tk browse <url>`);
    process.exit(1);
  }

  if (!quiet && !flags.json) {
    banner(quiet);
    console.log(`  ${c('cyan', '🌐 Browsing:')} ${c('white', url)} (extracting semantic tokens)...\n`);
  }

  try {
    const result = await browse(url);

    if (flags.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (result.threatLevel !== 'clean') {
      console.log(`  ${c('yellow', '⚠ IDPI Warning:')} Potential prompt injection detected (${result.threatLevel}):`);
      for (const t of result.threats) {
        console.log(`    ${c('red', '•')} ${t}`);
      }
      console.log();
    }

    console.log(c('gray', '─────────────────────────────────────────────────────────────'));
    console.log(result.markdown);
    console.log(c('gray', '─────────────────────────────────────────────────────────────'));
    console.log(`  ${c('green', '✔')} Extracted page content (${Buffer.byteLength(result.markdown, 'utf8')} bytes, < 1.5k tokens).\n`);
  } catch (err) {
    console.error(`  ${c('red', '✖ Browser error:')} ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  cmdBrowse,
};
