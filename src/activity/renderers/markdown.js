'use strict';

/**
 * Tribunal-Kit Markdown Activity Renderer (Phase 3 & Phase 9 Hardening)
 *
 * Premium AI chat presentation renderer designed for Antigravity, Claude Code,
 * Cursor, Windsurf, Copilot, and modern LLM chat interfaces.
 *
 * Features:
 * - High-contrast visual hierarchy (glyphs, bold badges, domain emphasis)
 * - Restrained typography inspired by Linear, Cursor, and Vercel
 * - Context-sensitive layout by operational event type and lifecycle state
 * - Progressive disclosure (<details>) with clean fallback for hosts without HTML support
 * - Responsive line wrapping for narrow IDE sidebars (250px - 400px)
 * - Zero ANSI escape leakage, zero ASCII box borders, zero decorative emojis
 * - Cross-environment security against HTML/Markdown prompt injection
 */

const {
  EVENT_TYPES,
  EVENT_VERBS,
  EVENT_GLYPHS,
} = require('../types');

const { sanitizeActivityEvent } = require('../schema');
const {
  STATUS_TREATMENTS,
  formatProgressBar,
  formatStagePipeline,
  formatCompactPath,
  formatDisclosure,
} = require('../design_system');

const {
  resolveDetailLevel,
  DETAIL_LEVELS,
  shouldDisplayEvent,
} = require('../progressive_disclosure');

const { boundArray, boundString } = require('../truncation');

const ANSI_REGEX =
  /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]|(?:\x1b\][^\x07\x1b]*(?:\x07|\x1b\\))/g;

function stripAnsi(text) {
  if (text === null || text === undefined) return '';
  const str = String(text);
  if (str.indexOf('\u001b') === -1 && str.indexOf('\u009b') === -1) {
    return str;
  }
  return str.replace(ANSI_REGEX, '');
}

