'use strict';

/**
 * cmdDeconstruct — Reverse-Engineer Live Web Elements into Production React Code
 *
 * Usage:
 *   tk deconstruct https://example.com --selector "button.primary"
 *   tk deconstruct http://localhost:3000 --selector "#pricing-card" --name PricingCard --output src/components/PricingCard.tsx
 */

const fs = require('fs');
const path = require('path');
const { deconstructElement } = require('../browser/synapse');
const { c } = require('../utils/logger');
const { banner } = require('../utils/helpers');

async function cmdDeconstruct(flags, processArgs, quiet = false) {
  const url = processArgs[3] || flags.url;
  const selector = flags.selector || processArgs[4];

  if (!url || !selector) {
    console.error(`  ${c('red', '✖ Error:')} Missing URL or selector. Usage: tk deconstruct <url> --selector "<css-selector>"`);
    process.exit(1);
  }

  if (!quiet && !flags.json) {
    banner(quiet);
    console.log(`  ${c('cyan', '⚡ Component Synapse Deconstructing:')} ${c('white', selector)} on ${c('gray', url)}...\n`);
  }

  try {
    const result = await deconstructElement(url, selector, flags);

    if (flags.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (flags.output) {
      const outPath = path.resolve(flags.output);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, result.code, 'utf8');
      console.log(`  ${c('green', '✔ Synthesized React component saved to:')} ${c('bold', outPath)}\n`);
    } else {
      console.log(c('gray', '────────────────── Synthesized React TSX Component ──────────────────'));
      console.log(result.code);
      console.log(c('gray', '─────────────────────────────────────────────────────────────────────'));
      console.log(`  ${c('green', '✔')} Extracted computed CSSOM and synthesized ${c('bold', result.componentName)}.\n`);
    }
  } catch (err) {
    console.error(`  ${c('red', '✖ Deconstruction failed:')} ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  cmdDeconstruct,
};
