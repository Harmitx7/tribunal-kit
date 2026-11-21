'use strict';

/**
 * cmdHeal — Runtime Sentinel Error Hunter and Fix Verifier
 *
 * Usage:
 *   tk heal http://localhost:3000
 *   tk heal http://localhost:5173 --verify
 *   tk heal http://localhost:3000 --json
 */

const sentinel = require('../browser/sentinel');
const { ensureBrowserAvailable } = require('../browser/discovery');
const { c } = require('../utils/logger');
const { banner, extractPositionalArgs } = require('../utils/helpers');

async function cmdHeal(flags = {}, processArgs = process.argv, quiet = false) {
  const positionals = extractPositionalArgs(processArgs, 'heal', ['--url']);
  let url = flags.url || positionals[0];

  if (!url) {
    url = 'http://localhost:3000';
    if (!quiet) {
      console.warn(
        `  ${c('yellow', '⚠ Warning:')} No target URL specified. Defaulting to ${c('bold', url)}. ` +
          `To target a different server, run 'tk heal <url>'.\n`,
      );
    }
  }

  try {
    ensureBrowserAvailable();
  } catch (browserErr) {
    console.error(`  ${c('red', '✖ Browser unavailable:')} ${browserErr.message}`);
    process.exit(1);
  }

  if (!quiet && !flags.json) {
    banner(quiet);
    console.log(
      `  ${c('cyan', '🛡 Runtime Sentinel:')} Scanning ${c('white', url)} for live runtime errors...\n`,
    );
  }

  try {
    if (flags.verify) {
      const verification = await sentinel.verifyRuntimeFix(url, flags);
      if (flags.json) {
        console.log(JSON.stringify(verification, null, 2));
        return;
      }

      if (verification.isFixed) {
        console.log(
          `  ${c('green', '✔ Verification Passed!')} Runtime errors cleared on ${c('bold', url)}.\n`,
        );
      } else {
        console.log(
          `  ${c('red', '✖ Verification Failed:')} ${verification.remainingIssues} issue(s) still remaining.\n`,
        );
      }
      return;
    }

    const report = await sentinel.captureRuntimeErrors(url, flags);

    if (flags.json) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    if (report.healthy) {
      console.log(
        `  ${c('green', '✔ Runtime Healthy:')} Zero uncaught exceptions or error overlays detected on ${c('bold', url)}.\n`,
      );
      return;
    }

    console.log(`  ${c('red', '✖ Runtime Errors Detected:')}\n`);

    if (report.overlay.hasOverlay) {
      console.log(
        `    ${c('red', '• Dev Error Overlay Active:')} ${c('yellow', report.overlay.overlayType || 'Generic Framework Overlay')}`,
      );
      if (report.overlay.bodyText) {
        console.log(`      ${c('gray', report.overlay.bodyText.slice(0, 160))}...\n`);
      }
    }

    for (const exc of report.exceptions) {
      console.log(`    ${c('red', '• Uncaught Exception:')} ${c('bold', exc.text)}`);
      if (exc.locations && exc.locations.length > 0) {
        for (const loc of exc.locations) {
          const locStr = loc.existsLocally
            ? `${c('green', loc.filePath)}:${loc.line}:${loc.column}`
            : `${c('gray', loc.rawUrl)}`;
          console.log(`      ${c('cyan', '→ Source:')} ${locStr}`);
        }
      }
      console.log();
    }

    for (const cerr of report.consoleErrors) {
      console.log(`    ${c('yellow', '• Console Error:')} ${cerr.text}`);
      if (cerr.locations && cerr.locations.length > 0) {
        for (const loc of cerr.locations) {
          const locStr = loc.existsLocally
            ? `${c('green', loc.filePath)}:${loc.line}:${loc.column}`
            : `${c('gray', loc.rawUrl)}`;
          console.log(`      ${c('cyan', '→ Source:')} ${locStr}`);
        }
      }
      console.log();
    }

    console.log(`  ${c('yellow', 'ℹ Remedy Guidance:')}`);
    console.log(`    1. Inspect the source file(s) listed above.`);
    console.log(`    2. Apply targeted fix.`);
    console.log(`    3. Run ${c('bold', `tk heal ${url} --verify`)} to confirm resolution.\n`);
  } catch (err) {
    if (
      err.message &&
      (err.message.includes('ERR_CONNECTION_REFUSED') ||
        err.message.includes('ECONNREFUSED') ||
        err.message.includes('net::ERR_NAME_NOT_RESOLVED'))
    ) {
      console.error(
        `  ${c('red', '✖ Connection refused:')} Nothing is listening at ${c('bold', url)}.\n` +
          `  Ensure your target development server is running (e.g. 'npm run dev') before running 'tk heal'.`,
      );
    } else {
      console.error(`  ${c('red', '✖ Sentinel scan failed:')} ${err.message}`);
    }
    process.exit(1);
  }
}

module.exports = {
  cmdHeal,
};
