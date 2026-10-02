#!/usr/bin/env node
/**
 * test_outcome_optimization_engine.js — Phase 10 Outcome Optimization Test Suite
 * ==============================================================================
 * Comprehensive tests covering:
 *   - The Outcome Invariant & Constants
 *   - Requirement Discovery & Priority Classification
 *   - Complexity Budgeting
 *   - Anti-Slop Architecture Guard (Over-Engineering Rejection)
 *   - Under-Engineering Detection (Missing Critical Considerations)
 *   - Engineering Option Generation & Tradeoff Evaluation (No fake winner scores)
 *   - Engineering Decision Records (EDRs) & Full Traceability Chains
 *   - Assumptions & Unknowns Handling (No invented load targets)
 *   - Solution Shape & Early Validation Probes
 *   - Multi-Objective Outcome Verification & Regression Detection
 *   - Skill Selection & Capability Depth
 *   - Phase 10 Engineering Outcome Memory
 *   - Canonical Benchmarks 1-5 (Payment API, Static Site, Slow DB, AI Agent, High Traffic)
 *   - Anti-Shortcut Test (Section 39)
 *   - Anti-Overengineering Test (Section 40)
 *   - Internal Telemetry & Quality of Consideration Tracking
 *   - Hub Integration in analyzeTask
 */

'use strict';

const assert = require('assert');
const path = require('path');
const ooe = require('../scripts/outcome_optimization_engine');
const engine = require('../scripts/skill_intelligence');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function suite(name, fn) {
  console.log(`\n━━━ ${name} ━━━`);
  fn();
}

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

// ── 1. The Outcome Invariant & Constants ──
suite('The Outcome Invariant & Constants', () => {
  test('Outcome invariant is defined and emphasizes outcome over speed', () => {
    assert(
      ooe.OUTCOME_INVARIANT.includes(
        'optimize the implemented system for the actual engineering objective',
      ),
    );
    assert(ooe.OUTCOME_INVARIANT.includes('not for shortest output'));
  });

  test('Requirement sources define explicit, inferred, default, and unknown', () => {
    assert.strictEqual(ooe.REQUIREMENT_SOURCES.EXPLICIT, 'EXPLICIT REQUIREMENT');
    assert.strictEqual(ooe.REQUIREMENT_SOURCES.INFERRED, 'INFERRED REQUIREMENT');
    assert.strictEqual(ooe.REQUIREMENT_SOURCES.UNKNOWN, 'UNKNOWN');
  });

  test('Requirement categories cover functional, non-functional, security, etc.', () => {
    assert(ooe.REQUIREMENT_CATEGORIES.FUNCTIONAL);
    assert(ooe.REQUIREMENT_CATEGORIES.SECURITY);
    assert(ooe.REQUIREMENT_CATEGORIES.RELIABILITY);
    assert(ooe.REQUIREMENT_CATEGORIES.PERFORMANCE);
    assert(ooe.REQUIREMENT_CATEGORIES.SCALABILITY);
    assert(ooe.REQUIREMENT_CATEGORIES.RECOVERY);
  });

  test('Complexity budgets define 5 tiers from MINIMAL to CRITICAL', () => {
    assert.strictEqual(ooe.COMPLEXITY_BUDGETS.MINIMAL, 'MINIMAL');
    assert.strictEqual(ooe.COMPLEXITY_BUDGETS.LOW, 'LOW');
    assert.strictEqual(ooe.COMPLEXITY_BUDGETS.MODERATE, 'MODERATE');
    assert.strictEqual(ooe.COMPLEXITY_BUDGETS.HIGH, 'HIGH');
    assert.strictEqual(ooe.COMPLEXITY_BUDGETS.CRITICAL, 'CRITICAL');
  });
});

