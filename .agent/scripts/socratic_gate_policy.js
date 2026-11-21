#!/usr/bin/env node
/**
 * socratic_gate_policy.js — Adaptive Socratic Gate Evaluator
 * =============================================================
 * Determines whether the Socratic Gate should block execution with interactive questions.
 *
 * Rules:
 *   - Tier 0 & Tier 1: Always BYPASS Socratic Gate (0 blocking questions).
 *   - Tier 2: Bypass UNLESS Ambiguity Score > 0.5 or explicit ambiguities are present.
 *   - Tier 3: Trigger Socratic Gate unless explicitly overridden with --no-gate or --express.
 */

'use strict';

const { parseArgs } = require('./_utils');

/**
 * Evaluates whether the Socratic Gate should be engaged.
 * @param {Object} opts - Options { tier, ambiguityScore, flags, task, humanApprovalToken }
 * @returns {Object} { shouldBlock, reason }
 */
function evaluateSocraticGate(opts = {}) {
  if (!opts || typeof opts !== 'object') {
    return { shouldBlock: true, reason: 'Fail-closed: missing options' };
  }

  // Fail-closed if tier is missing, not a number, or not within 0..3
  if (typeof opts.tier !== 'number' || Number.isNaN(opts.tier) || opts.tier < 0 || opts.tier > 3) {
    return { shouldBlock: true, reason: 'Fail-closed: missing or invalid tier' };
  }

  const tier = opts.tier;
  const ambiguityScore = typeof opts.ambiguityScore === 'number' ? opts.ambiguityScore : 0.2;
  const flags = opts.flags || {};

  // For Tier 3: Authenticated token or single explicit user override flag
  if (tier === 3) {
    const humanApprovalToken =
      opts.humanApprovalToken || flags.humanApprovalToken || flags.token || flags['approval-token'];
    if (
      humanApprovalToken &&
      typeof humanApprovalToken === 'string' &&
      humanApprovalToken.startsWith('HUMAN-APPROVED-')
    ) {
      return { shouldBlock: false, reason: 'Authenticated human approval token verified' };
    }
    // Block unauthenticated bulk force overrides on Tier 3
    if (flags.force || (flags['no-gate'] && flags.express)) {
      return {
        shouldBlock: true,
        reason: 'Tier 3 Full Gauntlet: unauthenticated force bypass rejected',
      };
    }
    if (flags['no-gate'] || flags.express) {
      return { shouldBlock: false, reason: 'Explicit user override (--no-gate / --express)' };
    }
    return { shouldBlock: true, reason: 'Tier 3 Full Gauntlet (high risk / architectural change)' };
  }

  // For Tier 0, 1, 2, user overrides may apply
  if (flags['no-gate'] || flags.express || flags.force) {
    return { shouldBlock: false, reason: 'Explicit user override (--no-gate / --express)' };
  }

  if (tier === 0) {
    return { shouldBlock: false, reason: 'Tier 0 Fast-Pass (low impact)' };
  }

  if (tier === 1) {
    return { shouldBlock: false, reason: 'Tier 1 Express Pass (single component / logic edit)' };
  }

  if (tier === 2) {
    if (ambiguityScore > 0.5) {
      return {
        shouldBlock: true,
        reason: `Tier 2 ambiguity exceeds threshold (${ambiguityScore} > 0.5)`,
      };
    }
    return { shouldBlock: false, reason: 'Tier 2 low-ambiguity edit (gate bypassed)' };
  }

  return { shouldBlock: true, reason: 'Fail-closed: unknown tier state' };
}

if (require.main === module) {
  try {
    const schema = {
      tier: { type: 'number', default: null },
      ambiguity: { type: 'number', default: null },
      json: { type: 'boolean', default: false },
      token: { type: 'string', default: null },
      'approval-token': { type: 'string', default: null },
    };
    const parsed = parseArgs(process.argv.slice(2), schema);
    const flags = (parsed && parsed.flags) || {};

    // Fail-closed if tier is not provided in CLI
    if (flags.tier === undefined || flags.tier === null) {
      console.log(
        JSON.stringify(
          {
            shouldBlock: true,
            reason: 'Fail-closed: missing --tier argument in CLI invocation',
          },
          null,
          2,
        ),
      );
      process.exit(0);
    }

    const tierParsed = parseInt(flags.tier, 10);
    const result = evaluateSocraticGate({
      tier: Number.isNaN(tierParsed) ? -1 : tierParsed,
      ambiguityScore: flags.ambiguity ? parseFloat(flags.ambiguity) : 0.2,
      flags,
      humanApprovalToken: flags.token || flags['approval-token'],
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.log(
      JSON.stringify(
        {
          shouldBlock: true,
          reason: `Fail-closed error: ${err.message}`,
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }
}

module.exports = { evaluateSocraticGate };
