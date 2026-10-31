'use strict';

/**
 * Tribunal-Kit Structured Activity Renderer (Phase 1 & Phase 9 Hardening)
 *
 * Deterministic machine-readable JSON renderer for telemetry, MCP streaming,
 * and structured log pipelines.
 * Ensures zero terminal escapes, clean serialization, no undefined keys,
 * and secret-safe output.
 */

const { sanitizeActivityEvent } = require('../schema');
const { resolveDetailLevel, shouldDisplayEvent } = require('../progressive_disclosure');

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

class StructuredRenderer {
  constructor(options = {}) {
    this.options = options;
  }

  render(rawEvent, options = {}) {
    return renderStructured(rawEvent, { ...this.options, ...options });
  }
}

function cleanAndSanitize(obj, seen = new WeakSet()) {
  if (obj === null || typeof obj !== 'object') {
    if (typeof obj === 'string') return stripAnsi(obj);
    return obj;
  }
  if (seen.has(obj)) return '[Circular]';
  seen.add(obj);

  if (Array.isArray(obj)) return obj.map(item => cleanAndSanitize(item, seen));
  const cleaned = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    if (v !== undefined) {
      cleaned[k] = cleanAndSanitize(v, seen);
    }
  }
  return cleaned;
}

function renderStructured(rawEvent, options = {}) {
  if (!rawEvent || typeof rawEvent !== 'object') {
    return JSON.stringify({ error: 'Invalid event object' });
  }

  const detailLevel = resolveDetailLevel(options);
  if (options.filter && !shouldDisplayEvent(rawEvent, detailLevel, options).visible) {
    return '';
  }

  const sanitized = sanitizeActivityEvent(rawEvent);
  const clean = cleanAndSanitize(sanitized);

  if (options.detailLevel) {
    clean._detailLevel = options.detailLevel;
  }

  const pretty = options.pretty !== undefined ? Boolean(options.pretty) : true;

  return JSON.stringify(clean, null, pretty ? 2 : 0);
}

module.exports = {
  StructuredRenderer,
  renderStructured,
  renderJson: renderStructured,
  stripAnsi,
};
