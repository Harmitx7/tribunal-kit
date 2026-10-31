'use strict';

/**
 * Phase 6 Unit Tests: MCP Response Optimization & Structured Output Intelligence
 *
 * Verifies:
 * 1. Compact serialization and whitespace elimination without data corruption.
 * 2. Complete data recovery via JSON.parse (functional parity).
 * 3. Secret and credential redaction across responses and errors.
 * 4. Structured content delivery without nested JSON string escaping.
 * 5. Bounded context shaping with explicit pagination and severity prioritization.
 * 6. Standardized error response contract (isError: true, sanitized messages, no raw stack traces).
 * 7. Token estimation and byte-reduction telemetry.
 * 8. End-to-end tool execution through MCP handleRequest.
 */

const {
  McpResponseOptimizer,
  serializeResponse,
  formatErrorResponse,
  estimateTokens,
  measurePayload,
  boundArray,
} = require('../../src/mcp/response_optimizer');

const { handleRequest } = require('../../bin/mcp-server');

describe('Phase 6: MCP Response Optimizer & Structured Output Intelligence', () => {
  // ── 1. Compact Serialization & Whitespace Elimination ─────────────────────
  describe('1. Serialization Efficiency & Functional Parity', () => {
    const samplePayload = {
      status: 'VERIFIED',
      checks: [
        { id: 'CHK-01', name: 'Lint', passed: true, score: 100 },
        { id: 'CHK-02', name: 'Security Scan', passed: true, score: 98 },
        { id: 'CHK-03', name: 'Type Safety', passed: true, score: 100 },
      ],
      metadata: {
        workspace: 'tribunal-core',
        timestamp: '2026-10-30T12:00:00Z',
      },
    };

    test('serializes to compact JSON by default and reduces payload size', () => {
      const response = serializeResponse(samplePayload);
      expect(response.content).toBeDefined();
      expect(response.content[0].type).toBe('text');

      const serializedText = response.content[0].text;
      // No extra 2-space indentation or newlines
      expect(serializedText).not.toContain('\n  ');

      // Functional parity: JSON.parse recovers the identical object
      const recovered = JSON.parse(serializedText);
      expect(recovered).toEqual(samplePayload);
    });

    test('supports pretty formatting when compact: false is explicitly requested', () => {
      const response = serializeResponse(samplePayload, { compact: false });
      const serializedText = response.content[0].text;
      expect(serializedText).toContain('\n  ');
      expect(JSON.parse(serializedText)).toEqual(samplePayload);
    });

    test('measures payload byte and token savings', () => {
      const metrics = measurePayload(samplePayload);
      expect(metrics.baselineBytes).toBeGreaterThan(metrics.optimizedBytes);
      expect(metrics.bytesSaved).toBeGreaterThan(0);
      expect(metrics.reductionPercent).toBeGreaterThan(25); // At least 25% reduction in whitespace
      expect(metrics.tokensSaved).toBeGreaterThan(0);
      expect(metrics.estimationMethod).toContain('heuristic');
    });
  });

  // ── 2. Secret Redaction Across Responses & Errors ─────────────────────────
  describe('2. Secret Safety & Sanitization', () => {
    test('redacts API keys and Bearer tokens in structured payloads', () => {
      const sensitiveData = {
        apiKey: 'sk_test_abcdef1234567890abcdef1234567890',
        auth: 'Bearer dGVzdF90b2tlbl9leGFtcGxlX3ZhbHVlXzEyMzQ1Njc4OTA=',
        rawJwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        dbUrl: 'postgres://admin:super_secret_pw@localhost:5432/db',
      };

      const response = serializeResponse(sensitiveData);
      const text = response.content[0].text;

      expect(text).not.toContain('sk_test_abcdef');
      expect(text).toContain('[REDACTED_API_KEY]');
      expect(text).toContain('Bearer [REDACTED_TOKEN]');
      expect(text).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6');
      expect(text).toContain('[REDACTED_JWT]');
      expect(text).not.toContain('super_secret_pw');
      expect(text).toContain('[REDACTED_DB_URL]');
    });

    test('redacts secrets from error messages and removes stack traces', () => {
      const err = new Error('Database query failed on postgres://user:secretPass123@db.internal:5432/prod');
      err.stack = 'Error: Database query failed\n    at query (/app/src/db.js:42:15)';

      const errResponse = formatErrorResponse(err, { prefix: 'Storage Error' });
      expect(errResponse.isError).toBe(true);
      expect(errResponse.content[0].text).toContain('Storage Error: Database query failed');
      expect(errResponse.content[0].text).not.toContain('secretPass123');
      expect(errResponse.content[0].text).toContain('[REDACTED_DB_URL]');
      expect(errResponse.content[0].text).not.toContain('    at query (/app/src/db.js:42:15)');
    });
  });

  // ── 3. Structured Content Support ─────────────────────────────────────────
  describe('3. Native Structured Content Support', () => {
    test('attaches structuredContent directly when requested', () => {
      const data = { operation: 'analyze', resultCount: 42 };
      const response = serializeResponse(data, { includeStructured: true });

      expect(response.content[0].type).toBe('text');
      expect(response.structuredContent).toBeDefined();
      expect(response.structuredContent.resultCount).toBe(42);
    });
  });

  // ── 4. Context-Efficient Bounding & Truncation ─────────────────────────────
  describe('4. Bounded Context & Pagination Metadata', () => {
    test('bounds large arrays and attaches explicit pagination metadata', () => {
      const largeList = Array.from({ length: 150 }, (_, i) => ({
        id: `item_${i + 1}`,
        severity: i % 2 === 0 ? 'critical' : 'low',
        name: `Finding ${i + 1}`,
      }));

      const bounded = boundArray(largeList, 20, { prioritizeSeverity: true });
      expect(bounded.items).toHaveLength(20);
      expect(bounded._pagination.truncated).toBe(true);
      expect(bounded._pagination.total).toBe(150);
      expect(bounded._pagination.returned).toBe(20);
      expect(bounded._pagination.remaining).toBe(130);
      expect(bounded._pagination.hasMore).toBe(true);

      // Verify that critical findings were prioritized
      expect(bounded.items[0].severity).toBe('critical');
    });

    test('does not truncate arrays within limit', () => {
      const smallList = [{ id: 1 }, { id: 2 }];
      const bounded = boundArray(smallList, 10);
      expect(bounded.items).toHaveLength(2);
      expect(bounded._pagination.truncated).toBe(false);
      expect(bounded._pagination.hasMore).toBe(false);
    });
  });

  // ── 5. Standardized Error Handling Contract ───────────────────────────────
  describe('5. Error Contract & Distinguishability', () => {
    test('distinguishes empty success from failure response', () => {
      const emptySuccess = serializeResponse({});
      expect(emptySuccess.isError).toBeFalsy();
      expect(emptySuccess.content[0].text).toBe('{}');

      const failure = formatErrorResponse('Target file not found', { code: 'ENOENT' });
      expect(failure.isError).toBe(true);
      expect(failure.content[0].text).toContain('Target file not found');
      expect(failure.content[0].text).toContain('[Code: ENOENT]');
    });
  });

  // ── 6. Token Estimation ───────────────────────────────────────────────────
  describe('6. Accurate Token & Size Estimation', () => {
    test('estimates token counts with transparent method disclaimer', () => {
      const text = 'Hello world! This is a test of token estimation.';
      const est = estimateTokens(text);
      expect(est.characterCount).toBe(text.length);
      expect(est.estimatedTokens).toBe(Math.ceil(text.length / 4));
      expect(est.estimationMethod).toContain('heuristic (1 token ≈ 4 characters)');
    });
  });

  // ── 7. End-to-End MCP Server Parity ───────────────────────────────────────
  describe('7. End-to-End Tool Parity via handleRequest', () => {
    test('initialize returns protocol version and serverInfo', async () => {
      const res = await handleRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {},
      });
      expect(res.protocolVersion).toBe('2025-03-26');
      expect(res.serverInfo.name).toBe('tribunal-kit-mcp');
    });

    test('tk_format_activity renders clean markdown activity format', async () => {
      const res = await handleRequest({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'tk_format_activity',
          arguments: {
            state: 'operation_started',
            title: 'Repository Analysis',
            summary: 'Inspecting dependencies and contracts',
          },
        },
      });
      expect(res.isError).toBeFalsy();
      expect(res.content[0].text).toContain('› **Started** · Repository Analysis');
      expect(res.content[0].text).toContain('Inspecting dependencies and contracts');
    });

    test('run_tribunal_audit returns concise text report', async () => {
      const res = await handleRequest({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'run_tribunal_audit',
          arguments: {},
        },
      });
      expect(res.isError).toBeFalsy();
      expect(res.content[0].text).toContain('Tribunal audit complete.');
    });

    test('unknown tool returns proper RpcError with code -32601', async () => {
      await expect(
        handleRequest({
          jsonrpc: '2.0',
          id: 4,
          method: 'tools/call',
          params: { name: 'non_existent_tool_xyz' },
        })
      ).rejects.toMatchObject({ code: -32601 });
    });
  });
});
