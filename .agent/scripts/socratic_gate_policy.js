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

"use strict";

const { parseArgs } = require("./_utils");

/**
 * Evaluates whether the Socratic Gate should be engaged.
 * @param {Object} opts - Options { tier, ambiguityScore, flags, task }
 * @returns {Object} { shouldBlock, reason }
 */
function evaluateSocraticGate(opts = {}) {
  const tier = typeof opts.tier === "number" ? opts.tier : 1;
  const ambiguityScore = typeof opts.ambiguityScore === "number" ? opts.ambiguityScore : 0.2;
  const flags = opts.flags || {};

  if (flags["no-gate"] || flags.express || flags.force) {
    return { shouldBlock: false, reason: "Explicit user override (--no-gate / --express)" };
  }

  if (tier === 0) {
    return { shouldBlock: false, reason: "Tier 0 Fast-Pass (low impact)" };
  }

  if (tier === 1) {
    return { shouldBlock: false, reason: "Tier 1 Express Pass (single component / logic edit)" };
  }

  if (tier === 2) {
    if (ambiguityScore > 0.5) {
      return { shouldBlock: true, reason: `Tier 2 ambiguity exceeds threshold (${ambiguityScore} > 0.5)` };
    }
    return { shouldBlock: false, reason: "Tier 2 low-ambiguity edit (gate bypassed)" };
  }

  // Tier 3
  return { shouldBlock: true, reason: "Tier 3 Full Gauntlet (high risk / architectural change)" };
}

if (require.main === module) {
  const args = parseArgs(process.argv);
  const result = evaluateSocraticGate({
    tier: args.tier ? parseInt(args.tier, 10) : 1,
    ambiguityScore: args.ambiguity ? parseFloat(args.ambiguity) : 0.2,
    flags: args
  });
  console.log(JSON.stringify(result, null, 2));
}

module.exports = { evaluateSocraticGate };
