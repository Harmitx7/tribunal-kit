'use strict';

const { createHash } = require('node:crypto');
const { assertWithinRoot } = require('../utils/path_containment');
const { AnnouncementIntelligence } = require('../activity/announcement');
const { AGENT_SKILL_STATES } = require('../activity/types');

const costs = {
  low: { tokens: 150, milliseconds: 500 },
  medium: { tokens: 400, milliseconds: 2000 },
  high: { tokens: 900, milliseconds: 10000 },
};
const defaults = { capabilities: 6, tokens: 2000, milliseconds: 30000 };

function digest(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function applicable(signal, context, entry) {
  const { fact, operator, value } = signal;
  if (fact === 'mode') return context.mode === value;
  if (fact === 'availability') return entry.availability.kind === value;
  if (fact === 'impactTier')
    return operator === 'atLeast' ? context.tier >= value : context.tier === value;
  if (fact === 'topology') return context.signals.topologyPaths.includes(value);
  if (fact !== 'path') return false;
  return context.scope.some(
    file =>
      file === value ||
      (operator === 'has' &&
        (value.startsWith('.') ? file.endsWith(value) : file.startsWith(value + '/'))),
  );
}

/** @returns {Array<[string, string[]]>} */
function requiredEvidence(context) {
  /** @type {[string, string[]]} */
  const architecture = [
    'architecture',
    ['cli:understand:impact', 'mcp:tribunal_understand:impact'],
  ];
  /** @type {[string, string[]]} */
  const verification = ['focused-verification-plan', ['agent:test-engineer']];
  if (context.tier >= 2) {
    const requirements = [architecture];
    if (context.tier === 3) {
      requirements.push(['security-review-guidance', ['agent:security-auditor']]);
    }
    return [...requirements, verification];
  }
  if (context.scope.every(file => /\.(css|scss|less|jsx|tsx|vue|svelte)$/i.test(file))) {
    return [['targeted-ui-inspection', ['agent:frontend-specialist', 'skill:baseline-ui']]];
  }
  return [verification];
}

function rank(context, budget, classifierHint) {
  const manifest = require('./capabilities.json');
  const { domain_routes: topics } = require('../../.agent/skill_topic_map.json');
  const entries = new Map(manifest.capabilities.map(entry => [entry.id, entry]));
  const limits = Object.fromEntries(
    Object.entries(defaults).map(([key, fallback]) => [
      key,
      Number.isSafeInteger(budget?.[key]) && budget[key] >= 0
        ? Math.min(budget[key], fallback)
        : fallback,
    ]),
  );
  const requirements = requiredEvidence(context);
  const preferences = new Map();
  if (
    classifierHint?.version === 1 &&
    Array.isArray(classifierHint.rankedCapabilityIds) &&
    classifierHint.rankedCapabilityIds.length <= 32 &&
    classifierHint.rankedCapabilityIds.every(id => typeof id === 'string' && entries.has(id)) &&
    new Set(classifierHint.rankedCapabilityIds).size === classifierHint.rankedCapabilityIds.length
  ) {
    classifierHint.rankedCapabilityIds.forEach((id, i) => preferences.set(id, i));
  }
  const nodes = [];
  const deferred = [];
  const used = new Set();
  const announcementSuppressed = !new AnnouncementIntelligence().evaluate({
    executionState: AGENT_SKILL_STATES.SELECTED,
  }).shouldAnnounce;
  const estimates = { tokens: 0, milliseconds: 0 };
  for (const [requirement, ids] of requirements) {
    const candidates = ids
      .map(id => entries.get(id))
      .filter(
        entry =>
          entry &&
          entry.sideEffectClass === 'read' &&
          entry.availability.kind !== 'unavailable' &&
          !used.has(entry.operationId) &&
          entry.preconditions.every(signal => applicable(signal, context, entry)) &&
          (!entry.triggerSignals.length ||
            entry.triggerSignals.some(signal => applicable(signal, context, entry))) &&
          (entry.surface !== 'skill' || topics.frontend.includes(entry.id.slice('skill:'.length))),
      );
    candidates.sort(
      (a, b) =>
        costs[a.estimatedCostTier].tokens - costs[b.estimatedCostTier].tokens ||
        (preferences.get(a.id) ?? 32) - (preferences.get(b.id) ?? 32) ||
        (a.id < b.id ? -1 : Number(a.id > b.id)),
    );
    const entry = candidates.find(candidate => {
      const cost = costs[candidate.estimatedCostTier];
      return (
        nodes.length < limits.capabilities &&
        estimates.tokens + cost.tokens <= limits.tokens &&
        estimates.milliseconds + cost.milliseconds <= limits.milliseconds
      );
    });
    if (!entry) {
      deferred.push(requirement);
      continue;
    }
    used.add(entry.operationId);
    const cost = costs[entry.estimatedCostTier];
    estimates.tokens += cost.tokens;
    estimates.milliseconds += cost.milliseconds;
    nodes.push({
      id: entry.id,
      operationId: entry.operationId,
      scope: context.scope,
      requires: nodes.map(node => node.id),
      required: true,
      rationale: requirement,
      verification: entry.verification,
      estimatedCost: cost,
      announcementSuppressed,
    });
  }
  return {
    nodes,
    estimates,
    deferred,
    requirements: [
      ...requirements.map(([name]) => name),
      ...(context.tier >= 2 && context.mode !== 'plan'
        ? ['write-approval', 'focused-verification-result']
        : []),
    ],
    manifestDigest: digest(manifest),
  };
}

function containScope(context) {
  try {
    for (const file of context.scope) assertWithinRoot(context.root, file);
    return true;
  } catch {
    return false;
  }
}

module.exports = { containScope, digest, rank };
