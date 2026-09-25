#!/usr/bin/env node
/**
 * harness_manager.js
 * CLI entry point for the Harness Manager. 
 * Replaces direct `node .agent/scripts/...` calls with:
 * `node .agent/scripts/harness_manager.js --syscall <name> [...args]`
 */

'use strict';

const { appendEvent } = require('./session_logger');
const { executeSyscall } = require('./syscall_registry');

function main() {
  const args = process.argv.slice(2);
  const syscallIndex = args.indexOf('--syscall');
  
  if (syscallIndex === -1 || syscallIndex === args.length - 1) {
    console.error("Usage: node harness_manager.js --syscall <name> [...args]");
    process.exit(1);
  }

  const syscall = args[syscallIndex + 1];
  const syscallArgs = args.filter((_, i) => i !== syscallIndex && i !== syscallIndex + 1);

  // 1. Log ToolRequested
  const eventId = appendEvent('ToolRequested', {
    tool: syscall,
    args: syscallArgs
  }, 'harness-manager');

  // 2. Execute Safely
  const result = executeSyscall(syscall, syscallArgs);

  // 3. Log ToolCompleted or ErrorEncountered
  if (result.exitCode === 0) {
    appendEvent('ToolCompleted', {
      exitCode: result.exitCode,
      stdout: result.stdout,
      requestEventId: eventId
    }, 'harness-manager');
    console.log(result.stdout);
  } else {
    appendEvent('ErrorEncountered', {
      exitCode: result.exitCode,
      message: result.stderr,
      stdout: result.stdout,
      requestEventId: eventId
    }, 'harness-manager');
    if (result.stderr) console.error(result.stderr);
    if (result.stdout) console.log(result.stdout);
    process.exit(result.exitCode);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
