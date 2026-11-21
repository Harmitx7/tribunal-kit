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
const { ensureBrowserAvailable } = require('../browser/discovery');
const { c } = require('../utils/logger');
const { banner, extractPositionalArgs } = require('../utils/helpers');

function validateOutputPath(outputPath, cwd = process.cwd()) {
  if (!outputPath || typeof outputPath !== 'string') {
    throw new Error('Security Violation: Invalid output path specified.');
  }
  if (outputPath.includes('\0')) {
    throw new Error('Security Violation: Null byte detected in output path.');
  }

  const resolvedCwd = path.resolve(cwd);
  const resolvedTarget = path.resolve(resolvedCwd, outputPath);

  const root = path.parse(resolvedTarget).root;
  if (resolvedTarget === root) {
    throw new Error('Security Violation: Writing directly to filesystem root is forbidden.');
  }

  const rel = path.relative(resolvedCwd, resolvedTarget);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(
      `Security Violation: Path traversal detected. Output target "${outputPath}" escapes allowed workspace root "${resolvedCwd}".`,
    );
  }

  if (fs.existsSync(resolvedTarget)) {
    try {
      const realTarget = fs.realpathSync.native
        ? fs.realpathSync.native(resolvedTarget)
        : fs.realpathSync(resolvedTarget);
      const realCwd = fs.realpathSync.native
        ? fs.realpathSync.native(resolvedCwd)
        : fs.realpathSync(resolvedCwd);
      const realRel = path.relative(realCwd, realTarget);
      if (realRel.startsWith('..') || path.isAbsolute(realRel)) {
        throw new Error(
          `Security Violation: Symlink path traversal detected. Target "${outputPath}" escapes workspace root.`,
        );
      }
    } catch (e) {
      if (e.message && e.message.startsWith('Security Violation')) throw e;
    }
  }

  return resolvedTarget;
}

async function cmdDeconstruct(flags = {}, processArgs = process.argv, quiet = false) {
  const positionals = extractPositionalArgs(processArgs, 'deconstruct', [
    '--selector',
    '-s',
    '--name',
    '-n',
    '--output',
    '-o',
    '--url',
  ]);
  const url = flags.url || positionals[0];
  const selector = flags.selector || positionals[1];

  if (!url || !selector) {
    console.error(
      `  ${c('red', '✖ Error:')} Missing URL or selector. Usage: tk deconstruct <url> --selector "<css-selector>"`,
    );
    process.exit(1);
  }

  try {
    ensureBrowserAvailable();
  } catch (browserErr) {
    console.error(`  ${c('red', '✖ Browser unavailable:')} ${browserErr.message}`);
    process.exit(1);
  }

  let validatedOutPath = null;
  if (flags.output) {
    try {
      validatedOutPath = validateOutputPath(flags.output);
    } catch (err) {
      console.error(`  ${c('red', '✖ Output validation error:')} ${err.message}`);
      process.exit(1);
    }
  }

  if (!quiet && !flags.json) {
    banner(quiet);
    console.log(
      `  ${c('cyan', '⚡ Component Synapse Deconstructing:')} ${c('white', selector)} on ${c('gray', url)}...\n`,
    );
  }

  try {
    const result = await deconstructElement(url, selector, flags);

    if (flags.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (validatedOutPath) {
      fs.mkdirSync(path.dirname(validatedOutPath), { recursive: true });
      fs.writeFileSync(validatedOutPath, result.code, 'utf8');
      console.log(
        `  ${c('green', '✔ Synthesized React component saved to:')} ${c('bold', validatedOutPath)}\n`,
      );
    } else {
      console.log(
        c('gray', '────────────────── Synthesized React TSX Component ──────────────────'),
      );
      console.log(result.code);
      console.log(
        c('gray', '─────────────────────────────────────────────────────────────────────'),
      );
      console.log(
        `  ${c('green', '✔')} Extracted computed CSSOM and synthesized ${c('bold', result.componentName)}.\n`,
      );
    }
  } catch (err) {
    console.error(`  ${c('red', '✖ Deconstruction failed:')} ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  cmdDeconstruct,
  validateOutputPath,
};
