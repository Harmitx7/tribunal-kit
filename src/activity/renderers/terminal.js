'use strict';

/**
 * Tribunal-Kit Terminal Activity Renderer (Phase 1 & Phase 9 Hardening)
 *
 * Deterministic renderer for local terminal and CLI output.
 * Respects existing theme conventions, NO_COLOR, non-TTY streams, and options.
 * Hardened against terminal control character injection and ANSI hijacking.
 */

const { EVENT_TYPES, EVENT_VERBS, EVENT_GLYPHS, ASCII_GLYPHS } = require('../types');
const { sanitizeActivityEvent } = require('../schema');
const { resolveDetailLevel, DETAIL_LEVELS, shouldDisplayEvent } = require('../progressive_disclosure');

let tuiTheme = null;
try {
  tuiTheme = require('../../tui/theme');
} catch {
  // Graceful fallback if theme not present
}

const STATE_COLORS = {
  [EVENT_TYPES.OPERATION_STARTED]: [56, 189, 248], // CYAN
  [EVENT_TYPES.AGENT_ACTIVATED]: [168, 85, 247], // PURPLE
  [EVENT_TYPES.SKILL_ACTIVATED]: [168, 85, 247],
  [EVENT_TYPES.ANALYSIS_STARTED]: [56, 189, 248],
  [EVENT_TYPES.TOOL_EXECUTION_STARTED]: [56, 189, 248],
  [EVENT_TYPES.PROGRESS_UPDATED]: [56, 189, 248],
  [EVENT_TYPES.EVIDENCE_COLLECTED]: [56, 189, 248],
  [EVENT_TYPES.VALIDATION_PASSED]: [35, 195, 105], // EMERALD
  [EVENT_TYPES.VALIDATION_FAILED]: [244, 63, 94], // ROSE
  [EVENT_TYPES.WARNING_DETECTED]: [245, 158, 11], // AMBER
  [EVENT_TYPES.APPROVAL_REQUIRED]: [225, 75, 45], // FLAME
  [EVENT_TYPES.OPERATION_BLOCKED]: [244, 63, 94],
  [EVENT_TYPES.RETRY_STARTED]: [245, 158, 11],
  [EVENT_TYPES.OPERATION_COMPLETED]: [35, 195, 105],
  [EVENT_TYPES.OPERATION_CANCELLED]: [113, 113, 122], // ZINC
};

class TerminalRenderer {
  constructor(options = {}) {
    this.options = options;
  }

  render(rawEvent, options = {}) {
    return renderTerminal(rawEvent, { ...this.options, ...options });
  }
}

function sanitizeForTerminal(str) {
  if (tuiTheme && typeof tuiTheme.sanitizeTerminal === 'function') {
    return tuiTheme.sanitizeTerminal(str);
  }
  if (typeof str !== 'string') return String(str || '');
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').replace(/\r(?!\n)/g, ' ');
}

