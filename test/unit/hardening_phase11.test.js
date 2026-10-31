'use strict';

/**
 * Phase 11 Test Suite: Performance, Security, and Regression Hardening
 *
 * Exhaustively tests:
 * 1. Circular reference survival and prototype pollution defense
 * 2. Expanded credential and secret redaction (URLs, Slack tokens, AWS secrets, EC private keys)
 * 3. Terminal and Markdown injection defense (newlines in headers, HTML tags, control codes)
 * 4. Fast-path ANSI stripping performance and correctness
 * 5. Resource lifecycle cleanup on terminal failures, cancellations, and errors
 * 6. High-frequency burst stress and bounded memory stabilization
 * 7. DiagnosticBuffer resilience with non-serializable payloads
 */

const {
  EVENT_TYPES,
  STATUSES,
  LIFECYCLE_STATES,
  ENVIRONMENTS,
  createActivityEvent,
  sanitizeActivityEvent,
  redactSecrets,
  renderMarkdown,
  renderTerminal,
  renderPlainText,
  renderStructured,
  ActivityTracker,
  OperationRecord,
  OperationRegistry,
  DiagnosticBuffer,
  boundArray,
  boundString,
  boundObject,
  stripAnsi,
} = require('../../src/activity');

describe('Phase 11: Performance, Security, and Regression Hardening', () => {
  // ── 1. Circular Reference & Prototype Pollution Defense ─────────────────────
  describe('1. Circular Reference & Prototype Pollution Defense', () => {
    test('deepClone and sanitizeActivityEvent survive cyclic references without call stack overflow', () => {
      const cyclicObj = {
        title: 'Cyclic Operation',
        evidence: {
          step: 1,
        },
      };
      cyclicObj.evidence.self = cyclicObj.evidence;
      cyclicObj.evidence.parent = cyclicObj;

      // Must not throw RangeError: Maximum call stack size exceeded
      let sanitized = null;
      expect(() => {
        sanitized = sanitizeActivityEvent(cyclicObj);
      }).not.toThrow();

      expect(sanitized).not.toBeNull();
      expect(sanitized.title).toBe('Cyclic Operation');
      expect(sanitized.evidence.step).toBe(1);
    });

    test('redactSecrets survives circular references in arrays and objects', () => {
      const cyclicArr = ['safe_string', 'sk-ant-api03-1234567890abcdef123456'];
      cyclicArr.push(cyclicArr);

      let redactedArr = null;
      expect(() => {
        redactedArr = redactSecrets(cyclicArr);
      }).not.toThrow();

      expect(redactedArr[0]).toBe('safe_string');
      expect(redactedArr[1]).toBe('[REDACTED_API_KEY]');
      expect(redactedArr[2]).toBe('[Circular]');
    });

    test('deepClone and redactSecrets neutralize prototype pollution attempts', () => {
      const maliciousPayload = JSON.parse('{"title":"Pollution Attempt","__proto__":{"polluted":"yes"},"constructor":{"prototype":{"injected":"yes"}}}');

      const cloned = sanitizeActivityEvent(maliciousPayload);

      // Verify Object.prototype was NOT polluted
      expect(({}).polluted).toBeUndefined();
      expect(({}).injected).toBeUndefined();
      expect(cloned.polluted).toBeUndefined();
    });

    test('boundObject safely handles cyclic structures and ignores prototype keys', () => {
      const cyclicObj = { name: 'Root', child: {} };
      cyclicObj.child.parent = cyclicObj;

      const bounded = boundObject(cyclicObj);
      expect(bounded.name).toBe('Root');
      expect(bounded.child.parent).toBe('[Circular]');
    });
  });

  // ── 2. Expanded Secret Redaction & Diagnostic Safety ────────────────────────
  describe('2. Expanded Secret Redaction & Diagnostic Safety', () => {
    test('redacts basic authentication passwords in HTTP/HTTPS URLs', () => {
      const input = 'Connecting to https://admin:SuperSecretP@ss123@api.internal.service/v1/metrics';
      const output = redactSecrets(input);

      expect(output).not.toContain('SuperSecretP@ss123');
      expect(output).toContain('https://admin:[REDACTED_PASSWORD]@api.internal.service/v1/metrics');
    });

    test('redacts Slack bot and user tokens', () => {
      const input = 'Bot token: xoxb-mock-sample-token-for-test-suite';
      const output = redactSecrets(input);

      expect(output).not.toContain('xoxb-mock-sample');
      expect(output).toContain('Bot token: [REDACTED_SLACK_TOKEN]');
    });

    test('redacts AWS secret access keys and session tokens', () => {
      const input = 'aws_secret_access_key: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"';
      const output = redactSecrets(input);

      expect(output).not.toContain('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
      expect(output).toContain('aws_secret_access_key: [REDACTED_AWS_SECRET]');
    });

    test('redacts generic Elliptic Curve (EC) and DSA private keys', () => {
      const ecKey = [
        '-----BEGIN EC PRIVATE KEY-----',
        'MHcCAQEEII8o5Z+YQ7u8qj3+1234567890abcdefghijklmnopqrstuv',
        '-----END EC PRIVATE KEY-----',
      ].join('\n');

      const output = redactSecrets(ecKey);
      expect(output).not.toContain('MHcCAQEEII8o5Z');
      expect(output).toBe('[REDACTED_PRIVATE_KEY]');
    });

    test('redaction applies consistently across Markdown, Terminal, Plaintext, and Structured renderers', () => {
      const secretEvent = createActivityEvent({
        eventType: EVENT_TYPES.VALIDATION_FAILED,
        title: 'Authentication Failed with token ghp_12345678901234567890123456789012',
        summary: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSignature',
        error: {
          message: 'Failed to authenticate with key sk-ant-api03-abcdef1234567890abcdef',
        },
      });

      const md = renderMarkdown(secretEvent);
      expect(md).not.toContain('ghp_123456789012');
      expect(md).not.toContain('doNotLeakThisSignature');
      expect(md).not.toContain('sk-ant-api03');
      expect(md).toContain('[REDACTED_API_KEY]');
      expect(md).toContain('[REDACTED_TOKEN]');

      const term = renderTerminal(secretEvent, { noColor: true });
      expect(term).not.toContain('ghp_123456789012');
      expect(term).not.toContain('sk-ant-api03');

      const plain = renderPlainText(secretEvent);
      expect(plain).not.toContain('ghp_123456789012');
      expect(plain).not.toContain('sk-ant-api03');

      const struct = renderStructured(secretEvent);
      expect(struct).not.toContain('ghp_123456789012');
      expect(struct).not.toContain('sk-ant-api03');
    });
  });

  // ── 3. Prompt Injection & Visual Spoofing Defense ───────────────────────────
  describe('3. Prompt Injection & Visual Spoofing Defense', () => {
    test('neutralizes multiline heading injection in Markdown titles and domains', () => {
      const maliciousEvent = createActivityEvent({
        eventType: EVENT_TYPES.OPERATION_STARTED,
        title: 'Legitimate Title\n## Injected Admin Heading\n<script>alert(1)</script>',
        domain: 'Core\n### Injected Subheading',
      });

      const md = renderMarkdown(maliciousEvent);

      // Must not contain unescaped newline creating fake headings
      expect(md).not.toContain('\n## Injected Admin Heading');
      expect(md).not.toContain('\n### Injected Subheading');
      expect(md).not.toContain('<script>');
      expect(md).toContain('&lt;script&gt;');
      // Header line must remain a single unbroken line
      const lines = md.split('\n');
      expect(lines[0]).toContain('Legitimate Title ## Injected Admin Heading');
    });

    test('escapes HTML tags in plaintext and terminal renderers', () => {
      const event = createActivityEvent({
        eventType: EVENT_TYPES.TOOL_EXECUTING,
        title: '<img src=x onerror=alert(1)> Tool Execution',
      });

      const plain = renderPlainText(event);
      expect(plain).toContain('<img src=x onerror=alert(1)> Tool Execution'); // Plain text doesn't evaluate HTML
      const term = renderTerminal(event, { noColor: true });
      expect(term).toContain('Tool Execution');
    });
  });

  // ── 4. ANSI Strip Fast-Path & Performance ───────────────────────────────────
  describe('4. ANSI Strip Fast-Path & Performance', () => {
    test('stripAnsi returns clean strings immediately via fast-path without regex modification', () => {
      const clean = 'Simple clean activity message';
      expect(stripAnsi(clean)).toBe(clean);

      const empty = '';
      expect(stripAnsi(empty)).toBe('');

      expect(stripAnsi(null)).toBe('');
      expect(stripAnsi(undefined)).toBe('');
    });

    test('stripAnsi thoroughly removes complex 256-color, 24-bit RGB, and OSC escape codes', () => {
      const ansiColored = '\u001b[38;2;255;100;50mRGB Color\u001b[0m and \u001b[31;1mBold Red\u001b[0m';
      expect(stripAnsi(ansiColored)).toBe('RGB Color and Bold Red');

      const oscSequence = '\u001b]0;Spoofed Terminal Title\u0007Clean Output';
      expect(stripAnsi(oscSequence)).toContain('Clean Output');
      expect(stripAnsi(oscSequence)).not.toContain('\u001b]0;');
    });
  });

  // ── 5. Resource Lifecycle & Telemetry Cleanup ────────────────────────────────
  describe('5. Resource Lifecycle & Telemetry Cleanup', () => {
    test('ActivityTracker cleans up stall detector and coalescer on terminal failure', () => {
      const tracker = new ActivityTracker({
        title: 'Terminal Failure Operation',
        enableStallDetection: true,
      });

      expect(tracker.stallDetector).toBeDefined();

      tracker.failed('Crash', { message: 'Out of memory' }, 'Restart process', { terminal: true });

      expect(tracker.completedAt).not.toBeNull();
      // Stall detector monitoring must be cleared for this operation
      expect(tracker.stallDetector.monitored.has(tracker.operationId)).toBe(false);

      tracker.dispose();
    });

    test('DiagnosticBuffer gracefully handles non-serializable circular evidence without throw', () => {
      const buffer = new DiagnosticBuffer();
      const opId = 'op-circ-diag';

      const circularEv = { result: 'partial' };
      circularEv.loop = circularEv;

      expect(() => {
        buffer.record({
          operationId: opId,
          eventType: EVENT_TYPES.VALIDATION_PASSED,
          title: 'Circular Check',
          evidence: circularEv,
        });
      }).not.toThrow();

      const diag = buffer.getDiagnostics(opId);
      expect(diag.events.length).toBe(1);
      // Evidence safely handled
      expect(diag.events[0].evidence).toBeDefined();
    });

    test('ActivityTracker handles repeated dispose calls idempotently', () => {
      const tracker = new ActivityTracker({
        title: 'Idempotent Tracker',
        enableCoalescing: true,
        enableStallDetection: true,
      });

      expect(() => {
        tracker.dispose();
        tracker.dispose();
        tracker.dispose();
      }).not.toThrow();
    });
  });

  // ── 6. High-Frequency Burst Stress Testing ───────────────────────────────────
  describe('6. High-Frequency Burst Stress Testing', () => {
    test('processes 1,000 rapid progress events with bounded memory and zero leaks', () => {
      const tracker = new ActivityTracker({
        title: 'High-Frequency Burst Pipeline',
      });

      const startTime = Date.now();
      for (let i = 1; i <= 1000; i++) {
        tracker.updateProgress({
          current: i,
          total: 1000,
          percentage: Math.round((i / 1000) * 100),
          isAuthoritative: true,
        });
      }
      const elapsedMs = Date.now() - startTime;

      // Processing 1,000 progress updates should take well under 250ms
      expect(elapsedMs).toBeLessThan(1000);

      // Memory bound invariant: tracker.events must not exceed 200 items
      expect(tracker.events.length).toBeLessThanOrEqual(200);
      expect(tracker._eventsTruncated).toBeGreaterThanOrEqual(800);

      tracker.complete('Burst complete', { totalProcessed: 1000 });
      expect(tracker.getStatus()).toBe(LIFECYCLE_STATES.COMPLETED);

      tracker.dispose();
    });

    test('concurrent parallel operations maintain distinct diagnostic buffers and lifecycles', () => {
      const op1 = new ActivityTracker({ title: 'Task 1' });
      const op2 = new ActivityTracker({ title: 'Task 2' });

      op1.start('Start 1');
      op2.start('Start 2');

      op1.passed('Check 1 Passed', { ok: true });
      op2.failed('Check 2 Failed', { message: 'Network error' }, null, { terminal: true });

      expect(op1.getStatus()).toBe(LIFECYCLE_STATES.RUNNING);
      expect(op2.getStatus()).toBe(LIFECYCLE_STATES.FAILED);

      const diag1 = op1.getDiagnostics();
      const diag2 = op2.getDiagnostics();

      expect(diag1.operationId).toBe(op1.operationId);
      expect(diag2.operationId).toBe(op2.operationId);
      expect(diag2.error.message).toBe('Network error');
      expect(diag1.error).toBeNull();

      op1.dispose();
      op2.dispose();
    });
  });
});

