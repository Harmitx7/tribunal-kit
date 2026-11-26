#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const { createAutopilotService } = require('../src/autopilot/service');
const { estimateTokens } = require('../src/mcp/response_optimizer');
const { requires, ensures, checkInvariant } = require('../src/verification/contract_engine');
const { FaultInjectionEngine } = require('../src/runtime_reliability/fault_injection_engine');
const { version, buckets, fixtures } = require('../benchmarks/corpus/autopilot');
const { capabilities } = require('../src/autopilot/capabilities.json');

const capabilitiesById = new Map(capabilities.map(entry => [entry.id, entry]));
const manualCommands = {
  'run-architecture-inspection': 'cli:understand:impact',
  'find-security-reviewer': 'agent:security-auditor',
  'find-test-specialist': 'agent:test-engineer',
  'find-frontend-specialist': 'agent:frontend-specialist',
};

function createFixtureRuntime(fixture, options = {}) {
  const root = __dirname;
  const snapshot = Object.freeze({
    root,
    fresh: true,
    baseDigest: 'a'.repeat(40),
    workingTreeDigest: 'b'.repeat(64),
    observedPaths: [fixture.target],
    ...(fixture.css && {
      touchedPaths: [fixture.target],
      diff: `- ${fixture.css}: #000;\n+ ${fixture.css}: #fff;`,
    }),
  });
  const inspections = [];
  const inspect = async (_, paths) => {
    inspections.push(...paths);
    return paths.map(file => ({ file, tier: 'LOW', affected: 0 }));
  };
  return {
    inspections,
    inspect,
    snapshot,
    runtime: createAutopilotService({
      root,
      collectEvidence: () => snapshot,
      inspectScope: inspect,
      ...options,
    }),
  };
}

async function replayFixture(fixture) {
  const manual = createFixtureRuntime(fixture);
  const manualStart = performance.now();
  const manualResults = [];
  for (const command of fixture.expected.manual) {
    const capability = capabilitiesById.get(manualCommands[command]);
    requires(capability, 'Manual baseline must name an existing capability', { id: fixture.id });
    const evidence =
      capability.surface === 'cli'
        ? await manual.inspect(manual.snapshot.root, [fixture.target])
        : [];
    manualResults.push({ id: capability.id, evidence });
  }
  const manualMs = performance.now() - manualStart;
  const auto = createFixtureRuntime(fixture);
  const start = performance.now();
  const plan = auto.runtime.plan({
    task: fixture.task,
    targets: [fixture.target],
    turnId: fixture.id,
  });
  const result = plan.planId ? await auto.runtime.execute({ planId: plan.planId }) : null;
  const autoMs = performance.now() - start;
  const selected = plan.nodes.map(node => node.id);
  const expected = fixture.expected;
  const required = expected.required.filter(id => selected.includes(id)).length;
  const unnecessary = selected.length - required;
  const unexpectedDispatches =
    auto.inspections.filter(file => file !== fixture.target).length +
    (expected.status === 'noop' ? auto.inspections.length : 0);
  const unnecessaryInvocations = expected.required.includes('cli:understand:impact')
    ? 0
    : auto.inspections.length;
  const duplicates = auto.inspections.length - new Set(auto.inspections).size;
  const evidenceRequired =
    expected.required.length + (fixture.css ? 1 : 0) + (fixture.bucket === 'highRisk' ? 2 : 0);
  const evidenceVerified =
    (result?.results || []).filter(
      item => item.status === 'SUCCEEDED' && expected.required.includes(item.agentId),
    ).length + Number(plan.inlineVerification === 'single-color-declaration-checked');
  checkInvariant(
    unexpectedDispatches === 0 && duplicates === 0,
    'Dispatch violated fixture scope or count',
    { id: fixture.id },
  );
  ensures(expected.status !== 'noop' || (!result && !selected.length), 'No-op dispatched', {
    id: fixture.id,
  });
  ensures(
    !expected.required.length || result?.status === 'awaiting-evidence',
    'Pending obligations were masked',
    { id: fixture.id },
  );
  return {
    id: fixture.id,
    bucket: fixture.bucket,
    partition: fixture.partition,
    selected: selected.length,
    required: expected.required.length,
    relevant: required,
    unnecessary,
    unnecessaryInvocations,
    duplicates,
    matchesRouting: plan.status === expected.status && plan.tier === expected.tier,
    matchesSelection: required === expected.required.length && unnecessary === 0,
    violations: unexpectedDispatches,
    manualCommands: expected.manual.length,
    autopilotCalls: 1 + Number(result !== null),
    boundedDispatches: auto.inspections.length,
    evidenceRequired,
    evidenceVerified,
    pending: Boolean(result),
    autoMs,
    manualMs,
    autoTokens: estimateTokens({ plan, result }).estimatedTokens,
    manualTokens: estimateTokens(manualResults).estimatedTokens,
  };
}

