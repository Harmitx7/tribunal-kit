// @ts-nocheck
'use strict';

/**
 * provider_adapter.js — Provider-Independent LLM Dispatch Adapter
 * ================================================================
 * Phase 1D & Stage 2: Provider Abstraction & Execution Engine
 *
 * Guarantees:
 * 1. Supports Anthropic, OpenAI, OpenRouter, Gemini REST, Local (Ollama/vLLM), and Mock.
 * 2. Strict timeout and cooperative cancellation (AbortSignal) support.
 * 3. Exact token telemetry tracking where provided by vendor API.
 * 4. Automatic transient error retry with exponential backoff.
 * 5. Secret scrubbing from all error logs and messages.
 * 6. Governance engine remains 100% provider-independent.
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

/**
 * Scrubs sensitive keys and authorization tokens from strings.
 * @param {string} text
 * @param {string[]} [extraKeys]
 * @returns {string}
 */
function scrubSecrets(text, extraKeys = []) {
  if (typeof text !== 'string') return text;
  let scrubbed = text
    .replace(/(Bearer\s+)[A-Za-z0-9_\-\.]{8,}/gi, '$1[REDACTED]')
    .replace(/((?:api[_-]?key|key=)[a-zA-Z0-9_\-]{8,})/gi, '[REDACTED_KEY]')
    .replace(/(AIzaSy[A-Za-z0-9_\-]{15,})/g, '[REDACTED_GEMINI_KEY]')
    .replace(/(sk-[a-zA-Z0-9_\-]{15,})/g, '[REDACTED_KEY]');

  for (const k of extraKeys) {
    if (k && typeof k === 'string' && k.length >= 6) {
      scrubbed = scrubbed.split(k).join('[REDACTED]');
    }
  }
  return scrubbed;
}

/**
 * Low-level HTTP / HTTPS request helper with cooperative timeout and abort support.
 *
 * @param {Object} options
 * @param {string} options.protocol - 'http:' or 'https:'
 * @param {string} options.hostname
 * @param {number|string} [options.port]
 * @param {string} options.path
 * @param {string} [options.method='POST']
 * @param {Object} [options.headers={}]
 * @param {Object|string} options.body
 * @param {number} [options.timeoutMs=30000]
 * @param {AbortSignal} [options.signal=null]
 * @returns {Promise<{ statusCode: number, headers: Object, data: string }>}
 */
function sendHttpRequest(options) {
  return new Promise((resolve, reject) => {
    const {
      protocol = 'https:',
      hostname,
      port,
      path: reqPath,
      method = 'POST',
      headers = {},
      body,
      timeoutMs = 30000,
      signal = null,
    } = options;

    let finished = false;
    const client = protocol === 'http:' ? http : https;
    const data = typeof body === 'string' ? body : JSON.stringify(body || {});

    const reqHeaders = {
      ...headers,
      'Content-Length': Buffer.byteLength(data),
    };

    const reqOptions = {
      method,
      hostname,
      path: reqPath,
      headers: reqHeaders,
      ...(port ? { port } : {}),
    };

    const req = client.request(reqOptions, res => {
      let raw = '';
      res.on('data', chunk => {
        raw += chunk;
      });
      res.on('end', () => {
        if (!finished) {
          finished = true;
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: raw,
          });
        }
      });
      res.on('error', err => {
        if (!finished) {
          finished = true;
          reject(err);
        }
      });
    });

    req.on('error', err => {
      if (!finished) {
        finished = true;
        reject(err);
      }
    });

    // Timeout handling
    req.setTimeout(timeoutMs, () => {
      if (!finished) {
        finished = true;
        const timeoutErr = new Error(
          `LLM_TIMEOUT: Request to ${hostname} timed out after ${timeoutMs}ms.`,
        );
        req.destroy(timeoutErr);
        reject(timeoutErr);
      }
    });

    // AbortSignal handling
    if (signal) {
      if (signal.aborted) {
        finished = true;
        const abortErr = new Error('LLM_ABORTED: Request was cancelled by caller signal.');
        req.destroy(abortErr);
        reject(abortErr);
        return;
      }
      signal.addEventListener('abort', () => {
        if (!finished) {
          finished = true;
          const abortErr = new Error('LLM_ABORTED: Request was cancelled by caller signal.');
          req.destroy(abortErr);
          reject(abortErr);
        }
      });
    }

    req.write(data);
    req.end();
  });
}

