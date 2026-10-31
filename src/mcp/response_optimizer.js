'use strict';

/**
 * Tribunal-Kit MCP Response Optimizer & Structured Output Intelligence (Phase 6)
 *
 * Implements context-efficient serialization, secret redaction,
 * bounded context shaping, structured content delivery, and accurate token estimation
 * for Model Context Protocol (MCP) server responses.
 *
 * Principles:
 * - Evidence Preservation: Never drop verifiable findings, line numbers, or provenance.
 * - Zero Double-Encoding: Output valid JSON directly without multi-layer string escapes.
 * - Whitespace Reduction: Eliminate unnecessary indentation in machine-oriented responses.
 * - Secret Safety: All responses and error messages are scrubbed of credentials/tokens.
 * - Consumer Transparency: Any truncation is explicit with total and retained counts.
 * - Backward Compatibility: Preserves `{ content: [{ type: 'text', text: ... }] }` contract.
 */

const { redactSecrets } = require('../activity');

class McpResponseOptimizer {
  /**
   * Estimates token consumption using standard 4-characters-per-token heuristic.
   *
   * @param {string|Object} input
   * @returns {Object} { characterCount, byteLength, estimatedTokens, estimationMethod }
   */
  static estimateTokens(input) {
    let str = '';
    if (typeof input === 'string') {
      str = input;
    } else if (input !== null && input !== undefined) {
      try {
        str = JSON.stringify(input);
      } catch {
        str = String(input);
      }
    }

    const characterCount = str.length;
    const byteLength = Buffer.byteLength(str, 'utf8');
    const estimatedTokens = Math.ceil(characterCount / 4);

    return {
      characterCount,
      byteLength,
      estimatedTokens,
      estimationMethod: 'heuristic (1 token ≈ 4 characters)',
    };
  }

  /**
   * Safely bounds an array and provides explicit pagination/truncation metadata
   * without losing critical findings.
   *
   * @param {Array} arr
   * @param {number} limit
   * @param {Object} [options]
   * @returns {Object} { items: Array, _pagination: Object|null }
   */
  static boundArray(arr, limit = 100, options = {}) {
    if (!Array.isArray(arr)) {
      return { items: arr, _pagination: null };
    }

    const total = arr.length;
    if (total <= limit || limit <= 0) {
      return {
        items: arr,
        _pagination: {
          truncated: false,
          total,
          returned: total,
          hasMore: false,
        },
      };
    }

    // Sort to keep severe findings first if items have severity
    let itemsToSlice = arr;
    if (options.prioritizeSeverity) {
      const severityRank = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
      itemsToSlice = [...arr].sort((a, b) => {
        const rankA = a && a.severity ? (severityRank[a.severity.toLowerCase()] || 0) : 0;
        const rankB = b && b.severity ? (severityRank[b.severity.toLowerCase()] || 0) : 0;
        return rankB - rankA;
      });
    }

    const returnedItems = itemsToSlice.slice(0, limit);

    return {
      items: returnedItems,
      _pagination: {
        truncated: true,
        total,
        returned: limit,
        remaining: total - limit,
        hasMore: true,
        retrievalHint: options.retrievalHint || 'Specify higher limit parameter to retrieve full results',
      },
    };
  }

  /**
   * Serializes a response payload efficiently for MCP consumers.
   *
   * @param {any} data - The internal result object or string.
   * @param {Object} [options]
   * @param {boolean} [options.compact=true] - If true, avoids 2-space indentation.
   * @param {boolean} [options.redact=true] - Scrubs credentials and secrets.
   * @param {boolean} [options.includeStructured=false] - Attaches structuredContent field.
   * @param {number} [options.maxArrayLength] - Bounding limit for top-level arrays.
   * @returns {Object} MCP content object { content: [...], ... }
   */
  static serializeResponse(data, options = {}) {
    const compact = options.compact !== false;
    const shouldRedact = options.redact !== false;
    const includeStructured = options.includeStructured === true;

    // Handle string data directly
    if (typeof data === 'string') {
      const sanitizedText = shouldRedact ? redactSecrets(data) : data;
      return {
        content: [
          {
            type: 'text',
            text: sanitizedText,
          },
        ],
      };
    }

    // Handle null or undefined
    if (data === null || data === undefined) {
      return {
        content: [
          {
            type: 'text',
            text: '{}',
          },
        ],
      };
    }

    // Clone and optionally bound array collections
    let sanitizedData = shouldRedact ? redactSecrets(data) : data;

    if (options.maxArrayLength && Array.isArray(sanitizedData)) {
      const bounded = McpResponseOptimizer.boundArray(sanitizedData, options.maxArrayLength, options);
      if (bounded._pagination && bounded._pagination.truncated) {
        sanitizedData = {
          items: bounded.items,
          _pagination: bounded._pagination,
        };
      }
    }

    // Serialize to text
    const text = compact
      ? JSON.stringify(sanitizedData)
      : JSON.stringify(sanitizedData, null, 2);

    const response = {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };

    if (includeStructured && typeof sanitizedData === 'object' && sanitizedData !== null) {
      response.structuredContent = sanitizedData;
    }

    return response;
  }

