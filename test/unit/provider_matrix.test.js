'use strict';

/**
 * provider_matrix.test.js — Automated Provider Compatibility Matrix & Protocol Verification
 *
 * Verifies request formatting, authentication, token normalization, timeouts,
 * cancellations, retries, and secret scrubbing across all 7 supported providers:
 * 1. Anthropic
 * 2. OpenAI
 * 3. OpenRouter
 * 4. Gemini REST
 * 5. Ollama (Local)
 * 6. vLLM (Local)
 * 7. Mock Engine
 */

const http = require('http');
const { ProviderAdapter } = require('../../src/execution/provider_adapter');

describe('Stage 2.1: Provider Compatibility Matrix', () => {
  let server;
  let serverPort;
  let serverUrl;
  let serverHandler;

  beforeAll(done => {
    server = http.createServer((req, res) => {
      let rawBody = '';
      req.on('data', chunk => {
        rawBody += chunk;
      });
      req.on('end', () => {
        if (serverHandler) {
          serverHandler(req, res, rawBody ? JSON.parse(rawBody) : null);
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      });
    });

    server.listen(0, '127.0.0.1', () => {
      serverPort = server.address().port;
      serverUrl = `http://127.0.0.1:${serverPort}`;
      done();
    });
  });

  afterAll(done => {
    server.close(done);
  });

  describe('1. Anthropic Provider Protocol', () => {
    test('formats Anthropic request correctly and normalizes message response', async () => {
      let captured = null;
      serverHandler = (req, res, body) => {
        captured = { url: req.url, headers: req.headers, body };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            content: [{ type: 'text', text: '{"status":"SUCCESS","summary":"Anthropic passed"}' }],
            usage: { input_tokens: 18, output_tokens: 28 },
          }),
        );
      };

      const provider = new ProviderAdapter({
        provider: 'anthropic',
        apiKey: 'sk-ant-test-key-12345',
        baseUrl: serverUrl,
        model: 'claude-3-5-sonnet-latest',
      });

      const res = await provider.sendReviewPrompt({ prompt: 'Test anthropic prompt' });

      expect(res.error).toBeNull();
      expect(res.provider).toBe('anthropic');
      expect(res.inputTokens).toBe(18);
      expect(res.outputTokens).toBe(28);
      expect(res.totalTokens).toBe(46);
      expect(res.text).toContain('Anthropic passed');

      // Verify protocol formatting
      expect(captured.url).toBe('/v1/messages');
      expect(captured.headers['x-api-key']).toBe('sk-ant-test-key-12345');
      expect(captured.headers['anthropic-version']).toBe('2023-06-01');
      expect(captured.body.model).toBe('claude-3-5-sonnet-latest');
      expect(captured.body.messages[0].content).toBe('Test anthropic prompt');
    });
  });

  describe('2. OpenAI Provider Protocol', () => {
    test('formats OpenAI request correctly and normalizes choices response', async () => {
      let captured = null;
      serverHandler = (req, res, body) => {
        captured = { url: req.url, headers: req.headers, body };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            choices: [{ message: { content: '{"status":"SUCCESS","summary":"OpenAI passed"}' } }],
            usage: { prompt_tokens: 22, completion_tokens: 34 },
          }),
        );
      };

      const provider = new ProviderAdapter({
        provider: 'openai',
        apiKey: 'sk-openai-test-key-67890',
        baseUrl: serverUrl,
        model: 'gpt-4o',
      });

      const res = await provider.sendReviewPrompt({ prompt: 'Test openai prompt' });

      expect(res.error).toBeNull();
      expect(res.provider).toBe('openai');
      expect(res.inputTokens).toBe(22);
      expect(res.outputTokens).toBe(34);
      expect(res.totalTokens).toBe(56);
      expect(res.text).toContain('OpenAI passed');

      expect(captured.url).toBe('/v1/chat/completions');
      expect(captured.headers['authorization']).toBe('Bearer sk-openai-test-key-67890');
      expect(captured.body.model).toBe('gpt-4o');
      expect(captured.body.response_format).toEqual({ type: 'json_object' });
    });
  });

  describe('3. OpenRouter Provider Protocol', () => {
    test('formats OpenRouter request with required attribution headers', async () => {
      let captured = null;
      serverHandler = (req, res, body) => {
        captured = { url: req.url, headers: req.headers, body };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            choices: [
              { message: { content: '{"status":"SUCCESS","summary":"OpenRouter passed"}' } },
            ],
            usage: { prompt_tokens: 15, completion_tokens: 25 },
          }),
        );
      };

      const provider = new ProviderAdapter({
        provider: 'openrouter',
        apiKey: 'sk-or-test-key-11111',
        baseUrl: serverUrl,
        model: 'meta-llama/llama-3-70b-instruct',
      });

      const res = await provider.sendReviewPrompt({ prompt: 'Test openrouter prompt' });

      expect(res.error).toBeNull();
      expect(res.provider).toBe('openrouter');
      expect(res.totalTokens).toBe(40);
      expect(captured.url).toBe('/api/v1/chat/completions');
      expect(captured.headers['authorization']).toBe('Bearer sk-or-test-key-11111');
      expect(captured.headers['http-referer']).toBe('https://github.com/Harmitx7/tribunal-kit');
      expect(captured.headers['x-title']).toBe('Tribunal Kit Governance Engine');
    });
  });

  describe('4. Gemini REST Provider Protocol', () => {
    test('formats Gemini REST request and parses candidates and usageMetadata', async () => {
      let captured = null;
      serverHandler = (req, res, body) => {
        captured = { url: req.url, headers: req.headers, body };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: '{"status":"SUCCESS","summary":"Gemini passed"}' }],
                },
              },
            ],
            usageMetadata: {
              promptTokenCount: 30,
              candidatesTokenCount: 40,
              totalTokenCount: 70,
            },
          }),
        );
      };

      const provider = new ProviderAdapter({
        provider: 'gemini',
        apiKey: 'AIzaSyTestGeminiKey12345',
        baseUrl: serverUrl,
        model: 'gemini-1.5-pro',
      });

      const res = await provider.sendReviewPrompt({ prompt: 'Test gemini prompt' });

      expect(res.error).toBeNull();
      expect(res.provider).toBe('gemini');
      expect(res.inputTokens).toBe(30);
      expect(res.outputTokens).toBe(40);
      expect(res.totalTokens).toBe(70);
      expect(res.text).toContain('Gemini passed');

      expect(captured.url).toContain(
        '/v1beta/models/gemini-1.5-pro:generateContent?key=AIzaSyTestGeminiKey12345',
      );
      expect(captured.body.contents[0].parts[0].text).toBe('Test gemini prompt');
      expect(captured.body.generationConfig.responseMimeType).toBe('application/json');
    });
  });

  describe('5. Local / Ollama Provider Protocol', () => {
    test('dispatches to Ollama endpoint and normalizes output', async () => {
      serverHandler = (req, res, _body) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            choices: [{ message: { content: '{"status":"SUCCESS","summary":"Ollama passed"}' } }],
            usage: { prompt_tokens: 10, completion_tokens: 15 },
          }),
        );
      };

      const provider = new ProviderAdapter({
        provider: 'ollama',
        baseUrl: serverUrl,
        model: 'mistral:latest',
      });

      const res = await provider.sendReviewPrompt({ prompt: 'Test ollama' });
      expect(res.error).toBeNull();
      expect(res.provider).toBe('ollama');
      expect(res.totalTokens).toBe(25);
    });
  });

  describe('6. Local / vLLM Provider Protocol', () => {
    test('dispatches to vLLM endpoint and normalizes output', async () => {
      serverHandler = (req, res, _body) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            choices: [{ message: { content: '{"status":"SUCCESS","summary":"vLLM passed"}' } }],
            usage: { prompt_tokens: 12, completion_tokens: 24 },
          }),
        );
      };

      const provider = new ProviderAdapter({
        provider: 'vllm',
        baseUrl: serverUrl,
        model: 'vllm-model',
      });

      const res = await provider.sendReviewPrompt({ prompt: 'Test vllm' });
      expect(res.error).toBeNull();
      expect(res.provider).toBe('vllm');
      expect(res.totalTokens).toBe(36);
    });
  });

  describe('7. Mock Engine Provider', () => {
    test('executes in-memory without network transport', async () => {
      const provider = new ProviderAdapter({
        provider: 'mock',
        mockHandler: async () => ({
          status: 'SUCCESS',
          summary: 'Deterministic mock executed',
          findings: [],
          inputTokens: 5,
          outputTokens: 10,
        }),
      });

      const res = await provider.sendReviewPrompt({ prompt: 'Test mock' });
      expect(res.error).toBeNull();
      expect(res.provider).toBe('mock');
      expect(res.totalTokens).toBe(15);
      expect(res.text).toContain('Deterministic mock executed');
    });
  });

  describe('Cross-Provider Governance Invariants', () => {
    test('retries on HTTP 429 rate limit and recovers on second attempt', async () => {
      let attempts = 0;
      serverHandler = (req, res) => {
        attempts++;
        if (attempts === 1) {
          res.writeHead(429, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { message: 'Rate limit exceeded' } }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              choices: [
                { message: { content: '{"status":"SUCCESS","summary":"Recovered from 429"}' } },
              ],
              usage: { prompt_tokens: 5, completion_tokens: 5 },
            }),
          );
        }
      };

      const provider = new ProviderAdapter({
        provider: 'openai',
        apiKey: 'sk-test',
        baseUrl: serverUrl,
        retryDelayMs: 10,
        maxRetries: 2,
      });

      const res = await provider.sendReviewPrompt({ prompt: 'Test 429' });
      expect(attempts).toBe(2);
      expect(res.error).toBeNull();
      expect(res.text).toContain('Recovered from 429');
    });

    test('fails immediately without retry on non-retryable client error (HTTP 401)', async () => {
      let attempts = 0;
      serverHandler = (req, res) => {
        attempts++;
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Invalid API Key' } }));
      };

      const provider = new ProviderAdapter({
        provider: 'anthropic',
        apiKey: 'sk-invalid-key-99999',
        baseUrl: serverUrl,
        retryDelayMs: 10,
        maxRetries: 2,
      });

      const res = await provider.sendReviewPrompt({ prompt: 'Test 401' });
      expect(attempts).toBe(1); // Zero retries for 401
      expect(res.error).toContain('HTTP_401');
      // Secret scrubbing verified: key must not appear in error
      expect(res.error).not.toContain('sk-invalid-key-99999');
    });

    test('cooperative cancellation cleanly cancels running HTTP request', async () => {
      serverHandler = (_req, _res) => {
        // Intentionally hold connection without responding
      };

      const ac = new AbortController();
      const provider = new ProviderAdapter({
        provider: 'openai',
        apiKey: 'sk-test',
        baseUrl: serverUrl,
        timeoutMs: 10000,
      });

      setTimeout(() => ac.abort(), 20);

      const res = await provider.sendReviewPrompt({
        prompt: 'Test abort',
        signal: ac.signal,
      });

      expect(res.text).toBeNull();
      expect(res.error).toContain('LLM_ABORTED');
    });
  });
});