async function runFaultVariants(fixture) {
  const faults = new FaultInjectionEngine();
  faults.injectTransientFailure('architecture', 'CRASH', 1);
  const failed = createFixtureRuntime(fixture, {
    inspectScope: () => faults.intercept('architecture', async () => []),
  });
  const request = { task: fixture.task, targets: [fixture.target], turnId: fixture.id };
  const failedPlan = failed.runtime.plan(request);
  const fault = await failed.runtime.execute({ planId: failedPlan.planId });
  ensures(
    fault.status === 'blocked' && faults.getInterceptCount('architecture') === 1,
    'Fault must block without retry',
  );
  const duplicate = createFixtureRuntime(fixture);
  const first = duplicate.runtime.plan(request);
  assert.equal(duplicate.runtime.plan(request).planId, first.planId);
  const inFlight = duplicate.runtime.execute({ planId: first.planId });
  assert.equal(
    (await duplicate.runtime.execute({ planId: first.planId })).reason,
    'already-running',
  );
  assert.equal((await inFlight).status, 'awaiting-evidence');
  await duplicate.runtime.execute({ planId: first.planId });
  assert.equal(duplicate.inspections.length, 1);
  assert.equal(
    (await createFixtureRuntime(fixture).runtime.execute({ planId: first.planId })).status,
    'denied',
  );
  assert.equal((await duplicate.runtime.execute({ planId: randomUUID() })).status, 'denied');
  await assert.rejects(
    duplicate.runtime.execute({ planId: first.planId, approved: true }),
    /invalid/i,
  );
  const cancelled = createFixtureRuntime(fixture);
  const cancelPlan = cancelled.runtime.plan(request);
  assert.equal(cancelled.runtime.cancel({ planId: cancelPlan.planId }).status, 'cancelled');
  assert.equal(
    (await cancelled.runtime.execute({ planId: cancelPlan.planId })).status,
    'cancelled',
  );
  assert.equal(cancelled.inspections.length, 0);
  return [
    'injected-crash',
    'duplicate-and-concurrent-delivery',
    'process-state-reset',
    'unknown-plan',
    'fabricated-approval',
    'pending-cancellation',
  ];
}

