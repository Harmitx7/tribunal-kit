'use strict';

const { randomUUID } = require('node:crypto');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { z } = require('zod');
const { planAutopilot } = require('../system1/decision_engine');
const { classifySpeechAct } = require('../../.agent/scripts/intent_extractor');
const { collectWorkspaceEvidence } = require('./workspace_evidence');
const { digest } = require('./relevance_engine');
const { validateDag } = require('../execution/dag_validation');
const { ActivityTracker } = require('../activity/tracker');
const { OperationRegistry } = require('../activity/registry');
const { deepClone, sanitizeActivityEvent, redactSecrets } = require('../activity/schema');
const { CancellationContext } = require('../runtime_reliability/cancellation_context');
const { StateMachineEngine } = require('../runtime_reliability/state_machine_engine');
const { ResourceGuardEngine } = require('../runtime_reliability/resource_guard_engine');
const { estimateTokens } = require('../mcp/token_estimate');
const {
  QuorumAndAggregationEngine,
} = require('../runtime_reliability/quorum_and_aggregation_engine');
const { createEnvelope, evaluateCapability, policyVersion } = require('./policy_gate');
const {
  createResultCache,
  evidenceSchema,
  fingerprintSources,
  scanLimits,
} = require('./result_cache');
const manifest = require('./capabilities.json');

const planInput = z.strictObject({
  task: z.string().trim().min(1).max(4096),
  targets: z.array(z.string().min(1).max(256)).max(6).default([]),
  turnId: z
    .string()
    .regex(/^[\w.-]{1,128}$/)
    .optional(),
  budget: z
    .strictObject({
      capabilities: z.int().min(0).max(6).optional(),
      tokens: z.int().min(0).max(2000).optional(),
      milliseconds: z.int().min(0).max(30000).optional(),
    })
    .optional(),
});
const runInput = z.strictObject({ planId: z.uuid() });
function parse(schema, input) {
  const checked = schema.safeParse(input);
  if (!checked.success) throw new Error('Invalid Autopilot arguments.');
  return checked.data;
}
const ttl = 120000;
const manifestDigest = digest(manifest);
const entries = new Map(manifest.capabilities.map(entry => [entry.id, entry]));
const exec = promisify(execFile);
const inspectorModules = [
  require.resolve('../../.agent/scripts/architecture_extractor'),
  require.resolve('../../.agent/scripts/blast_radius_engine'),
  require.resolve('../utils/path_containment'),
];
const inspectorProgram = `
  const { ArchitectureExtractor } = require(process.argv[1]);
  const { BlastRadiusEngine } = require(process.argv[2]);
  const { assertWithinRoot } = require(process.argv[3]);
  const model = new ArchitectureExtractor(process.cwd()).scan({
    ...${JSON.stringify(scanLimits)}, sourceOnly: true, assertWithinRoot, timeoutMs: 3500,
  });
  const engine = new BlastRadiusEngine(model);
  const results = process.argv.slice(4).map(file => {
    const entity = model.entities.find(item =>
      item.kind === 'module' && item.sources?.some(source => source.file === file));
    if (!entity) return { file, tier: 'INDETERMINATE', affected: 0 };
    const impact = engine.computeBlastRadius(entity.id, 2);
    return { file, tier: impact.metrics.riskTier, affected: impact.metrics.transitiveDependentsCount };
  });
  process.stdout.write(JSON.stringify(results));
`;

async function inspect(root, targets, signal) {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) =>
      /^(?:PATH|SYSTEMROOT|WINDIR|TEMP|TMP|PATHEXT)$/i.test(key),
    ),
  );
  const { stdout } = await exec(
    process.execPath,
    ['-e', inspectorProgram, '--', ...inspectorModules, ...targets],
    {
      cwd: root,
      env,
      signal,
      timeout: 4500,
      windowsHide: true,
      maxBuffer: 16 * 1024,
    },
  );
  const evidence = evidenceSchema.parse(JSON.parse(stdout));
  if (evidence.length !== targets.length || evidence.some((item, i) => item.file !== targets[i])) {
    throw new Error('Architecture evidence is incomplete.');
  }
  return evidence;
}

