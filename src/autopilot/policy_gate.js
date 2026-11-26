'use strict';

const { assertWithinRoot } = require('../utils/path_containment');
const { validateResourceId } = require('../security/boundary');

const policyVersion = 'autopilot-policy-1';
const inspectionAdapters = new Set(['cli:understand:impact', 'mcp:tribunal_understand:impact']);
const advisoryAdapters = new Set([
  'agent:frontend-specialist',
  'skill:baseline-ui',
  'agent:security-auditor',
  'agent:test-engineer',
]);

function evaluateCapability(node, entry, root, scope) {
  if (
    !entry ||
    entry.id !== node.id ||
    entry.operationId !== node.operationId ||
    entry.availability.kind === 'unavailable' ||
    !node.scope.length ||
    node.scope.some(file => !scope.includes(file))
  )
    return 'deny';
  try {
    for (const file of node.scope) assertWithinRoot(root, file);
  } catch {
    return 'deny';
  }
  if (entry.sideEffectClass === 'write') return 'write-approval';
  if (entry.sideEffectClass !== 'read') return 'deny';
  if (entry.availability.kind === 'advisory' && advisoryAdapters.has(entry.id)) return 'advisory';
  if (inspectionAdapters.has(entry.id)) return 'inspect';
  return 'deny';
}

function createEnvelope(rootRunId, parent, keys) {
  validateResourceId(rootRunId);
  if (parent && (parent.rootRunId !== rootRunId || parent.depth !== 0)) {
    throw new Error('Nested Autopilot execution is denied.');
  }
  return Object.freeze({
    rootRunId,
    parentRunId: parent?.rootRunId ?? null,
    depth: parent ? 1 : 0,
    maxDepth: 1,
    seenCapabilities: Object.freeze([...keys]),
  });
}

module.exports = { createEnvelope, evaluateCapability, policyVersion };