async function runCacheVariants() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-replay-cache-'));
  const git = (...args) => execFileSync('git', ['-C', directory, ...args], { stdio: 'ignore' });
  try {
    fs.writeFileSync(
      path.join(directory, 'auth.js'),
      'module.exports = function authenticate() {};\n',
    );
    fs.writeFileSync(path.join(directory, '.gitignore'), 'ignored.js\n');
    git('init');
    git('add', '--', '.gitignore', 'auth.js');
    git(
      '-c',
      'user.name=Replay',
      '-c',
      'user.email=replay@example.invalid',
      '-c',
      'commit.gpgsign=false',
      'commit',
      '-m',
      'Replay fixture',
    );
    const service = createAutopilotService({ root: directory });
    const execute = async turnId => {
      const start = performance.now();
      const plan = service.plan({ task: 'Build JWT authentication', targets: ['auth.js'], turnId });
      const result = await service.execute({ planId: plan.planId });
      const evidence = result.results?.find(item => item.status === 'SUCCEEDED');
      ensures(
        evidence && result.status === 'awaiting-evidence',
        'Cache replay must preserve pending requirements',
      );
      return {
        elapsedMs: Number((performance.now() - start).toFixed(3)),
        hit: evidence.cacheHit === true,
      };
    };
    const cold = await execute('cold');
    const warm = await execute('warm');
    fs.writeFileSync(path.join(directory, 'ignored.js'), "require('./auth');\n");
    const stale = await execute('ignored-source-changed');
    assert.deepEqual([cold.hit, warm.hit, stale.hit], [false, true, false]);
    return { cold, warm, stale };
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function summarize(rows) {
  const sum = key => rows.reduce((total, row) => total + row[key], 0);
  const percentile = (key, fraction) => {
    const values = rows.map(row => row[key]).sort((a, b) => a - b);
    return Number(values[Math.ceil(values.length * fraction) - 1].toFixed(3));
  };
  return {
    cases: rows.length,
    selected: sum('selected'),
    relevant: sum('relevant'),
    required: sum('required'),
    precision: sum('selected') ? sum('relevant') / sum('selected') : null,
    requiredRecall: sum('required') ? sum('relevant') / sum('required') : null,
    manualSelectionCommandsReplaced: sum('manualCommands'),
    autopilotCalls: sum('autopilotCalls'),
    boundedDispatches: sum('boundedDispatches'),
    unnecessarySelections: sum('unnecessary'),
    duplicateExecutions: sum('duplicates'),
    unnecessaryInvocations: sum('unnecessaryInvocations'),
    policyViolations: sum('violations'),
    evidenceVerified: sum('evidenceVerified'),
    evidenceRequired: sum('evidenceRequired'),
    pendingCases: rows.filter(row => row.pending).length,
    latencyMs: {
      manualP50: percentile('manualMs', 0.5),
      manualP95: percentile('manualMs', 0.95),
      autopilotP50: percentile('autoMs', 0.5),
      autopilotP95: percentile('autoMs', 0.95),
    },
    estimatedOutputTokens: {
      manual: sum('manualTokens'),
      autopilot: sum('autoTokens'),
      overhead: sum('autoTokens') - sum('manualTokens'),
    },
  };
}

async function runReplay() {
  requires(fixtures.length === 100, 'Golden corpus must contain exactly 100 turns');
  const rows = [];
  for (const fixture of fixtures) rows.push(await replayFixture(fixture));
  const perBucket = Object.fromEntries(
    Object.entries(buckets).map(([bucket, count]) => {
      const matching = rows.filter(row => row.bucket === bucket);
      ensures(matching.length === count, 'Golden bucket size changed', { bucket });
      return [bucket, summarize(matching)];
    }),
  );
  const variants = await runFaultVariants(fixtures.find(fixture => fixture.bucket === 'highRisk'));
  return {
    version,
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    mode: 'paired synthetic snapshots and deterministic read-effect fixtures',
    overall: summarize(rows),
    perBucket,
    heldOut: summarize(rows.filter(row => row.partition === 'held-out')),
    variants,
    cacheVariants: await runCacheVariants(),
    routingMismatches: rows.filter(row => !row.matchesRouting).map(row => row.id),
    selectionMismatches: rows.filter(row => !row.matchesSelection).map(row => row.id),
  };
}

if (require.main === module) {
  runReplay()
    .then(report => console.log(JSON.stringify(report, null, 2)))
    .catch(error => {
      console.error(error.message, error.details || {});
      process.exitCode = 1;
    });
}

module.exports = { runReplay };
