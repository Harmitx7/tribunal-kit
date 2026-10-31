'use strict';

/**
 * src/runtime_reliability/index.js — Unified Barrel Export & Resilient Workflow Orchestrator
 * =========================================================================================
 * Domain: Agent Runtime Reliability & Recovery (agent-runtime-reliability)
 *
 * Consolidates all execution state, failure classification, retry, cancellation,
 * quorum aggregation, checkpoint recovery, resource guard, and fault injection engines
 * into a single unified API for Tribunal-Kit.
 */

const schemas = require('./execution_state_schemas');
const stateMachine = require('./state_machine_engine');
const failureClassifier = require('./failure_classifier');
const retryEngine = require('./retry_and_timeout_engine');
const cancellation = require('./cancellation_context');
const quorumEngine = require('./quorum_and_aggregation_engine');
const recoveryEngine = require('./checkpoint_recovery_engine');
const resourceGuard = require('./resource_guard_engine');
const faultEngine = require('./fault_injection_engine');

/**
 * Top-level orchestrator: executes a workflow of parallel or sequence tasks with complete resilience.
 *
 * @param {Array<Object>} taskDescriptors - Array of { id, agentId, fn, isIdempotent, isRequired, timeoutMs }
 * @param {Object} [options]
 * @param {Object} [options.retryPolicy]
 * @param {Object} [options.quorumPolicy]
 * @param {number} [options.maxConcurrency=5]
 * @param {number} [options.workflowTimeoutMs=60000]
 */
async function executeResilientWorkflow(taskDescriptors, options = {}) {
  const startTime = Date.now();
  const rootContext = new cancellation.CancellationContext({
    timeoutMs: options.workflowTimeoutMs || 60000,
  });

  const retryRunner = new retryEngine.RetryAndTimeoutEngine({
    policy: options.retryPolicy || {},
  });

  const guard = new resourceGuard.ResourceGuardEngine({
    maxConcurrency: options.maxConcurrency || 5,
  });

  const requiredAgents = taskDescriptors.filter((t) => t.isRequired).map((t) => t.id);
  const optionalAgents = taskDescriptors.filter((t) => !t.isRequired).map((t) => t.id);

  const quorum = new quorumEngine.QuorumAndAggregationEngine({
    requiredAgents,
    optionalAgents,
    allowPartialResults: options.allowPartialResults !== false,
    minSuccessThreshold: options.minSuccessThreshold || 0.8,
  });

  const taskResults = [];
  const allFindings = [];

  // Execute tasks with bounded concurrency
  const taskPromises = taskDescriptors.map(async (task) => {
    const taskSm = new stateMachine.StateMachineEngine({
      id: task.id,
      agentId: task.agentId || task.id,
      taskType: task.taskType || 'agent_task',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await guard.acquireSlot(task.id);
    taskSm.start();

    try {
      const childContext = rootContext.createChild(task.timeoutMs || 30000);

      const execResult = await retryRunner.execute(
        async () => {
          return task.fn(childContext.signal);
        },
        {
          isIdempotent: task.isIdempotent !== false,
          idempotencyKey: task.idempotencyKey || task.id,
          signal: childContext.signal,
          taskTimeoutMs: task.timeoutMs || 30000,
        }
      );

      taskSm.complete({ attempts: execResult.attempts });
      childContext.dispose();

      taskResults.push({
        agentId: task.id,
        status: 'SUCCEEDED',
        result: execResult.result,
        attempts: execResult.attempts,
        durationMs: execResult.totalDurationMs,
      });
    } catch (err) {
      const category = failureClassifier.FailureClassifier.classify(err);
      if (category === 'TIMEOUT') {
        taskSm.timeout();
      } else if (category === 'CANCELLED') {
        taskSm.cancel(err.message);
      } else {
        taskSm.fail(err.message, category);
      }

      taskResults.push({
        agentId: task.id,
        status: taskSm.getState(),
        error: err.message,
        failureCategory: category,
        durationMs: Date.now() - startTime,
      });
    } finally {
      guard.releaseSlot();
    }
  });

  await Promise.all(taskPromises);
  rootContext.dispose();

  // Evaluate multi-agent quorum
  const quorumEval = quorum.evaluateResults(taskResults);
  allFindings.push(...quorumEval.findings);

  // Check deadlocks
  const deadlockCheck = guard.detectDeadlocks();
  if (deadlockCheck.hasDeadlock) {
    allFindings.push(...deadlockCheck.findings);
  }

  const succeededCount = taskResults.filter((r) => r.status === 'SUCCEEDED').length;
  const failedCount = taskResults.filter((r) => r.status === 'FAILED').length;
  const timedOutCount = taskResults.filter((r) => r.status === 'TIMED_OUT').length;
  const cancelledCount = taskResults.filter((r) => r.status === 'CANCELLED').length;

  let finalStatus = 'PASS';
  if (quorumEval.status === 'FAILED') finalStatus = 'FAIL';
  else if (quorumEval.status === 'PARTIAL') finalStatus = 'PARTIAL';

  return schemas.RuntimeAuditResultSchema.parse({
    status: finalStatus,
    timestamp: new Date().toISOString(),
    summary: quorumEval.summary,
    totalTasks: taskDescriptors.length,
    succeededTasks: succeededCount,
    failedTasks: failedCount,
    timedOutTasks: timedOutCount,
    cancelledTasks: cancelledCount,
    findings: allFindings,
    metrics: {
      totalExecutionTimeMs: Date.now() - startTime,
      quorumSatisfied: quorumEval.quorumSatisfied,
    },
  });
}

module.exports = {
  // Modules
  ...schemas,
  ...stateMachine,
  ...failureClassifier,
  ...retryEngine,
  ...cancellation,
  ...quorumEngine,
  ...recoveryEngine,
  ...resourceGuard,
  ...faultEngine,
  // High-level orchestrator
  executeResilientWorkflow,
};
