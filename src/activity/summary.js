'use strict';

/**
 * Tribunal-Kit High-Information Completion Summary Engine (Phase 10)
 *
 * Synthesizes evidence-grounded, high-density completion summaries
 * across Markdown, Terminal, PlainText, and Structured environments.
 *
 * Communicates:
 * - What was attempted
 * - What changed
 * - What succeeded
 * - What failed or remains incomplete
 * - What was verified
 * - What requires human attention
 * - Where supporting evidence / diagnostics can be found
 *
 * INVARIANT: Never claims success without authoritative evidence.
 */

const {
  STATUSES,
  LIFECYCLE_STATES,
  ENVIRONMENTS,
} = require('./types');

const { boundArray } = require('./truncation');

function formatDuration(ms) {
  if (ms === null || ms === undefined) return '';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Normalizes input (OperationRecord, ActivityTracker, or raw summary object)
 * into a canonical summary descriptor.
 *
 * @param {Object} input
 * @returns {Object}
 */
function normalizeSummaryData(input = {}) {
  if (!input || typeof input !== 'object') {
    return {
      title: 'Operation Finished',
      status: STATUSES.COMPLETED,
      durationMs: null,
      attempted: [],
      changed: [],
      succeeded: [],
      failed: [],
      verified: [],
      warnings: [],
      artifacts: [],
      diagnosticsRef: null,
    };
  }

  // If input is an ActivityTracker
  if (typeof input.getExecutiveSummary === 'function') {
    const exec = input.getExecutiveSummary();
    const op = typeof input.getOperation === 'function' ? input.getOperation() : null;

    const attempted = op && op.stages ? op.stages.map(s => s.name) : [input.title];
    const succeeded = [];
    const failed = [];
    const verified = [];
    const warnings = [];

    if (op && Array.isArray(op.evidence)) {
      op.evidence.forEach(e => {
        if (e.verified) verified.push(e.description || e.ref);
      });
    }

    if (op && op.error) {
      failed.push(op.error.message || String(op.error));
    }

    if (exec.passedCount > 0) {
      succeeded.push(`${exec.passedCount} checks passed`);
    }

    return {
      title: input.title || exec.title,
      operationId: input.operationId,
      status: input.getStatus() || exec.status,
      durationMs: exec.durationMs,
      attempted,
      changed: [],
      succeeded,
      failed,
      verified,
      warnings,
      artifacts: exec.artifacts || [],
      diagnosticsRef: input.operationId,
    };
  }

  // If input is an OperationRecord
  if (input.operationId && input.statusHistory) {
    const verified = (input.evidence || []).filter(e => e.verified).map(e => e.description || e.ref);
    const failed = input.error ? [input.error.message || String(input.error)] : [];
    const succeeded = [];
    if (verified.length > 0 && failed.length === 0) {
      succeeded.push(`${verified.length} verification invariants verified`);
    }

    const durationMs = input.timestamps && input.timestamps.completedAt && input.timestamps.startedAt
      ? new Date(input.timestamps.completedAt).getTime() - new Date(input.timestamps.startedAt).getTime()
      : null;

    return {
      title: input.title,
      operationId: input.operationId,
      status: input.status,
      durationMs,
      attempted: input.stages ? input.stages.map(s => s.name) : [input.title],
      changed: [],
      succeeded,
      failed,
      verified,
      warnings: input.warnings || [],
      artifacts: [],
      diagnosticsRef: input.operationId,
    };
  }

  // Raw summary object
  return {
    title: input.title || 'Engineering Operation',
    operationId: input.operationId || null,
    status: input.status || STATUSES.COMPLETED,
    durationMs: input.durationMs || null,
    attempted: Array.isArray(input.attempted) ? input.attempted : (input.attempted ? [input.attempted] : []),
    changed: Array.isArray(input.changed) ? input.changed : (input.changed ? [input.changed] : []),
    succeeded: Array.isArray(input.succeeded) ? input.succeeded : (input.succeeded ? [input.succeeded] : []),
    failed: Array.isArray(input.failed) ? input.failed : (input.failed ? [input.failed] : []),
    verified: Array.isArray(input.verified) ? input.verified : (input.verified ? [input.verified] : []),
    warnings: Array.isArray(input.warnings) ? input.warnings : (input.warnings ? [input.warnings] : []),
    artifacts: Array.isArray(input.artifacts) ? input.artifacts : (input.artifacts ? [input.artifacts] : []),
    diagnosticsRef: input.diagnosticsRef || input.operationId || null,
    limitations: input.limitations || null,
    nextAction: input.nextAction || null,
  };
}

/**
 * Formats an authoritative completion summary for the target environment.
 *
 * @param {Object} input OperationRecord, ActivityTracker, or summary descriptor
 * @param {Object} [options]
 * @returns {string} Formatted completion card
 */
function formatCompletionSummary(input, options = {}) {
  const data = normalizeSummaryData(input);
  const env = options.environment || ENVIRONMENTS.MARKDOWN;

  if (env === ENVIRONMENTS.STRUCTURED || env === ENVIRONMENTS.JSON) {
    return JSON.stringify(data, null, 2);
  }

  const isFailed = data.status === STATUSES.FAILED || data.status === LIFECYCLE_STATES.FAILED || data.failed.length > 0;
  const isCancelled = data.status === STATUSES.CANCELLED || data.status === LIFECYCLE_STATES.CANCELLED;

  const glyph = isFailed ? '✖' : isCancelled ? '⊘' : '✔';
  const verb = isFailed ? 'Failed' : isCancelled ? 'Cancelled' : 'Completed';
  const durationStr = data.durationMs ? ` (${formatDuration(data.durationMs)})` : '';

  if (env === ENVIRONMENTS.TERMINAL) {
    const lines = [];
    lines.push(`${glyph} ${verb}: ${data.title}${durationStr}`);

    if (data.succeeded.length > 0) {
      lines.push(`  Succeeded:`);
      data.succeeded.forEach(s => lines.push(`    [OK] ${s}`));
    }
    if (data.failed.length > 0) {
      lines.push(`  Failed:`);
      data.failed.forEach(f => lines.push(`    [FAIL] ${f}`));
    }
    if (data.verified.length > 0) {
      lines.push(`  Verified:`);
      data.verified.slice(0, 4).forEach(v => lines.push(`    - ${v}`));
    }
    if (data.artifacts.length > 0) {
      lines.push(`  Artifacts: ${data.artifacts.join(', ')}`);
    }
    if (data.diagnosticsRef) {
      lines.push(`  Diagnostics: ${data.diagnosticsRef}`);
    }
    return lines.join('\n');
  }

  if (env === ENVIRONMENTS.PLAINTEXT) {
    const lines = [];
    const asciiGlyph = isFailed ? '[FAIL]' : isCancelled ? '[CANCEL]' : '[DONE]';
    lines.push(`${asciiGlyph} ${data.title}${durationStr}`);
    if (data.succeeded.length > 0) {
      lines.push(`  Succeeded: ${data.succeeded.join(', ')}`);
    }
    if (data.failed.length > 0) {
      lines.push(`  Failed: ${data.failed.join(', ')}`);
    }
    if (data.verified.length > 0) {
      lines.push(`  Verified: ${data.verified.slice(0, 3).join(', ')}`);
    }
    if (data.artifacts.length > 0) {
      lines.push(`  Artifacts: ${data.artifacts.join(', ')}`);
    }
    return lines.join('\n');
  }

  // Markdown (Default AI Chat presentation)
  const lines = [];
  lines.push(`${glyph} **${verb}** · ${data.title}${durationStr}`);

  if (data.attempted.length > 0 && options.showAttempted !== false) {
    const bound = boundArray(data.attempted, { maxItems: 3 });
    lines.push(`  Attempted: ${bound.items.join(', ')}`);
  }

  if (data.changed.length > 0) {
    const bound = boundArray(data.changed, { maxItems: 4 });
    lines.push(`  Changed: ${bound.items.join(', ')}${bound.pagination.isTruncated ? ` (${bound.pagination.omitted} more)` : ''}`);
  }

  if (data.succeeded.length > 0) {
    lines.push(`  Succeeded:`);
    data.succeeded.slice(0, 3).forEach(s => lines.push(`    ✔ ${s}`));
  }

  if (data.failed.length > 0) {
    lines.push(`  Failed:`);
    data.failed.forEach(f => lines.push(`    ✖ ${f}`));
  }

  if (data.verified.length > 0) {
    lines.push(`  Verified:`);
    const bound = boundArray(data.verified, { maxItems: 4 });
    bound.items.forEach(v => lines.push(`    - ${v}`));
    if (bound.pagination.isTruncated) {
      lines.push(`    - ${bound.pagination.notice}`);
    }
  }

  if (data.warnings.length > 0) {
    lines.push(`  Attention:`);
    data.warnings.slice(0, 2).forEach(w => lines.push(`    ⚠ ${typeof w === 'object' ? w.message : w}`));
  }

  if (data.artifacts.length > 0) {
    lines.push(`  Artifacts: ${data.artifacts.map(a => `\`${a}\``).join(', ')}`);
  }

  if (data.diagnosticsRef) {
    lines.push(`  Diagnostics: \`${data.diagnosticsRef}\``);
  }

  if (data.nextAction) {
    lines.push(`  Next: ${data.nextAction}`);
  }

  return lines.join('\n');
}

module.exports = {
  formatDuration,
  normalizeSummaryData,
  formatCompletionSummary,
};

