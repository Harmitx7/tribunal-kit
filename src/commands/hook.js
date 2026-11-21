'use strict';

Object.defineProperty(exports, '__esModule', { value: true });
exports.cmdHook = cmdHook;
exports.generateHookScript = generateHookScript;

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Generates the POSIX shell hook script with strict LF line endings.
 */
function generateHookScript() {
  const lines = [
    '#!/bin/sh',
    '# Supreme Court - Auto Learn on Push',
    'set -e',
    '',
    'echo "⚖️  Tribunal Supreme Court: Evolving Skills..."',
    'if command -v npx >/dev/null 2>&1; then',
    '  npx tribunal-kit learn --head || true',
    '  echo "✦ Synchronizing IDE bridges..."',
    '  npx tribunal-kit sync || true',
    'elif command -v tribunal-kit >/dev/null 2>&1; then',
    '  tribunal-kit learn --head || true',
    '  echo "✦ Synchronizing IDE bridges..."',
    '  tribunal-kit sync || true',
    'fi',
    '',
  ];
  return lines.join('\n');
}

function cmdHook(flags = {}) {
  const targetDir = flags.path ? path.resolve(flags.path) : process.cwd();
  const gitDir = path.join(targetDir, '.git');

  if (!fs.existsSync(gitDir)) {
    logger.err('Not a git repository. Cannot install git hooks here.');
    process.exit(1);
  }

  const hooksDir = path.join(gitDir, 'hooks');
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  const prePushPath = path.join(hooksDir, 'pre-push');

  if (flags.uninstall || flags.remove) {
    if (fs.existsSync(prePushPath)) {
      try {
        fs.unlinkSync(prePushPath);
        console.log();
        logger.log(`  ${logger.c('green', '✔')} Removed pre-push git hook.`);
        console.log();
      } catch (err) {
        logger.err(`Failed to remove pre-push hook: ${err.message}`);
        process.exit(1);
      }
    } else {
      console.log();
      logger.log(`  ${logger.c('yellow', '⚠')} No pre-push hook found at ${prePushPath}.`);
      console.log();
    }
    return;
  }

  const hookScript = generateHookScript();
  fs.writeFileSync(prePushPath, hookScript, { encoding: 'utf8', mode: 0o755 });

  // On non-Windows platforms, ensure executable bit is explicitly set
  if (process.platform !== 'win32') {
    try {
      fs.chmodSync(prePushPath, 0o755);
    } catch (chmodErr) {
      logger.warn(`Failed to set executable mode on git hook: ${chmodErr.message}`);
    }
  }

  console.log();
  logger.log(`  ${logger.c('green', '✔')} Installed pre-push git hook.`);
  logger.log(
    `  ${logger.c('gray', '▸')} Skill Evolution and IDE Sync will now run automatically every time you git push.`,
  );
  console.log();
}