// ── 2. Requirement Discovery & Prioritization ──
suite('Requirement Discovery & Prioritization', () => {
  test('Discovers mandatory security and reliability requirements for payment task', () => {
    const reqs = ooe.discoverRequirements('Build production payment API');
    const mandatory = reqs.filter(r => r.priority === ooe.REQUIREMENT_PRIORITY.MANDATORY);
    assert(mandatory.length >= 3, 'At least 3 mandatory requirements for payments');
    assert(reqs.some(r => r.id === 'REQ-REL01' && r.description.includes('idempotency')));
    assert(reqs.some(r => r.id === 'REQ-REL02' && r.description.includes('transaction')));
    assert(reqs.some(r => r.id === 'REQ-SEC01' && r.description.includes('authentication')));
  });

  test('Identifies unknown throughput target for high-traffic task without hallucinating numbers', () => {
    const reqs = ooe.discoverRequirements('Prepare service for high traffic scaling');
    const unknowns = reqs.filter(r => r.priority === ooe.REQUIREMENT_PRIORITY.UNKNOWN);
    assert(unknowns.length >= 1, 'Unknown requirement identified');
    assert(unknowns[0].description.includes('Exact production peak request throughput'));
  });

  test('Discovers accessibility and static performance for portfolio website', () => {
    const reqs = ooe.discoverRequirements('Build a personal portfolio website');
    assert(reqs.some(r => r.id === 'REQ-A11Y01' && r.description.includes('Semantic HTML')));
    assert(
      reqs.some(r => r.id === 'REQ-PERF02' && r.description.includes('static asset delivery')),
    );
  });
});

// ── 3. Complexity Budgeting ──
suite('Complexity Budgeting', () => {
  test('Assigns MINIMAL complexity budget to cosmetic and static website tasks', () => {
    const b1 = ooe.evaluateComplexityBudget('Fix CSS typo in header');
    assert.strictEqual(b1.budget, ooe.COMPLEXITY_BUDGETS.MINIMAL);
    assert.strictEqual(b1.max_justified_layers, 1);

    const b2 = ooe.evaluateComplexityBudget('Build static portfolio landing page');
    assert.strictEqual(b2.budget, ooe.COMPLEXITY_BUDGETS.MINIMAL);
  });

  test('Assigns LOW complexity budget to simple local CRUD app', () => {
    const b = ooe.evaluateComplexityBudget('Build a local todo application');
    assert.strictEqual(b.budget, ooe.COMPLEXITY_BUDGETS.LOW);
    assert.strictEqual(b.max_justified_layers, 2);
  });

  test('Assigns HIGH complexity budget to payment and high-traffic tasks', () => {
    const b1 = ooe.evaluateComplexityBudget('Build Stripe checkout billing integration');
    assert.strictEqual(b1.budget, ooe.COMPLEXITY_BUDGETS.HIGH);

    const b2 = ooe.evaluateComplexityBudget('Scale service to 100k requests per second');
    assert.strictEqual(b2.budget, ooe.COMPLEXITY_BUDGETS.HIGH);
  });
});

// ── 4. Anti-Slop Architecture Guard (Over-Engineering Rejection) ──
suite('Anti-Slop Architecture Guard', () => {
  test('Rejects Kafka, microservices, CQRS, and Kubernetes for static site', () => {
    const budget = ooe.evaluateComplexityBudget('Build static portfolio page');
    const audit = ooe.auditArchitectureJustification('Build static portfolio page', budget);
    assert(audit.unjustified_components.length >= 4, 'Unjustified bloat detected');
    assert(audit.unjustified_components.some(u => u.component.includes('Kafka')));
    assert(audit.unjustified_components.some(u => u.component.includes('Microservices')));
    assert(audit.unjustified_components.some(u => u.component.includes('Kubernetes')));
  });

  test('Rejects distributed locks and Kafka for local todo application', () => {
    const aoe = ooe.runAntiOverengineeringCheck('Build a local todo application');
    assert.strictEqual(aoe.passed, true);
    assert.strictEqual(aoe.overengineering_prevented.kafka, true);
    assert.strictEqual(aoe.overengineering_prevented.microservices, true);
    assert.strictEqual(aoe.overengineering_prevented.kubernetes, true);
  });
});