function renderTerminal(rawEvent, options = {}) {
  if (!rawEvent || typeof rawEvent !== 'object') {
    return '> [NOTICE] Invalid event';
  }

  const event = sanitizeActivityEvent(rawEvent);

  const detailLevel = resolveDetailLevel(options);
  if (options.filter && !shouldDisplayEvent(event, detailLevel, options).visible) {
    return '';
  }

  const noColor = Boolean(
    options.noColor ||
    process.env.NO_COLOR ||
    (tuiTheme && !tuiTheme.hasColor && !options.forceColor)
  );

  const isUtf = options.ascii ? false : (tuiTheme ? tuiTheme.isUtf8 : true);
  const glyphMap = isUtf ? EVENT_GLYPHS : ASCII_GLYPHS;
  const rawGlyph = glyphMap[event.eventType] || '›';
  const verb = EVENT_VERBS[event.eventType] || 'Notice';
  const colorRgb = STATE_COLORS[event.eventType] || [228, 228, 231];

  const colorize = (rgb, txt) => {
    if (noColor || !tuiTheme || !tuiTheme.color) return txt;
    return tuiTheme.color(rgb, txt);
  };
  const bold = (txt) => {
    if (noColor || !tuiTheme || !tuiTheme.bold) return txt;
    return tuiTheme.bold(txt);
  };
  const dim = (txt) => {
    if (noColor || !tuiTheme || !tuiTheme.dim) return txt;
    return tuiTheme.dim(txt);
  };

  const styledGlyph = colorize(colorRgb, rawGlyph);
  const styledVerb = bold(colorize(colorRgb, verb));

  const cleanTitle = sanitizeForTerminal(event.title || '');
  const cleanSummary = event.summary ? sanitizeForTerminal(event.summary) : null;
  const cleanAgent = event.agent ? sanitizeForTerminal(event.agent) : null;
  const cleanSkill = event.skill ? sanitizeForTerminal(event.skill) : null;
  const cleanDomain = event.domain ? sanitizeForTerminal(event.domain) : null;

  let header = '';
  if (event.eventType === EVENT_TYPES.AGENT_ACTIVATED && cleanAgent) {
    const domainPart = cleanDomain ? ` ${dim('·')} ${cleanDomain}` : '';
    header = `${styledGlyph} ${styledVerb} ${bold(`@${cleanAgent}`)}${domainPart}`;
  } else if (event.eventType === EVENT_TYPES.SKILL_ACTIVATED && cleanSkill) {
    const domainPart = cleanDomain ? ` ${dim('·')} ${cleanDomain}` : '';
    header = `${styledGlyph} ${styledVerb} ${bold(`skill:${cleanSkill}`)}${domainPart}`;
  } else {
    const phasePart = event.phase ? `${dim(`[${sanitizeForTerminal(event.phase)}]`)} ` : '';
    header = `${styledGlyph} ${styledVerb} ${dim('·')} ${phasePart}${bold(cleanTitle)}`;
  }

  if (detailLevel === DETAIL_LEVELS.DIAGNOSTIC) {
    const timeBadge = event.timestamp ? ` ${dim(`[${event.timestamp.split('T')[1]?.slice(0, 8) || ''}]`)}` : '';
    const opBadge = event.operationId ? ` ${dim(`(${event.operationId})`)}` : '';
    header = `${header}${opBadge}${timeBadge}`;
  }

  if (options.compact) {
    const metaParts = [];
    if (cleanSummary) metaParts.push(cleanSummary);
    if (event.progress && event.progress.percentage !== undefined && event.progress.percentage !== null) {
      metaParts.push(`${event.progress.percentage}%`);
    }
    const metaStr = metaParts.length > 0 ? ` ${dim(`(${metaParts.join(' · ')})`)}` : '';
    return `${header}${metaStr}`;
  }

  const lines = [header];

  if (cleanSummary) {
    lines.push(`  ${cleanSummary}`);
  }

  if (event.progress) {
    const p = event.progress;
    if (p.isAuthoritative && p.current !== undefined && p.total !== undefined) {
      const pending = Math.max(0, p.total - p.current);
      const pct = p.percentage !== undefined && p.percentage !== null ? ` (${p.percentage}%)` : '';
      const unit = p.unit || 'steps';
      lines.push(`  ${dim('Progress:')} ${p.current}/${p.total} ${unit}${pct} ${dim('·')} ${pending} pending`);
    } else if (p.percentage !== undefined && p.percentage !== null && p.isAuthoritative) {
      lines.push(`  ${dim('Progress:')} ${p.percentage}%`);
    } else if (!p.isAuthoritative) {
      lines.push(`  ${dim('Status:')} In progress (unmetered)`);
    }
  }

  if (event.evidence) {
    const maxChars = detailLevel === DETAIL_LEVELS.ESSENTIAL ? 100 : (detailLevel === DETAIL_LEVELS.DIAGNOSTIC ? 500 : 200);
    const rawEv = typeof event.evidence === 'string' ? event.evidence : JSON.stringify(event.evidence);
    const ev = sanitizeForTerminal(rawEv);
    lines.push(`  ${dim('Evidence:')} ${ev.slice(0, maxChars)}${ev.length > maxChars ? '...' : ''}`);
  }

  if (event.warning) {
    const cleanWarn = sanitizeForTerminal(event.warning.message || '');
    lines.push(`  ${colorize(STATE_COLORS[EVENT_TYPES.WARNING_DETECTED], 'Warning:')} ${cleanWarn}`);
  }

  if (event.error) {
    const cleanErr = sanitizeForTerminal(event.error.message || '');
    lines.push(`  ${colorize(STATE_COLORS[EVENT_TYPES.VALIDATION_FAILED], 'Error:')} ${cleanErr}`);
    if (event.error.suggestion) {
      lines.push(`  ${dim('Remedy:')} ${sanitizeForTerminal(event.error.suggestion)}`);
    }
    if (detailLevel === DETAIL_LEVELS.DIAGNOSTIC && event.error.stack) {
      lines.push(`  ${dim('Diagnostic Stack:')}`);
      const stackLines = sanitizeForTerminal(event.error.stack).split('\n');
      stackLines.forEach(l => lines.push(`    ${dim(l)}`));
    }
  }

  if (event.nextAction) {
    lines.push(`  ${dim('Next:')} ${sanitizeForTerminal(event.nextAction)}`);
  }

  return lines.join('\n');
}

module.exports = {
  TerminalRenderer,
  renderTerminal,
  STATE_COLORS,
};
