'use strict';

const crypto = require('crypto');
const { REVIEWER_CATALOG: DEFAULT_CATALOG } = require('./reviewer_orchestrator');

const REVIEWER_SELECTION_SCHEMA_VERSION = 1;
const REVIEWER_ID_REGEX = /^[a-z0-9_-]+$/;

// Injection detection patterns: prompt injection delimiters or executable instructions
const INJECTION_PATTERNS = [
  /<\/?(?:system|instruction|override|prompt|context|admin)>/i,
  /\b(?:ignore|override|bypass)\s+(?:all\s+)?(?:rules|instructions|safety|security)\b/i,
  /\bprune\s+(?:all|security|mandatory)\b/i,
  /[\u200B-\u200D\uFEFF]/, // Zero-width characters
  /<script[\s>]/i,
  /javascript:/i,
];

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
}

function containsInjection(str) {
  if (typeof str !== 'string') return false;
  return INJECTION_PATTERNS.some(p => p.test(str));
}

/**
 * Validates a ReviewerSelectionResult against the Phase 2 contract.
 *
 * @param {Object} selection - The selection result to validate.
 * @param {Object} [options] - Optional validation settings.
 * @param {Array<Object>|Map<string, Object>} [options.catalog] - Authoritative catalog for ID validation.
 * @param {boolean} [options.strictCatalogCheck=true] - Whether to enforce that all reviewers exist in the catalog.
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateReviewerSelection(selection, options = {}) {
  const errors = [];

  if (!selection || typeof selection !== 'object' || Array.isArray(selection)) {
    return { valid: false, errors: ['Selection result must be a non-null object'] };
  }

  // 1. Schema version
  if (selection.schema_version !== REVIEWER_SELECTION_SCHEMA_VERSION) {
    errors.push(
      `Invalid schema_version: expected ${REVIEWER_SELECTION_SCHEMA_VERSION}, received ${selection.schema_version}`,
    );
  }

  // 2. Array type assertions
  const arrayFields = [
    'mandatory_reviewers',
    'selected_optional_reviewers',
    'pruned_optional_reviewers',
    'selected_reviewers',
  ];

  for (const field of arrayFields) {
    if (!Array.isArray(selection[field])) {
      errors.push(`Field "${field}" must be an array`);
    } else {
      for (const item of selection[field]) {
        if (typeof item !== 'string' || !item.trim()) {
          errors.push(`Field "${field}" contains non-string or empty item`);
          break;
        }
        if (!REVIEWER_ID_REGEX.test(item.trim())) {
          errors.push(`Reviewer ID "${item}" in "${field}" contains invalid characters (must match /^[a-z0-9_-]+$/)`);
          break;
        }
        if (containsInjection(item)) {
          errors.push(`Reviewer ID "${item}" in "${field}" contains prompt-injection pattern`);
          break;
        }
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const mandatorySet = new Set(selection.mandatory_reviewers);
  const selectedOptionalSet = new Set(selection.selected_optional_reviewers);
  const prunedSet = new Set(selection.pruned_optional_reviewers || selection.pruned_reviewers);
  const selectedSet = new Set(selection.selected_reviewers);

  // 3. Duplication checks
  if (mandatorySet.size !== selection.mandatory_reviewers.length) {
    errors.push('Duplicate reviewer IDs detected in mandatory_reviewers');
  }
  if (selectedOptionalSet.size !== selection.selected_optional_reviewers.length) {
    errors.push('Duplicate reviewer IDs detected in selected_optional_reviewers');
  }
  if (prunedSet.size !== (selection.pruned_optional_reviewers || selection.pruned_reviewers).length) {
    errors.push('Duplicate reviewer IDs detected in pruned_optional_reviewers');
  }
  if (selectedSet.size !== selection.selected_reviewers.length) {
    errors.push('Duplicate reviewer IDs detected in selected_reviewers');
  }

  // 4. Non-contradiction invariants
  // Invariant 4a: Selected and Pruned sets must be completely disjoint
  for (const r of selectedSet) {
    if (prunedSet.has(r)) {
      errors.push(`Contradiction: reviewer "${r}" is classified as both selected and pruned`);
    }
  }

  // Invariant 4b: All mandatory reviewers must be included in selected_reviewers
  for (const r of mandatorySet) {
    if (!selectedSet.has(r)) {
      errors.push(`Policy violation: mandatory reviewer "${r}" is missing from selected_reviewers`);
    }
    if (prunedSet.has(r)) {
      errors.push(`Security violation: mandatory reviewer "${r}" was placed in pruned_reviewers`);
    }
  }

  // Invariant 4c: selected_reviewers must equal mandatory_reviewers union selected_optional_reviewers
  const expectedSelected = new Set([...mandatorySet, ...selectedOptionalSet]);
  if (selectedSet.size !== expectedSelected.size || [...selectedSet].some(r => !expectedSelected.has(r))) {
    errors.push('selected_reviewers does not match union of mandatory_reviewers and selected_optional_reviewers');
  }

  // 5. Authoritative catalog validation
  const catalog = options.catalog || DEFAULT_CATALOG;
  const strictCheck = options.strictCatalogCheck !== false;
  if (strictCheck && catalog) {
    const validNames = new Set(
      Array.isArray(catalog)
        ? catalog.map(c => (typeof c === 'string' ? c : c.name || c.id)).filter(Boolean)
        : catalog instanceof Map
          ? Array.from(catalog.keys())
          : Object.keys(catalog),
    );

    if (validNames.size > 0) {
      for (const r of selectedSet) {
        if (!validNames.has(r)) {
          errors.push(`Unknown reviewer identifier "${r}" in selected_reviewers is not in catalog`);
        }
      }
      for (const r of prunedSet) {
        if (!validNames.has(r)) {
          errors.push(`Unknown reviewer identifier "${r}" in pruned_reviewers is not in catalog`);
        }
      }
    }
  }

  // 6. Reasons injection check
  const allReasons = (selection.selection_reasons || []).concat(selection.pruning_reasons || []);
  for (const r of allReasons) {
    const text = typeof r === 'string' ? r : r.reason || '';
    if (containsInjection(text)) {
      errors.push(`Selection/pruning reason contains prompt-injection pattern: ${text.slice(0, 50)}`);
      break;
    }
  }

  // 7. Fingerprint verification
  if (typeof selection.fingerprint !== 'string' || selection.fingerprint.length !== 64) {
    errors.push('Invalid or missing fingerprint: must be a 64-character SHA-256 hex string');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Builds a deterministic fail-closed fallback selection result.
 * Retains 100% of candidate reviewers with zero pruning.
 *
 * @param {Object} decisionPlan
 * @param {Array<Object>} [reviewerCatalog]
 * @param {string} [fallbackReason]
 * @returns {Object} Validated ReviewerSelectionResult
 */