// ── 5. Under-Engineering Detection (Missing Considerations) ──
suite('Under-Engineering Detection', () => {
  test('Flags naive order creation API as under-engineered without idempotency and transaction', () => {
    const asc = ooe.runAntiShortcutCheck('Build an API that creates an order');
    assert.strictEqual(asc.passed, true);
    assert.strictEqual(asc.critical_considerations_enforced.idempotency, true);
    assert.strictEqual(asc.critical_considerations_enforced.transaction_boundary, true);
    assert.strictEqual(asc.critical_considerations_enforced.concurrency_lock, true);
  });

  test('Surfaces missing critical considerations when task lacks idempotency keyword', () => {
    const budget = ooe.evaluateComplexityBudget('Build payment API');
    const audit = ooe.auditArchitectureJustification('Build payment API', budget);
    assert(audit.missing_critical_considerations.length >= 2);
    assert(
      audit.missing_critical_considerations.some(m => m.consideration.includes('Idempotency')),
    );
    assert(
      audit.missing_critical_considerations.some(m => m.consideration.includes('Transaction')),
    );
    assert.strictEqual(audit.architecture_balance, 'UNDER_ENGINEERED');
  });
});

// ── 6. Engineering Option Generation & Evaluation ──
suite('Engineering Option Generation & Evaluation', () => {
  test('Generates viable architectural options for background processing', () => {
    const r = ooe.runOutcomeOptimization(
      'Implement background worker processing for video transcoding',
    );
    assert(r.engineering_options.length >= 1);
    const bgOpts = r.engineering_options.find(o => o.topic.includes('Background Processing'));
    assert(bgOpts, 'Background options found');
    assert(bgOpts.options.length >= 3, 'At least 3 options evaluated');
    // Verify options do NOT have a fake score or single pre-declared winner
    for (const opt of bgOpts.options) {
      assert(!('score' in opt), 'No fake numerical scores');
      assert(!('winner' in opt), 'No arbitrary winner declared');
      assert(opt.strengths && opt.constraints && opt.fit, 'Rich tradeoff details provided');
    }
  });

  test('Generates viable options for query performance optimization', () => {
    const r = ooe.runOutcomeOptimization('Make this PostgreSQL query faster');
    const queryOpts = r.engineering_options.find(o => o.topic.includes('Query Performance'));
    assert(queryOpts);
    assert(queryOpts.options.some(o => o.name.includes('Composite B-Tree Indexing')));
    assert(queryOpts.options.some(o => o.name.includes('Query Restructuring')));
  });
});

// ── 7. Engineering Decision Records (EDRs) & Traceability ──
suite('Engineering Decision Records (EDRs) & Traceability', () => {
  test('Creates complete EDRs with full traceability chain for payment API', () => {
    const r = ooe.runOutcomeOptimization('Build payment API');
    assert(r.decision_records.length >= 2);
    const edr1 = r.decision_records[0];
    assert.strictEqual(edr1.id, 'EDR-001');
    assert(edr1.decision.includes('idempotency'));
    assert(edr1.alternatives.length >= 2, 'Evaluated and rejected alternatives documented');
    assert(edr1.validation.length >= 2, 'Validation requirements present');

    // Check traceability chain
    const chain = edr1.traceability_chain;
    assert(chain.user_requirement);
    assert(chain.engineering_consideration);
    assert(chain.canonical_concept);
    assert(chain.skill);
    assert(chain.interaction);
    assert(chain.decision);
    assert(chain.implementation);
    assert(chain.verification);
  });
});

