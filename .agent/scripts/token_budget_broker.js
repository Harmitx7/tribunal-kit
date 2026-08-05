#!/usr/bin/env node
/**
 * token_budget_broker.js — Token Budget & Persona Optimizer
 * ============================================================
 * Calculates and caps context window budgets based on Governance Impact Tiers.
 *
 * Tier Budgets:
 *   - Tier 0: 0 tokens (No LLM call required)
 *   - Tier 1: Max 2,000 tokens (diff context + 1 skill rule)
 *   - Tier 2: Max 8,000 tokens (diff + 2 skill rules + context summary)
 *   - Tier 3: Full budget (up to model context limit)
 */

"use strict";

const { parseArgs } = require("./_utils");

const TIER_TOKEN_LIMITS = {
  0: 0,
  1: 2000,
  2: 8000,
  3: 32000
};

/**
 * Returns context budget constraints for a given impact tier
 * @param {number} tier - Governance Impact Tier (0-3)
 * @returns {Object} { maxTokens, includeFullRepo, maxSkills, maxReviewers }
 */
function getTokenBudget(tier = 1) {
  // Normalize tier to a valid integer in [0, 3]
  const normalizedTier = (typeof tier === "number" && Number.isFinite(tier))
    ? Math.max(0, Math.min(3, Math.round(tier)))
    : 1;
  const maxTokens = TIER_TOKEN_LIMITS[normalizedTier];

  return {
    tier: normalizedTier,
    maxTokens,
    includeFullRepo: normalizedTier >= 2,
    maxSkills: normalizedTier === 0 ? 0 : normalizedTier === 1 ? 1 : normalizedTier === 2 ? 3 : 10,
    maxReviewers: normalizedTier === 0 ? 0 : normalizedTier === 1 ? 1 : normalizedTier === 2 ? 2 : 8
  };
}

if (require.main === module) {
  const args = parseArgs(process.argv);
  const tier = args.tier ? parseInt(args.tier, 10) : 1;
  console.log(JSON.stringify(getTokenBudget(tier), null, 2));
}

module.exports = { getTokenBudget, TIER_TOKEN_LIMITS };
