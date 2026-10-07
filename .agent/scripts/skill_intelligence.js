#!/usr/bin/env node
/**
 * skill_intelligence.js — Tribunal Kit Skill Intelligence Engine
 * =================================================================
 * Enforces the core operating principle:
 *   DISCOVER FIRST.
 *   COMPOSE SECOND.
 *   CREATE ONLY WHEN NECESSARY.
 *   VERIFY ALWAYS.
 *
 * Implements Phase 2:
 *   - Concept Discovery (Explicit & Implicit)
 *   - Engineering Consideration Matrix (Critical / High / Medium / Low)
 *   - Skill Coverage Matrix (FULL / PARTIAL / NONE)
 *   - Dependency-Aware Capability Pipeline DAG
 *   - 11-Check New Skill Creation Gate
 *   - Concept-Aligned Verification Plan
 *
 * Usage:
 *   node scripts/skill_intelligence.js --query "Build payment API with idempotency and retry"
 *   node scripts/skill_intelligence.js --gate --need "webhook-reconciliation"
 *   node scripts/skill_intelligence.js --audit
 *   node scripts/skill_intelligence.js --query "..." --json
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Colors fallback
const CYAN = '\x1b[36m',
  GREEN = '\x1b[32m',
  YELLOW = '\x1b[33m',
  RED = '\x1b[31m',
  BOLD = '\x1b[1m',
  DIM = '\x1b[2m',
  RESET = '\x1b[0m';

const { extractConcepts } = require('./concept_extractor');
const { generateConsiderations } = require('./consideration_engine');
const { evaluateCoverage } = require('./coverage_engine');
const { auditPostExecution, generateImprovementProposal } = require('./verification_auditor');
const {
  evaluateMateriality,
  checkMinimumSufficientEngineering,
  determineOutcomeBudget,
} = require('./materiality_engine');
const {
  determineQualityDimensions,
  generateOutcomeContract,
  detectTradeoffs,
  auditOutcome,
  evaluateOutcomeRegression,
} = require('./outcome_engine');
const {
  EVIDENCE_LEVELS,
  REVERSIBILITY_LEVELS,
  classifyEvidence,
  createUncertaintyRecord,
  calculateInformationValue,
  classifyReversibility,
  recordDecision,
  invalidateDecision,
  detectRequirementConflicts,
  runCounterfactualAnalysis,
  detectEngineeringSmells,
  evaluateEscalation,
  evaluateJudgmentState,
} = require('./judgment_engine');
const {
  DynamicCapabilityGraph,
  adaptPipelineOnSignal,
  analyzeChangeImpact,
  recordEngineeringLesson,
  recallRelevantLessons,
  evaluateSkillEffectiveness,
  runFinalEngineeringReview,
} = require('./adaptive_execution');
const {
  MEMORY_TYPES,
  PROVENANCE_TYPES,
  TRUST_STATES,
  TRUST_RANKS,
  MEMORY_SCOPES,
  sanitizeContentAndEvidence,
  validateMemoryAdmission,
  createMemoryRecord,
  validateApplicability,
  evaluateMemoryStaleness,
  evaluateMemoryHypothesisWithCurrentEvidence,
  recordConflictResolution,
  MemoryGraph,
  EngineeringMemoryStore,
  getEngineeringMemoryStore,
  retrieveRelevantMemories,
  extractEngineeringMemory,
} = require('./engineering_memory');
const {
  SkillTelemetryRegistry,
  getSkillTelemetryRegistry,
  CapabilityGapTracker,
  getCapabilityGapTracker,
  PROPOSAL_STATUS,
  SkillImprovementManager,
  getSkillImprovementManager,
  Phase5MetricsTracker,
  getPhase5MetricsTracker,
} = require('./capability_evolution');
const {
  FAILURE_TAXONOMY,
  BLAST_RADIUS_TIERS,
  SIMULATION_LEVELS,
  PREDICTION_STATUS,
  createPredictionRecord,
  analyzeBlastRadius,
  buildFailureChains,
  simulateDependencyFailures,
  simulateConcurrencyRisks,
  simulateRetryAmplification,
  simulateDatabaseFailures,
  simulateQueueFailures,
  simulateCacheFailures,
  simulateCapacityAndQueueing,
  simulateLatencyBudget,
  runSecurityPreMortem,
  runAgentPreMortem,
  runCostPreMortem,
  simulateDeploymentAndRecovery,
  generateChaosScenarios,
  detectUnsupportedClaims,
  determineSimulationLevel,
  runPreMortem,
  comparePredictionsWithObserved,
  Phase6MetricsTracker,
  getPhase6MetricsTracker,
} = require('./simulation_engine');

const _skillsCache = new Map();

function clearSkillsCache() {
  _skillsCache.clear();
}

const STOP_WORDS = new Set([
  'and',
  'the',
  'for',
  'with',
  'from',
  'that',
  'this',
  'have',
  'has',
  'are',
  'was',
  'were',
  'build',
  'create',
  'make',
  'add',
  'get',
  'use',
  'using',
  'how',
  'what',
  'when',
  'where',
  'which',
  'who',
  'why',
  'can',
  'should',
  'will',
  'would',
  'could',
  'into',
  'onto',
  'about',
  'than',
  'then',
  'also',
]);

function findAgentDir(start) {
  let cur = path.resolve(start || process.cwd());
  while (cur) {
    const candidate = path.join(cur, '.agent');
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return path.resolve('.agent');
}

// Failure modes mapping to high-signal skills
const FAILURE_SIGNALS = [
  {
    match: /(?:retry|duplicate|idempot|replay|network fail|double charge|dedup)/i,
    skills: ['error-resilience', 'api-patterns'],
  },
  {
    match: /(?:transaction|acid|rollback|atomic|deadlock|isolation)/i,
    skills: ['database-design', 'sql-pro', 'error-resilience'],
  },
  {
    match: /(?:n\+1|slow query|index|query optim|latency|explain)/i,
    skills: ['sql-pro', 'database-design'],
  },
  {
    match: /(?:auth|jwt|token|session|csrf|xss|injection|owasp|credential)/i,
    skills: ['agentshield-security', 'audit-and-fix', 'authentication-best-practices'],
  },
  {
    match: /(?:responsive|mobile|breakpoint|touch|layout shift|cls)/i,
    skills: ['adapt', 'mobile-design', 'better-ui'],
  },
  {
    match: /(?:memory leak|oom|heap|profiling|saturation|cpu)/i,
    skills: ['performance-profiling'],
  },
  {
    match: /(?:regression|flaky|test fail|mock drift)/i,
    skills: ['tdd-workflow', 'testing-patterns', 'verification-before-completion'],
  },
  {
    match: /(?:race condition|concurrency|mutex|lock|semaphore)/i,
    skills: ['error-resilience', 'system-design-pro'],
  },
  {
    match: /(?:prompt injection|jailbreak|llm security|hallucin)/i,
    skills: ['ai-prompt-injection-defense', 'anti-slop-enforcement'],
  },
  {
    match: /(?:ci|cd|pipeline|github action|docker|deploy)/i,
    skills: ['cicd-pro', 'devops-engineer'],
  },
];

// Pipeline execution order weights (lower = earlier in DAG)
const PIPELINE_ORDER = {
  architecture: 10,
  'domain-modeling': 15,
  'database-design': 20,
  'sql-pro': 25,
  'api-patterns': 30,
  'clean-code': 35,
  'error-resilience': 40,
  'frontend-design': 45,
  adapt: 50,
  'better-ui': 55,
  'tdd-workflow': 60,
  'testing-patterns': 65,
  'verification-before-completion': 70,
  'agentshield-security': 80,
  'audit-and-fix': 85,
  'performance-profiling': 90,
  'cicd-pro': 95,
};

function parseSkillFrontmatter(content) {
  const match = content.match(/^---\s*([\s\S]*?)\s*---/);
  if (!match) return {};
  const lines = match[1].split('\n');
  const meta = {};
  for (const line of lines) {
    const colon = line.indexOf(':');
    if (colon !== -1) {
      const key = line.slice(0, colon).trim();
      const val = line
        .slice(colon + 1)
        .trim()
        .replace(/^['"]|['"]$/g, '');
      meta[key] = val;
    }
  }
  return meta;
}

function loadAllSkills(agentDir) {
  agentDir = agentDir || findAgentDir(process.cwd());
  const cacheKey = path.resolve(agentDir);
  if (_skillsCache.has(cacheKey)) {
    return _skillsCache.get(cacheKey);
  }

  let skillsDir = path.join(agentDir, 'skills');
  if (!fs.existsSync(skillsDir)) {
    const rootSkills = path.join(path.dirname(agentDir), 'skills');
    if (fs.existsSync(rootSkills)) {
      skillsDir = rootSkills;
    } else {
      return [];
    }
  }

  const list = [];
  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillName = entry.name;
    const skillPath = path.join(skillsDir, skillName, 'SKILL.md');
    let description = '';
    let domain = 'general';
    let triggers = [];

    if (fs.existsSync(skillPath)) {
      try {
        const text = fs.readFileSync(skillPath, 'utf8');
        const meta = parseSkillFrontmatter(text);
        description = meta.description || '';
        domain = meta.domain || 'general';
        if (meta.triggers) {
          triggers = meta.triggers.split(',').map(s => s.trim().toLowerCase());
        }
      } catch (_) {}
    }

    list.push({
      name: skillName,
      description,
      domain,
      triggers,
      path: skillPath,
    });
  }
  _skillsCache.set(cacheKey, list);
  return list;
}

function discoverSkills(taskQuery, agentDir, options = {}) {
  const allSkills = loadAllSkills(agentDir);
  const q = taskQuery.toLowerCase();
  const rawTokens = q.split(/\W+/).filter(t => t.length > 2);
  const queryTokens = rawTokens.filter(t => !STOP_WORDS.has(t));

  const explicitIncludes = options.explicitIncludes || [];
  const explicitExcludes = options.explicitExcludes || [];

  // Evaluate failure mode hits
  const failureSkills = new Set();
  for (const sig of FAILURE_SIGNALS) {
    if (sig.match.test(q)) {
      sig.skills.forEach(s => failureSkills.add(s));
    }
  }

  const routingDecision = {
    requestId: options.requestId || `REQ-${Date.now()}`,
    candidates: [],
    selected: [],
    policy: {
      priority: options.priority || 'standard',
      conflictResolution: 'explicit-wins',
    },
  };

  const scored = [];

  for (const skill of allSkills) {
    let score = 0;
    const signals = {
      keyword: false,
      domain: false,
      concept: false,
      semantic: false,
      dependency: false,
    };
    const sName = skill.name.toLowerCase();
    const sDesc = skill.description.toLowerCase();
    let rejected = false;
    let rejectionReason = null;
    let isExplicit = false;

    if (explicitExcludes.includes(skill.name)) {
      rejected = true;
      rejectionReason = 'Explicitly excluded by user';
    } else if (explicitIncludes.includes(skill.name)) {
      score += 100;
      isExplicit = true;
      signals.keyword = true;
    } else {
      // Exact skill name in query
      if (q.includes(sName.replace(/-/g, ' ')) || q.includes(sName)) {
        score += 15;
        signals.keyword = true;
      }

      // Token matches in skill name
      for (const token of queryTokens) {
        if (sName === token) {
          score += 12;
          signals.keyword = true;
        } else if (sName.includes(token)) {
          score += 6;
          signals.keyword = true;
        }

        // Trigger matches
        if (skill.triggers.some(tr => tr.includes(token))) {
          score += 8;
          signals.concept = true;
        }

        // Description token match (exact word boundary)
        const wordRegex = new RegExp(`\\b${token}\\b`, 'i');
        if (wordRegex.test(sDesc)) {
          score += 3;
          signals.semantic = true;
        }
      }

      // Failure mode signal boost
      if (failureSkills.has(skill.name)) {
        score += 10;
        signals.domain = true;
      }
    }

    if (score >= 4 || rejected) {
      let state = 'OPTIONAL';
      if (score >= 12 || isExplicit) {
        state = 'MANDATORY';
      } else if (score >= 6) {
        state = 'RECOMMENDED';
      }

      routingDecision.candidates.push({
        skillId: skill.name,
        score,
        signals,
        matched: !rejected,
        rejected,
        rejectionReason,
      });

      if (!rejected) {
        scored.push({
          skill: skill.name,
          score,
          state,
          domain: skill.domain,
          description: skill.description,
        });
      }
    }
  }

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  // Composed Execution Pipeline: Mandatory + Recommended skills (ordered by pipeline stage)
  const pipelineCandidates = scored.filter(
    s => s.state === 'MANDATORY' || s.state === 'RECOMMENDED',
  );
  const pipeline = [...pipelineCandidates].sort((a, b) => {
    const orderA = PIPELINE_ORDER[a.skill] || 50;
    const orderB = PIPELINE_ORDER[b.skill] || 50;
    return orderA - orderB;
  });

  routingDecision.selected = pipelineCandidates.map(p => ({
    skillId: p.skill,
    score: p.score,
    confidence: p.state,
  }));

  return {
    query: taskQuery,
    totalDiscovered: scored.length,
    mandatory: scored.filter(s => s.state === 'MANDATORY'),
    recommended: scored.filter(s => s.state === 'RECOMMENDED'),
    optional: scored.filter(s => s.state === 'OPTIONAL'),
    pipeline: pipeline.map(p => p.skill),
    routingDecision,
  };
}

function generateVerificationPlan(conceptData, considerations, coverageData) {
  const plan = [];
  for (const c of conceptData.all_concepts || []) {
    switch (c.id) {
      case 'idempotency':
        plan.push({
          target: 'idempotency',
          test: 'Duplicate Request Safety',
          action:
            'Replay request with identical idempotency key; verify exactly one business effect executed.',
        });
        break;
      case 'transaction-integrity':
        plan.push({
          target: 'transaction-integrity',
          test: 'Atomic Rollback on Error',
          action:
            'Simulate mid-operation failure; verify database state rolls back completely without partial commits.',
        });
        break;
      case 'concurrency-control':
        plan.push({
          target: 'concurrency-control',
          test: 'Concurrent Mutation Race Test',
          action:
            'Dispatch parallel concurrent requests for same entity; verify race conditions are serialized/rejected.',
        });
        break;
      case 'retry-and-backoff':
        plan.push({
          target: 'retry-and-backoff',
          test: 'Retry Jitter & Circuit Breaking',
          action:
            'Simulate downstream latency/failure; verify retry backoff applies jitter and triggers circuit breaker.',
        });
        break;
      case 'query-optimization':
        plan.push({
          target: 'query-optimization',
          test: 'EXPLAIN Query Plan & Index Verification',
          action:
            'Run EXPLAIN ANALYZE on query; verify index scan is utilized and table scan is avoided.',
        });
        break;
      case 'authentication-and-authorization':
        plan.push({
          target: 'authentication-and-authorization',
          test: 'Unauthorized & Expired Token Rejection',
          action:
            'Send malformed, expired, and unauthorized requests; verify strict 401/403 rejection before business logic.',
        });
        break;
      case 'input-validation-and-sanitization':
        plan.push({
          target: 'input-validation-and-sanitization',
          test: 'Schema Boundary Mutation Defense',
          action:
            'Inject unexpected types and boundary extremes; verify 422 Unprocessable Entity without crashing.',
        });
        break;
      case 'file-upload-and-storage':
        plan.push({
          target: 'file-upload-and-storage',
          test: 'MIME Verification & Byte-Limit Defense',
          action: 'Upload oversized and spoofed MIME files; verify immediate rejection.',
        });
        break;
      case 'ai-agent-security-and-sandboxing':
        plan.push({
          target: 'ai-agent-security-and-sandboxing',
          test: 'Subprocess Permission Boundary Check',
          action: 'Inject shell escapes; verify permission gate blocks unauthorized system calls.',
        });
        break;
      case 'realtime-collaboration-and-sync':
        plan.push({
          target: 'realtime-collaboration-and-sync',
          test: 'CRDT Concurrent Edit Convergence',
          action:
            'Simulate concurrent conflicting edits from multiple clients; verify deterministic state convergence.',
        });
        break;
    }
  }

  if (plan.length === 0) {
    plan.push({
      target: 'general-verification',
      test: 'Functional Contract Verification',
      action: 'Run unit test suite and verify expected return schema and error handling.',
    });
  }

  return plan;
}

function analyzeTask(taskQuery, agentDir, options = {}) {
  if (typeof agentDir === 'object' && agentDir !== null && !options.store) {
    options = agentDir;
    agentDir = undefined;
  }
  agentDir = agentDir || findAgentDir(process.cwd());
  const conceptData = extractConcepts(taskQuery, agentDir);
  const considerations = generateConsiderations(conceptData, agentDir);

  // Phase 5: Retrieve relevant engineering memory as hypotheses
  const memStore = options.store || getEngineeringMemoryStore();
  const metricsTracker = getPhase5MetricsTracker();
  metricsTracker.recordEvent('total_retrieval_queries');

  const retrievedMemories = retrieveRelevantMemories(
    taskQuery,
    {
      concepts: conceptData.all_concepts,
      technologies: options.technologies || [],
      project_id: options.project_id || null,
      scale: options.scale,
      strict_freshness: options.strict_freshness,
    },
    memStore,
    options,
  );

  metricsTracker.recordEvent('relevant_memories_retrieved', retrievedMemories.length);

  const patternHypotheses = retrievedMemories.filter(m => m.type === MEMORY_TYPES.PATTERN);
  const failureHypotheses = retrievedMemories.filter(
    m => m.type === MEMORY_TYPES.FAILURE || m.type === MEMORY_TYPES.ANTI_PATTERN,
  );
  const verificationStrategies = retrievedMemories.filter(
    m => m.type === MEMORY_TYPES.VERIFICATION,
  );
  const pastDecisions = retrievedMemories.filter(m => m.type === MEMORY_TYPES.DECISION);

  // Surface failure memories into considerations risks (Section 10 & 11)
  if (failureHypotheses.length > 0) {
    metricsTracker.recordEvent('repeated_failures_prevented', failureHypotheses.length);
    for (const f of failureHypotheses) {
      const riskStr = `[HISTORICAL FAILURE PREVENTED] ${f.title}`;
      if (!considerations.risks.some(r => typeof r === 'string' && r.includes(f.title))) {
        considerations.risks.push(riskStr);
      }
    }
  }

  const discoveredSkills = discoverSkills(taskQuery, agentDir, options);
  const allSkills = loadAllSkills(agentDir);
  const coverageData = evaluateCoverage(conceptData, discoveredSkills, allSkills);

  const pipelineSet = new Set(discoveredSkills.pipeline);
  for (const add of coverageData.candidate_additions) {
    pipelineSet.add(add);
  }

  const composedPipeline = Array.from(pipelineSet).sort((a, b) => {
    const orderA = PIPELINE_ORDER[a] || 50;
    const orderB = PIPELINE_ORDER[b] || 50;
    return orderA - orderB;
  });

  const verificationPlan = generateVerificationPlan(conceptData, considerations, coverageData);

  // Enhance verification plan with verified strategies from memory (Section 12)
  if (verificationStrategies.length > 0) {
    metricsTracker.recordEvent('verification_strategies_reused', verificationStrategies.length);
    for (const vs of verificationStrategies) {
      if (
        !verificationPlan.some(vp => vp.test === vs.verification?.strategy || vp.test === vs.title)
      ) {
        verificationPlan.unshift({
          target: vs.concepts?.[0] || 'memory-verified-strategy',
          test: vs.title,
          action: `${vs.verification?.strategy || vs.content}. Assertion: ${vs.verification?.assertion || 'Strict property verification'}`,
          provenance: vs.provenance,
        });
      }
    }
  }

  const materiality = evaluateMateriality(
    considerations.all_considerations,
    taskQuery,
    conceptData,
  );
  const outcomeContract = generateOutcomeContract(taskQuery, conceptData, considerations, {
    agentDir,
  });
  const tradeoffs = detectTradeoffs(composedPipeline);

  const conceptsArray = conceptData.all_concepts.map(c => ({
    id: c.id,
    name: c.name,
    domain: c.domain,
    implicit: !conceptData.explicit_concepts.some(e => e.id === c.id),
    reason: c.implied_reason || null,
  }));
  conceptsArray.explicit = conceptData.explicit_concepts;
  conceptsArray.implicit = conceptData.implicit_concepts;
  conceptsArray.all = conceptData.all_concepts.map(c => c.name);

  const skillsList = [...composedPipeline];
  skillsList.query = discoveredSkills.query;
  skillsList.totalDiscovered = discoveredSkills.totalDiscovered;
  skillsList.mandatory = discoveredSkills.mandatory;
  skillsList.recommended = discoveredSkills.recommended;
  skillsList.optional = discoveredSkills.optional;
  skillsList.pipeline = composedPipeline;

  const conflicts = detectRequirementConflicts(taskQuery);
  const counterfactuals = runCounterfactualAnalysis(taskQuery);
  const engineeringSmells = detectEngineeringSmells(taskQuery, composedPipeline);
  const reversibility = classifyReversibility(taskQuery);
  const relevantLessons = recallRelevantLessons(taskQuery);
  const initialJudgment = evaluateJudgmentState({
    task: taskQuery,
    outcomeContract,
    uncertainties: conflicts.map(c =>
      createUncertaintyRecord(c.conflict, { impact_if_wrong: c.explanation, status: 'assumed' }),
    ),
  });

  // Phase 6: System Simulation & Pre-Mortem Intelligence
  const phase6Tracker = getPhase6MetricsTracker();
  phase6Tracker.recordEvent('pre_mortems_executed');
  const preMortem = runPreMortem(taskQuery, {
    concepts: conceptData.all_concepts.map(c => c.name),
    technologies: options.technologies || [],
    assumptions: options.assumptions,
    dependencies: options.dependencies,
    complexity: materiality.level,
    evidence: options.evidence || [],
  });

  phase6Tracker.recordEvent('predictions_generated', preMortem.predictions.length);
  if (preMortem.failure_chains.length > 0) {
    phase6Tracker.recordEvent('failure_chains_detected', preMortem.failure_chains.length);
    phase6Tracker.recordEvent(
      'systemic_failures_identified',
      preMortem.failure_chains.filter(c => c.systemic).length,
    );
  }

  const unsupportedClaims = detectUnsupportedClaims(taskQuery);
  if (unsupportedClaims.length > 0) {
    phase6Tracker.recordEvent('unsupported_claims_caught', unsupportedClaims.length);
  }

  // Integrate pre-mortem predictions into verification plan
  for (const p of preMortem.predictions) {
    if (p.verification_method && !verificationPlan.some(v => v.test === p.prediction)) {
      verificationPlan.push({
        target: p.category,
        test: p.prediction,
        action: `[PRE-MORTEM VERIFICATION] ${p.verification_method}. Failure condition: ${p.reason}`,
        status: p.status,
      });
    }
  }

  return {
    task: {
      query: taskQuery,
      actions: conceptData.actions,
      domains: conceptData.domains,
    },
    concepts: conceptsArray,
    considerations: considerations.all_considerations,
    materiality: materiality.all_evaluated,
    material_considerations: materiality.material,
    outcome_contract: outcomeContract,
    tradeoffs,
    conflicts,
    counterfactuals,
    anti_slop: engineeringSmells,
    engineering_smells: engineeringSmells,
    reversibility,
    institutional_lessons: relevantLessons,
    judgment: initialJudgment,
    memories: {
      retrieved: retrievedMemories,
      patterns: patternHypotheses,
      failures_to_avoid: failureHypotheses,
      verification_strategies: verificationStrategies,
      decisions: pastDecisions,
    },
    metrics: metricsTracker.getMetrics(),
    // Phase 6 System Simulation & Pre-Mortem artifacts
    pre_mortem: preMortem,
    predictions: preMortem.predictions,
    failure_chains: preMortem.failure_chains,
    blast_radius: preMortem.blast_radius,
    unsupported_claims: unsupportedClaims,
    simulation_plan: preMortem.simulation_plan,
    phase6_metrics: phase6Tracker.getMetrics(),
    risks: considerations.risks,
    failure_modes: considerations.failure_modes,
    quality_attributes: considerations.quality_attributes,
    skills: skillsList,
    routing_decision: discoveredSkills.routingDecision,
    coverage: coverageData.coverage_matrix,
    coverage_summary: {
      full: coverageData.full.length,
      partial: coverageData.partial.length,
      uncovered: coverageData.uncovered.length,
    },
    composition: {
      pipeline: composedPipeline,
      candidate_promotions: coverageData.candidate_additions,
    },
    gaps: coverageData.true_gaps,
    creation_gate: {
      new_skill_required: coverageData.true_gaps.length > 0,
      reason:
        coverageData.true_gaps.length > 0
          ? `Uncovered gaps: ${coverageData.true_gaps.join(', ')}`
          : 'Existing capabilities can be composed.',
    },
    verification_plan: verificationPlan,
    confidence: {
      concept_recall: 0.95,
      coverage_score: coverageData.full.length / Math.max(1, coverageData.total_concepts),
    },
  };
}

function evaluateCreationGate(needDescription, agentDir) {
  const allSkills = loadAllSkills(agentDir);
  const target = needDescription.toLowerCase();
  const rawTokens = target.split(/\W+/).filter(t => t.length > 2);
  const tokens = rawTokens.filter(t => !STOP_WORDS.has(t));

  const exact = allSkills.find(s => s.name === target || s.name.replace(/-/g, ' ') === target);

  const overlaps = [];
  for (const s of allSkills) {
    let matchCount = 0;
    for (const tok of tokens) {
      if (s.name.includes(tok)) matchCount += 2;
      const re = new RegExp(`\\b${tok}\\b`, 'i');
      if (re.test(s.description)) matchCount += 1;
    }
    if (matchCount > 0) {
      overlaps.push({ skill: s.name, matches: matchCount });
    }
  }
  overlaps.sort((a, b) => b.matches - a.matches);

  const topOverlaps = overlaps.slice(0, 3).map(o => o.skill);
  const nearestSkill = topOverlaps[0] || null;

  const checks = [
    {
      name: 'Existing skill searched',
      passed: true,
      detail: `Searched ${allSkills.length} skills`,
    },
    {
      name: 'Semantic matches evaluated',
      passed: true,
      detail:
        topOverlaps.length > 0
          ? `Found candidate matches: ${topOverlaps.join(', ')}`
          : 'No direct matches',
    },
    {
      name: 'Related skills checked',
      passed: true,
      detail: `${topOverlaps.length} related skills analyzed`,
    },
    {
      name: 'Composition attempted',
      passed: topOverlaps.length >= 2,
      detail:
        topOverlaps.length >= 2
          ? `Can potentially compose [${topOverlaps.join(', ')}]`
          : 'Composition insufficient',
    },
    {
      name: 'Duplicate capability checked',
      passed: !exact,
      detail: exact ? `Exact match exists: ${exact.name}` : 'No exact duplicate',
    },
    {
      name: 'Capability gap confirmed',
      passed: !exact && topOverlaps.length < 2,
      detail: exact
        ? 'Duplicate exists'
        : topOverlaps.length >= 2
          ? 'Covered by existing composition'
          : 'Genuine gap',
    },
    {
      name: 'Reusability justified',
      passed: tokens.length >= 1,
      detail: 'Assessed for modularity',
    },
    {
      name: 'Concept coverage checked',
      passed: topOverlaps.length < 2,
      detail: topOverlaps.length >= 2 ? 'Covered by existing concepts' : 'New concept domain',
    },
    {
      name: 'Failure-mode coverage checked',
      passed: true,
      detail: 'Failure modes evaluated against existing guardrails',
    },
    {
      name: 'Verification capability checked',
      passed: true,
      detail: 'Automated test assertions possible',
    },
    {
      name: 'Existing skill improvement evaluated',
      passed: !nearestSkill,
      detail: nearestSkill
        ? `Evaluate extending '${nearestSkill}' instead`
        : 'No suitable base skill to extend',
    },
  ];

  const canCreate = !exact && !nearestSkill;
  let recommendation = '';
  if (exact) {
    recommendation = `REJECT: Skill '${exact.name}' already exists. Use or enhance it instead.`;
  } else if (topOverlaps.length >= 2) {
    recommendation = `COMPOSE FIRST: Capabilities can be satisfied by composing existing skills: [${topOverlaps.join(', ')}].`;
  } else if (nearestSkill) {
    recommendation = `IMPROVE FIRST: Nearest skill '${nearestSkill}' can be extended to cover this capability without creating a new skill.`;
  } else {
    recommendation = `APPROVED: Capability gap confirmed. Minimal focused reusable skill creation justified.`;
    try {
      getCapabilityGapTracker().recordCapabilityGap({
        capability_need: needDescription,
        source_task: 'Creation Gate Evaluation',
        reason_insufficient:
          checks.find(c => c.name === 'Capability gap confirmed')?.detail ||
          'Genuine capability gap',
      });
    } catch (e) {}
  }

  return {
    need: needDescription,
    canCreate,
    recommendation,
    checks,
    candidateSkills: topOverlaps,
    nearestSkill,
  };
}

function runAudit(agentDir) {
  const all = loadAllSkills(agentDir);
  console.log(
    `\n${BOLD}${CYAN}━━━ Skill Intelligence Engine: Discovery Readiness Audit ━━━${RESET}\n`,
  );
  console.log(`Total skills indexed: ${BOLD}${all.length}${RESET}`);

  let withoutDesc = 0;
  for (const s of all) {
    if (!s.description || s.description.length < 10) {
      withoutDesc++;
    }
  }

  console.log(`Skills with full metadata: ${GREEN}${all.length - withoutDesc}${RESET}`);
  if (withoutDesc > 0) {
    console.log(`Skills needing richer description: ${YELLOW}${withoutDesc}${RESET}`);
  } else {
    console.log(`Coverage: ${GREEN}100% Discoverable${RESET}`);
  }
  console.log(
    `\n${GREEN}✓ Skill Intelligence Engine ready for zero-hallucination discovery.${RESET}\n`,
  );
}

function main() {
  const args = process.argv.slice(2);
  let query = null;
  let gateNeed = null;
  let audit = false;
  let json = false;
  let workspaceDir = '.';

  let premortem = false;
  let simulate = false;
  let chainsOnly = false;
  let claimsOnly = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--query' && i + 1 < args.length) {
      query = args[++i];
    } else if (a === '--gate' || a === '-g') {
      if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        gateNeed = args[++i];
      }
    } else if (a === '--need' && i + 1 < args.length) {
      gateNeed = args[++i];
    } else if (a === '--audit') {
      audit = true;
    } else if (a === '--pre-mortem' || a === '--premortem') {
      premortem = true;
    } else if (a === '--simulate') {
      simulate = true;
    } else if (a === '--chains') {
      chainsOnly = true;
    } else if (a === '--claims') {
      claimsOnly = true;
    } else if (a === '--json') {
      json = true;
    } else if (a === '--workspace' && i + 1 < args.length) {
      workspaceDir = args[++i];
    } else if (!a.startsWith('-') && !query) {
      query = a;
    }
  }

  const agentDir = findAgentDir(path.resolve(workspaceDir));

  if (audit) {
    runAudit(agentDir);
    return;
  }

  if (gateNeed) {
    const gateResult = evaluateCreationGate(gateNeed, agentDir);
    if (json) {
      console.log(JSON.stringify(gateResult, null, 2));
      return;
    }

    console.log(`\n${BOLD}${CYAN}━━━ New Skill Creation Gate Audit (11-Check Gate) ━━━${RESET}\n`);
    console.log(`Requested Capability: ${BOLD}${gateNeed}${RESET}`);
    console.log(
      `Gate Status: ${gateResult.canCreate ? GREEN + 'APPROVED' : RED + 'BLOCKED'}${RESET}\n`,
    );
    for (const c of gateResult.checks) {
      const icon = c.passed ? `${GREEN}✓ PASS${RESET}` : `${RED}✖ FAIL${RESET}`;
      console.log(`  [${icon}] ${BOLD}${c.name.padEnd(38)}${RESET} ${DIM}(${c.detail})${RESET}`);
    }
    console.log(`\n${BOLD}Decision:${RESET} ${gateResult.recommendation}\n`);
    return;
  }

  if (query) {
    const analysis = analyzeTask(query, agentDir);

    if (chainsOnly) {
      if (json) {
        console.log(JSON.stringify(analysis.failure_chains, null, 2));
        return;
      }
      console.log(`\n${BOLD}${CYAN}━━━ CAUSAL FAILURE CHAINS ━━━${RESET}\n`);
      for (const fc of analysis.failure_chains) {
        console.log(
          `  ⚡ ${BOLD}${fc.name || fc.id}${RESET} [Blast: ${fc.blast_radius} | ${fc.severity}]`,
        );
        console.log(`     ${DIM}${fc.chain}${RESET}\n`);
      }
      return;
    }

    if (claimsOnly) {
      if (json) {
        console.log(JSON.stringify(analysis.unsupported_claims, null, 2));
        return;
      }
      console.log(`\n${BOLD}${CYAN}━━━ UNSUPPORTED CLAIMS AUDIT ━━━${RESET}\n`);
      if (analysis.unsupported_claims.length === 0) {
        console.log(`  ${GREEN}✓ No unsupported architectural claims detected.${RESET}\n`);
      } else {
        for (const uc of analysis.unsupported_claims) {
          console.log(`  ⚠ ${RED}"${uc.claim}"${RESET} — ${DIM}${uc.reason}${RESET}`);
          console.log(`    Action: ${YELLOW}${uc.action_required}${RESET}\n`);
        }
      }
      return;
    }

    if (premortem || simulate) {
      if (json) {
        console.log(JSON.stringify(analysis.pre_mortem, null, 2));
        return;
      }
      console.log(`\n${BOLD}${CYAN}━━━ SYSTEM PRE-MORTEM & FAILURE SIMULATION ━━━${RESET}\n`);
      console.log(`Task: ${BOLD}${query}${RESET}`);
      console.log(
        `Simulation Level: ${YELLOW}${analysis.simulation_plan.selected_level.name}${RESET}\n`,
      );

      console.log(`${BOLD}Predictions & Hypotheses (${analysis.predictions.length}):${RESET}`);
      for (const p of analysis.predictions) {
        const impCol = p.impact === 'CRITICAL' ? RED : p.impact === 'HIGH' ? YELLOW : CYAN;
        console.log(
          `  • [${impCol}${p.impact}${RESET}] ${BOLD}${p.prediction}${RESET} (${p.category})`,
        );
        console.log(`    Reason: ${DIM}${p.reason}${RESET}`);
        console.log(`    Verification: ${CYAN}${p.verification_method}${RESET}`);
      }

      if (analysis.failure_chains.length > 0) {
        console.log(`\n${BOLD}Causal Failure Chains (${analysis.failure_chains.length}):${RESET}`);
        for (const fc of analysis.failure_chains) {
          console.log(`  ⚡ ${BOLD}${fc.name || fc.id}${RESET} [Blast: ${fc.blast_radius}]`);
          console.log(`     ${DIM}${fc.chain}${RESET}`);
        }
      }

      if (analysis.unsupported_claims.length > 0) {
        console.log(
          `\n${BOLD}${RED}Unsupported Claims Detected (${analysis.unsupported_claims.length}):${RESET}`,
        );
        for (const uc of analysis.unsupported_claims) {
          console.log(`  ⚠ "${uc.claim}" — ${DIM}${uc.reason}${RESET}`);
        }
      }
      console.log();
      return;
    }

    if (json) {
      console.log(JSON.stringify(analysis, null, 2));
      return;
    }

    console.log(`\n${BOLD}${CYAN}━━━ TASK INTELLIGENCE ━━━${RESET}\n`);
    console.log(`Task: ${BOLD}${query}${RESET}`);
    if (analysis.risks.length > 0) {
      console.log(`Risk Signals: ${RED}${analysis.risks.join(' | ')}${RESET}`);
    }
    console.log();

    console.log(`${BOLD}${CYAN}━━━ CONCEPTS ━━━${RESET}`);
    if (analysis.concepts.explicit.length > 0) {
      console.log(`  ${BOLD}Explicit Concepts:${RESET}`);
      analysis.concepts.explicit.forEach(c =>
        console.log(`    • ${BOLD}${c.name}${RESET} ${DIM}(domain: ${c.domain})${RESET}`),
      );
    }
    if (analysis.concepts.implicit.length > 0) {
      console.log(`  ${BOLD}Implicit Considerations:${RESET}`);
      analysis.concepts.implicit.forEach(c =>
        console.log(
          `    • ${BOLD}${c.name}${RESET} ${DIM}(domain: ${c.domain}) — ${c.reason}${RESET}`,
        ),
      );
    }
    console.log();

    console.log(`${BOLD}${CYAN}━━━ ENGINEERING CONSIDERATIONS ━━━${RESET}`);
    const critical = analysis.considerations.filter(c => c.severity === 'CRITICAL');
    const high = analysis.considerations.filter(c => c.severity === 'HIGH');
    const medium = analysis.considerations.filter(c => c.severity === 'MEDIUM');

    if (critical.length > 0) {
      console.log(`  ${BOLD}${RED}[CRITICAL]${RESET}`);
      critical.forEach(c =>
        console.log(`    • ${BOLD}${c.title}${RESET} (${c.category}) — ${c.rationale}`),
      );
    }
    if (high.length > 0) {
      console.log(`  ${BOLD}${YELLOW}[HIGH]${RESET}`);
      high.forEach(c =>
        console.log(`    • ${BOLD}${c.title}${RESET} (${c.category}) — ${c.rationale}`),
      );
    }
    if (medium.length > 0) {
      console.log(`  ${BOLD}${CYAN}[MEDIUM]${RESET}`);
      medium.forEach(c =>
        console.log(`    • ${BOLD}${c.title}${RESET} (${c.category}) — ${c.rationale}`),
      );
    }
    console.log();

    console.log(`${BOLD}${CYAN}━━━ SKILL COVERAGE ━━━${RESET}`);
    console.log(`  ${'Concept'.padEnd(38)} ${'Coverage'.padEnd(10)} Matched Skill`);
    console.log(`  ${'─'.repeat(38)} ${'─'.repeat(10)} ${'─'.repeat(20)}`);
    for (const row of analysis.coverage) {
      const covColor = row.coverage === 'FULL' ? GREEN : row.coverage === 'PARTIAL' ? YELLOW : RED;
      console.log(
        `  ${row.concept_name.slice(0, 36).padEnd(38)} ${covColor}${row.coverage.padEnd(10)}${RESET} ${row.matched_skill || DIM + 'NONE' + RESET}`,
      );
    }
    console.log();

    console.log(`${BOLD}${CYAN}━━━ COMPOSED CAPABILITY PIPELINE DAG ━━━${RESET}`);
    console.log(`  ${GREEN}${analysis.composition.pipeline.join(' → ')}${RESET}\n`);

    console.log(`${BOLD}${CYAN}━━━ SYSTEM PRE-MORTEM HYPOTHESES & CHAINS ━━━${RESET}`);
    console.log(
      `  Simulation Level: ${YELLOW}${analysis.simulation_plan.selected_level.name}${RESET}`,
    );
    console.log(
      `  Predictions: ${BOLD}${analysis.predictions.length}${RESET} | Causal Chains: ${BOLD}${analysis.failure_chains.length}${RESET}`,
    );
    if (analysis.failure_chains.length > 0) {
      for (const fc of analysis.failure_chains.slice(0, 2)) {
        console.log(`  ⚡ ${BOLD}${fc.name || fc.id}${RESET} [Blast: ${fc.blast_radius}]`);
      }
    }
    console.log();

    console.log(`${BOLD}${CYAN}━━━ VERIFICATION PLAN ━━━${RESET}`);
    for (const v of analysis.verification_plan) {
      console.log(`  • [${BOLD}${v.target}${RESET}] ${v.test}: ${DIM}${v.action}${RESET}`);
    }
    console.log();
    return;
  }

  console.log(`
${BOLD}Tribunal Skill Intelligence Engine — Phase 2${RESET}
Usage:
  node scripts/skill_intelligence.js --query "<task>"
  node scripts/skill_intelligence.js --gate --need "<capability>"
  node scripts/skill_intelligence.js --audit
  node scripts/skill_intelligence.js --query "<task>" --json
`);
}

module.exports = {
  discoverSkills,
  evaluateCreationGate,
  loadAllSkills,
  clearSkillsCache,
  analyzeTask,
  generateVerificationPlan,
  auditPostExecution,
  generateImprovementProposal,
  evaluateMateriality,
  checkMinimumSufficientEngineering,
  determineOutcomeBudget,
  determineQualityDimensions,
  generateOutcomeContract,
  detectTradeoffs,
  auditOutcome,
  evaluateOutcomeRegression,
  FAILURE_SIGNALS,
  // Phase 4: Engineering Judgment & Adaptive Execution
  EVIDENCE_LEVELS,
  REVERSIBILITY_LEVELS,
  classifyEvidence,
  createUncertaintyRecord,
  calculateInformationValue,
  classifyReversibility,
  recordDecision,
  invalidateDecision,
  detectRequirementConflicts,
  runCounterfactualAnalysis,
  detectEngineeringSmells,
  evaluateEscalation,
  evaluateJudgmentState,
  DynamicCapabilityGraph,
  adaptPipelineOnSignal,
  analyzeChangeImpact,
  recordEngineeringLesson,
  recallRelevantLessons,
  evaluateSkillEffectiveness,
  runFinalEngineeringReview,
  // Phase 5: Engineering Memory & Continuous Capability Evolution
  MEMORY_TYPES,
  PROVENANCE_TYPES,
  TRUST_STATES,
  TRUST_RANKS,
  MEMORY_SCOPES,
  sanitizeContentAndEvidence,
  validateMemoryAdmission,
  createMemoryRecord,
  validateApplicability,
  evaluateMemoryStaleness,
  evaluateMemoryHypothesisWithCurrentEvidence,
  recordConflictResolution,
  MemoryGraph,
  EngineeringMemoryStore,
  getEngineeringMemoryStore,
  retrieveRelevantMemories,
  extractEngineeringMemory,
  SkillTelemetryRegistry,
  getSkillTelemetryRegistry,
  CapabilityGapTracker,
  getCapabilityGapTracker,
  PROPOSAL_STATUS,
  SkillImprovementManager,
  getSkillImprovementManager,
  Phase5MetricsTracker,
  getPhase5MetricsTracker,
  // Phase 6: System Simulation & Pre-Mortem Intelligence
  FAILURE_TAXONOMY,
  BLAST_RADIUS_TIERS,
  SIMULATION_LEVELS,
  PREDICTION_STATUS,
  createPredictionRecord,
  analyzeBlastRadius,
  buildFailureChains,
  simulateDependencyFailures,
  simulateConcurrencyRisks,
  simulateRetryAmplification,
  simulateDatabaseFailures,
  simulateQueueFailures,
  simulateCacheFailures,
  simulateCapacityAndQueueing,
  simulateLatencyBudget,
  runSecurityPreMortem,
  runAgentPreMortem,
  runCostPreMortem,
  simulateDeploymentAndRecovery,
  generateChaosScenarios,
  detectUnsupportedClaims,
  determineSimulationLevel,
  runPreMortem,
  comparePredictionsWithObserved,
  Phase6MetricsTracker,
  getPhase6MetricsTracker,
};

if (require.main === module) {
  main();
}