// ── 8. Assumptions & Unknowns Handling ──
suite('Assumptions & Unknowns Handling', () => {
  test('Distinguishes explicit unknowns from assumptions without inventing values', () => {
    const { assumptions, unknowns } = ooe.analyzeAssumptionsAndUnknowns(
      'Prepare API for high traffic',
    );
    assert(assumptions.length >= 1);
    assert(unknowns.length >= 1);
    assert(unknowns[0].unknown.includes('Exact target throughput'));
    assert(unknowns[0].impact.includes('Cannot justify'));
    assert(unknowns[0].default_posture.includes('stateless architecture'));
  });
});

// ── 9. Solution Shape & Early Validation Probes ──
suite('Solution Shape & Early Validation Probes', () => {
  test('Generates dependency-ordered implementation steps and early validation probes', () => {
    const r = ooe.runOutcomeOptimization('Build payment API');
    assert(r.implementation_order.length >= 5);
    assert(r.implementation_order[0].includes('Define data invariants'));
    assert(r.implementation_order[1].includes('Create idempotency table'));
    assert(r.early_validations.length >= 2);
    assert(r.early_validations.some(ev => ev.step.includes('Idempotency Constraint Probe')));
    assert(r.early_validations.some(ev => ev.step.includes('Transaction Rollback Probe')));
  });
});

// ── 10. Multi-Objective Outcome Verification & Regression Detection ──
suite('Multi-Objective Outcome Verification & Regression Detection', () => {
  test('Detects resource regression when latency drops but memory spikes', () => {
    const baseline = { p95_latency_ms: 450, memory_mb: 256, failing_tests: 0 };
    const current = { p95_latency_ms: 120, memory_mb: 1200, failing_tests: 0 };
    const evalResult = ooe.verifyOutcomeAndRegressions(baseline, current);

    assert.strictEqual(evalResult.has_regressions, true);
    assert(
      evalResult.regressions.some(r => r.type === 'LATENCY_IMPROVEMENT_WITH_RESOURCE_REGRESSION'),
    );
  });

  test('Passes cleanly when performance improves without regressions', () => {
    const baseline = { p95_latency_ms: 450, memory_mb: 256, failing_tests: 0 };
    const current = { p95_latency_ms: 150, memory_mb: 280, failing_tests: 0 };
    const evalResult = ooe.verifyOutcomeAndRegressions(baseline, current);

    assert.strictEqual(evalResult.has_regressions, false);
    assert.strictEqual(evalResult.verified, true);
  });
});

// ── 11. Skill Selection & Capability Depth ──
suite('Skill Selection & Capability Depth', () => {
  test('Filters skills into REQUIRED, CONDITIONAL, and NOT_JUSTIFIED', () => {
    const discovered = ['backend-resilience', 'sql-pro', 'distributed-cache', 'k8s'];
    const budget = { budget: ooe.COMPLEXITY_BUDGETS.LOW };
    const selection = ooe.evaluateSkillSelection(discovered, [], budget);

    assert(selection.required.some(s => s.skill.includes('resilience') || s.skill.includes('sql')));
    assert(selection.not_justified.some(s => s.skill.includes('k8s')));
  });
});

// ── 12. Phase 10 Engineering Outcome Memory ──
suite('Phase 10 Engineering Outcome Memory', () => {
  test('Stores and retrieves verified engineering decisions and rejected approaches', () => {
    const memory = ooe.getPhase10OutcomeMemory();
    memory.clear();

    memory.storeDecision({
      decision: 'database-backed idempotency',
      context: 'payment mutation',
      reason: 'duplicate execution protection under retry storm',
      validated: true,
    });

    memory.storeRejectedApproach({
      approach: 'Redis for idempotency',
      context: 'payment mutation',
      reason: 'lacks ACID transaction enrollment and subject to TTL eviction',
    });

    const decisions = memory.findDecisions('payment');
    assert.strictEqual(decisions.length, 1);
    assert.strictEqual(decisions[0].decision, 'database-backed idempotency');

    const rejected = memory.findRejected('payment');
    assert.strictEqual(rejected.length, 1);
    assert.strictEqual(rejected[0].approach, 'Redis for idempotency');
  });
});