  /**
   * Constructs an unambiguous, sanitized error response.
   *
   * @param {Error|string} error
   * @param {Object} [options]
   * @param {string} [options.prefix]
   * @param {boolean} [options.includeStack=false]
   * @returns {Object} { content: [{ type: 'text', text: ... }], isError: true }
   */
  static formatErrorResponse(error, options = {}) {
    let message = '';
    let code = options.code || null;

    if (error instanceof Error) {
      message = error.message || 'Unknown error';
      if (error.code && !code) {
        code = error.code;
      }
      if (options.includeStack && error.stack) {
        message += `\n\nStack:\n${error.stack}`;
      }
    } else if (typeof error === 'string') {
      message = error;
    } else if (error && typeof error === 'object') {
      message = error.message || JSON.stringify(error);
      if (error.code && !code) code = error.code;
    } else {
      message = 'An unexpected error occurred';
    }

    // Scrub any embedded secrets from error message
    message = redactSecrets(message);

    const prefix = options.prefix ? `${options.prefix}: ` : '';
    const codePart = code ? ` [Code: ${code}]` : '';

    return {
      content: [
        {
          type: 'text',
          text: `${prefix}${message}${codePart}`,
        },
      ],
      isError: true,
    };
  }

  /**
   * Measures the byte and token savings between pretty-printed baseline and compact optimized payload.
   *
   * @param {any} data
   * @returns {Object} Comparison metrics.
   */
  static measurePayload(data) {
    const baselineText = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const optimizedText = typeof data === 'string' ? data : JSON.stringify(data);

    const baselineBytes = Buffer.byteLength(baselineText, 'utf8');
    const optimizedBytes = Buffer.byteLength(optimizedText, 'utf8');
    const bytesSaved = Math.max(0, baselineBytes - optimizedBytes);
    const reductionPercent = baselineBytes > 0 ? Number(((bytesSaved / baselineBytes) * 100).toFixed(2)) : 0;

    const baselineTokens = Math.ceil(baselineText.length / 4);
    const optimizedTokens = Math.ceil(optimizedText.length / 4);
    const tokensSaved = Math.max(0, baselineTokens - optimizedTokens);

    return {
      baselineBytes,
      optimizedBytes,
      bytesSaved,
      reductionPercent,
      baselineTokens,
      optimizedTokens,
      tokensSaved,
      estimationMethod: 'heuristic (1 token ≈ 4 characters)',
    };
  }

  /**
   * Formats an ActivityEvent or array of events into an MCP-compliant response envelope.
   *
   * @param {Object|Array} eventOrEvents
   * @param {Object} [options]
   * @param {string} [options.format='structured'] - 'structured' (JSON) or 'markdown'
   * @returns {Object} MCP Response { content: [{ type: 'text', text: string }], isError?: boolean }
   */
  static formatActivityResponse(eventOrEvents, options = {}) {
    const isArray = Array.isArray(eventOrEvents);
    const events = isArray ? eventOrEvents : [eventOrEvents];

    let hasError = false;
    for (const ev of events) {
      if (ev && (ev.status === 'failed' || ev.eventType === 'validation_failed' || ev.error)) {
        hasError = true;
        break;
      }
    }

    if (options.format === 'markdown') {
      const { renderMarkdown } = require('../activity');
      const textParts = events.map(ev => renderMarkdown(ev, options));
      return {
        content: [
          {
            type: 'text',
            text: redactSecrets(textParts.join('\n\n')),
          },
        ],
        ...(hasError ? { isError: true } : {}),
      };
    }

    // Default: structured / JSON format
    const { sanitizeActivityEvent } = require('../activity');
    const sanitized = isArray
      ? events.map(sanitizeActivityEvent)
      : sanitizeActivityEvent(events[0]);

    const res = McpResponseOptimizer.serializeResponse(sanitized, options);
    if (hasError) {
      res.isError = true;
    }
    return res;
  }
}

module.exports = {
  McpResponseOptimizer,
  serializeResponse: McpResponseOptimizer.serializeResponse,
  formatErrorResponse: McpResponseOptimizer.formatErrorResponse,
  formatActivityResponse: McpResponseOptimizer.formatActivityResponse,
  estimateTokens: McpResponseOptimizer.estimateTokens,
  measurePayload: McpResponseOptimizer.measurePayload,
  boundArray: McpResponseOptimizer.boundArray,
};

