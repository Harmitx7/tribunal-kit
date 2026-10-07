'use strict';

/**
 * verification_auditor.js — Tribunal Kit Verification & Post-Execution Auditor
 * ============================================================================
 * Implements Phase 8 & Phase 9 of the Skill Intelligence Engine:
 *   - Post-Execution Coverage Recheck
 *   - Failure Mode Recheck
 *   - Implementation Verification (Concept detected vs implemented)
 *   - Dynamic Coverage Downgrade upon verification failure
 *   - Unexpected Implementation Risk & New Capability Gap Detection
 *   - Closed-Loop Corrective Action Generation
 *   - Skill Telemetry & Improvement Proposals
 */

const fs = require('fs');
const path = require('path');

/**
 * Audit post-execution evidence against discovered task intelligence.
 *
 * @param {Object|string} taskIntelligenceOrQuery - Pre-execution analysis or task query
 * @param {Object} executionEvidence - Evidence from implementation & verification
 *   - code_diff: string (diff or modified code)
 *   - changed_files: string[] (list of files modified)
 *   - tests_executed: Array<{ name: string, target?: string, passed: boolean, error?: string }>
 *   - runtime_observations: string[]
 * @param {Object} [options]
 * @returns {Object} Post-execution audit report
 */
function auditPostExecution(taskIntelligenceOrQuery, executionEvidence, options = {}) {
  let taskIntelligence;
  const agentDir = options.agentDir || path.resolve(__dirname, '..', '.agent');

  if (typeof taskIntelligenceOrQuery === 'string') {
    const { analyzeTask } = require('./skill_intelligence');
    taskIntelligence = analyzeTask(taskIntelligenceOrQuery, agentDir);
  } else {
    taskIntelligence = taskIntelligenceOrQuery;
  }

  const evidence = executionEvidence || {};
  const codeDiff = (evidence.code_diff || '').toLowerCase();
  const changedFiles = (evidence.changed_files || []).map(f => f.toLowerCase());
  const tests = evidence.tests_executed || [];
  const runtimeObs = (evidence.runtime_observations || []).map(o => o.toLowerCase());

  const auditFindings = [];
  const downgradedConcepts = [];
  const verifiedConcepts = [];
  const unverifiedFailureModes = [];
  const newCapabilityGaps = [];
  const correctiveActions = [];

  // Extract concept list from task intelligence
  const allConcepts = Array.isArray(taskIntelligence.concepts)
    ? taskIntelligence.concepts
    : taskIntelligence.concepts && taskIntelligence.concepts.all
      ? taskIntelligence.concepts.all.map(name => ({
          name,
          id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        }))
      : (taskIntelligence.coverage || []).map(c => ({ id: c.concept_id, name: c.concept_name }));

  // 1. Implementation Verification (Was each discovered concept addressed in code or files?)
  for (const concept of allConcepts) {
    const cId = (concept.id || concept.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const cName = (concept.name || concept.id || '').toLowerCase();
    const tokens = cName.split(/\s+/).filter(t => t.length > 3);

    // Look for traces of concept in diff, changed filenames, or tests
    let hasCodeTrace = false;
    if (codeDiff.includes(cId) || codeDiff.includes(cName)) {
      hasCodeTrace = true;
    } else {
      hasCodeTrace = tokens.some(
        tok => codeDiff.includes(tok) || changedFiles.some(f => f.includes(tok)),
      );
    }

    const testForConcept = tests.find(
      t =>
        (t.target && (t.target.toLowerCase() === cId || t.target.toLowerCase().includes(cId))) ||
        (t.name &&
          (t.name.toLowerCase().includes(cName) ||
            tokens.some(tok => t.name.toLowerCase().includes(tok)))),
    );

    if (!hasCodeTrace && !testForConcept) {
      auditFindings.push({
        type: 'UNIMPLEMENTED_CONCEPT',
        severity: 'HIGH',
        concept: concept.name || concept.id,
        detail: `Discovered concept '${concept.name || concept.id}' had no identifiable code changes or tests in execution evidence.`,
      });
      correctiveActions.push(`Implement missing capability for '${concept.name || concept.id}'.`);
    } else if (testForConcept) {
      if (!testForConcept.passed) {
        // Concept was implemented but verification failed!
        downgradedConcepts.push({
          concept: concept.name || concept.id,
          previous_coverage: 'PARTIAL',
          current_coverage: 'DOWNGRADED_FAILED',
          reason: testForConcept.error || `Verification test '${testForConcept.name}' failed.`,
        });
        auditFindings.push({
          type: 'VERIFICATION_FAILURE',
          severity: 'CRITICAL',
          concept: concept.name || concept.id,
          detail: `Verification for '${concept.name || concept.id}' failed: ${testForConcept.error || 'Test assertion failed.'}`,
        });
        correctiveActions.push(
          `Fix verification failure in '${concept.name || concept.id}' (${testForConcept.name}): ${testForConcept.error || 'Assertion failed'} and re-verify.`,
        );
      } else {
        verifiedConcepts.push({
          concept: concept.name || concept.id,
          test: testForConcept.name,
          status: 'VERIFIED',
        });
      }
    } else {
      // Code exists but no explicit test ran
      auditFindings.push({
        type: 'UNVERIFIED_IMPLEMENTATION',
        severity: 'MEDIUM',
        concept: concept.name || concept.id,
        detail: `Code trace exists for '${concept.name || concept.id}', but no targeted verification test was executed.`,
      });
      correctiveActions.push(`Add targeted verification test for '${concept.name || concept.id}'.`);
    }
  }

  // 2. Failure Mode Recheck
  const failureModes = taskIntelligence.failure_modes || [];
  for (const fm of failureModes) {
    const fmNormalized = fm.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
    const testAddressed = tests.some(
      t =>
        (t.name && t.name.toLowerCase().includes(fmNormalized)) ||
        (t.target && t.target.toLowerCase().includes(fmNormalized)),
    );
    const obsAddressed = runtimeObs.some(o => o.includes(fmNormalized));

    if (!testAddressed && !obsAddressed) {
      unverifiedFailureModes.push(fm);
    }
  }

  if (unverifiedFailureModes.length > 0) {
    auditFindings.push({
      type: 'UNVERIFIED_FAILURE_MODES',
      severity: 'MEDIUM',
      count: unverifiedFailureModes.length,
      failure_modes: unverifiedFailureModes,
      detail: `${unverifiedFailureModes.length} identified failure modes were not explicitly verified in the test run.`,
    });
  }

  // 3. Unexpected Implementation Risk & New Capability Gap Detection
  // Check if codeDiff introduced risky anti-patterns
  const riskPatterns = [
    {
      regex: /(?:SELECT\s+.*\s+FROM\s+.*\s+WHERE\s+.*['"]\s*\+)|(?:\$\{[^}]*\}\s*WHERE)/i,
      risk: 'SQL Injection Vulnerability',
      gapSkill: 'agentshield-security',
      recommendation: 'Use parameterized queries or ORM bindings instead of string interpolation.',
    },
    {
      regex: /(?:password|secret|api_key|token)\s*=\s*['"][a-zA-Z0-9_\-]{8,}['"]/i,
      risk: 'Hardcoded Secret / Credential',
      gapSkill: 'agentshield-security',
      recommendation: 'Extract secrets to environment variables.',
    },
    {
      regex: /(?:Promise\.all\(\s*.*\.map\()/i,
      risk: 'Unbounded Concurrency Spike',
      gapSkill: 'error-resilience',
      recommendation: 'Use p-limit or p-queue to throttle parallel execution.',
    },
  ];

  const activePipeline =
    (taskIntelligence.composition && taskIntelligence.composition.pipeline) || [];

  for (const rp of riskPatterns) {
    if (rp.regex.test(codeDiff)) {
      const isCovered = activePipeline.includes(rp.gapSkill);
      newCapabilityGaps.push({
        risk: rp.risk,
        recommended_skill: rp.gapSkill,
        covered_by_active_pipeline: isCovered,
        recommendation: rp.recommendation,
      });
      auditFindings.push({
        type: 'NEW_IMPLEMENTATION_RISK',
        severity: 'CRITICAL',
        risk: rp.risk,
        detail: `New code diff introduces risk: ${rp.risk}. ${rp.recommendation}`,
      });
      if (!isCovered) {
        correctiveActions.push(`Activate capability '${rp.gapSkill}' to remediate ${rp.risk}.`);
      }
    }
  }

  const criticalIssues = auditFindings.filter(f => f.severity === 'CRITICAL');
  const highIssues = auditFindings.filter(f => f.severity === 'HIGH');
  const isComplete =
    criticalIssues.length === 0 && highIssues.length === 0 && downgradedConcepts.length === 0;

  return {
    status: isComplete ? 'VERIFIED' : 'ACTION_REQUIRED',
    is_complete: isComplete,
    findings_count: auditFindings.length,
    findings: auditFindings,
    verified_concepts: verifiedConcepts,
    downgraded_concepts: downgradedConcepts,
    unverified_failure_modes: unverifiedFailureModes,
    new_capability_gaps: newCapabilityGaps,
    corrective_actions: correctiveActions,
    audit_summary: {
      total_concepts_checked: allConcepts.length,
      verified_count: verifiedConcepts.length,
      downgraded_count: downgradedConcepts.length,
      unimplemented_count: auditFindings.filter(f => f.type === 'UNIMPLEMENTED_CONCEPT').length,
      new_risks_detected: newCapabilityGaps.length,
    },
  };
}

/**
 * Generate a structured Skill Improvement Proposal when gaps or partial coverage are discovered.
 *
 * @param {string} targetSkillOrGap - Name of existing skill or capability gap
 * @param {Object} context - Evidence context
 * @param {string} [agentDir] - Agent directory
 * @returns {Object} Skill improvement proposal
 */
function generateImprovementProposal(targetSkillOrGap, context = {}, agentDir) {
  const isExistingSkill = Boolean(context.existingSkill);
  const gapName = context.gap || targetSkillOrGap;

  return {
    proposal_id: `prop-${(targetSkillOrGap || 'skill').replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`,
    target: targetSkillOrGap,
    type: isExistingSkill ? 'ENHANCE_EXISTING_SKILL' : 'EVALUATE_NEW_CAPABILITY',
    rationale: isExistingSkill
      ? `Extending existing skill '${targetSkillOrGap}' preserves cohesion and satisfies 11-check gate without proliferating duplicate skills.`
      : `Addressing confirmed capability gap '${gapName}' with a modular, highly focused engineering capability.`,
    gap_addressed: gapName,
    failure_modes_covered: context.failure_modes || [],
    proposed_enhancements: [
      `Add explicit engineering guidelines for '${gapName}' to SKILL.md.`,
      `Incorporate verification checklist tests targeting failure modes: ${(context.failure_modes || ['edge-case-regression']).join(', ')}.`,
      `Update skill triggers and taxonomy mappings.`,
    ],
    validation_gate_passed: false,
    status: 'PROPOSED_PENDING_APPROVAL',
  };
}

/**
 * Formalized Schema Validation per Skill (Phase 5/6)
 * Validates skill inputs/outputs against Canonical Contracts dynamically using Zod.
 *
 * @param {Object} skillContract - The loaded Canonical Skill Contract (YAML/JSON parsed)
 * @param {Object} payload - The input or output payload to validate
 * @param {string} payloadType - 'input' | 'output'
 * @returns {{ valid: boolean, errors: Array<string> }}
 */
function validateSkillSchema(skillContract, payload, payloadType = 'input') {
  if (!skillContract || typeof skillContract !== 'object') {
    return { valid: false, errors: ['Invalid skill contract provided for validation.'] };
  }

  const contractDefinition = skillContract.contract || skillContract;

  // If the skill doesn't formally define inputs/outputs, it is technically "valid" by lack of constraints,
  // but we flag it as an unverified boundary.
  if (!contractDefinition.inputs && payloadType === 'input') {
    return { valid: true, errors: ['WARNING: Skill lacks formal input schema contract.'] };
  }
  if (!contractDefinition.outputs && payloadType === 'output') {
    return { valid: true, errors: ['WARNING: Skill lacks formal output schema contract.'] };
  }

  const schemaDef =
    payloadType === 'input' ? contractDefinition.inputs : contractDefinition.outputs;
  if (!schemaDef) {
    return { valid: true, errors: [] };
  }

  try {
    const { z } = require('zod');

    // Dynamically build a Zod object schema based on the skill contract definition
    const shape = {};
    for (const [key, fieldDef] of Object.entries(schemaDef)) {
      let zType = z.any();

      const typeStr = (fieldDef.type || 'string').toLowerCase();
      if (typeStr === 'string') zType = z.string();
      else if (typeStr === 'number') zType = z.number();
      else if (typeStr === 'boolean') zType = z.boolean();
      else if (typeStr === 'array') zType = z.array(z.any());
      else if (typeStr === 'object') zType = z.record(z.any());

      if (fieldDef.required !== false) {
        // Assume required by default unless explicitly false
      } else {
        zType = zType.optional();
      }

      if (fieldDef.description) {
        zType = zType.describe(fieldDef.description);
      }

      shape[key] = zType;
    }

    const schema = z.object(shape).strict(); // Strict to prevent payload poisoning

    try {
      schema.parse(payload);
      return { valid: true, errors: [] };
    } catch (e) {
      if (e && Array.isArray(e.errors)) {
        return {
          valid: false,
          errors: e.errors.map(err => `${(err.path || []).join('.')}: ${err.message}`),
        };
      }
      return { valid: false, errors: [e.message] };
    }
  } catch (err) {
    // If Zod is unavailable, fallback gracefully
    return { valid: false, errors: [`Schema validation engine error: ${err.message}`] };
  }
}

module.exports = {
  auditPostExecution,
  generateImprovementProposal,
  validateSkillSchema,
};
