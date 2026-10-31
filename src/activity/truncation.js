'use strict';

/**
 * Tribunal-Kit Semantic Output Truncation & Bounding Engine (Phase 10)
 *
 * Implements intelligent, semantic size bounding for large outputs (test results,
 * audits, evidence arrays, tool payloads, stack traces).
 *
 * INVARIANTS:
 * - Truncation is explicit: never silently drop items without a visible indicator.
 * - Array items are preserved as complete units; no slicing midway through an object.
 * - String truncation preserves beginning (context) and end (conclusions/errors).
 * - Machine-readable payloads retain valid structure and include `_pagination` metadata.
 */

const DEFAULT_ARRAY_MAX_ITEMS = 10;
const DEFAULT_STRING_MAX_LENGTH = 2000;

/**
 * Semantically bounds an array of items to a maximum length while preserving
 * explicit pagination metadata and human-readable truncation indicators.
 *
 * @param {Array<any>} items
 * @param {Object} [options]
 * @returns {{ items: Array<any>, pagination: { total: number, shown: number, omitted: number, isTruncated: boolean, notice: string | null } }}
 */
function boundArray(items, options = {}) {
  if (!Array.isArray(items)) {
    return {
      items: items ? [items] : [],
      pagination: { total: 0, shown: 0, omitted: 0, isTruncated: false, notice: null },
    };
  }

  const maxItems = typeof options.maxItems === 'number' ? Math.max(1, options.maxItems) : DEFAULT_ARRAY_MAX_ITEMS;
  const total = items.length;

  if (total <= maxItems) {
    return {
      items: [...items],
      pagination: {
        total,
        shown: total,
        omitted: 0,
        isTruncated: false,
        notice: null,
      },
    };
  }

  const omitted = total - maxItems;
  const boundedItems = items.slice(0, maxItems);
  const diagRefPart = options.diagnosticRef ? ` (retained in diagnostics: ${options.diagnosticRef})` : '';
  const verboseHint = options.verboseHint !== false ? '; use --verbose to view all' : '';
  const notice = `... and ${omitted} more verified findings${verboseHint}${diagRefPart}`;

  return {
    items: boundedItems,
    pagination: {
      total,
      shown: maxItems,
      omitted,
      isTruncated: true,
      notice,
    },
  };
}

/**
 * Semantically bounds a long text string preserving head (context) and tail (errors/conclusion).
 *
 * @param {string} text
 * @param {Object} [options]
 * @returns {{ text: string, isTruncated: boolean, originalLength: number, truncatedChars: number }}
 */
function boundString(text, options = {}) {
  if (text === null || text === undefined) {
    return { text: '', isTruncated: false, originalLength: 0, truncatedChars: 0 };
  }

  const str = String(text);
  const maxLength = typeof options.maxLength === 'number' ? Math.max(50, options.maxLength) : DEFAULT_STRING_MAX_LENGTH;

  if (str.length <= maxLength) {
    return { text: str, isTruncated: false, originalLength: str.length, truncatedChars: 0 };
  }

  const headRatio = typeof options.headRatio === 'number' ? Math.min(0.9, Math.max(0.1, options.headRatio)) : 0.6;
  const tailRatio = 1.0 - headRatio;

  if (maxLength < 200) {
    const keepChars = Math.max(10, maxLength - 45);
    const headChars = Math.floor(keepChars * headRatio);
    const tailChars = Math.floor(keepChars * tailRatio);
    const head = str.slice(0, headChars);
    const tail = str.slice(str.length - tailChars);
    const truncatedChars = str.length - (head.length + tail.length);
    const marker = `... [${truncatedChars} chars omitted] ...`;
    return {
      text: `${head}${marker}${tail}`,
      isTruncated: true,
      originalLength: str.length,
      truncatedChars,
    };
  }

  const targetChars = maxLength - 120; // allowance for marker line
  const headChars = Math.floor(targetChars * headRatio);
  const tailChars = Math.floor(targetChars * tailRatio);

  // Attempt to break at line boundaries
  let headSlice = str.slice(0, headChars);
  const lastHeadNewline = headSlice.lastIndexOf('\n');
  if (lastHeadNewline > headChars * 0.7) {
    headSlice = headSlice.slice(0, lastHeadNewline);
  }

  let tailSlice = str.slice(str.length - tailChars);
  const firstTailNewline = tailSlice.indexOf('\n');
  if (firstTailNewline !== -1 && firstTailNewline < tailChars * 0.3) {
    tailSlice = tailSlice.slice(firstTailNewline + 1);
  }

  const truncatedChars = str.length - (headSlice.length + tailSlice.length);
  const diagRefPart = options.diagnosticRef ? ` (complete output in diagnostics: ${options.diagnosticRef})` : '';
  const marker = `\n\n[... ${truncatedChars.toLocaleString()} characters truncated for display${diagRefPart} ...]\n\n`;

  return {
    text: `${headSlice}${marker}${tailSlice}`,
    isTruncated: true,
    originalLength: str.length,
    truncatedChars,
  };
}

/**
 * Bounded object serializer for structured payloads.
 *
 * @param {Object} obj
 * @param {Object} [options]
 * @returns {Object}
 */
function boundObject(obj, options = {}) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  const seen = options._seen || new WeakSet();
  if (seen.has(obj)) {
    return '[Circular]';
  }
  seen.add(obj);

  const maxArrayLength = typeof options.maxArrayLength === 'number' ? options.maxArrayLength : 10;
  const maxDepth = typeof options.maxDepth === 'number' ? options.maxDepth : 4;
  const currentDepth = options._depth || 0;

  if (currentDepth >= maxDepth) {
    return '[Object: maximum depth reached]';
  }

  if (Array.isArray(obj)) {
    if (obj.length > maxArrayLength) {
      const bounded = obj.slice(0, maxArrayLength).map(item =>
        boundObject(item, { ...options, _depth: currentDepth + 1, _seen: seen })
      );
      bounded.push(`[... ${obj.length - maxArrayLength} items omitted]`);
      return bounded;
    }
    return obj.map(item => boundObject(item, { ...options, _depth: currentDepth + 1, _seen: seen }));
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    if (typeof value === 'string' && value.length > 500) {
      result[key] = boundString(value, { maxLength: 500 }).text;
    } else {
      result[key] = boundObject(value, { ...options, _depth: currentDepth + 1, _seen: seen });
    }
  }

  return result;
}

module.exports = {
  DEFAULT_ARRAY_MAX_ITEMS,
  DEFAULT_STRING_MAX_LENGTH,
  boundArray,
  boundString,
  boundObject,
};

