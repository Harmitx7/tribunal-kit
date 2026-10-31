'use strict';

/**
 * tool_permission_engine.js — Least Privilege & Tool Boundary Auditor
 * ====================================================================
 * Domain: AI Agent Security & Governance (ai-agent-security-governance)
 *
 * Enforces strict least-privilege capability boundaries for agent tools and MCP servers:
 * 1. Wildcard grant detection (*, fs:*, exec:*, all, admin)
 * 2. Confused-deputy pattern detection (unprivileged input reaching privileged sinks)
 * 3. Least-privilege capability scoping and policy generation
 * 4. MCP tool manifest and server configuration vetting
 */

const WILDCARD_PATTERNS = [
  /^\*$/,
  /^[a-zA-Z_-]+:\*$/,
  /^(?:all|admin|root|superuser|unrestricted)$/i,
];

const HIGH_RISK_CAPABILITIES = [
  'exec_shell',
  'execute_command',
  'run_script',
  'write_arbitrary_file',
  'delete_file',
  'send_raw_http',
  'eval_code',
  'modify_system_environment',
];

/**
 * Checks whether a given capability string constitutes a wildcard grant.
 */
function isWildcardCapability(cap) {
  if (typeof cap !== 'string') return false;
  const trimmed = cap.trim();
  return WILDCARD_PATTERNS.some(pat => pat.test(trimmed));
}

/**
 * Audits a collection of tool manifests and requested capabilities.
 *
 * @param {Array<object>} toolManifests - Tools provided to the agent
 * @param {Array<string>} [requestedCapabilities] - Specific capabilities requested by the task
 * @param {object} [options]
 * @param {boolean} [options.requireHumanGateForHighRisk=true]
 * @returns {object} Detailed permission audit verdict
 */
function auditToolPermissions(toolManifests, requestedCapabilities = [], options = {}) {
  if (!Array.isArray(toolManifests)) {
    throw new Error('auditToolPermissions expects an array of tool manifests.');
  }

  const excessiveGrants = [];
  const wildcardGrants = [];
  const highRiskTools = [];
  const approvedCapabilities = new Set(requestedCapabilities);

  for (const tool of toolManifests) {
    const name = tool.name || tool.id || 'unnamed_tool';
    const capabilities = Array.isArray(tool.capabilities)
      ? tool.capabilities
      : [tool.capability || name];

    for (const cap of capabilities) {
      if (typeof cap !== 'string') continue;

      // 1. Wildcard detection
      if (isWildcardCapability(cap)) {
        wildcardGrants.push({
          tool: name,
          capability: cap,
          reason: 'Wildcard capability violates least-privilege security axiom.',
        });
      }

      // 2. High-risk sink classification
      if (HIGH_RISK_CAPABILITIES.includes(cap) || HIGH_RISK_CAPABILITIES.includes(name)) {
        highRiskTools.push({
          tool: name,
          capability: cap,
          requiresGate: options.requireHumanGateForHighRisk !== false,
        });
      }

      // 3. Excessive grant detection (if requested capabilities are explicitly specified)
      if (requestedCapabilities.length > 0 && !approvedCapabilities.has(cap) && !approvedCapabilities.has('*')) {
        excessiveGrants.push({
          tool: name,
          capability: cap,
          reason: `Tool grants capability "${cap}" which was not requested or approved for this task context.`,
        });
      }
    }
  }

  let verdict = 'PERMITTED';
  if (wildcardGrants.length > 0) {
    verdict = 'PROHIBITED_WILDCARD';
  } else if (excessiveGrants.length > 0) {
    verdict = 'EXCESSIVE_PERMISSIONS_DETECTED';
  }

  return {
    verdict,
    isCompliant: verdict === 'PERMITTED',
    totalTools: toolManifests.length,
    wildcardGrants,
    excessiveGrants,
    highRiskTools,
    requiresHumanGate: highRiskTools.some(t => t.requiresGate),
  };
}

/**
 * Detects confused-deputy patterns where an untrusted prompt or low-privilege input
 * instructs the agent to invoke an authorization-exempt privileged tool.
 *
 * @param {object} invocationRequest
 * @param {string} invocationRequest.callerRole - e.g. 'untrusted_guest', 'repo_ingestor', 'user_lead'
 * @param {string} invocationRequest.toolName - target tool to call
 * @param {object} invocationRequest.toolArgs - arguments passed
 * @param {boolean} [invocationRequest.hasHumanSignoff=false]
 * @returns {object} Confused deputy audit result
 */