function buildFallbackSelection(decisionPlan, reviewerCatalog, fallbackReason = 'Unknown failure') {
  const catalog = Array.isArray(reviewerCatalog) && reviewerCatalog.length > 0 ? reviewerCatalog : DEFAULT_CATALOG;
  const allCatalogNames = catalog.map(r => (typeof r === 'string' ? r : r.name || r.id)).filter(Boolean);

  const candidateNames = Array.from(
    new Set([
      ...(decisionPlan?.required_reviewers || []),
      ...(decisionPlan?.optional_reviewers || []),
    ]),
  );

  const finalNames = (candidateNames.length > 0 ? candidateNames : allCatalogNames)
    .filter(name => REVIEWER_ID_REGEX.test(name))
    .sort();

  const mandatoryNames = Array.from(new Set(decisionPlan?.required_reviewers || [])).sort();

  const rawInputs = JSON.stringify({
    fallback: true,
    reason: fallbackReason,
    mandatory: mandatoryNames,
    selected: finalNames,
    pruned: [],
  });
  const fingerprint = crypto.createHash('sha256').update(rawInputs).digest('hex');

  return {
    schema_version: REVIEWER_SELECTION_SCHEMA_VERSION,
    selection_id: `RS-FALLBACK-${Date.now()}-${fingerprint.slice(0, 8)}`,
    decision_plan_id: decisionPlan?.plan_id || null,
    decision_plan_fingerprint: decisionPlan?.fingerprint || null,
    mandatory_reviewers: mandatoryNames,
    required_reviewers: mandatoryNames, // Backward compatibility
    selected_optional_reviewers: finalNames.filter(r => !mandatoryNames.includes(r)),
    pruned_optional_reviewers: [],
    pruned_reviewers: [], // Backward compatibility
    selected_reviewers: finalNames,
    selection_reasons: finalNames.map(r => `${r}: selected via deterministic fallback (${fallbackReason})`),
    pruning_reasons: [`Fallback activated due to error: ${fallbackReason}`],
    policy_constraints: ['FAIL_CLOSED_FULL_RETENTION'],
    policy_version: 1,
    selection_source: 'deterministic_fallback',
    fallback_reason: fallbackReason,
    telemetry: {
      total_catalog_reviewers: catalog.length,
      candidate_reviewers_count: finalNames.length,
      mandatory_count: mandatoryNames.length,
      selected_optional_count: finalNames.length - mandatoryNames.length,
      pruned_count: 0,
      llm_calls_avoided: 0,
      selection_duration_ms: 0,
    },
    fingerprint,
  };
}