// ── 13. Canonical Benchmarks (Section 38) ──
suite('Section 38 Canonical Benchmarks', () => {
  test('Benchmark 1: Payment API focuses on idempotency, transactions, audit log', () => {
    const r = ooe.runOutcomeOptimization('Build a production-ready payment API');
    assert.strictEqual(r.complexity_budget, ooe.COMPLEXITY_BUDGETS.HIGH);
    assert(
      r.architecture_audit.justified_components.some(c => c.component.includes('Idempotency')),
    );
    assert(
      r.architecture_audit.justified_components.some(c => c.component.includes('Transaction')),
    );
    assert(r.architecture_audit.justified_components.some(c => c.component.includes('Audit Log')));
  });

  test('Benchmark 2: Static Website rejects Kafka, Redis, microservices, Kubernetes', () => {
    const r = ooe.runOutcomeOptimization('Build a portfolio website');
    assert.strictEqual(r.complexity_budget, ooe.COMPLEXITY_BUDGETS.MINIMAL);
    assert(r.architecture_audit.unjustified_components.length >= 4);
  });

  test('Benchmark 3: Slow Database Query focuses on baseline, indexing, and query plan', () => {
    const r = ooe.runOutcomeOptimization('Make this PostgreSQL query faster');
    assert(r.engineering_options.some(o => o.topic.includes('Query Performance')));
    assert(r.implementation_order.some(s => s.includes('EXPLAIN (ANALYZE, BUFFERS)')));
  });

  test('Benchmark 4: AI Agent enforces sandbox and prompt injection defense', () => {
    const r = ooe.runOutcomeOptimization('Build an AI agent that can execute shell commands');
    assert(r.architecture_audit.justified_components.some(c => c.component.includes('Sandbox')));
    assert(
      r.architecture_audit.justified_components.some(c => c.component.includes('Prompt Injection')),
    );
  });

  test('Benchmark 5: High Traffic API identifies unknown RPS and prepares stateless baseline', () => {
    const r = ooe.runOutcomeOptimization('Prepare API for high traffic');
    assert(r.unknowns.some(u => u.unknown.includes('Exact target throughput')));
    assert(r.engineering_options.some(o => o.topic.includes('High-Traffic')));
  });
});

// ── 14. Quality of Consideration Internal Telemetry ──
suite('Internal Telemetry (Section 41)', () => {
  test('Tracks internal dimensions without exposing fake quality score', () => {
    const tracker = ooe.getPhase10MetricsTracker();
    const metrics = tracker.getMetrics();
    assert(typeof metrics.tasks_optimized === 'number');
    assert(typeof metrics.requirements_discovered === 'number');
    assert(typeof metrics.mandatory_requirements === 'number');
    assert(typeof metrics.overengineering_prevented === 'number');
    assert(typeof metrics.underengineering_prevented === 'number');
    assert(!('universal_quality_score' in metrics), 'Never expose a fake universal score');
  });
});

// ── 15. Hub Integration in analyzeTask ──
suite('Hub Integration in analyzeTask', () => {
  test('analyzeTask integrates Phase 10 outcome optimization and verification requirements', () => {
    const res = engine.analyzeTask('Build payment API with retries and Redis caching');
    assert(res.outcome_optimization, 'outcome_optimization present in analyzeTask');
    assert(res.decision_records.length >= 1, 'decision_records present');
    assert(res.solution_shape, 'solution_shape present');
    assert(res.early_validations.length >= 1, 'early_validations present');
    assert(res.phase10_metrics, 'phase10_metrics present');

    // Verification plan includes outcome optimization verification
    const outcomeVerifications = res.verification_plan.filter(v =>
      v.action.includes('[OUTCOME OPTIMIZATION VERIFICATION]'),
    );
    assert(outcomeVerifications.length >= 1, 'Outcome verifications added to verification plan');
  });
});

// ── Final Test Summary ──
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  PHASE 10 TEST RESULTS: ${passedTests}/${totalTests} passed, ${failedTests} failed`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
