'use strict';

/**
 * Tribunal-Kit AI Chat Visual Design System (Phase 3)
 *
 * Defines design tokens, typography rules, status treatments,
 * progressive disclosure builders, and layout formatters inspired by
 * Linear, Cursor, and Vercel for AI chat windows.
 */

const {
  EVENT_TYPES,
} = require('./types');

/**
 * Visual badge and glyph definitions for operational states.
 */
const STATUS_TREATMENTS = Object.freeze({
  [EVENT_TYPES.OPERATION_STARTED]: { glyph: '›', verb: 'Started', tone: 'neutral' },
  [EVENT_TYPES.AGENT_ACTIVATED]: { glyph: '›', verb: 'Activated', tone: 'accent' },
  [EVENT_TYPES.SKILL_ACTIVATED]: { glyph: '›', verb: 'Skill Applied', tone: 'accent' },
  [EVENT_TYPES.ANALYSIS_STARTED]: { glyph: '›', verb: 'Analyzing', tone: 'neutral' },
  [EVENT_TYPES.ANALYSIS_IN_PROGRESS]: { glyph: '›', verb: 'Analyzing', tone: 'neutral' },
  [EVENT_TYPES.TOOL_EXECUTION_STARTED]: { glyph: '›', verb: 'Executing', tone: 'neutral' },
  [EVENT_TYPES.TOOL_EXECUTING]: { glyph: '›', verb: 'Executing', tone: 'neutral' },
  [EVENT_TYPES.PROGRESS_UPDATED]: { glyph: '›', verb: 'Progress', tone: 'neutral' },
  [EVENT_TYPES.TESTS_RUNNING]: { glyph: '›', verb: 'Testing', tone: 'neutral' },
  [EVENT_TYPES.EVIDENCE_COLLECTED]: { glyph: '›', verb: 'Evidence Collected', tone: 'neutral' },
  [EVENT_TYPES.EVIDENCE_COLLECTING]: { glyph: '›', verb: 'Collecting Evidence', tone: 'neutral' },
  [EVENT_TYPES.VALIDATION_PASSED]: { glyph: '✔', verb: 'Verified', tone: 'success' },
  [EVENT_TYPES.VALIDATION_FAILED]: { glyph: '✖', verb: 'Failed', tone: 'error' },
  [EVENT_TYPES.WARNING_DETECTED]: { glyph: '⚠', verb: 'Warning', tone: 'warning' },
  [EVENT_TYPES.APPROVAL_REQUIRED]: { glyph: '⏸', verb: 'Approval Required', tone: 'gate' },
  [EVENT_TYPES.HUMAN_APPROVAL_REQUIRED]: { glyph: '⏸', verb: 'Approval Required', tone: 'gate' },
  [EVENT_TYPES.OPERATION_BLOCKED]: { glyph: '⛔', verb: 'Blocked', tone: 'error' },
  [EVENT_TYPES.RETRY_STARTED]: { glyph: '⟳', verb: 'Retrying', tone: 'warning' },
  [EVENT_TYPES.RETRY_IN_PROGRESS]: { glyph: '⟳', verb: 'Retrying', tone: 'warning' },
  [EVENT_TYPES.STALL_SUSPECTED]: { glyph: '⚠', verb: 'Stall Suspected', tone: 'warning' },
  [EVENT_TYPES.PROGRESS_BATCH]: { glyph: '›', verb: 'Progress Batch', tone: 'neutral' },
  [EVENT_TYPES.OPERATION_COMPLETED]: { glyph: '✔', verb: 'Completed', tone: 'success' },
  [EVENT_TYPES.OPERATION_CANCELLED]: { glyph: '⊘', verb: 'Cancelled', tone: 'muted' },
});

/**
 * Generates an authoritative compact Unicode progress bar.
 *
 * @param {number} percentage - 0 to 100
 * @param {number} [barWidth=10]
 * @returns {string} e.g. "[■■■■■□□□□□]"
 */
function formatProgressBar(percentage, barWidth = 10) {
  const safePct = Math.max(0, Math.min(100, typeof percentage === 'number' ? percentage : 0));
  const filled = Math.round((safePct / 100) * barWidth);
  const empty = barWidth - filled;
  return `[${'■'.repeat(filled)}${'□'.repeat(empty)}]`;
}

/**
 * Formats stage pipelines into a scannable linear flow.
 *
 * @param {Array<{ name: string, status?: string }>} stages
 * @returns {string} e.g. "✔ lint · › test · · bundle"
 */
function formatStagePipeline(stages) {
  if (!Array.isArray(stages) || stages.length === 0) return '';
  return stages.map(s => {
    let icon = '·';
    if (s.status === 'completed') icon = '✔';
    else if (s.status === 'running') icon = '›';
    else if (s.status === 'failed') icon = '✖';
    return `${icon} ${s.name}`;
  }).join(' · ');
}

/**
 * Shortens deep file paths for narrow chat sidebars while preserving the file basename.
 *
 * @param {string} fullPath
 * @param {number} [maxLen=45]
 * @returns {string}
 */
function formatCompactPath(fullPath, maxLen = 45) {
  if (typeof fullPath !== 'string') return '';
  const normalized = fullPath.replace(/\\/g, '/');
  if (normalized.length <= maxLen) return normalized;

  const parts = normalized.split('/');
  if (parts.length <= 2) return normalized;

  const fileName = parts[parts.length - 1];
  const rootDir = parts[0] ? parts[0] : (parts[1] ? `/${parts[1]}` : '');
  const candidate = `${rootDir}/.../${fileName}`;

  return candidate.length < normalized.length ? candidate : normalized;
}

/**
 * Formats expandable progressive disclosure blocks.
 * If allowHtml is false, falls back to a clean plain indented summary.
 *
 * @param {string} summary - Header label
 * @param {string} content - Markdown or code content
 * @param {boolean} [allowHtml=true]
 * @returns {string}
 */
function formatDisclosure(summary, content, allowHtml = true) {
  if (!content || !content.trim()) return '';
  if (allowHtml) {
    return `<details>\n<summary>${summary}</summary>\n\n${content.trim()}\n</details>`;
  }
  return `  ${summary}:\n${content.split('\n').map(l => `    ${l}`).join('\n')}`;
}

module.exports = {
  STATUS_TREATMENTS,
  formatProgressBar,
  formatStagePipeline,
  formatCompactPath,
  formatDisclosure,
};

