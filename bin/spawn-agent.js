'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Validates that an executable name does not contain shell injection characters.
 */
function validateExecutableName(cmd) {
  if (!cmd || typeof cmd !== 'string') {
    throw new Error('Security Violation: Executable command must be a non-empty string.');
  }
  if (/[\0\r\n;&|<>`$]/.test(cmd)) {
    throw new Error(`Security Violation: Disallowed metacharacters in executable command: "${cmd}".`);
  }
  return cmd.trim();
}

/**
 * Validates argument list to prevent argument injection and shell escapes.
 */
function validateProcessArgs(args, isBatch = false) {
  if (!Array.isArray(args)) {
    throw new Error('Security Violation: Arguments must be an array.');
  }
  for (const arg of args) {
    if (typeof arg !== 'string') {
      throw new Error(`Security Violation: Argument must be a string, got ${typeof arg}.`);
    }
    if (arg.includes('\0') || arg.includes('\r') || arg.includes('\n')) {
      throw new Error('Security Violation: Control characters / null bytes detected in arguments.');
    }
    // When executing batch scripts on Windows, cmd.exe can interpret special characters
    // Double quotes are rejected to prevent BatBadBut (CVE-2024-24576) argument delimiter breakout
    if (isBatch && /[&|<>^%"]/.test(arg)) {
      throw new Error(`Security Violation: Argument "${arg}" contains dangerous cmd.exe metacharacters.`);
    }

  }
  return args;
}

/**
 * Resolves an executable on Windows to determine if it is a binary (.exe) or batch (.cmd/.bat).
 */
function resolveExecutable(cmd) {
  const sanitized = validateExecutableName(cmd);
  if (process.platform !== 'win32') {
    return { command: sanitized, isBatch: false, needsShell: false };
  }

  const ext = path.extname(sanitized).toLowerCase();
  if (['.cmd', '.bat'].includes(ext)) {
    return { command: sanitized, isBatch: true, needsShell: true };
  }
  if (['.exe', '.com'].includes(ext)) {
    return { command: sanitized, isBatch: false, needsShell: false };
  }

  const pathext = (process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD').split(';');
  const pathDirs = (process.env.PATH || '').split(path.delimiter);

  // If path is specified
  if (sanitized.includes(path.sep) || sanitized.includes('/')) {
    for (const pe of pathext) {
      const candidate = sanitized + pe.toLowerCase();
      if (fs.existsSync(candidate)) {
        const isBatch = ['.cmd', '.bat'].includes(pe.toLowerCase());
        return { command: candidate, isBatch, needsShell: isBatch };
      }
    }
    return { command: sanitized, isBatch: false, needsShell: false };
  }

  for (const dir of pathDirs) {
    for (const pe of pathext) {
      const candidate = path.join(dir, sanitized + pe.toLowerCase());
      if (fs.existsSync(candidate)) {
        const isBatch = ['.cmd', '.bat'].includes(pe.toLowerCase());
        return { command: candidate, isBatch, needsShell: isBatch };
      }
      const candidateUpper = path.join(dir, sanitized + pe.toUpperCase());
      if (fs.existsSync(candidateUpper)) {
        const isBatch = ['.cmd', '.bat'].includes(pe.toLowerCase());
        return { command: candidateUpper, isBatch, needsShell: isBatch };
      }
    }
  }

  return { command: sanitized, isBatch: false, needsShell: false };
}

function spawnAgent(agentCommand, proxyPort) {
  const proxyUrl = `http://localhost:${proxyPort}`;

  let command;
  let args;

  if (Array.isArray(agentCommand)) {
    if (agentCommand.length === 0) {
      throw new Error('Security Violation: Empty command array provided.');
    }
    command = agentCommand[0];
    args = agentCommand.slice(1);
  } else if (typeof agentCommand === 'string') {
    const parts = agentCommand.trim().split(/\s+/);
    command = parts.shift();
    args = parts;
  } else {
    throw new Error('Security Violation: Invalid agentCommand type.');
  }

  const resolved = resolveExecutable(command);
  validateProcessArgs(args, resolved.isBatch);

  console.log(`[Tribunal Proxy] Launching ${resolved.command} with proxy ${proxyUrl}`);

  const env = {
    ...process.env,
    ANTHROPIC_BASE_URL: proxyUrl,
  };

  const child = spawn(resolved.command, args, {
    stdio: 'inherit',
    env,
    shell: resolved.needsShell,
  });

  child.on('close', (code, signal) => {
    console.log(`[Tribunal Proxy] ${resolved.command} exited with code ${code !== null ? code : signal}`);
    if (code !== null) {
      process.exit(code);
    } else {
      process.exit(signal ? 128 : 1);
    }
  });

  child.on('error', err => {
    console.error(`[Tribunal Proxy] Failed to start ${resolved.command}:`, err);
    process.exit(1);
  });

  return child;
}

module.exports = {
  spawnAgent,
  resolveExecutable,
  validateExecutableName,
  validateProcessArgs,
};
