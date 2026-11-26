'use strict';

/**
 * provider_adapter_extended.test.js — Unit Tests for Gemini, Local Providers, Retries & Secret Scrubbing
 */

const {
  ProviderAdapter,
  scrubSecrets,
  isTransientError,
  sendHttpRequest: _sendHttpRequest,
} = require('../../src/execution/provider_adapter');
const http = require('http');

describe('ProviderAdapter Extended Capabilities', () => {
  describe('Secret Scrubbing', () => {
    test('redacts OpenAI, Anthropic, Gemini and generic bearer tokens', () => {
      const sensitive =
        'Failed with Bearer sk-ant-api03-abcdef123456789 and AIzaSyD1234567890abcdef1234567890ab and key=secret_value_12345';
      const scrubbed = scrubSecrets(sensitive, ['custom_api_secret_999']);
      expect(scrubbed).not.toContain('AIzaSyD1234567890abcdef1234567890ab');
      expect(scrubbed).not.toContain('secret_value_12345');
      expect(scrubbed).toContain('[REDACTED');
    });

    test('scrubs explicit apiKey passed as argument', () => {
      const explicitSecret = 'my-ultra-secret-token-xyz';
      const msg = `Error talking to upstream server with token ${explicitSecret}`;
      const scrubbed = scrubSecrets(msg, [explicitSecret]);
      expect(scrubbed).not.toContain(explicitSecret);
      expect(scrubbed).toContain('[REDACTED]');
    });
  });

  describe('Transient Error Detection', () => {
    test('identifies rate limits (429) and server errors (500, 502, 503, 504) as transient', () => {
      expect(isTransientError({ statusCode: 429 })).toBe(true);
      expect(isTransientError({ statusCode: 500 })).toBe(true);
      expect(isTransientError({ statusCode: 502 })).toBe(true);
      expect(isTransientError({ statusCode: 503 })).toBe(true);
      expect(isTransientError({ statusCode: 504 })).toBe(true);
      expect(isTransientError(new Error('LLM_TIMEOUT: timed out'))).toBe(true);
      expect(isTransientError(new Error('read ECONNRESET'))).toBe(true);
      expect(isTransientError(new Error('socket hang up'))).toBe(true);
    });

    test('identifies client errors (400, 401, 403, 404) and cancellations as non-transient', () => {
      expect(isTransientError({ statusCode: 400 })).toBe(false);
      expect(isTransientError({ statusCode: 401 })).toBe(false);
      expect(isTransientError({ statusCode: 403 })).toBe(false);
      expect(isTransientError({ statusCode: 404 })).toBe(false);
      expect(isTransientError(new Error('LLM_ABORTED: Request was cancelled'))).toBe(false);
    });
  });

  describe('Mock Provider with Retries', () => {
    test('retries on transient error and succeeds', async () => {
      let attempts = 0;
      const provider = new ProviderAdapter({
        provider: 'mock',
        retryDelayMs: 10,
        maxRetries: 2,
        mockHandler: async () => {
          attempts++;
          if (attempts === 1) {
            const err = new Error('LLM_TIMEOUT: Transient timeout');
            throw err;
          }
          return {
            verdict: 'APPROVED',
            confidence: 0.99,
            findings: [],
          };
        },
      });

      const res = await provider.sendReviewPrompt({ prompt: 'Review test' });
      expect(attempts).toBe(2);
      expect(res.error).toBeNull();
      const parsed = JSON.parse(res.text);
      expect(parsed.verdict).toBe('APPROVED');
    });

    test('fails closed after maxRetries exhausted', async () => {
      let attempts = 0;
      const provider = new ProviderAdapter({
        provider: 'mock',
        retryDelayMs: 5,
        maxRetries: 2,
        mockHandler: async () => {
          attempts++;
          const err = new Error('LLM_TIMEOUT: Permanent timeout');
          throw err;
        },
      });

      const res = await provider.sendReviewPrompt({ prompt: 'Review test' });
      expect(attempts).toBe(3); // 1 initial + 2 retries
      expect(res.text).toBeNull();
      expect(res.error).toContain('LLM_TIMEOUT');
    });

    test('does not retry on non-transient client errors', async () => {
      let attempts = 0;
      const provider = new ProviderAdapter({
        provider: 'mock',
        retryDelayMs: 5,
        maxRetries: 2,
        mockHandler: async () => {
          attempts++;
          const err = new Error('INVALID_ARGUMENT: Prompt exceeds max length');
          err.statusCode = 400;
          throw err;
        },
      });

      const res = await provider.sendReviewPrompt({ prompt: 'Review test' });
      expect(attempts).toBe(1); // No retries for 400
      expect(res.error).toContain('INVALID_ARGUMENT');
    });
  });

  describe('Local HTTP Provider Handling', () => {
    let server;
    let serverPort;
    const receivedRequests = [];

    beforeAll(done => {
      server = http.createServer((req, res) => {
        let body = '';
        req.on('data', chunk => {
          body += chunk;
        });
        req.on('end', () => {
          receivedRequests.push({
            url: req.url,
            method: req.method,
            headers: req.headers,
            body: body ? JSON.parse(body) : null,
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      status: 'SUCCESS',
                      summary: 'Local Ollama execution passed',
                      findings: [],
                    }),
                  },
                },
              ],
              usage: {
                prompt_tokens: 45,
                completion_tokens: 30,
              },
            }),
          );
        });
      });

      server.listen(0, '127.0.0.1', () => {
        serverPort = server.address().port;
        done();
      });
    });

    afterAll(done => {
      server.close(done);
    });

    test('dispatches to local HTTP server with OpenAI compatible format', async () => {
      const provider = new ProviderAdapter({
        provider: 'local',
        baseUrl: `http://127.0.0.1:${serverPort}`,
        model: 'llama3:latest',
      });

      const res = await provider.sendReviewPrompt({
        prompt: 'Analyze code for SQL injection',
      });

      expect(res.error).toBeNull();
      expect(res.provider).toBe('local');
      expect(res.inputTokens).toBe(45);
      expect(res.outputTokens).toBe(30);
      expect(res.totalTokens).toBe(75);

      const parsed = JSON.parse(res.text);
      expect(parsed.summary).toBe('Local Ollama execution passed');
      expect(receivedRequests.length).toBeGreaterThan(0);
      const lastReq = receivedRequests[receivedRequests.length - 1];
      expect(lastReq.url).toBe('/v1/chat/completions');
      expect(lastReq.body.model).toBe('llama3:latest');
    });
  });

  describe('Missing API Key Handling', () => {
    test('gemini fails safely with clear missing key error when no key provided', async () => {
      const origKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      try {
        const provider = new ProviderAdapter({ provider: 'gemini', apiKey: null });
        const res = await provider.sendReviewPrompt({ prompt: 'test' });
        expect(res.error).toContain('MISSING_API_KEY: GEMINI_API_KEY');
        expect(res.text).toBeNull();
      } finally {
        if (origKey) process.env.GEMINI_API_KEY = origKey;
      }
    });
  });
});
