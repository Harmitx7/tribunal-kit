'use strict';

/**
 * agent_dispatcher.js — Controlled Multi-Agent DAG Dispatcher & Orchestrator
 * =========================================================================
 * Stage 2: Controlled Multi-Agent Orchestration
 *
 * Guarantees:
 * 1. DAG validation with cycle detection and missing dependency verification.
 * 2. Parallel wave execution governed by KernelScheduler concurrency limits.
 * 3. Failure cascading: dependent tasks fail-closed (BLOCKED) when dependencies fail.
 * 4. Failure isolation: non-dependent parallel tasks continue execution unaffected.
 * 5. Automatic conflict resolution across all completed agent findings.
 * 6. Cryptographically verifiable session evidence aggregation.
 */

const crypto = require('crypto');
const { AgentRuntime } = require('./agent_runtime');
const { ConflictResolver } = require('./conflict_resolver');
const { EvidenceBus } = require('./evidence_bus');

/**
 * Validates task dependencies and verifies DAG acyclicity.
 * @param {Array<Object>} tasks
 * @returns {{ valid: boolean, error?: string, executionOrder?: string[][] }}
 */
function validateDag(tasks) {
  const taskMap = new Map();
  const inDegree = new Map();
  const graph = new Map(); // taskId -> list of dependent tasks

  for (const t of tasks) {
    if (!t || !t.taskId) {
      return { valid: false, error: 'Every task must possess a valid non-empty taskId.' };
    }
    if (taskMap.has(t.taskId)) {
      return { valid: false, error: `Duplicate taskId detected: "${t.taskId}".` };
    }
    taskMap.set(t.taskId, t);
    inDegree.set(t.taskId, 0);
    graph.set(t.taskId, []);
  }

  // Build graph and calculate in-degrees
  for (const t of tasks) {
    const deps = Array.isArray(t.dependencies) ? t.dependencies : [];
    for (const depId of deps) {
      if (!taskMap.has(depId)) {
        return {
          valid: false,
          error: `MISSING_DEPENDENCY: Task "${t.taskId}" references non-existent dependency "${depId}".`,
        };
      }
      graph.get(depId).push(t.taskId);
      inDegree.set(t.taskId, inDegree.get(t.taskId) + 1);
    }
  }

  // Kahn's algorithm for topological sorting and cycle detection
  const waves = [];
  let ready = [];

  for (const [taskId, deg] of inDegree.entries()) {
    if (deg === 0) {
      ready.push(taskId);
    }
  }

  let processedCount = 0;

  while (ready.length > 0) {
    waves.push([...ready]);
    const nextReady = [];

    for (const taskId of ready) {
      processedCount++;
      const dependents = graph.get(taskId) || [];
      for (const dep of dependents) {
        const newDeg = inDegree.get(dep) - 1;
        inDegree.set(dep, newDeg);
        if (newDeg === 0) {
          nextReady.push(dep);
        }
      }
    }
    ready = nextReady;
  }

  if (processedCount < tasks.length) {
    return {
      valid: false,
      error: `CYCLE_DETECTED: Cyclic dependency detected among tasks (${tasks.length - processedCount} unreachable tasks).`,
    };
  }

  return { valid: true, executionOrder: waves };
}

class AgentDispatcher {
  /**
   * @param {Object} [options]
   * @param {AgentRuntime} [options.runtime]
   * @param {ConflictResolver} [options.conflictResolver]
   * @param {EvidenceBus} [options.evidenceBus]
   */
  constructor(options = {}) {
    this.runtime = options.runtime || new AgentRuntime(options);
    this.conflictResolver = options.conflictResolver || new ConflictResolver();
    this.evidenceBus = options.evidenceBus || this.runtime.evidenceBus;
  }

  /**
   * Dispatches a collection of dependent tasks through the runtime DAG.
   *
   * @param {Array<Object>} tasks - Array of AgentTask specifications
   * @param {Object} [options]
   * @param {string} [options.sessionId]
   * @param {boolean} [options.strictConflicts=false]
   * @param {AbortSignal} [options.signal]
   * @returns {Promise<{
   *   status: 'SUCCESS'|'PARTIAL_SUCCESS'|'FAILURE',
   *   sessionId: string,
   *   totalTasks: number,
   *   completedTasks: number,
   *   failedTasks: number,
   *   blockedTasks: number,
   *   results: Object<string, Object>,
   *   conflicts: Array<Object>,
   *   hasConflicts: boolean,
   *   durationMs: number,
   *   summary: string
   * }>}
   */
  async dispatch(tasks = [], options = {}) {
    const start = Date.now();
    const sessionId = options.sessionId || `session_${crypto.randomBytes(8).toString('hex')}`;
    const signal = options.signal || null;

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return {
        status: 'SUCCESS',
        sessionId,
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        blockedTasks: 0,
        results: {},
        conflicts: [],
        hasConflicts: false,
        durationMs: Date.now() - start,
        summary: 'No tasks to dispatch.',
      };
    }

    // 1. DAG Validation
    const dagCheck = validateDag(tasks);
    if (!dagCheck.valid) {
      const err = new Error(`DAG_VALIDATION_ERROR: ${dagCheck.error}`);
      err.code = 'DAG_VALIDATION_ERROR';
      throw err;
    }

