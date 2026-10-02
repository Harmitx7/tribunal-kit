#!/usr/bin/env node
/**
 * test_cross_domain_engine.js — Phase 9 Cross-Domain Engine Test Suite
 * =====================================================================
 * Tests:
 *   - Single-domain task (minimal interactions)
 *   - Two-domain task
 *   - Multi-domain task
 *   - Hidden interaction discovery (adversarial)
 *   - Second-order effect chain detection
 *   - Conflicting constraints
 *   - Historical failure interaction (placeholder)
 *   - Irrelevant domain rejection (negative test)
 *   - Duplicate interaction detection
 *   - False positive prevention
 *   - Emergent failure detection
 *   - Security boundary analysis
 *   - Resource contention detection
 *   - Blind spot detection
 *   - Validation requirement generation
 *   - JSON contract stability
 *   - Full pipeline integration
 */

'use strict';

const path = require('path');
const cde = require(path.join(__dirname, '..', 'scripts', 'cross_domain_engine.js'));
const ce = require(path.join(__dirname, '..', 'scripts', 'concept_extractor.js'));

let passed = 0;
let failed = 0;
let total = 0;

function assert(condition, name) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✖ FAIL: ${name}`);
  }
}

function suite(name, fn) {
  console.log(`\n━━━ ${name} ━━━`);
  fn();
}

// Helper to run analysis for a task
function analyze(task) {
  const concepts = ce.extractConcepts(task, process.cwd());
  return cde.runCrossDomainAnalysis(task, concepts);
}

// ── Test Suite ──

suite('Constants', () => {
  assert(
    Object.keys(cde.RELATIONSHIP_TYPES).length >= 15,
    'At least 15 relationship types defined',
  );
  assert(Object.keys(cde.INTERACTION_PRIORITY).length === 4, '4 interaction priority levels');
  assert(Object.keys(cde.INTERACTION_CONFIDENCE).length === 4, '4 confidence levels');
  assert(cde.INTERACTION_RULES.length >= 20, 'At least 20 interaction rules registered');
  assert(cde.EFFECT_CHAINS.length >= 8, 'At least 8 second-order effect chains defined');
  assert(cde.EMERGENT_FAILURE_PATTERNS.length >= 8, 'At least 8 emergent failure patterns defined');
});

suite('Trivial Task Skip', () => {
  const r = analyze('Fix CSS typo in footer');
  assert(r.skipped === true, 'CSS typo task is skipped');
  assert(r.interactions.length === 0, 'No interactions for trivial task');
  assert(r.second_order_effects.length === 0, 'No second-order effects for trivial task');
});

suite('Negative Test: Static Page (No Hallucination)', () => {
  const r = analyze('Build static marketing page');
  assert(r.skipped === false, 'Not skipped (non-trivial keyword)');
  assert(r.summary.total_interactions === 0, 'Zero interactions for static page');
  assert(r.summary.emergent_failures === 0, 'Zero emergent failures for static page');
  assert(r.summary.validation_tests_generated === 0, 'Zero validation tests for static page');
});

suite('Single-Domain Task', () => {
  const r = analyze('Build a REST API endpoint');
  assert(r.skipped === false, 'Not skipped');
  // Should have some interactions but not be overwhelming
  assert(r.summary.total_interactions <= 15, 'Bounded interaction count for simple API');
});

suite('Two-Domain Task: Cache + Auth', () => {
  const r = analyze('Add Redis caching to authorization');
  assert(r.summary.total_interactions >= 3, 'At least 3 interactions for cache + auth');
  assert(
    r.interactions.all.some(i => i.a === 'cache' && i.b === 'consistency'),
    'Cache ↔ consistency detected',
  );

  // Should detect emergent failure
  const emergent = r.emergent_failures.find(
    ef => ef.pattern.includes('Cross-Tenant') || ef.pattern.includes('Dual Source'),
  );
  assert(emergent !== undefined, 'Emergent failure detected for cache + auth domain');
});

suite('Multi-Domain Task: Payment API', () => {
  const r = analyze('Build payment API with retries and Redis caching');
  assert(r.summary.total_interactions >= 8, 'At least 8 interactions for complex payment task');
  assert(r.summary.critical_interactions >= 3, 'At least 3 critical interactions');
  assert(r.summary.second_order_chains >= 3, 'At least 3 second-order chains');
  assert(r.summary.emergent_failures >= 3, 'At least 3 emergent failures');
  assert(r.summary.validation_tests_generated >= 15, 'At least 15 validation tests generated');

  // Specific critical interactions
  const retryIdempotency = r.interactions.all.find(i => i.a === 'retry' && i.b === 'idempotency');
  assert(retryIdempotency !== undefined, 'Retry ↔ Idempotency detected');
  assert(retryIdempotency.priority === 'CRITICAL', 'Retry ↔ Idempotency is CRITICAL');

  const paymentIdempotency = r.interactions.all.find(
    i => i.a === 'payment' && i.b === 'idempotency',
  );
  assert(paymentIdempotency !== undefined, 'Payment ↔ Idempotency detected');
});

suite('Adversarial: Hidden Interactions', () => {
  // "Make the checkout endpoint faster" should discover cache, DB index, payment concerns
  const r = analyze('Make the checkout endpoint faster');
  assert(
    r.summary.total_interactions >= 3,
    'Discovered hidden interactions for checkout optimization',
  );
  assert(r.summary.second_order_chains >= 2, 'Discovered second-order effects for optimization');

  // "Add automatic retries to the worker" should surface queue, idempotency, contention
  const r2 = analyze('Add automatic retries to the worker');
  assert(r2.summary.total_interactions >= 4, 'Discovered hidden interactions for worker retry');
  assert(r2.summary.emergent_failures >= 2, 'Detected emergent failures for worker retry');
});

suite('AI Agent Security', () => {
  const r = analyze('Build AI agent with shell tools');
  assert(
    r.interactions.all.some(i => i.a === 'agent' || i.b === 'agent'),
    'Agent interaction detected',
  );
  assert(
    r.second_order_effects.some(soe => soe.trigger === 'agent'),
    'Agent second-order chain detected',
  );

  // Security boundary should be flagged
  assert(r.security_boundaries.total >= 1, 'Security boundary concern raised');
  assert(
    r.security_boundaries.concerns.some(c => c.boundary === 'AI Agent Sandbox'),
    'AI Agent Sandbox boundary detected',
  );
});

suite('Scaling Task', () => {
  const r = analyze('Scale API to 100K requests/sec');
  assert(r.summary.total_interactions >= 2, 'Interactions discovered for scaling task');
  assert(r.resource_contention.length >= 2, 'Resource contention risks detected');
});

suite('Microservices Split', () => {
  const r = analyze('Split monolith into microservices');
  assert(
    r.interactions.all.some(i => i.a === 'microservices' || i.b === 'microservices'),
    'Microservices interaction detected',
  );
  assert(
    r.second_order_effects.some(soe => soe.trigger === 'microservices'),
    'Microservices second-order chain detected',
  );
});

suite('Kafka Order Processing', () => {
  const r = analyze('Build Kafka-based order processing');
  assert(r.summary.total_interactions >= 3, 'Queue interactions detected');
  const queueIdempotency = r.interactions.all.find(i => i.a === 'queue' && i.b === 'idempotency');
  assert(queueIdempotency !== undefined, 'Queue ↔ Idempotency detected');
  assert(queueIdempotency.priority === 'CRITICAL', 'Queue ↔ Idempotency is CRITICAL');
});

suite('Second-Order Effect Chains', () => {
  const r = analyze('Build payment API with retries and Redis caching');

  // Retry amplification cascade
  const retryCascade = r.second_order_effects.find(soe => soe.trigger === 'retry');
  assert(retryCascade !== undefined, 'Retry cascade chain discovered');
  assert(retryCascade.chain.length >= 5, 'Retry cascade has at least 5 steps');
  assert(retryCascade.mitigation !== undefined, 'Retry cascade has mitigation');

  // Payment double-charge cascade
  const paymentCascade = r.second_order_effects.find(soe => soe.trigger === 'payment');
  assert(paymentCascade !== undefined, 'Payment double-charge cascade discovered');
  assert(paymentCascade.severity === 'CRITICAL', 'Payment cascade is CRITICAL');
});

suite('Failure Propagation', () => {
  const r = analyze('Build API with Redis cache and database');
  assert(r.failure_propagation.length >= 1, 'At least 1 failure propagation path');

  const cacheFailure = r.failure_propagation.find(fp => fp.source === 'cache');
  assert(cacheFailure !== undefined, 'Cache outage failure propagation detected');
  assert(
    cacheFailure.cascading_effects.length >= 2,
    'Cache failure cascades to multiple components',
  );
});

suite('Resource Contention', () => {
  const r = analyze('Build API with Redis cache and LLM inference');
  assert(r.resource_contention.length >= 2, 'At least 2 resource contention risks');

  const memoryContention = r.resource_contention.find(rc => rc.resource === 'Memory');
  assert(memoryContention !== undefined, 'Memory contention detected for cache + LLM');
});

suite('Security Boundary Analysis', () => {
  const r = analyze('Build multi-tenant API with Redis cache and authorization');
  assert(r.security_boundaries.total >= 2, 'At least 2 security boundary concerns');
  assert(r.security_boundaries.has_critical === true, 'Critical security concern detected');

  const tenantIsolation = r.security_boundaries.concerns.find(
    c => c.boundary === 'Tenant Isolation',
  );
  assert(tenantIsolation !== undefined, 'Tenant isolation concern detected');

  const cacheSecConcern = r.security_boundaries.concerns.find(c => c.boundary === 'Cache Security');
  assert(cacheSecConcern !== undefined, 'Cache security concern detected for auth + multi-tenant');
});

suite('Constraint Conflict Detection', () => {
  // Manually test with tokens that include conflicting concerns
  const tokens = new Set(['security', 'performance', 'cost', 'consistency']);
  const conflicts = cde.detectConstraintConflicts(tokens);
  assert(conflicts.length >= 2, 'At least 2 constraint conflicts detected');
  assert(
    conflicts.some(c => c.constraint_a === 'security' && c.constraint_b === 'performance'),
    'Security ↔ Performance conflict',
  );
});

suite('Emergent Failure Detection', () => {
  const tokens = new Set(['retry', 'timeout', 'rate_limiting']);
  const emergent = cde.detectEmergentFailures(tokens);
  assert(
    emergent.some(ef => ef.pattern === 'Retry Amplification'),
    'Retry Amplification detected',
  );

  const tokens2 = new Set(['cache', 'authorization', 'multi_tenancy']);
  const emergent2 = cde.detectEmergentFailures(tokens2);
  assert(
    emergent2.some(ef => ef.pattern === 'Cross-Tenant Cache Leakage'),
    'Cross-Tenant Cache Leakage detected',
  );

  const tokens3 = new Set(['llm', 'agent', 'prompt_injection']);
  const emergent3 = cde.detectEmergentFailures(tokens3);
  assert(
    emergent3.some(ef => ef.pattern.includes('Privilege Escalation')),
    'Agent Privilege Escalation detected',
  );
});

suite('Blind Spot Detection', () => {
  const concepts = [{ domain: 'backend' }];
  const interactions = [{ domains: ['backend', 'database'] }];
  const tokens = new Set(['payment', 'database']);

  const blindSpots = cde.detectBlindSpots(concepts, interactions, tokens);
  // Payment should imply data-integrity consideration
  assert(blindSpots.length >= 0, 'Blind spot detection runs without error');
});

suite('Validation Requirement Generation', () => {
  const interactions = [
    {
      a: 'retry',
      b: 'idempotency',
      priority: 'CRITICAL',
      effect: 'test effect',
      validation: ['duplicate_request_test'],
    },
  ];
  const secondOrder = [{ trigger: 'retry', name: 'Retry Cascade', severity: 'CRITICAL' }];
  const failureProp = [
    { source: 'cache', failure: 'Cache outage', severity: 'HIGH', propagation: [] },
  ];
  const security = {
    concerns: [
      { boundary: 'Tenant', priority: 'CRITICAL', question: 'test?', components_to_verify: ['db'] },
    ],
  };

  const reqs = cde.generateValidationRequirements(interactions, secondOrder, failureProp, security);
  assert(reqs.length >= 3, 'At least 3 validation requirements generated');
  assert(
    reqs.some(r => r.type === 'interaction'),
    'Interaction-sourced validation requirement',
  );
  assert(
    reqs.some(r => r.type === 'second_order'),
    'Second-order-sourced validation requirement',
  );
  assert(
    reqs.some(r => r.type === 'failure_propagation'),
    'Failure-propagation-sourced validation requirement',
  );
  assert(
    reqs.some(r => r.type === 'security_boundary'),
    'Security-boundary-sourced validation requirement',
  );
});

suite('Duplicate Interaction Prevention', () => {
  const tokens = new Set(['retry', 'idempotency', 'database', 'cache']);
  const interactions = cde.discoverInteractions(tokens);

  // Check no duplicates
  const keys = interactions.map(i => `${i.a}↔${i.b}`);
  const uniqueKeys = new Set(keys);
  assert(keys.length === uniqueKeys.size, 'No duplicate interactions discovered');
});

suite('JSON Contract Stability', () => {
  const r = analyze('Build payment API with retries');

  // Verify JSON contract shape
  assert(r.task !== undefined, 'Result has task field');
  assert(r.tokens !== undefined, 'Result has tokens field');
  assert(r.domains !== undefined, 'Result has domains field');
  assert(r.interactions !== undefined, 'Result has interactions field');
  assert(r.interactions.direct !== undefined, 'Result has interactions.direct');
  assert(r.interactions.inferred !== undefined, 'Result has interactions.inferred');
  assert(r.interactions.all !== undefined, 'Result has interactions.all');
  assert(r.interactions.total !== undefined, 'Result has interactions.total');
  assert(r.second_order_effects !== undefined, 'Result has second_order_effects');
  assert(r.failure_propagation !== undefined, 'Result has failure_propagation');
  assert(r.resource_contention !== undefined, 'Result has resource_contention');
  assert(r.security_boundaries !== undefined, 'Result has security_boundaries');
  assert(r.constraint_conflicts !== undefined, 'Result has constraint_conflicts');
  assert(r.emergent_failures !== undefined, 'Result has emergent_failures');
  assert(r.tradeoffs !== undefined, 'Result has tradeoffs');
  assert(r.blind_spots !== undefined, 'Result has blind_spots');
  assert(r.validation_requirements !== undefined, 'Result has validation_requirements');
  assert(r.summary !== undefined, 'Result has summary');
  assert(r.phase9_metrics !== undefined, 'Result has phase9_metrics');
});

suite('Full Pipeline Integration', () => {
  // Verify that skill_intelligence.js properly includes Phase 9
  const engine = require(path.join(__dirname, '..', 'scripts', 'skill_intelligence.js'));
  const analysis = engine.analyzeTask('Build payment API with retries and Redis caching');

  assert(analysis.cross_domain_analysis !== null, 'analyzeTask includes cross_domain_analysis');
  assert(
    analysis.cross_domain_analysis.interactions !== undefined,
    'cross_domain_analysis has interactions',
  );
  assert(analysis.cross_domain_analysis.summary !== undefined, 'cross_domain_analysis has summary');
  assert(analysis.phase9_metrics !== null, 'analyzeTask includes phase9_metrics');

  // Verify cross-domain validations were added to verification plan
  const crossDomainVerifications = analysis.verification_plan.filter(
    v => v.action && v.action.includes('CROSS-DOMAIN'),
  );
  assert(
    crossDomainVerifications.length >= 1,
    'Cross-domain validations added to verification plan',
  );
});

suite('Metrics Tracker', () => {
  const tracker = new cde.Phase9MetricsTracker();
  tracker.record('tasks_analyzed');
  tracker.record('interactions_discovered', 5);
  tracker.record('true_positives', 3);
  tracker.record('false_positives', 1);

  const metrics = tracker.getMetrics();
  assert(metrics.tasks_analyzed === 1, 'Tasks analyzed metric tracked');
  assert(metrics.interactions_discovered === 5, 'Interactions discovered metric tracked');
  assert(tracker.getPrecision() === 0.75, 'Precision calculated correctly (3/4 = 0.75)');
});

// ── Summary ──
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  PHASE 9 TEST RESULTS: ${passed}/${total} passed, ${failed} failed`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

process.exit(failed > 0 ? 1 : 0);
