'use strict';

/**
 * skill_mutator.js — SkillOpt Loop 1 Bounded Procedural Rule Mutator
 * ==================================================================
 * Phase 3 RSIE: Subagent-Driven Co-Evolution & Mutation Engine
 *
 * Autonomously synthesizes bounded procedural rules and heuristic refinements
 * for skills and prompts, strictly constrained by:
 * 1. Case-Based Negative Memory (similarity >= 0.85 rejection).
 * 2. Change Budget Enforcement (change ratio <= 0.25).
 * 3. Structured Markdown Preservation.
 */

const path = require('path');
const {
  loadRejections,
  isPreviouslyRejected,
  normalizedSimilarity,
} = require('./negative_memory');

const DEFAULT_CHANGE_BUDGET = Object.freeze({
  maxChangeRatio: 0.25,
  maxRules: 5,
  similarityThreshold: 0.85,
});

class SkillMutator {
  /**
   * @param {object} [options]
   * @param {string} [options.agentDir] - Base agent state directory
   * @param {number} [options.similarityThreshold=0.85] - Rejection threshold
   * @param {number} [options.maxChangeRatio=0.25] - Max edit delta ratio
   * @param {number} [options.maxRules=5] - Max new rules added per mutation
   */
  constructor(options = {}) {
    this.agentDir = path.resolve(options.agentDir || path.join(process.cwd(), '.agent'));
    this.similarityThreshold = options.similarityThreshold || DEFAULT_CHANGE_BUDGET.similarityThreshold;
    this.maxChangeRatio = options.maxChangeRatio || DEFAULT_CHANGE_BUDGET.maxChangeRatio;
    this.maxRules = options.maxRules || DEFAULT_CHANGE_BUDGET.maxRules;
  }

  /**
   * Generates a candidate procedural hardening rule from an adversarial finding.
   *
   * @param {object} finding
   * @param {string} [finding.category] - Attack category (SECURITY_INJECTIONS, etc.)
   * @param {string} [finding.reason] - Explanation of vulnerability
   * @param {any} [finding.payload] - Attack payload
   * @returns {string} Synthesized rule string
   */
  synthesizeRuleFromFinding(finding = {}) {
    const category = (finding.category || 'GENERAL').toUpperCase();
    const payloadStr =
      typeof finding.payload === 'object'
        ? JSON.stringify(finding.payload)
        : String(finding.payload !== undefined ? finding.payload : '');

    switch (category) {
      case 'SECURITY':
      case 'SECURITY_INJECTIONS':
        return `- **Security Guard**: Always sanitize inputs against shell metacharacters and use parameterized queries. Prohibit direct string concatenation for "${payloadStr.substring(0, 30)}".`;
      case 'BOUNDARY_EXTREMA':
        return `- **Boundary Guard**: Explicitly guard against null, undefined, empty collections, and extreme bounds before accessing properties or performing numeric operations.`;
      case 'TYPE_CONFUSION':
        return `- **Type Safety Guard**: Validate input types strictly with typeof and Array.isArray. Prevent prototype poisoning by checking for __proto__ and constructor properties.`;
      case 'RESOURCE_DOS':
        return `- **Resource Envelope Guard**: Bound all string inputs and execution timeouts. Prohibit polynomial or catastrophic backtracking regex patterns.`;
      case 'ANTI_HALLUCINATION':
        return `- **Anti-Hallucination Guard**: Never import unverified third-party packages or call undocumented methods. Verify all method signatures against official documentation.`;
      default:
        return `- **Defensive Invariant**: Validate preconditions and handle errors gracefully: ${finding.reason || 'General robustness requirement'}.`;
    }
  }

  /**
   * Mutates skill instructions by injecting verified procedural rules while
   * checking Negative CBR memory and enforcing the change budget.
   *
   * @param {string} originalText - Current skill instruction content
   * @param {string} targetSkill - Skill identifier (e.g., 'project-idioms')
   * @param {object|object[]} findings - Adversarial findings to harden against
   * @param {object} [options]
   * @returns {{ mutatedText: string, appliedRules: string[], rejectedCount: number, changeRatio: number, diff: string }}
   */
  mutateSkill(originalText, targetSkill, findings = [], options = {}) {
    if (typeof originalText !== 'string' || originalText.trim().length === 0) {
      throw new Error('Original skill text must be a non-empty string.');
    }
    if (!targetSkill || typeof targetSkill !== 'string') {
      throw new Error('Target skill identifier must be a non-empty string.');
    }

    const findingList = Array.isArray(findings) ? findings : [findings];
    const rejections = loadRejections(this.agentDir, targetSkill);
    const threshold = options.similarityThreshold || this.similarityThreshold;
    const maxRatio = options.maxChangeRatio || this.maxChangeRatio;
    const maxRules = options.maxRules || this.maxRules;

    const appliedRules = [];
    let rejectedCount = 0;

    for (const finding of findingList) {
      if (appliedRules.length >= maxRules) break;

      const candidateRule = this.synthesizeRuleFromFinding(finding);

      // 1. Negative CBR Memory Check
      const rejectionCheck = isPreviouslyRejected(candidateRule, rejections, threshold);
      if (rejectionCheck && rejectionCheck.rejected) {
        rejectedCount++;
        continue;
      }

      // Check against already applied rules in this batch
      const alreadyApplied = appliedRules.some(
        r => normalizedSimilarity(r, candidateRule) >= threshold,
      );
      if (alreadyApplied) {
        continue;
      }

      // Check if original text already contains this rule
      if (originalText.includes(candidateRule)) {
        continue;
      }

      appliedRules.push(candidateRule);
    }

    if (appliedRules.length === 0) {
      return {
        mutatedText: originalText,
        appliedRules: [],
        rejectedCount,
        changeRatio: 0,
        diff: '',
      };
    }

    // 2. Append or inject into procedural rules section
    let mutatedText = originalText;
    const headerPattern = /(##\s*(?:Procedural Rules|Guidelines|Instructions|Defensive Guardrails))/i;

    const rulesBlock = appliedRules.join('\n');
    if (headerPattern.test(mutatedText)) {
      mutatedText = mutatedText.replace(headerPattern, `$1\n${rulesBlock}`);
    } else {
      mutatedText = `${mutatedText.trim()}\n\n## Defensive Guardrails\n${rulesBlock}\n`;
    }

    // 3. Change Budget Enforcement
    const charDelta = Math.abs(mutatedText.length - originalText.length);
    const changeRatio = Math.round((charDelta / Math.max(originalText.length, 1)) * 10000) / 10000;

    if (changeRatio > maxRatio) {
      throw new Error(
        `Change Budget Exceeded: Mutation change ratio (${changeRatio}) exceeds maximum allowed ratio of ${maxRatio}.`,
      );
    }

    const diff = `+ ${appliedRules.join('\n+ ')}`;

    return {
      mutatedText,
      appliedRules,
      rejectedCount,
      changeRatio,
      diff,
    };
  }
}

module.exports = {
  SkillMutator,
  DEFAULT_CHANGE_BUDGET,
};
