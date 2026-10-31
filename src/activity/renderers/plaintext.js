'use strict';

/**
 * Tribunal-Kit PlainText Activity Renderer (Phase 1 & Phase 9 Hardening)
 *
 * Deterministic renderer for plain-text environments, CI outputs, and raw log files.
 * Emits zero ANSI escapes, zero markdown decoration, and zero box-drawing characters.
 * Guarantees all strings are stripped of terminal escape sequences.
 */

const { EVENT_TYPES, ASCII_GLYPHS } = require('../types');
const { sanitizeActivityEvent } = require('../schema');
const { resolveDetailLevel, DETAIL_LEVELS, shouldDisplayEvent } = require('../progressive_disclosure');

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

class PlainTextRenderer {
  constructor(options = {}) {
    this.options = options;
  }

  render(rawEvent, options = {}) {
    return renderPlainText(rawEvent, { ...this.options, ...options });
  }
}

function renderPlainText(rawEvent, options = {}) {
  if (!rawEvent || typeof rawEvent !== 'object') {
    return '> [NOTICE] Invalid event';
  }

  const event = sanitizeActivityEvent(rawEvent);

  const detailLevel = resolveDetailLevel(options);
  if (options.filter && !shouldDisplayEvent(event, detailLevel, options).visible) {
    return '';
  }

  const glyph = ASCII_GLYPHS[event.eventType] || '>';

  const cleanTitle = stripAnsi(event.title || '').replace(/[\r\n]+/g, ' ').trim();
  const cleanSummary = event.summary ? stripAnsi(event.summary) : null;
  const cleanAgent = event.agent ? stripAnsi(event.agent).trim() : null;
  const cleanSkill = event.skill ? stripAnsi(event.skill).trim() : null;
  const cleanDomain = event.domain ? stripAnsi(event.domain).replace(/[\r\n]+/g, ' ').trim() : null;

  let header = '';
  if (event.eventType === EVENT_TYPES.AGENT_ACTIVATED && cleanAgent) {
    const domainPart = cleanDomain ? ` - ${cleanDomain}` : '';
    header = `${glyph} @${cleanAgent}${domainPart}`;
  } else if (event.eventType === EVENT_TYPES.SKILL_ACTIVATED && cleanSkill) {
    const domainPart = cleanDomain ? ` - ${cleanDomain}` : '';
    header = `${glyph} skill:${cleanSkill}${domainPart}`;
  } else {
    const phasePart = event.phase ? `[${stripAnsi(event.phase)}] ` : '';
    header = `${glyph} ${phasePart}${cleanTitle}`;
  }

  if (detailLevel === DETAIL_LEVELS.DIAGNOSTIC) {
    const timeBadge = event.timestamp ? ` [${event.timestamp.split('T')[1]?.slice(0, 8) || ''}]` : '';
    const opBadge = event.operationId ? ` (${event.operationId})` : '';
    header = `${header}${opBadge}${timeBadge}`;
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
      lines.push(`  Progress: ${p.current}/${p.total} ${unit}${pct} - ${pending} pending`);
    } else if (p.percentage !== undefined && p.percentage !== null && p.isAuthoritative) {
      lines.push(`  Progress: ${p.percentage}%`);
    } else if (!p.isAuthoritative) {
      lines.push(`  Status: In progress (unmetered)`);
    }
  }

  if (event.evidence) {
    let rawEv = '';
    if (typeof event.evidence === 'string') {
      rawEv = event.evidence;
    } else if (Array.isArray(event.evidence)) {
      rawEv = event.evidence.map(e => (typeof e === 'string' ? stripAnsi(e) : JSON.stringify(e))).join(', ');
    } else {
      rawEv = JSON.stringify(event.evidence);
    }
    const cleanEv = stripAnsi(rawEv);
    const maxChars = detailLevel === DETAIL_LEVELS.ESSENTIAL ? 120 : (detailLevel === DETAIL_LEVELS.DIAGNOSTIC ? 500 : 250);
    lines.push(`  Evidence: ${cleanEv.slice(0, maxChars)}${cleanEv.length > maxChars ? '...' : ''}`);
  }

  if (event.warning) {
    const cleanWarn = stripAnsi(event.warning.message || '');
    lines.push(`  Warning: ${cleanWarn}`);
  }

  if (event.error) {
    const cleanErr = stripAnsi(event.error.message || '');
    lines.push(`  Error: ${cleanErr}`);
    if (event.error.suggestion) {
      lines.push(`  Remedy: ${stripAnsi(event.error.suggestion)}`);
    }
    if (detailLevel === DETAIL_LEVELS.DIAGNOSTIC && event.error.stack) {
      lines.push(`  Diagnostic Stack:`);
      const stackLines = stripAnsi(event.error.stack).split('\n');
      stackLines.forEach(l => lines.push(`    ${l}`));
    }
  }

  if (event.nextAction) {
    lines.push(`  Next: ${stripAnsi(event.nextAction)}`);
  }

  if (Array.isArray(event.reportReferences) && event.reportReferences.length > 0) {
    const cleanRefs = event.reportReferences.map(stripAnsi);
    lines.push(`  Artifacts: ${cleanRefs.join(', ')}`);
  }

  return lines.join('\n');
}

module.exports = {
  PlainTextRenderer,
  renderPlainText,
  stripAnsi,
};
