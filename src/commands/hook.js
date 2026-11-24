'use strict';

Object.defineProperty(exports, '__esModule', { value: true });
exports.cmdHook = cmdHook;
exports.generateHookScript = generateHookScript;
exports.generatePreCommitHookScript = generatePreCommitHookScript;

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Generates the POSIX shell pre-commit hook script with strict LF line endings.
 */
function generatePreCommitHookScript() {
  const lines = [
    '#!/bin/sh',
    '# Tribunal Kit — Pre-Commit Mirror & Skill Integrity Guard',
    'set -e',
    '',
    'echo "⚖️  Verifying Tribunal Skills & Workspace Mirror Parity..."',
    'if [ -f "scripts/sync-skills.js" ]; then',
    '  node scripts/sync-skills.js --check',
    'elif [ -f "tribunal-kit/scripts/sync-skills.js" ]; then',
    '  node tribunal-kit/scripts/sync-skills.js --check',
    'fi',
    '',
  ];
  return lines.join('\n');
}

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
  const preCommitPath = path.join(hooksDir, 'pre-commit');

  if (flags.uninstall || flags.remove) {
    let removedAny = false;
    if (fs.existsSync(prePushPath)) {
      try {
        fs.unlinkSync(prePushPath);
        logger.log(`  ${logger.c('green', '✔')} Removed pre-push git hook.`);
        removedAny = true;
      } catch (err) {
        logger.err(`Failed to remove pre-push hook: ${err.message}`);
      }
    }
    if (fs.existsSync(preCommitPath)) {
      try {
        fs.unlinkSync(preCommitPath);
        logger.log(`  ${logger.c('green', '✔')} Removed pre-commit git hook.`);
        removedAny = true;
      } catch (err) {
        logger.err(`Failed to remove pre-commit hook: ${err.message}`);
      }
    }
    if (!removedAny) {
      logger.log(`  ${logger.c('yellow', '⚠')} No Tribunal git hooks found at ${hooksDir}.`);
    }
    console.log();
    return;
  }

  const hookScript = generateHookScript();
  fs.writeFileSync(prePushPath, hookScript, { encoding: 'utf8', mode: 0o755 });

  const preCommitScript = generatePreCommitHookScript();
  fs.writeFileSync(preCommitPath, preCommitScript, { encoding: 'utf8', mode: 0o755 });

  // On non-Windows platforms, ensure executable bit is explicitly set
  if (process.platform !== 'win32') {
    try {
      fs.chmodSync(prePushPath, 0o755);
      fs.chmodSync(preCommitPath, 0o755);
    } catch (chmodErr) {
      logger.warn(`Failed to set executable mode on git hook: ${chmodErr.message}`);
    }
  }

  console.log();
  logger.log(`  ${logger.c('green', '✔')} Installed pre-commit & pre-push git hooks.`);
  logger.log(`  ${logger.c('gray', '▸')} Skill Mirror Parity check runs before each commit.`);
  logger.log(
    `  ${logger.c('gray', '▸')} Skill Evolution and IDE Sync run automatically every time you git push.`,
  );
  console.log();
}