/**
 * Backward-compatible HTTPS POST helper.
 *
 * @param {string} hostname
 * @param {string} apiPath
 * @param {Object} headers
 * @param {Object} body
 * @param {number} timeoutMs
 * @param {AbortSignal} [signal]
 * @returns {Promise<string>}
 */
async function httpsPost(hostname, apiPath, headers, body, timeoutMs = 30000, signal = null) {
  const res = await sendHttpRequest({
    protocol: 'https:',
    hostname,
    path: apiPath,
    headers,
    body,
    timeoutMs,
    signal,
  });

  if (res.statusCode >= 400) {
    const err = new Error(`HTTP_${res.statusCode}: ${res.data}`);
    err.statusCode = res.statusCode;
    err.responseBody = res.data;
    throw err;
  }
  return res.data;
}

/**
 * Checks if an error is considered transient and safe for automatic retry.
 * @param {Error|any} err
 * @returns {boolean}
 */
function isTransientError(err) {
  if (!err) return false;
  if (err.message && err.message.includes('LLM_ABORTED')) return false;

  const status = err.statusCode;
  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
    return true;
  }

  const msg = (err.message || '').toLowerCase();
  return (
    msg.includes('llm_timeout') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('eai_again') ||
    msg.includes('socket hang up')
  );
}

/**
 * Automatically detects the provider configuration.
 * If preferredProvider is given, resolves keys and models for that specific provider.
 * @param {string} [preferredProvider]
 * @returns {{ provider: string, apiKey: string|null, model: string, baseUrl?: string }|null}
 */
function detectProviderConfig(preferredProvider = null) {
  const norm = preferredProvider ? preferredProvider.toLowerCase() : null;

  if (
    norm === 'anthropic' ||
    (!norm && (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN))
  ) {
    if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) {
      return {
        provider: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN,
        model: process.env.ANTHROPIC_DEFAULT_SONNET_MODEL || 'claude-3-5-sonnet-latest',
      };
    }
  }
  if (norm === 'openai' || (!norm && process.env.OPENAI_API_KEY)) {
    if (process.env.OPENAI_API_KEY) {
      return {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      };
    }
  }
  if (norm === 'openrouter' || (!norm && process.env.OPENROUTER_API_KEY)) {
    if (process.env.OPENROUTER_API_KEY) {
      return {
        provider: 'openrouter',
        apiKey: process.env.OPENROUTER_API_KEY,
        model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
      };
    }
  }
  if (norm === 'gemini' || (!norm && process.env.GEMINI_API_KEY)) {
    if (process.env.GEMINI_API_KEY) {
      return {
        provider: 'gemini',
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      };
    }
  }
  if (
    norm === 'local' ||
    norm === 'ollama' ||
    norm === 'vllm' ||
    (!norm && (process.env.LOCAL_LLM_URL || process.env.OLLAMA_BASE_URL))
  ) {
    return {
      provider: norm || 'local',
      apiKey: process.env.LOCAL_LLM_API_KEY || null,
      model: process.env.LOCAL_LLM_MODEL || (norm === 'vllm' ? 'vllm-default' : 'llama3:latest'),
      baseUrl:
        process.env.LOCAL_LLM_URL ||
        process.env.OLLAMA_BASE_URL ||
        (norm === 'vllm' ? 'http://localhost:8000' : 'http://localhost:11434'),
    };
  }
  return null;
}

/**
 * Automatically detects the default available LLM provider from environment variables.
 * @returns {{ provider: string, apiKey: string, model: string, baseUrl?: string }|null}
 */
function detectDefaultProvider() {
  return detectProviderConfig(null);
}

