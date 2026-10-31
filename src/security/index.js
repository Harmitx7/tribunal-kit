'use strict';

/**
 * index.js — Centralized Security & Governance Subsystem Barrel
 * ==============================================================
 * Domain: AI Agent Security & Governance (ai-agent-security-governance)
 *
 * Unifies all security engines, boundary enforcers, and schemas into a cohesive API.
 */

const boundary = require('./boundary');
const threatModelSchemas = require('./threat_model_schemas');
const promptInjectionEngine = require('./prompt_injection_engine');
const toolPermissionEngine = require('./tool_permission_engine');
const dataLeakageEngine = require('./data_leakage_engine');
const executionSafetyEngine = require('./execution_safety_engine');
const multiAgentGovernanceEngine = require('./multi_agent_governance_engine');

module.exports = {
  // Boundary & Containment
  assertWithinRoot: boundary.assertWithinRoot,
  validateResourceId: boundary.validateResourceId,
  validateBrowserUrl: boundary.validateBrowserUrl,
  validateBrowserUrlAsync: boundary.validateBrowserUrlAsync,
  isProhibitedIp: boundary.isProhibitedIp,
  sanitizeErrorMessage: boundary.sanitizeErrorMessage,
  SAFE_RESOURCE_ID_REGEX: boundary.SAFE_RESOURCE_ID_REGEX,

  // Threat Modeling & Schemas
  SUPPORTED_THREAT_MODEL_VERSIONS: threatModelSchemas.SUPPORTED_THREAT_MODEL_VERSIONS,
  THREAT_SEVERITIES: threatModelSchemas.THREAT_SEVERITIES,
  STRIDE_CATEGORIES: threatModelSchemas.STRIDE_CATEGORIES,
  TRUST_BOUNDARIES: threatModelSchemas.TRUST_BOUNDARIES,
  ThreatRecordSchema: threatModelSchemas.ThreatRecordSchema,
  SecurityControlSchema: threatModelSchemas.SecurityControlSchema,
  SecurityFindingSchema: threatModelSchemas.SecurityFindingSchema,
  SecurityIncidentSchema: threatModelSchemas.SecurityIncidentSchema,
  PolicyAuditFindingSchema: threatModelSchemas.PolicyAuditFindingSchema,
  validateThreatRecord: threatModelSchemas.validateThreatRecord,
  validateSecurityControl: threatModelSchemas.validateSecurityControl,
  validateSecurityFinding: threatModelSchemas.validateSecurityFinding,
  validateSecurityIncident: threatModelSchemas.validateSecurityIncident,
  validatePolicyClause: threatModelSchemas.validatePolicyClause,
  buildThreatModelRegister: threatModelSchemas.buildThreatModelRegister,

  // Prompt Injection & Smuggling Defense
  scanForPromptInjection: promptInjectionEngine.scanForPromptInjection,
  wrapUntrustedContent: promptInjectionEngine.wrapUntrustedContent,
  detectIndirectInjection: promptInjectionEngine.detectIndirectInjection,
  normalizeObfuscatedText: promptInjectionEngine.normalizeObfuscatedText,
  DIRECT_SMUGGLER_PATTERNS: promptInjectionEngine.DIRECT_SMUGGLER_PATTERNS,
  DELIMITER_BREAKOUT_PATTERNS: promptInjectionEngine.DELIMITER_BREAKOUT_PATTERNS,
  EXFILTRATION_PATTERNS: promptInjectionEngine.EXFILTRATION_PATTERNS,

  // Tool Permissions & Least Privilege
  auditToolPermissions: toolPermissionEngine.auditToolPermissions,
  detectConfusedDeputy: toolPermissionEngine.detectConfusedDeputy,
  generateLeastPrivilegePolicy: toolPermissionEngine.generateLeastPrivilegePolicy,
  auditMcpManifest: toolPermissionEngine.auditMcpManifest,
  isWildcardCapability: toolPermissionEngine.isWildcardCapability,
  HIGH_RISK_CAPABILITIES: toolPermissionEngine.HIGH_RISK_CAPABILITIES,
  WILDCARD_PATTERNS: toolPermissionEngine.WILDCARD_PATTERNS,

  // Data Leakage & Canary Tokens
  generateCanary: dataLeakageEngine.generateCanary,
  registerCanary: dataLeakageEngine.registerCanary,
  clearCanaries: dataLeakageEngine.clearCanaries,
  getActiveCanaries: dataLeakageEngine.getActiveCanaries,
  scanForDataLeakage: dataLeakageEngine.scanForDataLeakage,
  sanitizeTrace: dataLeakageEngine.sanitizeTrace,

  // Execution Safety & Sinks
  auditCommandSafety: executionSafetyEngine.auditCommandSafety,
  auditPathContainment: executionSafetyEngine.auditPathContainment,
  validateDryRunFidelity: executionSafetyEngine.validateDryRunFidelity,
  DANGEROUS_SHELL_OPERATORS: executionSafetyEngine.DANGEROUS_SHELL_OPERATORS,
  DESTRUCTIVE_COMMAND_PATTERNS: executionSafetyEngine.DESTRUCTIVE_COMMAND_PATTERNS,

  // Multi-Agent Trust & Governance
  auditDelegationHierarchy: multiAgentGovernanceEngine.auditDelegationHierarchy,
  auditReviewerConsensus: multiAgentGovernanceEngine.auditReviewerConsensus,
};