    const taskMap = new Map(tasks.map(t => [t.taskId, t]));
    const results = new Map(); // taskId -> AgentResult
    const failedTaskIds = new Set();
    const blockedTaskIds = new Set();

    // 2. Wave-by-Wave Execution
    for (const wave of dagCheck.executionOrder) {
      if (signal && signal.aborted) {
        for (const taskId of wave) {
          results.set(taskId, {
            taskId,
            agentId: taskMap.get(taskId)?.agentId || 'unknown',
            status: 'CANCELLED',
            summary: 'Dispatched wave cancelled by caller signal.',
            findings: [],
            evidence: [],
            artifacts: [],
            recommendations: [],
            errors: ['DISPATCH_CANCELLED'],
            provenance: {
              inputHash: '',
              outputHash: '',
              provider: 'none',
              model: 'none',
              durationMs: 0,
              timestamp: Date.now(),
            },
            durationMs: 0,
          });
        }
        continue;
      }

      // Filter tasks in this wave: check if any of their dependencies failed
      const runnableTasks = [];
      for (const taskId of wave) {
        const task = taskMap.get(taskId);
        const deps = task.dependencies || [];
        const failedDep = deps.find(d => failedTaskIds.has(d) || blockedTaskIds.has(d));

        if (failedDep) {
          // Failure cascading: mark blocked
          blockedTaskIds.add(taskId);
          results.set(taskId, {
            taskId,
            agentId: task.agentId,
            status: 'BLOCKED',
            summary: `CASCADING_FAILURE: Dependency "${failedDep}" failed; execution blocked.`,
            findings: [],
            evidence: [],
            artifacts: [],
            recommendations: [],
            errors: [`Dependency "${failedDep}" did not succeed.`],
            provenance: {
              inputHash: crypto.createHash('sha256').update(JSON.stringify(task)).digest('hex'),
              outputHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              provider: 'none',
              model: 'none',
              durationMs: 0,
              timestamp: Date.now(),
            },
            durationMs: 0,
          });
        } else {
          runnableTasks.push(task);
        }
      }

      // Execute runnable tasks in parallel wave
      if (runnableTasks.length > 0) {
        const wavePromises = runnableTasks.map(async task => {
          try {
            const res = await this.runtime.executeTask(task, {
              sessionId,
              signal,
            });
            results.set(task.taskId, res);

            if (res.status === 'FAILURE' || res.status === 'ERROR' || res.status === 'CANCELLED') {
              failedTaskIds.add(task.taskId);
            } else if (res.status === 'BLOCKED') {
              blockedTaskIds.add(task.taskId);
            }
          } catch (taskErr) {
            failedTaskIds.add(task.taskId);
            results.set(task.taskId, {
              taskId: task.taskId,
              agentId: task.agentId,
              status: 'ERROR',
              summary: `UNCAUGHT_RUNTIME_ERROR: ${taskErr.message}`,
              findings: [],
              evidence: [],
              artifacts: [],
              recommendations: [],
              errors: [taskErr.message],
              provenance: {
                inputHash: '',
                outputHash: crypto.createHash('sha256').update(taskErr.message).digest('hex'),
                provider: 'none',
                model: 'none',
                durationMs: 0,
                timestamp: Date.now(),
              },
              durationMs: 0,
            });
          }
        });

        await Promise.all(wavePromises);
      }
    }

    // 3. Aggregate all findings & evaluate conflicts
    const sessionEvidence = this.evidenceBus.createSession(sessionId);
    const allFindings = sessionEvidence.getFindings();

    const conflictAnalysis = this.conflictResolver.resolve(allFindings, {
      strict: Boolean(options.strictConflicts),
    });

    // 4. Synthesize Final Status
    const totalTasks = tasks.length;
    const completedTasks = Array.from(results.values()).filter(r => r.status === 'SUCCESS').length;
    const failedTasks = failedTaskIds.size;
    const blockedTasks = blockedTaskIds.size;

    let status = 'SUCCESS';
    if ((failedTasks > 0 || blockedTasks > 0) && completedTasks > 0) {
      status = 'PARTIAL_SUCCESS';
    } else if (failedTasks > 0 || (completedTasks === 0 && totalTasks > 0)) {
      status = 'FAILURE';
    } else if (blockedTasks > 0) {
      status = 'BLOCKED';
    }

    const durationMs = Date.now() - start;
    const summary = `Orchestration ${sessionId} concluded with status ${status}: ${completedTasks}/${totalTasks} tasks succeeded, ${failedTasks} failed, ${blockedTasks} blocked. ${conflictAnalysis.summary}`;

    return {
      status,
      sessionId,
      totalTasks,
      completedTasks,
      failedTasks,
      blockedTasks,
      results: Object.fromEntries(results.entries()),
      conflicts: conflictAnalysis.conflicts,
      hasConflicts: conflictAnalysis.hasConflicts,
      durationMs,
      summary,
    };
  }
}

module.exports = {
  AgentDispatcher,
  validateDag,
};