function escapeHtmlTags(text) {
  if (typeof text !== 'string') return String(text || '');
  if (text.indexOf('<') === -1 && text.indexOf('>') === -1) {
    return text;
  }
  return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

class MarkdownRenderer {
  constructor(options = {}) {
    this.options = options;
  }

  render(rawEvent, options = {}) {
    return renderMarkdown(rawEvent, { ...this.options, ...options });
  }
}

/**
 * Formats a canonical ActivityEvent into polished, responsive GitHub-flavored Markdown.
 *
 * @param {Object} rawEvent
 * @param {Object} [options]
 * @returns {string}
 */
function renderMarkdown(rawEvent, options = {}) {
  if (!rawEvent || typeof rawEvent !== 'object') {
    return '› **Notice** · Invalid event';
  }

  // Presentation-safe sanitized event with secret redactions applied
  const event = sanitizeActivityEvent(rawEvent);

  const detailLevel = resolveDetailLevel(options);
  if (options.filter && !shouldDisplayEvent(event, detailLevel, options).visible) {
    return '';
  }

  const treatment = STATUS_TREATMENTS[event.eventType] || {
    glyph: EVENT_GLYPHS[event.eventType] || '›',
    verb: EVENT_VERBS[event.eventType] || 'Notice',
  };

  const glyph = treatment.glyph;
  const verb = treatment.verb;

  // Clean strings of any ANSI codes that might have leaked from subprocess/terminal logs
  const cleanTitle = escapeHtmlTags(stripAnsi(event.title || '')).replace(/[\r\n]+/g, ' ').trim();
  const cleanSummary = event.summary ? escapeHtmlTags(stripAnsi(event.summary)) : null;
  const cleanDomain = event.domain ? escapeHtmlTags(stripAnsi(event.domain)).replace(/[\r\n]+/g, ' ').trim() : null;
  const cleanAgent = event.agent ? stripAnsi(event.agent).replace(/[`\r\n]/g, '').trim() : null;
  const cleanSkill = event.skill ? stripAnsi(event.skill).replace(/[`\r\n]/g, '').trim() : null;

  // ── 1. Header Line ────────────────────────────────────────────────────────
  let header = '';

  if (event.eventType === EVENT_TYPES.AGENT_ACTIVATED && cleanAgent) {
    const domainPart = cleanDomain
      ? ` · ${cleanDomain}`
      : (cleanTitle && cleanTitle !== 'Operational Event' ? ` · ${cleanTitle}` : '');
    header = `${glyph} **${verb}** \`@${cleanAgent}\`${domainPart}`;
  } else if (event.eventType === EVENT_TYPES.SKILL_ACTIVATED && cleanSkill) {
    const domainPart = cleanDomain ? ` · ${cleanDomain}` : '';
    header = `${glyph} **${verb}** \`skill:${cleanSkill}\`${domainPart}`;
  } else if (event.eventType === EVENT_TYPES.TOOL_EXECUTING || event.eventType === EVENT_TYPES.TOOL_EXECUTION_STARTED) {
    const toolTitle = cleanTitle.startsWith('Tool: ')
      ? cleanTitle.replace(/^Tool:\s*/, '')
      : cleanTitle;
    const phasePart = event.phase ? `[${stripAnsi(event.phase)}] ` : '';
    header = `${glyph} **${verb}** · ${phasePart}${toolTitle}`;
  } else if (
    (event.eventType === EVENT_TYPES.RETRY_STARTED || event.eventType === EVENT_TYPES.RETRY_IN_PROGRESS) &&
    event.attempt
  ) {
    const maxPart = event.maxAttempts ? ` of ${event.maxAttempts}` : '';
    header = `${glyph} **${verb}** · ${cleanTitle} (Attempt ${event.attempt}${maxPart})`;
  } else {
    const phasePart = event.phase ? `[${stripAnsi(event.phase)}] ` : '';
    header = `${glyph} **${verb}** · ${phasePart}${cleanTitle}`;
  }

  if (detailLevel === DETAIL_LEVELS.DIAGNOSTIC) {
    const timeBadge = event.timestamp ? ` [${event.timestamp.split('T')[1]?.slice(0, 8) || ''}]` : '';
    const opBadge = event.operationId ? ` \`(${event.operationId})\`` : '';
    header = `${header}${opBadge}${timeBadge}`;
  }

  // Compact mode for micro-events
  if (options.compact) {
    const metaParts = [];
    if (cleanSummary) metaParts.push(cleanSummary);
    if (event.progress && event.progress.percentage !== undefined && event.progress.percentage !== null) {
      metaParts.push(`${event.progress.percentage}%`);
    }
    const metaStr = metaParts.length > 0 ? ` (${metaParts.join(' · ')})` : '';
    return `${header}${metaStr}`;
  }

  const lines = [header];

  // ── 2. Summary / Mandate Description ──────────────────────────────────────
  if (cleanSummary) {
    lines.push(`  ${cleanSummary}`);
  }

  // ── 3. Authoritative Progress & Stages ─────────────────────────────────────
  if (event.progress) {
    const p = event.progress;
    if (p.isAuthoritative && p.current !== undefined && p.total !== undefined) {
      const pending = Math.max(0, p.total - p.current);
      const pct = p.percentage !== undefined && p.percentage !== null ? ` (${p.percentage}%)` : '';
      const unit = p.unit || 'steps';
      const barPart = options.progressBar && p.percentage !== undefined && p.percentage !== null
        ? `${formatProgressBar(p.percentage, 8)} `
        : '';
      lines.push(`  Progress: ${barPart}${p.current}/${p.total} ${unit}${pct} · ${pending} pending`);
    } else if (p.percentage !== undefined && p.percentage !== null && p.isAuthoritative) {
      const barPart = options.progressBar ? `${formatProgressBar(p.percentage, 8)} ` : '';
      lines.push(`  Progress: ${barPart}${p.percentage}%`);
    } else if (!p.isAuthoritative) {
      lines.push(`  Status: In progress (unmetered)`);
    }

    if (Array.isArray(p.stages) && p.stages.length > 0) {
      if (options.stageGlyphs) {
        lines.push(`  Stages: ${formatStagePipeline(p.stages)}`);
      } else {
        const completed = p.stages.filter(s => s.status === 'completed').map(s => s.name);
        const running = p.stages.filter(s => s.status === 'running').map(s => s.name);
        const pending = p.stages.filter(s => !s.status || s.status === 'pending').map(s => s.name);

        const parts = [];
        if (completed.length) parts.push(`done: ${completed.join(', ')}`);
        if (running.length) parts.push(`active: ${running.join(', ')}`);
        if (pending.length) parts.push(`pending: ${pending.join(', ')}`);
        if (parts.length) {
          lines.push(`  Stages: ${parts.join(' · ')}`);
        }
      }
    }
  }

  // ── 4. Authoritative Verification Evidence ────────────────────────────────
  if (event.evidence) {
    const defaultMaxInline = detailLevel === DETAIL_LEVELS.ESSENTIAL ? 2 : 4;
    const maxInline = typeof options.maxInlineEvidence === 'number' ? options.maxInlineEvidence : defaultMaxInline;
    const hostAllowsHtml = options.capabilities ? options.capabilities.supportsHtml : true;
    const allowDisclosure = options.progressiveDisclosure !== false && options.allowHtml !== false && hostAllowsHtml;

    if (typeof event.evidence === 'string') {
      const cleanEv = stripAnsi(event.evidence);
      const boundedEv = detailLevel === DETAIL_LEVELS.DIAGNOSTIC
        ? cleanEv
        : boundString(cleanEv, { maxLength: detailLevel === DETAIL_LEVELS.ESSENTIAL ? 500 : 2000, diagnosticRef: event.operationId }).text;
      const formattedEv = options.shortenPaths ? formatCompactPath(boundedEv) : boundedEv;
      lines.push(`  Evidence: ${formattedEv}`);
    } else if (Array.isArray(event.evidence)) {
      if (event.evidence.length === 1 && typeof event.evidence[0] === 'string') {
        const cleanEv = stripAnsi(event.evidence[0]);
        const itemStr = options.shortenPaths ? formatCompactPath(cleanEv) : cleanEv;
        lines.push(`  Evidence: ${itemStr}`);
      } else if (event.evidence.length <= maxInline) {
        lines.push(`  Evidence:`);
        event.evidence.forEach(item => {
          const rawItem = typeof item === 'object' ? JSON.stringify(item) : String(item);
          lines.push(`    - ${stripAnsi(rawItem)}`);
        });
      } else {
        // Exceeds maxInline
        if (allowDisclosure) {
          lines.push(`  Evidence:`);
          event.evidence.slice(0, 2).forEach(item => {
            const rawItem = typeof item === 'object' ? JSON.stringify(item) : String(item);
            lines.push(`    - ${stripAnsi(rawItem)}`);
          });
          const remainingItems = event.evidence.slice(2);
          const maxInDisclosure = detailLevel === DETAIL_LEVELS.ESSENTIAL ? 5 : (detailLevel === DETAIL_LEVELS.DIAGNOSTIC ? 100 : 20);
          const boundedRemaining = remainingItems.slice(0, maxInDisclosure);
          const extraLines = boundedRemaining.map(item => `  - ${stripAnsi(typeof item === 'object' ? JSON.stringify(item) : item)}`);
          if (remainingItems.length > maxInDisclosure) {
            extraLines.push(`  - ... and ${remainingItems.length - maxInDisclosure} more verified findings (retained in diagnostics${event.operationId ? `: ${event.operationId}` : ''})`);
          }
          const extraItemsStr = extraLines.join('\n');
          lines.push(formatDisclosure(`... and ${event.evidence.length - 2} more verified findings`, extraItemsStr, true));
        } else {
          lines.push(`  Evidence:`);
          const bounded = boundArray(event.evidence, { maxItems: maxInline, diagnosticRef: event.operationId });
          bounded.items.forEach(item => {
            const rawItem = typeof item === 'object' ? JSON.stringify(item) : String(item);
            lines.push(`    - ${stripAnsi(rawItem)}`);
          });
          lines.push(`    - ${bounded.pagination.notice || `... and ${event.evidence.length - maxInline} more verified findings`}`);
        }
      }
    } else if (typeof event.evidence === 'object') {
      const entries = Object.entries(event.evidence);
      if (entries.length > 0) {
        const previewLimit = detailLevel === DETAIL_LEVELS.ESSENTIAL ? 3 : (detailLevel === DETAIL_LEVELS.DIAGNOSTIC ? 10 : 5);
        const preview = entries.slice(0, previewLimit).map(([k, v]) => `${k}=${stripAnsi(typeof v === 'object' ? JSON.stringify(v) : v)}`).join(' · ');
        const extraNote = entries.length > previewLimit ? ` · ... (+${entries.length - previewLimit} fields)` : '';
        lines.push(`  Evidence: ${preview}${extraNote}`);
      }
    }
  }

  // ── 5. Warnings ───────────────────────────────────────────────────────────
  if (event.warning) {
    const cleanWarn = stripAnsi(event.warning.message || '');
    lines.push(`  Warning: ${cleanWarn}`);
    if (event.warning.impact) {
      lines.push(`  Impact: ${stripAnsi(event.warning.impact)}`);
    }
  }

  // ── 6. Errors & Diagnostics ───────────────────────────────────────────────
  if (event.error) {
    const codePart = event.error.code ? ` [${event.error.code}]` : '';
    const cleanErrMsg = stripAnsi(event.error.message || '');
    lines.push(`  Error${codePart}: ${cleanErrMsg}`);
    if (event.error.suggestion) {
      lines.push(`  Remedy: ${stripAnsi(event.error.suggestion)}`);
    }

    // Progressive disclosure for multiline stack or detailed traces
    const hostAllowsHtml = options.capabilities ? options.capabilities.supportsHtml : true;
    const allowDisclosure = options.progressiveDisclosure !== false && options.allowHtml !== false && hostAllowsHtml;

    if (event.error.stack) {
      const cleanStack = stripAnsi(event.error.stack).trim();
      const stackLines = cleanStack.split('\n');
      if (detailLevel === DETAIL_LEVELS.DIAGNOSTIC) {
        lines.push(`  Diagnostic Stack:`);
        lines.push(`\`\`\`text\n${cleanStack}\n\`\`\``);
      } else if (allowDisclosure && stackLines.length > 3) {
        lines.push(formatDisclosure('Diagnostic Stack Trace', `\`\`\`text\n${cleanStack}\n\`\`\``, true));
      } else if (stackLines.length > 1) {
        lines.push(`  Stack: ${stackLines[0]}`);
      }
    }
  }

  // ── 7. Next Action Directive ──────────────────────────────────────────────
  if (event.nextAction) {
    lines.push(`  Next: ${stripAnsi(event.nextAction)}`);
  }

  // ── 8. Artifact & Report References ───────────────────────────────────────
  if (Array.isArray(event.reportReferences) && event.reportReferences.length > 0) {
    const refs = event.reportReferences.map(r => {
      const cleanRef = stripAnsi(r);
      const displayPath = options.shortenPaths ? formatCompactPath(cleanRef) : cleanRef;
      return `\`${displayPath}\``;
    });
    lines.push(`  Artifacts: ${refs.join(', ')}`);
  }

  return lines.join('\n');
}

module.exports = {
  MarkdownRenderer,
  renderMarkdown,
  stripAnsi,
  escapeHtmlTags,
};