function createAutopilotService({
  root,
  inspectScope = inspect,
  onEvent = null,
  collectEvidence = collectWorkspaceEvidence,
}) {
  const plans = new Map();
  const turns = new Map();
  const resources = new ResourceGuardEngine({ maxConcurrency: 2, maxQueueDepth: 8 });
  const cache =
    inspectScope === inspect && collectEvidence === collectWorkspaceEvidence
      ? createResultCache(
          root,
          digest([manifestDigest, policyVersion, inspectorProgram, process.version]),
        )
      : null;

  function plan(input) {
    const request = parse(planInput, input);
    const now = Date.now();
    for (const [id, record] of plans) {
      if (!record.running && record.expires <= now) {
        plans.delete(id);
        turns.delete(record.turnKey);
      }
    }
    const turnKey = request.turnId && digest(request.turnId);
    const requestDigest = digest(request);
    const repeated = turnKey && plans.get(turns.get(turnKey));
    if (repeated)
      return repeated.requestDigest === requestDigest
        ? redactSecrets(deepClone(repeated.response))
        : { status: 'blocked', reason: 'turn-budget-already-reserved' };
    const deadline = now + (request.budget?.milliseconds ?? 30000);
    const workspace =
      classifySpeechAct(request.task) === 'discuss'
        ? null
        : collectEvidence(root, request.targets, {}, deadline);
    const recommendation = planAutopilot({ ...request, workspace });
    if (
      recommendation.status !== 'noop' &&
      (estimateTokens(recommendation).estimatedTokens >= (request.budget?.tokens ?? 2000) ||
        Date.now() >= deadline)
    ) {
      return { status: 'blocked', reason: 'planning-budget-exhausted' };
    }
    if (recommendation.status !== 'proposal' || !recommendation.nodes.length) {
      return redactSecrets(deepClone(recommendation));
    }
    if (plans.size >= 64) throw new Error('Autopilot plan capacity reached.');
    const planId = randomUUID();
    const response = { ...recommendation, planId };
    const planTokens = estimateTokens(response).estimatedTokens;
    if (planTokens >= (request.budget?.tokens ?? 2000) || Date.now() >= deadline) {
      return { status: 'blocked', reason: 'planning-budget-exhausted' };
    }
    plans.set(planId, {
      response,
      turnKey,
      requestDigest,
      expires: now + ttl,
      workspaceDigest: workspace.workingTreeDigest,
      policyVersion,
      budget: request.budget,
      planTokens,
      remainingMs: deadline - Date.now(),
      running: false,
      result: null,
      context: null,
    });
    if (turnKey) turns.set(turnKey, planId);
    return redactSecrets(deepClone(response));
  }

  async function execute(input) {
    const { planId } = parse(runInput, input);
    const record = plans.get(planId);
    if (!record || record.expires <= Date.now())
      return { status: 'denied', reason: 'unknown-or-expired-plan' };
    if (record.running) return { status: 'blocked', reason: 'already-running' };
    if (record.result) return redactSecrets(deepClone(record.result));
    const { response } = record;
    const dag = validateDag(
      response.nodes.map(node => ({ taskId: node.id, dependencies: node.requires })),
    );
    if (
      !dag.valid ||
      response.manifestDigest !== manifestDigest ||
      record.policyVersion !== policyVersion
    ) {
      return { status: 'denied', reason: 'invalid-plan' };
    }
    const budget = record.remainingMs;
    if (budget <= 0) return { status: 'blocked', reason: 'budget-exhausted' };
    record.running = true;
    const seen = new Set();
    const envelope = createEnvelope(planId, null, seen);
    const cancellation = new CancellationContext({ timeoutMs: budget, envelope });
    record.context = cancellation;
    const registry = new OperationRegistry();
    const tracker = new ActivityTracker({
      operationId: planId,
      registry,
      projectRoot: root,
      title: 'Autopilot execution',
      metadata: { envelope },
      onEvent: onEvent && (event => onEvent(sanitizeActivityEvent(event))),
    });
    const now = new Date().toISOString();
    const machine = new StateMachineEngine({
      id: planId,
      agentId: 'autopilot',
      taskType: 'capability-plan',
      createdAt: now,
      updatedAt: now,
      maxAttempts: 1,
      metadata: { envelope },
    });
    const results = new Map();
    const nodes = new Map(response.nodes.map(node => [node.id, node]));
    const tokenLimit = record.budget?.tokens ?? 2000;
    const runBudget = new ResourceGuardEngine({ tokenBudget: tokenLimit - record.planTokens });
    try {
      tracker.start('Autopilot execution', 'Executing eligible capabilities');
      machine.start();
      for (const node of response.nodes) {
        for (const dep of node.requires) runBudget.registerWaitDependency(node.id, dep);
      }
      if (runBudget.detectDeadlocks().hasDeadlock) throw new Error('Circular wait detected.');
      for (const id of dag.executionOrder.flat()) {
        if (cancellation.isCancelled()) break;
        const node = nodes.get(id);
        for (const dep of node.requires) runBudget.removeWaitDependency(node.id, dep);
        const rule = evaluateCapability(node, entries.get(id), root, response.scope);
        const key = digest([node.operationId, node.scope, record.workspaceDigest]);
        if (seen.has(key) || rule === 'deny') throw new Error('Policy denied capability.');
        seen.add(key);
        if (
          rule !== 'inspect' ||
          node.requires.some(dep => results.get(dep)?.status !== 'SUCCEEDED')
        ) {
          results.set(id, { agentId: id, status: 'BLOCKED', disposition: rule });
          continue;
        }
        const child = cancellation.createChild(null, createEnvelope(planId, envelope, seen));
        registry.register({
          operationId: randomUUID(),
          parentOperationId: planId,
          metadata: { envelope: child.envelope },
        });
        let acquired = false;
        try {
          await resources.acquireSlot(id);
          acquired = true;
          if (child.isCancelled()) break;
          const deadline = cancellation.getDeadline();
          const current = collectEvidence(root, response.scope, {}, deadline);
          if (Date.now() >= cancellation.getDeadline()) {
            cancellation.cancel('Execution deadline expired', 'TIMEOUT');
            break;
          }
          if (current?.workingTreeDigest !== record.workspaceDigest)
            throw new Error('Workspace changed.');
          if (evaluateCapability(node, entries.get(id), root, response.scope) !== 'inspect') {
            throw new Error('Policy changed before dispatch.');
          }
          const sourceHash = cache && fingerprintSources(root, deadline);
          const cacheKey = cache?.key(id, node.scope, record.workspaceDigest, sourceHash);
          const cached = cache?.get(cacheKey);
          if (Date.now() >= deadline) {
            cancellation.cancel('Execution deadline expired', 'TIMEOUT');
            break;
          }
          if (!cached) runBudget.recordTokenUsage(node.estimatedCost.tokens);
          const evidence = cached || (await inspectScope(root, node.scope, child.signal));
          if (child.isCancelled()) break;
          const after = collectEvidence(root, response.scope, {}, deadline);
          if (sourceHash && fingerprintSources(root, deadline) !== sourceHash) {
            throw new Error('Source inputs changed during inspection.');
          }
          if (Date.now() >= deadline) {
            cancellation.cancel('Execution deadline expired', 'TIMEOUT');
            break;
          }
          if (after?.workingTreeDigest !== record.workspaceDigest) {
            throw new Error('Workspace changed during inspection.');
          }
          const safeEvidence = redactSecrets(evidence);
          runBudget.recordTokenUsage(estimateTokens(safeEvidence).estimatedTokens);
          if (!cached) cache?.set(cacheKey, safeEvidence);
          results.set(id, {
            agentId: id,
            status: 'SUCCEEDED',
            evidence: safeEvidence,
            ...(cached && { cacheHit: true }),
          });
        } finally {
          if (acquired) resources.releaseSlot();
          child.dispose();
        }
      }
      const quorum = new QuorumAndAggregationEngine({
        requiredAgents: response.nodes.filter(node => node.required).map(node => node.id),
      }).evaluateResults([...results.values()]);
      const pending = response.requirements.filter(
        requirement =>
          !response.nodes.some(
            node => node.rationale === requirement && results.get(node.id)?.status === 'SUCCEEDED',
          ),
      );
      const status = cancellation.isCancelled()
        ? 'cancelled'
        : quorum.quorumSatisfied && !pending.length
          ? 'verified'
          : 'awaiting-evidence';
      record.result = {
        status,
        pending,
        results: [...results.values()],
        envelope: createEnvelope(planId, null, seen),
        ...(pending.includes('write-approval') &&
          !cancellation.isCancelled() && {
            writeHandoff: { request: 'tribunal_request_write', preview: 'tribunal_preview_write' },
          }),
      };
      if (record.planTokens + estimateTokens(record.result).estimatedTokens > tokenLimit) {
        record.result = { status: 'blocked', reason: 'response-budget-exhausted' };
      }
      if (status === 'cancelled') {
        machine.cancel();
        tracker.cancel('Execution cancelled');
      } else if (record.result.status === 'blocked') {
        machine.block('response-budget');
        tracker.blocked('Response budget exhausted');
      } else if (status === 'verified') {
        machine.complete();
        tracker.complete('Required evidence verified');
      } else {
        machine.block('required-evidence');
        if (pending.includes('write-approval')) {
          tracker.approvalRequired(
            'Write approval required',
            'Use the controlled write request and preview tools.',
          );
        } else tracker.blocked('Required evidence is pending');
      }
    } catch {
      if (cancellation.isCancelled()) {
        machine.cancel();
        tracker.cancel('Execution cancelled');
        record.result = { status: 'cancelled' };
      } else {
        machine.fail('Execution could not verify evidence');
        tracker.failed('Autopilot execution blocked', 'Execution could not verify evidence');
        record.result = { status: 'blocked', reason: 'policy-or-verification-failure' };
      }
    } finally {
      cancellation.dispose();
      tracker.dispose();
      record.context = null;
      record.running = false;
      registry.cleanup();
    }
    return redactSecrets(deepClone(record.result));
  }

  function cancel(input) {
    const { planId } = parse(runInput, input);
    const record = plans.get(planId);
    if (!record || record.result) return { status: 'inactive' };
    if (record.context) record.context.cancel('Caller cancelled');
    else record.result = { status: 'cancelled' };
    return { status: 'cancelled' };
  }

  return { plan, execute, cancel };
}

module.exports = { createAutopilotService, inspectRepository: inspect };