class ProviderAdapter {
  /**
   * @param {Object} [options]
   * @param {string} [options.provider] - 'anthropic'|'openai'|'openrouter'|'gemini'|'local'|'ollama'|'vllm'|'mock'
   * @param {string} [options.apiKey]
   * @param {string} [options.model]
   * @param {string} [options.baseUrl] - Custom endpoint for local/ollama/vLLM providers
   * @param {number} [options.timeoutMs]
   * @param {number} [options.maxRetries=2] - Automatic retries on transient errors
   * @param {number} [options.retryDelayMs=100] - Base delay for exponential backoff
   * @param {Function} [options.mockHandler] - For deterministic test mocking
   */
  constructor(options = {}) {
    const reqProvider = options.provider ? options.provider.toLowerCase() : null;
    const detected = detectProviderConfig(reqProvider) || {};
    this.provider = reqProvider || detected.provider || 'mock';
    this.apiKey = options.apiKey !== undefined ? options.apiKey : detected.apiKey || null;
    this.defaultModel = options.model || detected.model || 'default-model';
    this.baseUrl = options.baseUrl || detected.baseUrl || null;
    this.timeoutMs = options.timeoutMs || 30000;
    this.maxRetries = options.maxRetries !== undefined ? options.maxRetries : 2;
    this.retryDelayMs = options.retryDelayMs || 100;
    this.mockHandler = options.mockHandler || null;
  }

  /**
   * Resolves target endpoint configuration, respecting baseUrl in test environments.
   * @private
   */
  _resolveEndpoint(defaultHostname, defaultPath) {
    if (!this.baseUrl) {
      return {
        protocol: 'https:',
        hostname: defaultHostname,
        port: 443,
        path: defaultPath,
      };
    }
    const u = new URL(this.baseUrl);
    const basePath = u.pathname === '/' ? '' : u.pathname.replace(/\/$/, '');
    return {
      protocol: u.protocol,
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: `${basePath}${defaultPath}`,
    };
  }

  /**
   * Helper to dispatch POST request to resolved endpoint.
   * @private
   */
  async _dispatchPost(ep, headers, body, timeoutMs, signal) {
    const res = await sendHttpRequest({
      protocol: ep.protocol,
      hostname: ep.hostname,
      port: ep.port,
      path: ep.path,
      headers,
      body,
      timeoutMs,
      signal,
    });

    if (res.statusCode >= 400) {
      const err = new Error(`HTTP_${res.statusCode}: ${res.data}`);
      err.statusCode = res.statusCode;
      err.responseBody = res.data;
      throw err;
    }
    return res.data;
  }

  /**
   * Helper to sleep with cancellation awareness.
   * @private
   */
  async _sleep(ms, signal) {
    if (ms <= 0) return;
    return new Promise((resolve, reject) => {
      let timer;
      const onAbort = () => {
        clearTimeout(timer);
        reject(new Error('LLM_ABORTED: Request was cancelled by caller signal.'));
      };
      if (signal) {
        if (signal.aborted) {
          return reject(new Error('LLM_ABORTED: Request was cancelled by caller signal.'));
        }
        signal.addEventListener('abort', onAbort, { once: true });
      }
      timer = setTimeout(() => {
        if (signal) signal.removeEventListener('abort', onAbort);
        resolve();
      }, ms);
    });
  }

  /**
   * Executes an async operation with automatic exponential backoff retry on transient errors.
   * @private
   */
  async _withRetry(operation, maxRetries, signal) {
    let attempt = 0;
    while (true) {
      try {
        return await operation(attempt);
      } catch (err) {
        if (signal && signal.aborted) throw err;
        if (attempt >= maxRetries || !isTransientError(err)) {
          throw err;
        }
        attempt++;
        const backoff = this.retryDelayMs * Math.pow(2, attempt - 1);
        await this._sleep(backoff, signal);
      }
    }
  }

