'use strict';

/**
 * execution_safety_engine.js — Process Execution & Command Sink Safety Auditor
 * =============================================================================
 * Domain: AI Agent Security & Governance (ai-agent-security-governance)
 *
 * Enforces process execution safeguards:
 * 1. Prohibits dangerous shell chaining and command substitution (| ; && || ` $(...))
 * 2. Blocks destructive disk and environment modification commands (rm -rf, dd, format, LD_PRELOAD)
 * 3. Enforces filesystem containment using boundary.js assertWithinRoot
 * 4. Verifies dry-run scope fidelity before destructive actions
 */

const { assertWithinRoot } = require('./boundary');

// Dangerous shell operators that allow command injection or arbitrary chaining
const DANGEROUS_SHELL_OPERATORS = [
  { pattern: /;/, label: 'Semicolon command chaining (;)' },
  { pattern: /&&/, label: 'Logical AND command chaining (&&)' },
  { pattern: /\|\|/, label: 'Logical OR command chaining (||)' },
  { pattern: /\|/, label: 'Pipe operator (|)' },
  { pattern: /&(?![0-9])/, label: 'Background execution (&)' },
  { pattern: /`[^`]+`/, label: 'Backtick command substitution (`...`)' },
  { pattern: /\$\([^\)]+\)/, label: 'Dollar parenthesis command substitution ($(..))' },
  { pattern: /\b(?:eval|exec)\b/i, label: 'Dynamic execution primitives (eval/exec)' },
];

// Destructive command signatures
const DESTRUCTIVE_COMMAND_PATTERNS = [
  { pattern: /\brm\s+-(?:r|f|rf|fr)\s+(?:\/|\.\.|\*|[a-zA-Z]:\\)/i, label: 'Destructive recursive root/wildcard removal (rm -rf /)' },
  { pattern: /\b(?:mkfs|format\s+[a-zA-Z]:|fdisk|dd\s+if=)/i, label: 'Raw filesystem formatting / disk overwriting' },
  { pattern: /\b(?:chmod|chown)\s+(?:-R\s+)?777\b/i, label: 'Insecure permissive file permissions (777)' },
  { pattern: /curl\s+[^\n|]+\|\s*(?:bash|sh|zsh|powershell|pwsh)/i, label: 'Unchecked curl-to-shell piping' },
  { pattern: /\b(?:shutdown|reboot|poweroff|init\s+0)\b/i, label: 'System reboot/shutdown commands' },
  { pattern: /:(?:\(\)\s*\{[\s\S]*?\};:)/i, label: 'Fork bomb signature' },
];

// Dangerous environment overrides
const DANGEROUS_ENV_OVERRIDES = [
  { pattern: /\b(?:LD_PRELOAD|LD_LIBRARY_PATH|NODE_OPTIONS|PYTHONPATH)\s*=/i, label: 'Dynamic linker/runtime hijack variable override' },
];

/**
 * Audits a proposed shell command line for injection operators and destructive patterns.
 *
 * @param {string} commandLine - The raw command to inspect
 * @param {object} [options]
 * @param {boolean} [options.allowPipes=false] - Explicitly allow piping if controlled
 * @param {boolean} [options.allowChaining=false] - Explicitly allow chaining if controlled
 * @returns {object} Audit result with safety verdict and violations
 */
function auditCommandSafety(commandLine, options = {}) {
  if (!commandLine || typeof commandLine !== 'string') {
    return {
      isSafe: true,
      command: '',
      violations: [],
    };
  }

  const trimmed = commandLine.trim();
  const violations = [];

  // 1. Check for dangerous chaining operators
  for (const op of DANGEROUS_SHELL_OPERATORS) {
    if (op.label.includes('Pipe') && options.allowPipes === true) continue;
    if (op.label.includes('chaining') && options.allowChaining === true) continue;

    if (op.pattern.test(trimmed)) {
      violations.push({
        type: 'DANGEROUS_SHELL_OPERATOR',
        severity: 'CRITICAL',
        issue: op.label,
        evidence: trimmed,
      });
    }
  }

  // 2. Check for destructive commands
  for (const dest of DESTRUCTIVE_COMMAND_PATTERNS) {
    if (dest.pattern.test(trimmed)) {
      violations.push({
        type: 'DESTRUCTIVE_COMMAND',
        severity: 'CRITICAL',
        issue: dest.label,
        evidence: trimmed,
      });
    }
  }

  // 3. Check for dangerous env overrides
  for (const env of DANGEROUS_ENV_OVERRIDES) {
    if (env.pattern.test(trimmed)) {
      violations.push({
        type: 'DANGEROUS_ENVIRONMENT_OVERRIDE',
        severity: 'HIGH',
        issue: env.label,
        evidence: trimmed,
      });
    }
  }

  return {
    isSafe: violations.length === 0,
    command: trimmed,
    violationCount: violations.length,
    violations,
    remediation: violations.length > 0
      ? 'Avoid raw shell chaining operators; use direct binary execution with static arguments.'
      : 'None required.',
  };
}

/**
 * Audits a target file path against an authorized directory boundary.
 *
 * @param {string} targetPath - Relative or absolute path
 * @param {string} authorizedRoot - Trusted root boundary
 * @param {object} [options]
 * @returns {object} Containment audit result
 */
function auditPathContainment(targetPath, authorizedRoot, options = {}) {
  try {
    const resolved = assertWithinRoot(authorizedRoot, targetPath, options);
    return {
      isContained: true,
      resolvedPath: resolved,
      violation: null,
    };
  } catch (err) {
    return {
      isContained: false,
      resolvedPath: null,
      violation: err.message,
    };
  }
}

/**
 * Validates whether a command has dry-run fidelity before destructive execution.
 *
 * @param {string} commandLine
 * @returns {object} Dry-run audit result
 */
function validateDryRunFidelity(commandLine) {
  if (typeof commandLine !== 'string') {
    return { hasDryRun: false, recommendation: 'Supply a valid command string.' };
  }

  const dryRunFlags = ['--dry-run', '-n', '--check', 'status', 'diff'];
  const hasDryRun = dryRunFlags.some(flag => commandLine.includes(flag));

  return {
    hasDryRun,
    command: commandLine,
    recommendation: hasDryRun
      ? 'Command safely executes in non-destructive inspection mode.'
      : 'Include an explicit --dry-run or inspection flag before executing destructive operations.',
  };
}

module.exports = {
  auditCommandSafety,
  auditPathContainment,
  validateDryRunFidelity,
  DANGEROUS_SHELL_OPERATORS,
  DESTRUCTIVE_COMMAND_PATTERNS,
};

