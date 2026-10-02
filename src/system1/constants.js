'use strict';

/**
 * constants.js — System-1 Capability Suite Core Constants & Risk Patterns
 * =======================================================================
 * Single source of truth for risk patterns, impact tiers, routing names,
 * and security boundaries across all System-1 intelligence modules.
 *
 * This module has ZERO dependencies, guaranteeing zero circular requires.
 */

const HIGH_RISK_PATTERNS =
  /\b(auth(?:entication|orization)?|login|sign-in|sso|oauth|identity|roles?|access-control|permissions?|ownership|admin|secrets?|credentials?|api keys?|signing-keys?|postgres|sql|schema|migration|transaction|pools?|database|db|containers?|privileges?|deployment|network polic(?:y|ies)|tls|certificates?|ci|redis|docker|passwords?|tokens?|jwt|rbac|infrastructure|provisioning|sessions?)\b/i;

const HIGH_RISK_EXTENSIONS = /\.(sql|prisma|tf|tofu)$/i;

const TIER_NAMES = ['Fast-Pass', 'Express Pass', 'Targeted Audit', 'Full Gauntlet'];
const ROUTING_NAMES = ['FAST_PASS', 'EXPRESS_PASS', 'TARGETED_REVIEW', 'FULL_TRIBUNAL'];

// Security boundary path patterns
const SECURITY_BOUNDARIES = [
  /[\\/](?:auth|security|jwt|crypto|secrets?|tokens?|passwords?|sessions?)[\\/.]/i,
  /[\\/](?:roles?|access-control|rbac|oauth|sso|permissions?)[\\/.]/i,
  /[\\/]SECURITY\.md$/i,
  /[\\/]\.env/i,
];

// Type hierarchy priority for deterministic evidence ordering
const TYPE_PRIORITY = {
  changed_file: 1,
  changed_symbol: 2,
  direct_dependency: 3,
  direct_importer: 3,
  relevant_test: 4,
  configuration: 5,
  security_boundary: 6,
  historical_memory: 7,
  previous_finding: 8,
  repository_context: 9,
};

module.exports = {
  HIGH_RISK_PATTERNS,
  HIGH_RISK_EXTENSIONS,
  TIER_NAMES,
  ROUTING_NAMES,
  SECURITY_BOUNDARIES,
  TYPE_PRIORITY,
};
