'use strict';

/**
 * decision_engine.js — System-1 Capability 2: Cross-Capability Decision Engine
 * ============================================================================
 * Unified System-1 decision layer that combines:
 * - Impact (Laya ONNX + change volume heuristic)
 * - Risk (diff patterns, sensitive file types, credential leaks)
 * - Evidence Intelligence (relevance, coverage, confidence L1-L4)
 * - Browser / Interaction Intelligence (UI risk, route impact, CDP availability)
 * - Adaptive Reviewer Orchestration (minimal covering reviewer set)
 *
 * Core Directives:
 * 1. Monotonic Safety: Uncertainty maintains or increases scrutiny; never silently reduces scrutiny.
 * 2. Precedence: High-risk signals can never be downgraded by low-confidence capabilities.
 * 3. Explainability: Every decision contains an explicit audit trail of why the tier was chosen,
 *    which signals fired, which capabilities were consulted or unavailable, and whether fallback was used.
 */

const crypto = require('crypto');
const {
  HIGH_RISK_PATTERNS,
  HIGH_RISK_EXTENSIONS,
  TIER_NAMES,
  ROUTING_NAMES,
} = require('./constants');
const { collectAndRankEvidence } = require('./evidence_engine');
const { evaluateBrowserRequirement } = require('./browser_intelligence');
const { orchestrateReviewers } = require('./reviewer_orchestrator');

function resolveMonotonicImpactTier(options = {}) {
  const opts = options && typeof options === 'object' ? options : {};
  const rawFiles = opts.files;
  const files = (
    Array.isArray(rawFiles) ? rawFiles : typeof rawFiles === 'string' ? rawFiles.split(',') : []
  )
    .map(f =>
      typeof f === 'string'
        ? f
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .trim()
            .replace(/\\/g, '/')
        : '',
    )
    .filter(Boolean);
  const rawLines =
    typeof opts.lines === 'number' && !isNaN(opts.lines)
      ? opts.lines
      : parseInt(opts.lines, 10) || 0;
  const lines = Math.max(0, rawLines);
  const task = typeof opts.task === 'string' ? opts.task.replace(/[\u200B-\u200D\uFEFF]/g, '') : '';
  const diff = typeof opts.diff === 'string' ? opts.diff.replace(/[\u200B-\u200D\uFEFF]/g, '') : '';
  const layaTier = opts.layaTier;

  const fileCount = files.length;

  // 1. Base tier from change volume
  const isFastPass =
    fileCount <= 2 &&
    lines <= 10 &&
    files.length > 0 &&
    files.every(f => /\.(css|scss|less|md|txt|svg|png|jpg)$/i.test(f));

  let baseTier = 0;
  if (isFastPass || (fileCount === 0 && lines <= 5)) baseTier = 0;
  else if (fileCount <= 1 && lines <= 50) baseTier = 1;
  else if (fileCount <= 5 && lines <= 200) baseTier = 2;
  else baseTier = 3;

  // 2. Concrete risk evidence analysis
  const isPureDocFiles =
    fileCount > 0 &&
    files.every(f => /\.(md|txt|markdown|rst|adoc)$/i.test(f) || f.includes('docs/'));

  // Concrete secret or code patterns that make even documentation dangerous
  const secretOrExecPatterns =
    /(?:-----BEGIN [A-Z ]+KEY-----|eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+|AKIA[0-9A-Z]{16}|(?:aws[_-]?)?(?:api[_-]?key|secret(?:[_-]?key)?|password|bearer|auth[_-]?token|access[_-]?key(?:[_-]?id)?)\s*[:=]\s*['"]?[^'"\s\n]{6,}['"]?)/i;

  const diffHasCode =
    /^\+[ \t]*(?:const|let|var|function|def|import|require|class|export|db\.|SELECT|UPDATE|DELETE|INSERT|jwt\.|auth\.)/im.test(
      diff,
    );
  const diffMatchesHighRiskCode = diffHasCode && HIGH_RISK_PATTERNS.test(diff);

  const diffHasHighRisk =
    HIGH_RISK_EXTENSIONS.test(diff) ||
    diffMatchesHighRiskCode ||
    (!isPureDocFiles && HIGH_RISK_PATTERNS.test(diff)) ||
    secretOrExecPatterns.test(diff);

  const fileHasHighRisk = files.some(
    f =>
      HIGH_RISK_EXTENSIONS.test(f) ||
      (!isPureDocFiles && HIGH_RISK_PATTERNS.test(f)) ||
      f.includes('docker') ||
      f.includes('.github/'),
  );

  let riskEvidenceTier = 0;
  if (diffHasHighRisk || fileHasHighRisk) {
    riskEvidenceTier = 3;
  } else if (!isPureDocFiles && HIGH_RISK_PATTERNS.test(task + ' ' + files.join(' '))) {
    riskEvidenceTier = 3;
  }

  // 3. Negative controls (Documentation changes)
  // A doc change remains low risk (Tier 0) UNLESS concrete high-risk implementation evidence exists in files or diff
  if (isPureDocFiles && !diffHasHighRisk && !fileHasHighRisk) {
    return 0;
  }

  // 4. Ambiguity tier: short vague tasks (<= 2 words) touching non-doc code files
  let ambiguityTier = 0;
  const wordCount = task.trim().length > 0 ? task.trim().split(/\s+/).length : 0;
  if (wordCount > 0 && wordCount <= 2 && fileCount > 0 && !isPureDocFiles) {
    ambiguityTier = 2;
  }

  // 5. Monotonic aggregation: finalTier = max(baseTier, layaTier, riskEvidenceTier, ambiguityTier)
  const candidateTiers = [baseTier, riskEvidenceTier, ambiguityTier];
  if (typeof layaTier === 'number' && !isNaN(layaTier) && layaTier >= 0 && layaTier <= 3) {
    candidateTiers.push(layaTier);
  }

  return Math.max(...candidateTiers);
}