function detectConfusedDeputy(invocationRequest) {
  if (!invocationRequest || typeof invocationRequest !== 'object') {
    throw new Error('detectConfusedDeputy requires an invocationRequest object.');
  }

  const { callerRole, toolName, toolArgs, hasHumanSignoff = false } = invocationRequest;
  const isHighRisk = HIGH_RISK_CAPABILITIES.includes(toolName);
  const isLowPrivilegeCaller = callerRole === 'untrusted_guest' || callerRole === 'repo_ingestor';

  const violations = [];

  if (isLowPrivilegeCaller && isHighRisk) {
    violations.push({
      rule: 'CALLER_PRIVILEGE_MISMATCH',
      description: `Low-privilege caller "${callerRole}" attempted to invoke high-privilege sink "${toolName}".`,
      severity: 'CRITICAL',
    });
  }

  if (isHighRisk && !hasHumanSignoff) {
    violations.push({
      rule: 'MISSING_HUMAN_GATE',
      description: `High-privilege sink "${toolName}" requires explicit human signoff before execution.`,
      severity: 'CRITICAL',
    });
  }

  return {
    isConfusedDeputy: violations.length > 0,
    blocked: violations.length > 0,
    violations,
    remediation: 'Require explicit Zone 0 human approval and isolate caller trust boundary before execution.',
  };
}

/**
 * Scopes a tool manifest to the absolute minimum necessary capabilities.
 *
 * @param {Array<object>} toolManifests
 * @param {Array<string>} permittedActions
 * @returns {Array<object>} Hardened, least-privilege tool manifests
 */
function generateLeastPrivilegePolicy(toolManifests, permittedActions) {
  if (!Array.isArray(toolManifests) || !Array.isArray(permittedActions)) {
    throw new Error('generateLeastPrivilegePolicy requires toolManifests and permittedActions arrays.');
  }

  const allowedSet = new Set(permittedActions);

  return toolManifests
    .map(tool => {
      const caps = Array.isArray(tool.capabilities) ? tool.capabilities : [tool.name];
      const scopedCaps = caps.filter(c => !isWildcardCapability(c) && allowedSet.has(c));

      if (scopedCaps.length === 0) return null;

      return {
        ...tool,
        capabilities: scopedCaps,
        leastPrivilegeScoped: true,
      };
    })
    .filter(Boolean);
}

/**
 * Audits an MCP server configuration object (e.g. from mcp_config.json).
 *
 * @param {object} mcpConfig - Object with mcpServers definitions
 * @returns {object} Security triage of MCP servers
 */
function auditMcpManifest(mcpConfig) {
  if (!mcpConfig || typeof mcpConfig !== 'object') {
    throw new Error('auditMcpManifest requires an mcpConfig object.');
  }

  const servers = mcpConfig.mcpServers || mcpConfig;
  const untrustedServers = [];
  const findings = [];

  for (const [serverName, serverDef] of Object.entries(servers)) {
    if (!serverDef || typeof serverDef !== 'object') continue;

    const command = serverDef.command || '';
    const args = Array.isArray(serverDef.args) ? serverDef.args : [];

    // Check for dangerous shell interpreters or execution wrappers
    if (['bash', 'sh', 'cmd', 'cmd.exe', 'powershell', 'pwsh'].includes(command)) {
      untrustedServers.push(serverName);
      findings.push({
        server: serverName,
        severity: 'CRITICAL',
        issue: `MCP server "${serverName}" invokes raw shell interpreter "${command}".`,
        remediation: 'Use direct binary invocation without shell wrappers.',
      });
    }

    // Check for dangerous arguments like -c, /c, -Command
    const argStr = args.join(' ');
    if (/(?:-c|\/c|-Command|-EncodedCommand)\s+/i.test(argStr)) {
      untrustedServers.push(serverName);
      findings.push({
        server: serverName,
        severity: 'CRITICAL',
        issue: `MCP server "${serverName}" passes dynamic command-line evaluation flags in args.`,
        remediation: 'Pass static file paths instead of inline evaluation strings.',
      });
    }

    // Check environment variables for sensitive token leakage
    if (serverDef.env && typeof serverDef.env === 'object') {
      for (const [k, v] of Object.entries(serverDef.env)) {
        if (typeof v === 'string' && v.startsWith('sk-') && !v.startsWith('$')) {
          findings.push({
            server: serverName,
            severity: 'HIGH',
            issue: `Hardcoded API credential found in server environment key "${k}".`,
            remediation: 'Reference environment variables via $VAR instead of hardcoding secrets in config.',
          });
        }
      }
    }
  }

  return {
    isSecure: findings.length === 0,
    totalServersAudited: Object.keys(servers).length,
    untrustedServers: Array.from(new Set(untrustedServers)),
    findings,
  };
}

module.exports = {
  auditToolPermissions,
  detectConfusedDeputy,
  generateLeastPrivilegePolicy,
  auditMcpManifest,
  isWildcardCapability,
  HIGH_RISK_CAPABILITIES,
  WILDCARD_PATTERNS,
};

