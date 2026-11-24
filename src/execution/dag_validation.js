'use strict';

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

module.exports = { validateDag };
