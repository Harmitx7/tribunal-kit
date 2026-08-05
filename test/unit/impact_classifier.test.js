/**
 * impact_classifier.test.js — Unit tests for Adaptive Governance Impact Classifier
 */

"use strict";

const { classifyImpact } = require("../../.agent/scripts/impact_classifier");
const { evaluateSocraticGate } = require("../../.agent/scripts/socratic_gate_policy");
const { getTokenBudget } = require("../../.agent/scripts/token_budget_broker");

describe("Adaptive Governance Impact Classifier", () => {
  test("Classifies pure CSS / typo edit as Tier 0 Fast-Pass", () => {
    const res = classifyImpact({
      files: ["src/components/Button.css"],
      task: "Fix typo in button hover style comment",
      lineCount: 3
    });

    expect(res.tier).toBe(0);
    expect(res.fastPass).toBe(true);
    expect(res.maxReviewers).toBe(0);
    expect(res.requireGate).toBe(false);
  });

  test("Classifies single component logic fix as Tier 1 Express Pass", () => {
    const res = classifyImpact({
      files: ["src/components/Header.tsx"],
      task: "Update toggle state logic",
      lineCount: 15
    });

    expect(res.tier).toBe(1);
    expect(res.fastPass).toBe(false);
    expect(res.maxReviewers).toBe(1);
    expect(res.requireGate).toBe(false);
  });

  test("Classifies auth/security files as Tier 3 Full Gauntlet", () => {
    const res = classifyImpact({
      files: ["src/auth/jwt_verifier.ts"],
      task: "Update session token expiration check",
      lineCount: 8
    });

    expect(res.tier).toBe(3);
    expect(res.maxReviewers).toBe(8);
    expect(res.requireGate).toBe(true);
  });
});

describe("Adaptive Socratic Gate Policy", () => {
  test("Bypasses Socratic gate for Tier 0 and Tier 1", () => {
    expect(evaluateSocraticGate({ tier: 0 }).shouldBlock).toBe(false);
    expect(evaluateSocraticGate({ tier: 1 }).shouldBlock).toBe(false);
  });

  test("Enforces gate for Tier 3 or high ambiguity Tier 2", () => {
    expect(evaluateSocraticGate({ tier: 3 }).shouldBlock).toBe(true);
    expect(evaluateSocraticGate({ tier: 2, ambiguityScore: 0.8 }).shouldBlock).toBe(true);
  });

  test("Respects --no-gate or --express override flags", () => {
    expect(evaluateSocraticGate({ tier: 3, flags: { "no-gate": true } }).shouldBlock).toBe(false);
    expect(evaluateSocraticGate({ tier: 3, flags: { express: true } }).shouldBlock).toBe(false);
  });
});

describe("Token Budget Broker", () => {
  test("Caps token budget according to Impact Tier", () => {
    expect(getTokenBudget(0).maxTokens).toBe(0);
    expect(getTokenBudget(1).maxTokens).toBe(2000);
    expect(getTokenBudget(2).maxTokens).toBe(8000);
    expect(getTokenBudget(3).maxTokens).toBe(32000);
  });
});
