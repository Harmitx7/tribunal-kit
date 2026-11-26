'use strict';

const path = require('node:path');
const { classifySpeechAct } = require('../../.agent/scripts/intent_extractor');
const { classifyImpact } = require('../../.agent/scripts/impact_classifier');

const maxTaskLength = 4096;
const maxDiffLength = 64 * 1024;
const maxPaths = 128;

function paths(values) {
  if (!Array.isArray(values) || values.length > maxPaths) return [];
  return [
    ...new Set(
      values.flatMap(value => {
        if (typeof value !== 'string' || value.length > 256) return [];
        const normalized = value.replace(/\\/g, '/').replace(/^\.\//, '');
        if (
          normalized
            .split('/')
            .some(
              part =>
                !part ||
                part === '.' ||
                part === '..' ||
                /[:\x00-\x1f]/.test(part) ||
                /[. ]$/.test(part) ||
                /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part),
            )
        )
          return [];
        return [normalized];
      }),
    ),
  ].sort();
}

function buildIntentContext(input, resolveTier) {
  const task =
    typeof input.task === 'string' && input.task.length <= maxTaskLength ? input.task.trim() : '';
  const mode = classifySpeechAct(task);
  if (mode === 'discuss') return { mode, tier: 0, reason: 'discussion', scope: [] };
  const state = input.workspace;
  const digest = value => typeof value === 'string' && /^[a-f0-9]{40,64}$/.test(value);
  if (
    !state ||
    state.fresh !== true ||
    typeof state.root !== 'string' ||
    !path.isAbsolute(state.root) ||
    !digest(state.workingTreeDigest) ||
    !digest(state.baseDigest)
  ) {
    return { mode, tier: null, reason: 'missing-current-workspace-evidence', scope: [] };
  }
  const targets = new Set(paths(input.targets));
  const diff =
    typeof state.diff === 'string' && state.diff.length <= maxDiffLength ? state.diff : '';
  const signals = Object.fromEntries(
    ['touchedPaths', 'observedPaths', 'topologyPaths', 'blastPaths'].map(source => [
      source,
      paths(state[source]).filter(file => targets.has(file)),
    ]),
  );
  const scope = [...new Set(Object.values(signals).flat())].sort();
  if (!scope.length) return { mode, tier: null, reason: 'target-not-corroborated', scope };
  const changed = paths(state.touchedPaths);
  // Only use a diff when the host attests that every touched file is in scope.
  const scopedDiff = changed.length && changed.every(file => targets.has(file)) ? diff : '';
  const decision = {
    files: scope,
    task,
    diff: scopedDiff,
    lines: scopedDiff ? scopedDiff.split('\n').length : 0,
  };
  const blastTier = Math.max(
    0,
    ...signals.topologyPaths.concat(signals.blastPaths).map(file => {
      const risk = state.blastRisk?.[file];
      return risk === 'CRITICAL' ? 3 : risk === 'HIGH' ? 2 : 0;
    }),
  );
  const resolvedTier = resolveTier(decision);
  const docsOnly = scope.every(file => /\.(?:md|txt|markdown|rst|adoc)$/i.test(file));
  const heuristic = classifyImpact(
    docsOnly && resolvedTier === 0 ? { ...decision, task: '' } : decision,
  ).tier;
  const tier = Math.max(resolvedTier, heuristic, blastTier);
  return {
    mode,
    task,
    tier,
    scope,
    signals,
    scopedDiff,
    root: state.root,
    baseDigest: state.baseDigest,
    workingTreeDigest: state.workingTreeDigest,
    turnId:
      typeof input.turnId === 'string' && /^[\w.-]{1,128}$/.test(input.turnId)
        ? input.turnId
        : null,
  };
}

function verifyInline(context) {
  if (
    context.scope.length !== 1 ||
    !/\.css$/i.test(context.scope[0]) ||
    !context.signals.touchedPaths.includes(context.scope[0]) ||
    !context.scopedDiff
  ) {
    return 'pending';
  }
  const changes = context.scopedDiff.split(/\r?\n/).filter(line => /^[+-](?![+-]{2})/.test(line));
  if (changes.length !== 2 || !changes[0].startsWith('-') || !changes[1].startsWith('+'))
    return 'pending';
  const color = /^[+-]\s*((?:background-)?color):\s*(#[a-f0-9]{3}(?:[a-f0-9]{3})?);\s*$/i;
  const [before, after] = changes.map(line => color.exec(line));
  return before && after && before[1] === after[1] && before[2] !== after[2]
    ? 'single-color-declaration-checked'
    : 'pending';
}

module.exports = { buildIntentContext, paths, verifyInline };