  /**
   * Dispatches a prompt to the configured LLM provider.
   *
   * @param {Object} request
   * @param {string} request.prompt
   * @param {string} [request.model]
   * @param {number} [request.temperature=0.1]
   * @param {number} [request.maxTokens=2048]
   * @param {number} [request.timeoutMs]
   * @param {number} [request.maxRetries]
   * @param {AbortSignal} [request.signal]
   * @returns {Promise<{
   *   text: string|null,
   *   provider: string,
   *   model: string,
   *   inputTokens: number|'UNAVAILABLE',
   *   outputTokens: number|'UNAVAILABLE',
   *   totalTokens: number|'UNAVAILABLE',
   *   latencyMs: number,
   *   error?: string
   * }>}
   */
  async sendReviewPrompt(request = {}) {
    const start = Date.now();
    const model = request.model || this.defaultModel;
    const timeoutMs = request.timeoutMs || this.timeoutMs;
    const temperature = request.temperature !== undefined ? request.temperature : 0.1;
    const maxTokens = request.maxTokens || 2048;
    const prompt = request.prompt || '';
    const signal = request.signal || null;
    const retries = request.maxRetries !== undefined ? request.maxRetries : this.maxRetries;

    const sanitizeError = err => {
      const msg = err && err.message ? err.message : String(err);
      return scrubSecrets(msg, [this.apiKey]);
    };

    // 1. Mock Provider Execution
    if (this.provider === 'mock' || this.mockHandler) {
      try {
        if (signal && signal.aborted) {
          throw new Error('LLM_ABORTED: Request was cancelled by caller signal.');
        }

        if (typeof this.mockHandler === 'function') {
          const res = await this._withRetry(
            async () => {
              let timer;
              const timeoutPromise = new Promise((_, reject) => {
                timer = setTimeout(() => {
                  reject(new Error(`LLM_TIMEOUT: Request timed out after ${timeoutMs}ms.`));
                }, timeoutMs);
              });

              const abortPromise = signal
                ? new Promise((_, reject) => {
                    signal.addEventListener('abort', () => {
                      reject(new Error('LLM_ABORTED: Request was cancelled by caller signal.'));
                    });
                  })
                : null;

              const raceTargets = [
                Promise.resolve().then(() => this.mockHandler(request)),
                timeoutPromise,
              ];
              if (abortPromise) raceTargets.push(abortPromise);

              try {
                return await Promise.race(raceTargets);
              } finally {
                clearTimeout(timer);
              }
            },
            retries,
            signal,
          );

          const inTok = res.inputTokens ?? Math.ceil(prompt.length / 4);
          const outTok = res.outputTokens ?? 150;
          const totTok = res.totalTokens ?? inTok + outTok;

          const latencyMs = Date.now() - start;
          return {
            text:
              res.text !== undefined
                ? res.text
                : typeof res === 'string'
                  ? res
                  : JSON.stringify(res),
            provider: 'mock',
            model,
            inputTokens: inTok,
            outputTokens: outTok,
            totalTokens: totTok,
            latencyMs,
            error: res.error || null,
          };
        }

        // Default deterministic mock response
        const latencyMs = Date.now() - start;
        return {
          text: JSON.stringify({
            verdict: 'APPROVED',
            confidence: 0.95,
            findings: [],
            recommendations: ['Maintain current implementation standards.'],
          }),
          provider: 'mock',
          model,
          inputTokens: Math.ceil(prompt.length / 4),
          outputTokens: 40,
          totalTokens: Math.ceil(prompt.length / 4) + 40,
          latencyMs,
          error: null,
        };
      } catch (mockErr) {
        return {
          text: null,
          provider: 'mock',
          model,
          inputTokens: 'UNAVAILABLE',
          outputTokens: 'UNAVAILABLE',
          totalTokens: 'UNAVAILABLE',
          latencyMs: Date.now() - start,
          error: sanitizeError(mockErr),
        };
      }
    }

    // 2. Anthropic Execution
    if (this.provider === 'anthropic') {
      if (!this.apiKey) {
        return {
          text: null,
          provider: 'anthropic',
          model,
          inputTokens: 'UNAVAILABLE',
          outputTokens: 'UNAVAILABLE',
          totalTokens: 'UNAVAILABLE',
          latencyMs: Date.now() - start,
          error: 'MISSING_API_KEY: ANTHROPIC_API_KEY environment variable is not configured.',
        };
      }
      try {
        const ep = this._resolveEndpoint('api.anthropic.com', '/v1/messages');
        const raw = await this._withRetry(
          () =>
            this._dispatchPost(
              ep,
              {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01',
              },
              {
                model,
                max_tokens: maxTokens,
                temperature,
                messages: [{ role: 'user', content: prompt }],
              },
              timeoutMs,
              signal,
            ),
          retries,
          signal,
        );

        const json = JSON.parse(raw);
        if (json.error) {
          throw new Error(json.error.message || JSON.stringify(json.error));
        }
        const text = json?.content?.[0]?.text || null;
        const inTok =
          typeof json?.usage?.input_tokens === 'number' ? json.usage.input_tokens : 'UNAVAILABLE';
        const outTok =
          typeof json?.usage?.output_tokens === 'number' ? json.usage.output_tokens : 'UNAVAILABLE';
        const totTok =
          inTok !== 'UNAVAILABLE' && outTok !== 'UNAVAILABLE' ? inTok + outTok : 'UNAVAILABLE';

        return {
          text,
          provider: 'anthropic',
          model,
          inputTokens: inTok,
          outputTokens: outTok,
          totalTokens: totTok,
          latencyMs: Date.now() - start,
          error: null,
        };
      } catch (err) {
        return {
          text: null,
          provider: 'anthropic',
          model,
          inputTokens: 'UNAVAILABLE',
          outputTokens: 'UNAVAILABLE',
          totalTokens: 'UNAVAILABLE',
          latencyMs: Date.now() - start,
          error: sanitizeError(err),
        };
      }
    }

    // 3. OpenAI Execution
    if (this.provider === 'openai') {
      if (!this.apiKey) {
        return {
          text: null,
          provider: 'openai',
          model,
          inputTokens: 'UNAVAILABLE',
          outputTokens: 'UNAVAILABLE',
          totalTokens: 'UNAVAILABLE',
          latencyMs: Date.now() - start,
          error: 'MISSING_API_KEY: OPENAI_API_KEY environment variable is not configured.',
        };
      }
      try {
        const ep = this._resolveEndpoint('api.openai.com', '/v1/chat/completions');
        const raw = await this._withRetry(
          () =>
            this._dispatchPost(
              ep,
              {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
              },
              {
                model,
                max_tokens: maxTokens,
                temperature,
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' },
              },
              timeoutMs,
              signal,
            ),
          retries,
          signal,
        );

        const json = JSON.parse(raw);
        if (json.error) {
          throw new Error(json.error.message || JSON.stringify(json.error));
        }
        const text = json?.choices?.[0]?.message?.content || null;
        const inTok =
          typeof json?.usage?.prompt_tokens === 'number' ? json.usage.prompt_tokens : 'UNAVAILABLE';
        const outTok =
          typeof json?.usage?.completion_tokens === 'number'
            ? json.usage.completion_tokens
            : 'UNAVAILABLE';
        const totTok =
          inTok !== 'UNAVAILABLE' && outTok !== 'UNAVAILABLE' ? inTok + outTok : 'UNAVAILABLE';

        return {
          text,
          provider: 'openai',
          model,
          inputTokens: inTok,
          outputTokens: outTok,
          totalTokens: totTok,
          latencyMs: Date.now() - start,
          error: null,
        };
      } catch (err) {
        return {
          text: null,
          provider: 'openai',
          model,
          inputTokens: 'UNAVAILABLE',
          outputTokens: 'UNAVAILABLE',
          totalTokens: 'UNAVAILABLE',
          latencyMs: Date.now() - start,
          error: sanitizeError(err),
        };
      }
    }

    // 4. OpenRouter Execution
    if (this.provider === 'openrouter') {
      if (!this.apiKey) {
        return {
          text: null,
          provider: 'openrouter',
          model,
          inputTokens: 'UNAVAILABLE',
          outputTokens: 'UNAVAILABLE',
          totalTokens: 'UNAVAILABLE',
          latencyMs: Date.now() - start,
          error: 'MISSING_API_KEY: OPENROUTER_API_KEY environment variable is not configured.',
        };
      }
      try {
        const ep = this._resolveEndpoint('openrouter.ai', '/api/v1/chat/completions');
        const raw = await this._withRetry(
          () =>
            this._dispatchPost(
              ep,
              {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
                'HTTP-Referer': 'https://github.com/Harmitx7/tribunal-kit',
                'X-Title': 'Tribunal Kit Governance Engine',
              },
              {
                model,
                max_tokens: maxTokens,
                temperature,
                messages: [{ role: 'user', content: prompt }],
              },
              timeoutMs,
              signal,
            ),
          retries,
          signal,
        );

        const json = JSON.parse(raw);
        if (json.error) {
          throw new Error(json.error.message || JSON.stringify(json.error));
        }
        const text = json?.choices?.[0]?.message?.content || null;
        const inTok =
          typeof json?.usage?.prompt_tokens === 'number' ? json.usage.prompt_tokens : 'UNAVAILABLE';
        const outTok =
          typeof json?.usage?.completion_tokens === 'number'
            ? json.usage.completion_tokens
            : 'UNAVAILABLE';
        const totTok =
          inTok !== 'UNAVAILABLE' && outTok !== 'UNAVAILABLE' ? inTok + outTok : 'UNAVAILABLE';

        return {
          text,
          provider: 'openrouter',
          model,
          inputTokens: inTok,
          outputTokens: outTok,
          totalTokens: totTok,
          latencyMs: Date.now() - start,
          error: null,
        };
      } catch (err) {
        return {
          text: null,
          provider: 'openrouter',
          model,
          inputTokens: 'UNAVAILABLE',
          outputTokens: 'UNAVAILABLE',
          totalTokens: 'UNAVAILABLE',
          latencyMs: Date.now() - start,
          error: sanitizeError(err),
        };
      }
    }

    // 5. Gemini REST API Execution
    if (this.provider === 'gemini') {
      if (!this.apiKey) {
        return {
          text: null,
          provider: 'gemini',
          model,
          inputTokens: 'UNAVAILABLE',
          outputTokens: 'UNAVAILABLE',
          totalTokens: 'UNAVAILABLE',
          latencyMs: Date.now() - start,
          error: 'MISSING_API_KEY: GEMINI_API_KEY environment variable is not configured.',
        };
      }
      try {
        const geminiPath = `/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
        const geminiPayload = {
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            responseMimeType: 'application/json',
          },
        };

        const ep = this._resolveEndpoint('generativelanguage.googleapis.com', geminiPath);
        const raw = await this._withRetry(
          () =>
            this._dispatchPost(
              ep,
              { 'Content-Type': 'application/json' },
              geminiPayload,
              timeoutMs,
              signal,
            ),
          retries,
          signal,
        );

        const json = JSON.parse(raw);
        if (json.error) {
          throw new Error(json.error.message || JSON.stringify(json.error));
        }

        const candidate = json?.candidates?.[0];
        const partText = candidate?.content?.parts?.[0]?.text || null;

        const usage = json?.usageMetadata;
        const inTok =
          typeof usage?.promptTokenCount === 'number' ? usage.promptTokenCount : 'UNAVAILABLE';
        const outTok =
          typeof usage?.candidatesTokenCount === 'number'
            ? usage.candidatesTokenCount
            : 'UNAVAILABLE';
        const totTok =
          typeof usage?.totalTokenCount === 'number'
            ? usage.totalTokenCount
            : inTok !== 'UNAVAILABLE' && outTok !== 'UNAVAILABLE'
              ? inTok + outTok
              : 'UNAVAILABLE';

        return {
          text: partText,
          provider: 'gemini',
          model,
          inputTokens: inTok,
          outputTokens: outTok,
          totalTokens: totTok,
          latencyMs: Date.now() - start,
          error: null,
        };
      } catch (err) {
        return {
          text: null,
          provider: 'gemini',
          model,
          inputTokens: 'UNAVAILABLE',
          outputTokens: 'UNAVAILABLE',
          totalTokens: 'UNAVAILABLE',
          latencyMs: Date.now() - start,
          error: sanitizeError(err),
        };
      }
    }

    // 6. Local / Ollama / vLLM HTTP Execution
    if (this.provider === 'local' || this.provider === 'ollama' || this.provider === 'vllm') {
      const defaultUrl =
        this.provider === 'vllm' ? 'http://localhost:8000' : 'http://localhost:11434';
      const rawBaseUrl = this.baseUrl || defaultUrl;

      try {
        const parsedUrl = new URL(rawBaseUrl);
        const protocol = parsedUrl.protocol;
        const hostname = parsedUrl.hostname;
        const port = parsedUrl.port || (protocol === 'https:' ? 443 : 80);

        let endpointPath = parsedUrl.pathname;
        if (!endpointPath.endsWith('/chat/completions')) {
          if (endpointPath.endsWith('/')) {
            endpointPath += 'v1/chat/completions';
          } else {
            endpointPath += '/v1/chat/completions';
          }
        }

        const headers = {
          'Content-Type': 'application/json',
        };
        if (this.apiKey) {
          headers['Authorization'] = `Bearer ${this.apiKey}`;
        }

        const payload = {
          model,
          max_tokens: maxTokens,
          temperature,
          messages: [{ role: 'user', content: prompt }],
          format: 'json',
          response_format: { type: 'json_object' },
        };

        const res = await this._withRetry(
          async () => {
            const resp = await sendHttpRequest({
              protocol,
              hostname,
              port,
              path: endpointPath,
              headers,
              body: payload,
              timeoutMs,
              signal,
            });

            if (resp.statusCode >= 400) {
              const err = new Error(`LOCAL_HTTP_${resp.statusCode}: ${resp.data}`);
              err.statusCode = resp.statusCode;
              err.responseBody = resp.data;
              throw err;
            }
            return resp.data;
          },
          retries,
          signal,
        );

        const json = JSON.parse(res);
        if (json.error) {
          throw new Error(json.error.message || JSON.stringify(json.error));
        }

        const text = json?.choices?.[0]?.message?.content || json?.message?.content || null;
        const inTok =
          typeof json?.usage?.prompt_tokens === 'number' ? json.usage.prompt_tokens : 'UNAVAILABLE';
        const outTok =
          typeof json?.usage?.completion_tokens === 'number'
            ? json.usage.completion_tokens
            : 'UNAVAILABLE';
        const totTok =
          inTok !== 'UNAVAILABLE' && outTok !== 'UNAVAILABLE' ? inTok + outTok : 'UNAVAILABLE';

        return {
          text,
          provider: this.provider,
          model,
          inputTokens: inTok,
          outputTokens: outTok,
          totalTokens: totTok,
          latencyMs: Date.now() - start,
          error: null,
        };
      } catch (err) {
        return {
          text: null,
          provider: this.provider,
          model,
          inputTokens: 'UNAVAILABLE',
          outputTokens: 'UNAVAILABLE',
          totalTokens: 'UNAVAILABLE',
          latencyMs: Date.now() - start,
          error: sanitizeError(err),
        };
      }
    }

    return {
      text: null,
      provider: this.provider,
      model,
      inputTokens: 'UNAVAILABLE',
      outputTokens: 'UNAVAILABLE',
      totalTokens: 'UNAVAILABLE',
      latencyMs: Date.now() - start,
      error: `UNSUPPORTED_PROVIDER: Provider "${this.provider}" is not recognized.`,
    };
  }
}

module.exports = {
  ProviderAdapter,
  detectDefaultProvider,
  httpsPost,
  sendHttpRequest,
  scrubSecrets,
  isTransientError,
};
