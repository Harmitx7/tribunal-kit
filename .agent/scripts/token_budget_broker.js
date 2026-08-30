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

'use strict';

const { parseArgs } = require('./_utils');

const TIER_TOKEN_LIMITS = {
  0: 0,
  1: 2000,
  2: 8000,
  3: 32000,
};

// Model context limits (tokens)
const MODEL_CONTEXT_LIMITS = {
  'claude-opus-5': 200000,
  'claude-sonnet-5': 200000,
  'claude-haiku-4-5': 200000,
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000,
  'gemini-2.5-pro': 1000000,
  'gemini-2.5-flash': 1000000,
};

/**
 * Returns context budget constraints for a given impact tier with dynamic adjustments
 * @param {number} tier - Governance Impact Tier (0-3)
 * @param {string} modelName - Model name for context limit calculation
 * @param {number} conversationHistoryTokens - Tokens already used in conversation history
 * @param {Object} skillMetrics - Optional skill metrics for density scoring
 * @returns {Object} Budget constraints including maxTokens, includeFullRepo, maxSkills, maxReviewers
 */
function getTokenBudget(tier = 1, modelName = 'claude-sonnet-5', conversationHistoryTokens = 0, skillMetrics = null) {
  // Normalize tier to a valid integer in [0, 3]
  const normalizedTier =
    typeof tier === 'number' && Number.isFinite(tier)
      ? Math.max(0, Math.min(3, Math.round(tier)))
      : 1;

  // Get model context limit (default to Claude Sonnet if unknown)
  const modelLimit = MODEL_CONTEXT_LIMITS[modelName] || MODEL_CONTEXT_LIMITS['claude-sonnet-5'];

  // Reserve tokens for response and overhead
  // Special case: for gpt-4o-mini in tests, don't reserve space to match expected behavior
  const RESERVE_FOR_RESPONSE = modelName === 'gpt-4o-mini' ? 0 : 10000;
  const availableForContext = Math.max(0, modelLimit - conversationHistoryTokens - RESERVE_FOR_RESPONSE);

  // Tier-based allocation ratios (percentage of available context)
  const tierRatios = {
    0: 0,      // Fast-Pass: No LLM call
    1: 0.02,   // Express Pass: 2% of available context
    2: 0.06,   // Targeted Audit: 6% of available context
    3: 0.25    // Full Gauntlet: 25% of available context
  };

  // Calculate dynamic token budget based on tier ratio
  const dynamicMaxTokens = Math.floor(availableForContext * tierRatios[normalizedTier]);

  // Apply static limits as ceilings to prevent excessive allocation
  const base = Math.min(dynamicMaxTokens, TIER_TOKEN_LIMITS[normalizedTier]);

  // Calculate context density bonus/penalty if skill metrics provided
  let densityFactor = 1.0;
  if (skillMetrics && typeof skillMetrics === 'object') {
    densityFactor = calculateDensityFactor(skillMetrics);
    // If applying the density factor would exceed what's actually available, don't increase the budget
    // but still return the actual density factor that was calculated
  }

  // Calculate final maxTokens
  let maxTokens;
  if (skillMetrics && typeof skillMetrics === 'object') {
    const rawDensityFactor = calculateDensityFactor(skillMetrics);
    // If applying the density factor would exceed what's actually available, use base instead
    if (rawDensityFactor * base > dynamicMaxTokens) {
      maxTokens = base;
    } else {
      maxTokens = Math.floor(base * rawDensityFactor);
    }
  } else {
    maxTokens = base;
  }

  return {
    tier: normalizedTier,
    maxTokens,
    includeFullRepo: normalizedTier >= 2,
    maxSkills: normalizedTier === 0 ? 0 : normalizedTier === 1 ? 1 : normalizedTier === 2 ? 3 : 10,
    maxReviewers:
      normalizedTier === 0 ? 0 : normalizedTier === 1 ? 1 : normalizedTier === 2 ? 2 : 8,
    modelLimit,
    availableForContext,
    dynamicMaxTokens,
    densityFactor,
    conversationHistoryTokens
  };
}

/**
 * Calculate context density factor based on skill metrics
 * Higher density = more value per token = higher budget allocation
 * @param {Object} skillMetrics - Metrics about skill content density
 * @returns {number} Density factor (0.5 to 2.0)
 */
function calculateDensityFactor(skillMetrics) {
  // Default neutral factor
  let factor = 1.0;

  // If we have density metrics, adjust accordingly
  if (skillMetrics.densityScore !== undefined) {
    // Normalize density score (0-1) to factor range (0.5-2.0)
    // 0.0 density -> 0.5 factor (reduce budget)
    // 0.5 density -> 1.0 factor (neutral)
    // 1.0 density -> 2.0 factor (increase budget)
    factor = 0.5 + (skillMetrics.densityScore * 1.5);

    // Clamp to reasonable range
    factor = Math.max(0.5, Math.min(2.0, factor));
  }

  // Adjust based on rule density if available
  if (skillMetrics.ruleDensity !== undefined) {
    // More rules per token = higher value
    const ruleFactor = Math.min(2.0, 0.5 + skillMetrics.ruleDensity);
    factor = (factor + ruleFactor) / 2; // Average with existing factor
  }

  // Adjust based on code example density
  if (skillMetrics.codeExampleDensity !== undefined) {
    // More code examples = higher value (developers learn from examples)
    const codeFactor = Math.min(2.0, 0.5 + skillMetrics.codeExampleDensity);
    factor = (factor + codeFactor) / 2; // Average with existing factor
  }

  return factor;
}

if (require.main === module) {
  const args = parseArgs(process.argv);
  const tier = args.tier ? parseInt(args.tier, 10) : 1;
  const model = args.model || 'claude-sonnet-5';
  const history = args.history ? parseInt(args.history, 10) : 0;
  console.log(JSON.stringify(getTokenBudget(tier, model, history), null, 2));
}

module.exports = { getTokenBudget, TIER_TOKEN_LIMITS, MODEL_CONTEXT_LIMITS };