/**
 * Dynamic Reviewer Selection (System-1 Capability 2 / Phase 2)
 *
 * Evaluates candidate reviewers against the validated Decision Plan contract,
 * selecting mandatory reviewers unconditionally and pruning irrelevant optional reviewers
 * based on verified domain matches, risk signals, ambiguity, and reviewer capabilities.
 *
 * @param {Object} decisionPlan - The validated Decision Plan.
 * @param {Array<Object>} [reviewerCatalog] - Authoritative reviewer catalog.
 * @param {Object} [options] - Additional options (e.g. forcedReviewers).
 * @returns {Object} Validated ReviewerSelectionResult
 */
function dynamicReviewerSelection(decisionPlan, reviewerCatalog, options = {}) {
  const start = Date.now();

  try {
    // 1. Ingest and validate Decision Plan
    if (!decisionPlan || typeof decisionPlan !== 'object' || !decisionPlan.schema_version) {
      return buildFallbackSelection(
        decisionPlan,
        reviewerCatalog,
        'Invalid Decision Plan: missing or malformed object',
      );
    }

    // 2. Resolve catalog
    const catalog =
      Array.isArray(reviewerCatalog) && reviewerCatalog.length > 0
        ? reviewerCatalog
        : DEFAULT_CATALOG;

    const catalogMap = new Map();
    for (const r of catalog) {
      const name = typeof r === 'string' ? r : r.name || r.id;
      if (name) catalogMap.set(name.toLowerCase().trim(), r);
    }

    // 3. Extract plan fields with safe defaults
    const rawRequired = Array.isArray(decisionPlan.required_reviewers)
      ? decisionPlan.required_reviewers
      : [];
    const rawOptional = Array.isArray(decisionPlan.optional_reviewers)
      ? decisionPlan.optional_reviewers
      : [];

    const planDomains = (Array.isArray(decisionPlan.domains) ? decisionPlan.domains : [])
      .map(d => sanitizeString(d).toLowerCase())
      .filter(Boolean);

    const planRisk = typeof decisionPlan.risk === 'string' ? decisionPlan.risk.toUpperCase() : 'LOW';
    const planTier = typeof decisionPlan.tier === 'number' ? decisionPlan.tier : 1;
    const planAmbiguity =
      typeof decisionPlan.ambiguity === 'string' ? decisionPlan.ambiguity.toUpperCase() : 'LOW';
    const planVerification = Array.isArray(decisionPlan.verification_requirements)
      ? decisionPlan.verification_requirements
      : [];

    // Check for prompt-injection vectors attempting to alter policy
    const adversarialAttempt =
      containsInjection(decisionPlan.task) ||
      containsInjection(decisionPlan.rationale?.join(' ')) ||
      rawRequired.some(r => containsInjection(r)) ||
      rawOptional.some(r => containsInjection(r));

    // Determine candidate reviewer pool
    let candidateNames = Array.from(new Set([...rawRequired, ...rawOptional])).filter(
      r => typeof r === 'string' && REVIEWER_ID_REGEX.test(r),
    );

    // If candidate names is empty, candidate pool defaults to all catalog names
    if (candidateNames.length === 0) {
      candidateNames = Array.from(catalogMap.keys());
    }

    const mandatory = new Set();
    const selectedOptional = new Set();
    const pruned = new Set();
    const selectionReasons = [];
    const pruningReasons = [];
    const policyConstraints = ['MANDATORY_REVIEWER_PRESERVATION'];

    // ─── 4. Category A: MANDATORY REVIEWERS ───
    // Mandatory Rule 1: Reviewers explicitly required by Decision Plan
    for (const rName of rawRequired) {
      if (REVIEWER_ID_REGEX.test(rName)) {
        mandatory.add(rName);
        selectionReasons.push(`${rName}: mandatory (specified in required_reviewers)`);
      }
    }

    // Mandatory Rule 2: Security Policy Enforcement (Non-negotiable)
    const requiresSecurity =
      planRisk === 'HIGH' ||
      planVerification.includes('SECURITY_CHECKS') ||
      planVerification.includes('FULL_VALIDATION') ||
      planDomains.includes('security') ||
      planDomains.includes('auth');

    if (requiresSecurity) {
      mandatory.add('security-auditor');
      policyConstraints.push('HIGH_RISK_MANDATORY_SECURITY');
      if (!selectionReasons.some(r => r.startsWith('security-auditor:'))) {
        selectionReasons.push('security-auditor: mandatory (high risk / security verification requirement)');
      }
    }

    // Mandatory Rule 3: Tier 3 Domain Coverage (Full Gauntlet guarantees)
    if (planTier >= 3) {
      policyConstraints.push('TIER_3_FULL_GAUNTLET_COVERAGE');
      const domainSpecialists = {
        database: 'sql-reviewer',
        sql: 'sql-reviewer',
        schema: 'schema-reviewer',
        dependency: 'dependency-reviewer',
        ci_cd: 'pipeline-reviewer',
        devops: 'pipeline-reviewer',
      };

      for (const [dom, reviewer] of Object.entries(domainSpecialists)) {
        if (planDomains.includes(dom) && catalogMap.has(reviewer)) {
          mandatory.add(reviewer);
          if (!selectionReasons.some(r => r.startsWith(`${reviewer}:`))) {
            selectionReasons.push(`${reviewer}: mandatory (Tier 3 specialist for active domain "${dom}")`);
          }
        }
      }
    }

    // Mandatory Rule 4: Forced reviewers from options / plan
    const forced = options.forcedReviewers || decisionPlan.forced_reviewers || [];
    if (Array.isArray(forced)) {
      for (const f of forced) {
        if (typeof f === 'string' && REVIEWER_ID_REGEX.test(f.trim())) {
          const norm = f.trim();
          mandatory.add(norm);
          policyConstraints.push('FORCED_REVIEWER_OVERRIDE');
          selectionReasons.push(`${norm}: mandatory (forced override)`);
        }
      }
    }

    // Ensure all mandatory reviewers are present in candidate set
    for (const m of mandatory) {
      if (!candidateNames.includes(m)) {
        candidateNames.push(m);
      }
    }

    // ─── 5. Category B & C: OPTIONAL REVIEWER EVALUATION ───
    for (const rName of candidateNames) {
      // If already mandatory, skip optional evaluation
      if (mandatory.has(rName)) {
        continue;
      }

      const reviewerSpec = catalogMap.get(rName.toLowerCase());

      // If missing from catalog -> conservative retention
      if (!reviewerSpec) {
        selectedOptional.add(rName);
        selectionReasons.push(`${rName}: selected conservatively (missing metadata in catalog)`);
        continue;
      }

      const primaryDomains = (reviewerSpec.primary_domains || []).map(d => d.toLowerCase());
      const secondaryDomains = (reviewerSpec.secondary_domains || []).map(d => d.toLowerCase());
      const allDomains = [...primaryDomains, ...secondaryDomains];

      const matchedDomains = allDomains.filter(d => planDomains.includes(d));
      const hasMatchingDomain = matchedDomains.length > 0;
      const isSecurity = primaryDomains.includes('security') || primaryDomains.includes('auth');
      const priority = reviewerSpec.priority ? reviewerSpec.priority.toLowerCase() : 'medium';

      let isSelected = false;
      let selectionReason = '';

      if (hasMatchingDomain) {
        isSelected = true;
        selectionReason = `${rName}: selected (domain match: ${matchedDomains.join(', ')})`;
      } else if (requiresSecurity && isSecurity) {
        // Should have been mandatory, but just in case
        mandatory.add(rName);
        isSelected = true;
        selectionReason = `${rName}: mandatory (security policy)`;
      } else if (planAmbiguity === 'HIGH' && priority === 'critical') {
        isSelected = true;
        policyConstraints.push('AMBIGUITY_CRITICAL_RETENTION');
        selectionReason = `${rName}: selected (high ambiguity conservative retention; critical priority)`;
      } else if (planAmbiguity === 'MEDIUM' && (priority === 'critical' || priority === 'high')) {
        isSelected = true;
        policyConstraints.push('AMBIGUITY_HIGH_RETENTION');
        selectionReason = `${rName}: selected (medium ambiguity conservative retention; ${priority} priority)`;
      }

      if (isSelected) {
        if (!mandatory.has(rName)) {
          selectedOptional.add(rName);
        }
        selectionReasons.push(selectionReason);
      } else {
        pruned.add(rName);
        pruningReasons.push(
          `${rName}: pruned (no domain match for [${planDomains.join(', ') || 'none'}], priority: ${priority}, risk: ${planRisk})`,
        );
      }
    }

    // ─── 6. DEPENDENCY RESOLUTION (DAG with Cycle Defense) ───
    const resolving = new Set();
    const resolved = new Set();
    const initiallySelected = [...mandatory, ...selectedOptional];

    function resolveDeps(rName, isParentMandatory) {
      if (resolved.has(rName)) return;
      if (resolving.has(rName)) {
        throw new Error(`Dependency cycle detected involving ${rName}`);
      }

      resolving.add(rName);
      const spec = catalogMap.get(rName.toLowerCase());

      if (spec && Array.isArray(spec.dependencies)) {
        for (const dep of spec.dependencies) {
          const normDep = dep.toLowerCase().trim();
          if (!REVIEWER_ID_REGEX.test(normDep)) continue;

          // If dep was pruned, unprune it
          if (pruned.has(normDep)) {
            pruned.delete(normDep);
            const pruneIdx = pruningReasons.findIndex(p => p.startsWith(`${normDep}:`));
            if (pruneIdx !== -1) pruningReasons.splice(pruneIdx, 1);
          }

          if (isParentMandatory) {
            mandatory.add(normDep);
            selectionReasons.push(`${normDep}: mandatory (dependency of mandatory reviewer ${rName})`);
          } else if (!mandatory.has(normDep)) {
            selectedOptional.add(normDep);
            selectionReasons.push(`${normDep}: selected (dependency of ${rName})`);
          }

          resolveDeps(normDep, isParentMandatory);
        }
      }

      resolving.delete(rName);
      resolved.add(rName);
    }

    for (const r of initiallySelected) {
      resolveDeps(r, mandatory.has(r));
    }

    // Adversarial guardrail: if adversarial attempt detected, ensure mandatory reviewers remain intact
    if (adversarialAttempt) {
      policyConstraints.push('ADVERSARIAL_INJECTION_DEFENSE_APPLIED');
    }

    // ─── 7. DETERMINISTIC CANONICAL NORMALIZATION ───
    const sortedMandatory = Array.from(mandatory).sort();
    const sortedSelectedOptional = Array.from(selectedOptional).filter(r => !mandatory.has(r)).sort();
    const sortedPruned = Array.from(pruned).sort();
    const sortedSelected = Array.from(new Set([...sortedMandatory, ...sortedSelectedOptional])).sort();

    const sortedSelectionReasons = Array.from(new Set(selectionReasons)).sort();
    const sortedPruningReasons = Array.from(
      new Set(pruningReasons.filter(p => sortedPruned.some(pr => p.startsWith(`${pr}:`)))),
    ).sort();

    const uniqueConstraints = Array.from(new Set(policyConstraints)).sort();

    const durationMs = Date.now() - start;

    // Canonical fingerprint inputs
    const canonicalPayload = JSON.stringify({
      dp_fingerprint: decisionPlan.fingerprint || null,
      mandatory: sortedMandatory,
      selected: sortedSelected,
      pruned: sortedPruned,
      policy: uniqueConstraints,
    });
    const fingerprint = crypto.createHash('sha256').update(canonicalPayload).digest('hex');

    const result = {
      schema_version: REVIEWER_SELECTION_SCHEMA_VERSION,
      selection_id: `RS-${Date.now()}-${fingerprint.slice(0, 8)}`,
      decision_plan_id: decisionPlan.plan_id || null,
      decision_plan_fingerprint: decisionPlan.fingerprint || null,
      mandatory_reviewers: sortedMandatory,
      required_reviewers: sortedMandatory, // 100% backward compatibility
      selected_optional_reviewers: sortedSelectedOptional,
      pruned_optional_reviewers: sortedPruned,
      pruned_reviewers: sortedPruned, // 100% backward compatibility
      selected_reviewers: sortedSelected,
      selection_reasons: sortedSelectionReasons,
      pruning_reasons: sortedPruningReasons,
      policy_constraints: uniqueConstraints,
      policy_version: 1,
      selection_source: 'decision_plan',
      fallback_reason: null,
      telemetry: {
        total_catalog_reviewers: catalogMap.size,
        candidate_reviewers_count: candidateNames.length,
        mandatory_count: sortedMandatory.length,
        selected_optional_count: sortedSelectedOptional.length,
        pruned_count: sortedPruned.length,
        llm_calls_avoided: sortedPruned.length,
        selection_duration_ms: durationMs,
      },
      fingerprint,
    };

    // 8. Self-validation check
    const validation = validateReviewerSelection(result, {
      catalog: catalogMap,
      strictCatalogCheck: false, // allow mock catalog in tests
    });

    if (!validation.valid) {
      return buildFallbackSelection(
        decisionPlan,
        catalog,
        `Self-validation failed: ${validation.errors.join('; ')}`,
      );
    }

    return result;
  } catch (err) {
    return buildFallbackSelection(decisionPlan, reviewerCatalog, err.message);
  }
}

module.exports = {
  dynamicReviewerSelection,
  validateReviewerSelection,
  buildFallbackSelection,
  REVIEWER_SELECTION_SCHEMA_VERSION,
  REVIEWER_ID_REGEX,
};