/**
 * Evaluate cross-capability System-1 decision
 * @param {Object} options
 * @param {string} [options.task]
 * @param {string} [options.diff]
 * @param {string[]|string} [options.files]
 * @param {number} [options.lines]
 * @param {Object} [options.evidence] - Optional pre-computed evidence
 * @param {Object} [options.browserSignal] - Optional pre-computed browser signal
 * @param {number|null} [options.layaTier] - Optional Laya inference output
 * @param {string} [options.repoRoot] - Optional repository root
 * @param {Array} [options.memory] - Optional memory items
 * @param {Array} [options.previousFindings] - Optional previous findings
 * @param {Object} [options.environment] - Optional environment overrides (e.g. browserFound)
 * @returns {Object} Comprehensive Decision Payload
 */
function evaluateDecision(options = {}) {
  const rawTask = typeof options.task === 'string' ? options.task : '';
  const task = rawTask.replace(/[\u200B-\u200D\uFEFF]/g, '');
  const rawDiff = typeof options.diff === 'string' ? options.diff : '';
  const diff = rawDiff.replace(/[\u200B-\u200D\uFEFF]/g, '');
  const rawFiles = options.files;
  const files = (
    Array.isArray(rawFiles) ? rawFiles : typeof rawFiles === 'string' ? rawFiles.split(',') : []
  )
    .map(f =>
      typeof f === 'string'
        ? f
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .trim()
            .replace(/\\/g, '/')
        : '',
    )
    .filter(Boolean);
  const rawLines =
    typeof options.lines === 'number' && !isNaN(options.lines)
      ? options.lines
      : parseInt(options.lines, 10) || (diff ? diff.split('\n').length : 0);
  const lines = Math.max(0, rawLines);
  const repoRoot = options.repoRoot || process.cwd();
  const layaTier = options.layaTier ?? null;

  const capabilitiesConsulted = [];
  const capabilitiesUnavailable = [];
  const firedRiskSignals = [];
  const monotonicSafeguards = [];
  let fallbackUsed = false;

  // 1. Evidence Intelligence Consultation
  let evidenceResult = options.evidence;
  if (!evidenceResult) {
    try {
      evidenceResult = collectAndRankEvidence({
        task,
        diff,
        files,
        repoRoot,
        memory: options.memory,
        previousFindings: options.previousFindings,
      });
      capabilitiesConsulted.push('evidence_engine');
    } catch (_) {
      capabilitiesUnavailable.push('evidence_engine');
      evidenceResult = {
        evidence: [],
        summary: { confidence: 'L4', critical_evidence_count: 0, has_security_boundary: false },
      };
    }
  } else {
    capabilitiesConsulted.push('evidence_engine (provided)');
  }

  // 2. Browser Intelligence Consultation
  let browserSignal = options.browserSignal;
  if (!browserSignal) {
    try {
      browserSignal = evaluateBrowserRequirement({
        files,
        diff,
        task,
        environment: options.environment,
      });
      capabilitiesConsulted.push('browser_intelligence');
      if (browserSignal.browser_available === 'UNAVAILABLE') {
        capabilitiesUnavailable.push('browser_cdp');
      }
    } catch (_) {
      capabilitiesUnavailable.push('browser_intelligence');
      browserSignal = {
        requires_browser_verification: false,
        validation_level: 'NONE',
        browser_available: 'UNAVAILABLE',
        escalate: false,
      };
    }
  } else {
    capabilitiesConsulted.push('browser_intelligence (provided)');
  }

  // 3. Impact & Risk Analysis
  if (layaTier !== null && typeof layaTier === 'number') {
    capabilitiesConsulted.push('laya_onnx');
  } else {
    capabilitiesConsulted.push('deterministic_heuristic');
    capabilitiesUnavailable.push('laya_onnx');
    fallbackUsed = true;
  }

  // Scan concrete risk signals
  const combinedContext = `${task}\n${diff}\n${files.join('\n')}`;
  if (HIGH_RISK_PATTERNS.test(combinedContext)) {
    firedRiskSignals.push('HIGH_RISK_PATTERNS (auth/crypto/secrets/tokens/database)');
  }
  if (files.some(f => HIGH_RISK_EXTENSIONS.test(f)) || HIGH_RISK_EXTENSIONS.test(diff)) {
    firedRiskSignals.push('HIGH_RISK_EXTENSIONS (.sql, .prisma, .tf)');
  }
  if (
    /(?:-----BEGIN [A-Z ]+KEY-----|eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+|(?:api[_-]?key|secret|password)\s*[:=])/i.test(
      diff,
    )
  ) {
    firedRiskSignals.push('SECRET_OR_KEY_PATTERN (possible exposed credentials)');
  }
  if (evidenceResult.summary?.has_security_boundary) {
    firedRiskSignals.push(
      'SECURITY_BOUNDARY_EVIDENCE (direct touch of security policy / boundary)',
    );
  }

  // Calculate baseline monotonic tier with fail-closed production safeguard
  let calculatedTier = 3;
  try {
    const resolver =
      typeof options.tierResolver === 'function'
        ? options.tierResolver
        : resolveMonotonicImpactTier;
    calculatedTier = resolver({
      files,
      lines,
      task,
      diff,
      layaTier,
    });
  } catch (err) {
    calculatedTier = 3;
    monotonicSafeguards.push(
      `Tier calculation fallback to Tier 3 due to exception: ${err.message}`,
    );
  }

  if (
    typeof calculatedTier !== 'number' ||
    isNaN(calculatedTier) ||
    calculatedTier < 0 ||
    calculatedTier > 3
  ) {
    calculatedTier = 3;
    monotonicSafeguards.push(
      `Tier calculation fallback to Tier 3 due to invalid output from resolver`,
    );
  }

  let finalTier = calculatedTier;
  let escalated = false;
  let escalationReason = null;

  // 4. Cross-Capability Monotonic Rules & Conflict Resolution
  // Base tier strictly from change volume (ignoring risk for safeguard comparison)
  const isFastPassVol =
    files.length <= 2 &&
    lines <= 10 &&
    files.every(f => /\.(css|scss|less|md|txt|svg|png|jpg)$/i.test(f));
  const baseVolumeTier =
    isFastPassVol || (files.length === 0 && lines <= 5)
      ? 0
      : files.length <= 1 && lines <= 50
        ? 1
        : files.length <= 5 && lines <= 200
          ? 2
          : 3;

  // Rule A: High Risk + Low Base Tier -> Enforce Tier 3
  if (firedRiskSignals.length > 0) {
    const isPureDoc = files.length > 0 && files.every(f => /\.(md|txt)$/i.test(f));
    const hasDiffRisk = firedRiskSignals.some(
      s =>
        s.includes('SECRET') ||
        s.includes('HIGH_RISK_EXTENSIONS') ||
        s.includes('SECURITY_BOUNDARY') ||
        diff.includes('jwt') ||
        diff.includes('auth'),
    );
    if (!isPureDoc || hasDiffRisk) {
      if (finalTier < 3) {
        finalTier = 3;
      }
      if (baseVolumeTier < 3) {
        monotonicSafeguards.push(
          'Enforced Tier 3: Concrete risk signals detected despite low change volume',
        );
      }
    }
  }

  // Rule B: Low Evidence Confidence (L4 / unavailable) forbids Fast-Pass (Tier 0)
  const evidenceConfidence = evidenceResult.summary?.confidence || 'L4';
  if ((evidenceConfidence === 'L4' || evidenceResult.evidence.length === 0) && finalTier === 0) {
    const isTrivialDoc = files.length > 0 && files.every(f => /\.(md|txt)$/i.test(f)) && lines <= 5;
    if (!isTrivialDoc) {
      finalTier = 1; // Cannot fast-pass when evidence is unavailable/unverified
      monotonicSafeguards.push(
        'Elevated from Tier 0 to Tier 1: Low evidence confidence forbids Fast-Pass assumption',
      );
    }
  }

  // Rule C: Laya Downgrade Prevention
  if (layaTier !== null && layaTier < finalTier) {
    monotonicSafeguards.push(
      `Prevented Laya downgrade: Laya suggested Tier ${layaTier}, but deterministic evidence mandated Tier ${finalTier}`,
    );
  }

  // Rule D: Browser Intelligence Escalation
  // If browser validation is required (SMOKE/FUNCTIONAL/HIGH_RISK) but browser is UNAVAILABLE, escalate
  if (browserSignal.requires_browser_verification && browserSignal.escalate) {
    escalated = true;
    escalationReason =
      browserSignal.safety_notice ||
      'Browser verification is required but browser runtime is unavailable.';
    monotonicSafeguards.push(
      'Escalation triggered: Missing browser execution capability for UI change',
    );
  }

  // If browser risk is HIGH_RISK, elevate tier to at least Tier 2
  if (browserSignal.validation_level === 'HIGH_RISK' && finalTier < 2) {
    finalTier = 2;
    monotonicSafeguards.push(
      'Elevated to Tier 2: High-risk browser verification (payment/auth UI)',
    );
  }

  // If Tier 2 and Browser risk is HIGH_RISK + browser unavailable -> Escalate to human gate
  if (
    finalTier >= 2 &&
    browserSignal.validation_level === 'HIGH_RISK' &&
    browserSignal.browser_available === 'UNAVAILABLE'
  ) {
    escalated = true;
    escalationReason =
      'High-risk payment/auth browser verification required but browser environment is unavailable.';
  }

  // 5. Adaptive Reviewer Orchestration
  let reviewerResult;
  try {
    reviewerResult = orchestrateReviewers({
      tier: finalTier,
      files,
      diff,
      task,
      evidence: evidenceResult.evidence,
      previousFindings: options.previousFindings,
    });
    capabilitiesConsulted.push('reviewer_orchestrator');
  } catch (_) {
    capabilitiesUnavailable.push('reviewer_orchestrator');
    reviewerResult = {
      selected: [],
      rejected: [],
      total_selected: 0,
      coverage: { all_risks_covered: false },
    };
  }

  // 6. Routing Decision & Socratic Gate
  const routing = escalated ? 'ESCALATE' : ROUTING_NAMES[finalTier] || 'TARGETED_REVIEW';

  const socraticGate = escalated
    ? 'required'
    : finalTier >= 3
      ? 'required'
      : finalTier >= 2
        ? 'conditional'
        : 'bypass';

  // 7. Explanations & Provenance
  const influencingEvidence = evidenceResult.evidence
    .filter(e => e.score >= 0.8 || e.is_mandatory)
    .map(e => `${e.id} (score: ${e.score})`);

  let whyTierSelected = `Classified as ${TIER_NAMES[finalTier]} (Tier ${finalTier}). `;
  if (firedRiskSignals.length > 0) {
    whyTierSelected += `Risk signals fired: [${firedRiskSignals.join(', ')}]. `;
  } else if (finalTier === 0) {
    whyTierSelected +=
      'Change is low-volume styling/documentation with zero risk signals (Fast-Pass eligible). ';
  } else if (finalTier === 1) {
    whyTierSelected +=
      'Single-file or bounded component edit with isolated impact (Express Pass). ';
  } else if (finalTier === 2) {
    whyTierSelected += 'Multi-file feature edit requiring targeted domain verification. ';
  } else {
    whyTierSelected +=
      'High-impact architectural or security change requiring full gauntlet review. ';
  }

  if (escalated) {
    whyTierSelected += `ESCALATED: ${escalationReason}`;
  }

  // Overall Decision Confidence
  let decisionConfidence = 'L1';
  if (fallbackUsed && evidenceConfidence !== 'L1') {
    decisionConfidence = 'L2';
  } else if (evidenceConfidence === 'L3' || evidenceConfidence === 'L4') {
    decisionConfidence = evidenceConfidence;
  }

  return {
    decision_id: `DEC-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    timestamp: new Date().toISOString(),
    tier: finalTier,
    tier_name: TIER_NAMES[finalTier],
    routing,
    socratic_gate: socraticGate,
    escalated,
    escalation_reason: escalationReason,
    confidence: decisionConfidence,
    explanation: {
      why_tier_selected: whyTierSelected.trim(),
      influencing_evidence: influencingEvidence,
      fired_risk_signals: firedRiskSignals,
      capabilities_consulted: capabilitiesConsulted,
      capabilities_unavailable: capabilitiesUnavailable,
      fallback_used: fallbackUsed,
      monotonic_safeguards_applied: monotonicSafeguards,
    },
    signals: {
      change_lines: lines,
      change_files_count: files.length,
      impact_tier_raw: calculatedTier,
      laya_tier: layaTier,
      evidence_confidence: evidenceConfidence,
      browser_validation_level: browserSignal.validation_level,
      browser_available: browserSignal.browser_available,
    },
    evidence_summary: {
      total_evaluated: evidenceResult.summary?.total_items_evaluated || 0,
      total_selected: evidenceResult.summary?.total_items_selected || 0,
      critical_count: evidenceResult.summary?.critical_evidence_count || 0,
      confidence: evidenceConfidence,
    },
    reviewers: {
      selected: reviewerResult.selected,
      rejected: reviewerResult.rejected,
      total_selected: reviewerResult.total_selected,
      all_risks_covered: reviewerResult.coverage?.all_risks_covered ?? true,
    },
  };
}

module.exports = {
  evaluateDecision,
  resolveMonotonicImpactTier,
  HIGH_RISK_PATTERNS,
  HIGH_RISK_EXTENSIONS,
  TIER_NAMES,
  ROUTING_NAMES,
};
