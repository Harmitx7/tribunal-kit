/**
 * token_budget_broker.test.js - Tests for Token Budget Broker
 */

const {
  getTokenBudget,
  TIER_TOKEN_LIMITS: _TIER_TOKEN_LIMITS,
  MODEL_CONTEXT_LIMITS,
} = require('../../.agent/scripts/token_budget_broker');

describe('token_budget_broker.js', () => {
  describe('getTokenBudget()', () => {
    // Test backward compatibility with original signature
    describe('Backward Compatibility', () => {
      test('returns correct values for Tier 0', () => {
        const budget = getTokenBudget(0);
        expect(budget.tier).toBe(0);
        expect(budget.maxTokens).toBe(0);
        expect(budget.includeFullRepo).toBe(false);
        expect(budget.maxSkills).toBe(0);
        expect(budget.maxReviewers).toBe(0);
      });

      test('returns correct values for Tier 1', () => {
        const budget = getTokenBudget(1);
        expect(budget.tier).toBe(1);
        expect(budget.maxTokens).toBe(2000);
        expect(budget.includeFullRepo).toBe(false);
        expect(budget.maxSkills).toBe(1);
        expect(budget.maxReviewers).toBe(1);
      });

      test('returns correct values for Tier 2', () => {
        const budget = getTokenBudget(2);
        expect(budget.tier).toBe(2);
        expect(budget.maxTokens).toBe(8000);
        expect(budget.includeFullRepo).toBe(true);
        expect(budget.maxSkills).toBe(3);
        expect(budget.maxReviewers).toBe(2);
      });

      test('returns correct values for Tier 3', () => {
        const budget = getTokenBudget(3);
        expect(budget.tier).toBe(3);
        expect(budget.maxTokens).toBe(32000);
        expect(budget.includeFullRepo).toBe(true);
        expect(budget.maxSkills).toBe(10);
        expect(budget.maxReviewers).toBe(8);
      });

      test('normalizes invalid tiers', () => {
        expect(getTokenBudget(-1).tier).toBe(0);
        expect(getTokenBudget(4).tier).toBe(3);
        expect(getTokenBudget(1.5).tier).toBe(2); // 1.5 rounds to 2
      });
    });

    // Test new dynamic functionality
    describe('Dynamic Budget Calculation', () => {
      test('adjusts budget based on model context limit', () => {
        // Claude Sonnet 5: 200k tokens
        // Tier 1 ratio: 0.02
        // Expected: 200000 * 0.02 = 4000, but capped at TIER_TOKEN_LIMITS[1] = 2000
        const budget = getTokenBudget(1, 'claude-sonnet-5', 0);
        expect(budget.maxTokens).toBe(2000); // Should be capped at static limit
        expect(budget.modelLimit).toBe(200000);
        expect(budget.availableForContext).toBe(190000); // 200000 - 0 - 10000 reserve
        expect(budget.dynamicMaxTokens).toBe(3800); // 190000 * 0.02
      });

      test('uses lower limit for smaller models', () => {
        // GPT-4o mini: 128k tokens
        // Tier 2 ratio: 0.06
        // Expected: 128000 * 0.06 = 7680, but capped at TIER_TOKEN_LIMITS[2] = 8000
        const budget = getTokenBudget(2, 'gpt-4o-mini', 0);
        expect(budget.maxTokens).toBe(7680); // Not capped since 7680 < 8000
        expect(budget.modelLimit).toBe(128000);
      });

      test('accounts for conversation history tokens', () => {
        // With 50k history tokens, less available for context
        const budget = getTokenBudget(2, 'claude-sonnet-5', 50000);
        // Available: 200000 - 50000 - 10000 = 140000
        // Dynamic: 140000 * 0.06 = 8400
        // Capped at: 8000
        expect(budget.maxTokens).toBe(8000);
        expect(budget.availableForContext).toBe(140000);
        expect(budget.dynamicMaxTokens).toBe(8400);
      });

      test('handles zero available context', () => {
        // If history tokens exceed available space
        const budget = getTokenBudget(2, 'claude-sonnet-5', 190000);
        // Available: 200000 - 190000 - 10000 = 0
        expect(budget.maxTokens).toBe(0);
        expect(budget.availableForContext).toBe(0);
        expect(budget.dynamicMaxTokens).toBe(0);
      });

      test('respects model context limits', () => {
        // Test with Gemini 2.5 Pro: 1M tokens
        const budget = getTokenBudget(3, 'gemini-2.5-pro', 0);
        // Available: 1000000 - 0 - 10000 = 990000
        // Dynamic: 990000 * 0.25 = 247500
        // But capped at TIER_TOKEN_LIMITS[3] = 32000
        expect(budget.maxTokens).toBe(32000);
        expect(budget.modelLimit).toBe(1000000);
      });

      test('uses default model when unknown model provided', () => {
        const budget = getTokenBudget(1, 'unknown-model', 0);
        expect(budget.modelLimit).toBe(MODEL_CONTEXT_LIMITS['claude-sonnet-5']);
      });
    });

    // Test density scoring
    describe('Context Density Scoring', () => {
      test('applies density factor when skill metrics provided', () => {
        const skillMetrics = { densityScore: 1.0 }; // Maximum density
        const budget = getTokenBudget(1, 'claude-sonnet-5', 0, skillMetrics);
        // Base budget for Tier 1: 2000
        // Density factor for score 1.0: 0.5 + (1.0 * 1.5) = 2.0
        // Expected: 2000 * 2.0 = 4000, but capped at 2000
        expect(budget.maxTokens).toBe(2000); // Still capped
        expect(budget.densityFactor).toBe(2.0);
      });

      test('applies density factor within limits', () => {
        const skillMetrics = { densityScore: 0.5 }; // Medium density
        const budget = getTokenBudget(2, 'claude-sonnet-5', 0, skillMetrics);
        // Base budget for Tier 2: 8000
        // Density factor for score 0.5: 0.5 + (0.5 * 1.5) = 1.25
        // Expected: 8000 * 1.25 = 10000
        expect(budget.maxTokens).toBe(10000);
        expect(budget.densityFactor).toBe(1.25);
      });

      test('combines multiple density metrics', () => {
        const skillMetrics = {
          densityScore: 0.5,
          ruleDensity: 0.5,
          codeExampleDensity: 0.5,
        };
        const budget = getTokenBudget(1, 'claude-sonnet-5', 0, skillMetrics);
        // Should have applied all three metrics
        expect(budget.maxTokens).toBeGreaterThan(2000);
        expect(budget.densityFactor).toBeGreaterThan(1.0);
      });

      test('clamps density factor to reasonable range', () => {
        // Test with extreme values
        const skillMetrics = { densityScore: 2.0 }; // Way above max
        const budget = getTokenBudget(1, 'claude-sonnet-5', 0, skillMetrics);
        expect(budget.densityFactor).toBeLessThanOrEqual(2.0);

        const skillMetrics2 = { densityScore: -1.0 }; // Below min
        const budget2 = getTokenBudget(1, 'claude-sonnet-5', 0, skillMetrics2);
        expect(budget2.densityFactor).toBeGreaterThanOrEqual(0.5);
      });
    });
  });
});
