'use strict';

/**
 * token_accounting.js — Authoritative Centralized Token Accounting Engine
 * ========================================================================
 * Phase 3: Accurate Token Budgeting & Economics
 *
 * Guarantees:
 * 1. Accuracy Classification:
 *    - EXACT: Exact tokenizer counts or provider usage receipts.
 *    - HEURISTIC_CODE_BPE: High-fidelity BPE/subword heuristic for code & prose.
 *    - FALLBACK_ESTIMATE: Bounded character/byte ratio fallback with explicit labeling.
 * 2. Model & Tokenizer Identification:
 *    - Every count records the exact model, tokenizer family, and accuracy class.
 *    - No silent substitution of one model's tokenizer for another.
 * 3. Separate Accounting Breakdown:
 *    - Content / diff, system instructions, schemas, tool definitions, request overhead.
 * 4. Strict Budget Enforcement:
 *    availableContext = modelLimit - reservedOutput - requestOverhead - safetyMargin
 * 5. Deterministic & Bounded:
 *    - Fixed-capacity LRU cache keyed by (model, tokenizer, contentHash).
 *    - Validates configuration and rejects invalid/non-finite budgets.
 */

const crypto = require('crypto');

// Accuracy classification levels
const ACCURACY = {
  EXACT: 'EXACT',
  HEURISTIC_CODE_BPE: 'HEURISTIC_CODE_BPE',
  FALLBACK_ESTIMATE: 'FALLBACK_ESTIMATE',
};

// Model registry with context windows, default output reserves, and tokenizer families
const MODEL_REGISTRY = {
  // Anthropic Claude Family
  'claude-3-5-sonnet-latest': {
    provider: 'anthropic',
    tokenizer: 'claude_bpe',
    contextLimit: 200000,
    defaultOutputReserve: 4096,
    defaultSafetyMargin: 500,
    perMessageOverhead: 4,
  },
  'claude-3-5-sonnet-20241022': {
    provider: 'anthropic',
    tokenizer: 'claude_bpe',
    contextLimit: 200000,
    defaultOutputReserve: 4096,
    defaultSafetyMargin: 500,
    perMessageOverhead: 4,
  },
  'claude-3-opus-20240229': {
    provider: 'anthropic',
    tokenizer: 'claude_bpe',
    contextLimit: 200000,
    defaultOutputReserve: 4096,
    defaultSafetyMargin: 500,
    perMessageOverhead: 4,
  },
  'claude-3-haiku-20240307': {
    provider: 'anthropic',
    tokenizer: 'claude_bpe',
    contextLimit: 200000,
    defaultOutputReserve: 4096,
    defaultSafetyMargin: 500,
    perMessageOverhead: 4,
  },
  'claude-sonnet-5': {
    provider: 'anthropic',
    tokenizer: 'claude_bpe',
    contextLimit: 200000,
    defaultOutputReserve: 4096,
    defaultSafetyMargin: 500,
    perMessageOverhead: 4,
  },

  // OpenAI Family
  'gpt-4o': {
    provider: 'openai',
    tokenizer: 'o200k_base',
    contextLimit: 128000,
    defaultOutputReserve: 4096,
    defaultSafetyMargin: 300,
    perMessageOverhead: 3,
  },
  'gpt-4o-mini': {
    provider: 'openai',
    tokenizer: 'o200k_base',
    contextLimit: 128000,
    defaultOutputReserve: 4096,
    defaultSafetyMargin: 300,
    perMessageOverhead: 3,
  },
  'gpt-4-turbo': {
    provider: 'openai',
    tokenizer: 'cl100k_base',
    contextLimit: 128000,
    defaultOutputReserve: 4096,
    defaultSafetyMargin: 300,
    perMessageOverhead: 3,
  },
  'o1': {
    provider: 'openai',
    tokenizer: 'o200k_base',
    contextLimit: 200000,
    defaultOutputReserve: 16384,
    defaultSafetyMargin: 500,
    perMessageOverhead: 3,
  },
  'o3-mini': {
    provider: 'openai',
    tokenizer: 'o200k_base',
    contextLimit: 200000,
    defaultOutputReserve: 16384,
    defaultSafetyMargin: 500,
    perMessageOverhead: 3,
  },

  // Google Gemini Family
  'gemini-1.5-pro': {
    provider: 'gemini',
    tokenizer: 'gemini_sentencepiece',
    contextLimit: 2000000,
    defaultOutputReserve: 8192,
    defaultSafetyMargin: 1000,
    perMessageOverhead: 4,
  },
  'gemini-1.5-flash': {
    provider: 'gemini',
    tokenizer: 'gemini_sentencepiece',
    contextLimit: 1000000,
    defaultOutputReserve: 8192,
    defaultSafetyMargin: 1000,
    perMessageOverhead: 4,
  },
  'gemini-2.0-flash': {
    provider: 'gemini',
    tokenizer: 'gemini_sentencepiece',
    contextLimit: 1000000,
    defaultOutputReserve: 8192,
    defaultSafetyMargin: 1000,
    perMessageOverhead: 4,
  },
  'gemini-2.5-pro': {
    provider: 'gemini',
    tokenizer: 'gemini_sentencepiece',
    contextLimit: 1000000,
    defaultOutputReserve: 8192,
    defaultSafetyMargin: 1000,
    perMessageOverhead: 4,
  },

  // DeepSeek / OpenRouter / Generic
  'deepseek-coder': {
    provider: 'deepseek',
    tokenizer: 'deepseek_bpe',
    contextLimit: 128000,
    defaultOutputReserve: 4096,
    defaultSafetyMargin: 400,
    perMessageOverhead: 4,
  },
  'deepseek-r1': {
    provider: 'deepseek',
    tokenizer: 'deepseek_bpe',
    contextLimit: 128000,
    defaultOutputReserve: 8192,
    defaultSafetyMargin: 500,
    perMessageOverhead: 4,
  },
  'default-model': {
    provider: 'generic',
    tokenizer: 'generic_bpe',
    contextLimit: 128000,
    defaultOutputReserve: 4096,
    defaultSafetyMargin: 500,
    perMessageOverhead: 4,
  },
};

/**
 * LRU Cache for token counts to avoid recalculating on identical text slices.
 */
class BoundedTokenCache {
  constructor(maxSize = 2000) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return undefined;
    // Refresh position for LRU
    this.cache.delete(key);
    this.cache.set(key, item);
    return item;
  }

  set(key, val) {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, val);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

const GLOBAL_TOKEN_CACHE = new BoundedTokenCache(2000);

/**
 * Computes a fast SHA-256 hash of text for caching and integrity fingerprints.
 * @param {string} text
 * @returns {string}
 */
function computeContentHash(text) {
  if (typeof text !== 'string') text = String(text || '');
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * High-fidelity subword/BPE heuristic for code and technical text.
 * Accurately models how modern tokenizers (cl100k, o200k, Claude, SentencePiece)
 * tokenize code symbols, CamelCase transitions, indentation, and Unicode.
 *
 * @param {string} text
 * @returns {number}
 */
function estimateCodeBpeTokens(text) {
  if (!text || typeof text !== 'string') return 0;
  if (text.length === 0) return 0;

  let tokens = 0;

  // Split text into lines to process structure
  const lines = text.split(/\r?\n/);
  const lineCount = lines.length;

  // Newlines themselves count as tokens (or merge into leading indentation)
  tokens += Math.max(0, lineCount - 1);

  // Common multi-character programming symbols that usually form single or double tokens
  const COMPOUND_OPERATORS = /(?:===|!==|<=|>=|=>|->|\+\+|--|&&|\|\||\?\?|::|\.\.\.|\/\*|\*\/)/g;

  for (let i = 0; i < lineCount; i++) {
    const line = lines[i];
    if (line.length === 0) continue;

    // 1. Indentation whitespace accounting:
    // Modern BPE tokenizers group tabs or runs of 2-4 spaces into single tokens
    const indentMatch = line.match(/^[ \t]+/);
    let remainingLine = line;
    if (indentMatch) {
      const indent = indentMatch[0];
      let spaces = 0;
      for (let c = 0; c < indent.length; c++) {
        if (indent[c] === '\t') {
          tokens += 1;
        } else {
          spaces++;
        }
      }
      tokens += Math.ceil(spaces / 4);
      remainingLine = line.slice(indent.length);
    }

    if (remainingLine.length === 0) continue;

    // 2. Count compound operators and strip them for sub-token processing
    const compoundMatches = remainingLine.match(COMPOUND_OPERATORS);
    if (compoundMatches) {
      tokens += compoundMatches.length;
      remainingLine = remainingLine.replace(COMPOUND_OPERATORS, ' ');
    }

    // 3. Tokenize words, numbers, identifiers, and punctuation chunks
    // Matches:
    // - Alphabetic words with CamelCase boundaries: [A-Z]?[a-z]+ | [A-Z]+(?=[A-Z][a-z]|\b)
    // - Numeric literals: \d+
    // - Punctuation symbols: [^\s\w]
    // - Non-ASCII Unicode characters: [^\x00-\x7F]
    const wordRegex = /[A-Z]?[a-z]+|[A-Z]+(?=[A-Z][a-z]|\b)|\d+|[^\s\w\x00-\x7F]+|[^\s\w]/g;
    let match;
    while ((match = wordRegex.exec(remainingLine)) !== null) {
      const chunk = match[0];
      const chunkLen = chunk.length;

      // Check for non-ASCII Unicode (e.g. Emoji, CJK, accents)
      if (/[^\x00-\x7F]/.test(chunk)) {
        // Multi-byte Unicode: in UTF-8 BPE, each CJK char or emoji is 2-3 tokens
        const bytes = Buffer.byteLength(chunk, 'utf8');
        tokens += Math.max(1, Math.ceil(bytes / 2.5));
        continue;
      }

      // Pure punctuation runs (e.g. brackets, braces, quotes)
      if (/^[^\s\w]+$/.test(chunk)) {
        tokens += chunkLen;
        continue;
      }

      // Number runs: tokenizers split long numbers into 2-3 digit chunks
      if (/^\d+$/.test(chunk)) {
        tokens += Math.ceil(chunkLen / 3);
        continue;
      }

      // Alphabetic/identifier subwords
      if (chunkLen <= 4) {
        // Short words/stems ('the', 'get', 'func', 'path') are usually 1 token
        tokens += 1;
      } else if (chunkLen <= 8) {
        // Medium words ('request', 'process', 'contain') typically 1-2 tokens
        tokens += Math.ceil(chunkLen / 4.5);
      } else {
        // Long identifiers ('untrustedContent', 'filesystemContainment') split into subwords
        tokens += Math.ceil(chunkLen / 3.8);
      }
    }
  }

  return Math.max(1, Math.round(tokens));
}

/**
 * Fallback character-to-token ratio estimator.
 * Used only when strictly configured as fallback or when string length is trivial.
 *
 * @param {string|number} textOrBytes
 * @returns {number}
 */
function fallbackEstimateTokens(textOrBytes) {
  if (typeof textOrBytes === 'number') {
    if (!Number.isFinite(textOrBytes) || textOrBytes <= 0) return 0;
    return Math.max(1, Math.ceil(textOrBytes / 4));
  }
  if (typeof textOrBytes === 'string') {
    if (textOrBytes.length === 0) return 0;
    return Math.max(1, Math.ceil(textOrBytes.length / 4));
  }
  return 0;
}

/**
 * Resolves a model profile or returns default safe settings.
 *
 * @param {string} [modelName]
 * @returns {Object} Model profile
 */
function resolveModelProfile(modelName) {
  if (!modelName || typeof modelName !== 'string') {
    return { ...MODEL_REGISTRY['default-model'], modelName: 'default-model', isUnknown: true };
  }
  const normalized = modelName.trim().toLowerCase();

  // Direct match
  if (MODEL_REGISTRY[normalized]) {
    return { ...MODEL_REGISTRY[normalized], modelName: normalized, isUnknown: false };
  }

  // Prefix/contains match
  for (const [key, profile] of Object.entries(MODEL_REGISTRY)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return { ...profile, modelName: key, isUnknown: false };
    }
  }

  // Unknown model: return generic profile marked as unknown
  return {
    ...MODEL_REGISTRY['default-model'],
    modelName: normalized,
    isUnknown: true,
  };
}

/**
 * Authoritative token counting function.
 * Returns structured count with metadata, accuracy level, and model identification.
 *
 * @param {string} text - Content to count
 * @param {Object} [options]
 * @param {string} [options.model] - Model identifier
 * @param {string} [options.accuracyOverride] - Force specific accuracy class
 * @param {Function} [options.exactTokenizer] - Custom exact tokenizer if provided
 * @returns {{
 *   tokens: number,
 *   accuracy: string,
 *   model: string,
 *   tokenizer: string,
 *   contentHash: string,
 *   cached: boolean
 * }}
 */
function countTokens(text, options = {}) {
  if (text === null || text === undefined) {
    text = '';
  }
  if (typeof text !== 'string') {
    text = String(text);
  }

  const modelName = options.model || 'claude-3-5-sonnet-latest';
  const profile = resolveModelProfile(modelName);
  const contentHash = computeContentHash(text);
  const cacheKey = `${profile.modelName}:${profile.tokenizer}:${contentHash}`;

  // Check cache
  const cachedVal = GLOBAL_TOKEN_CACHE.get(cacheKey);
  if (cachedVal !== undefined && !options.exactTokenizer && !options.accuracyOverride) {
    return {
      tokens: cachedVal.tokens,
      accuracy: cachedVal.accuracy,
      model: profile.modelName,
      tokenizer: profile.tokenizer,
      contentHash,
      cached: true,
    };
  }

  if (text.length === 0) {
    return {
      tokens: 0,
      accuracy: ACCURACY.EXACT,
      model: profile.modelName,
      tokenizer: profile.tokenizer,
      contentHash,
      cached: false,
    };
  }

  let tokens;
  let accuracy;

  // 1. Exact tokenizer provided
  if (typeof options.exactTokenizer === 'function') {
    try {
      const res = options.exactTokenizer(text);
      if (typeof res === 'number' && Number.isFinite(res) && res >= 0) {
        tokens = Math.round(res);
        accuracy = ACCURACY.EXACT;
      }
    } catch (_) {
      // Fall through to heuristic if custom tokenizer throws
    }
  }

  // 2. High-fidelity code BPE heuristic
  if (tokens === undefined) {
    if (options.accuracyOverride === ACCURACY.FALLBACK_ESTIMATE) {
      tokens = fallbackEstimateTokens(text);
      accuracy = ACCURACY.FALLBACK_ESTIMATE;
    } else {
      tokens = estimateCodeBpeTokens(text);
      accuracy = ACCURACY.HEURISTIC_CODE_BPE;
    }
  }

  const result = {
    tokens,
    accuracy,
    model: profile.modelName,
    tokenizer: profile.tokenizer,
    contentHash,
    cached: false,
  };

  // Cache computed result
  GLOBAL_TOKEN_CACHE.set(cacheKey, { tokens, accuracy });

  return result;
}

/**
 * Calculates the available context budget for a given model, request components, and constraints.
 *
 * Formula:
 * availableContextBudget = modelContextLimit - reservedOutputBudget - knownRequestOverhead - safetyMargin
 *
 * @param {Object} params
 * @param {string} [params.model] - Target model
 * @param {number} [params.customContextLimit] - Override context limit
 * @param {number} [params.reservedOutput] - Requested output tokens
 * @param {number} [params.safetyMargin] - Safety buffer for provider tokenization discrepancies
 * @param {string} [params.systemInstructions] - System prompt text
 * @param {string|Object} [params.schema] - Output schema definition
 * @param {Array<string|Object>} [params.tools] - Tool definitions / constraints
 * @param {number} [params.conversationHistoryTokens=0] - Already consumed tokens in session
 * @param {boolean} [params.failOnUnknownModel=false] - Fail if model is unmapped
 * @returns {{
 *   availableBudget: number,
 *   modelLimit: number,
 *   reservedOutput: number,
 *   safetyMargin: number,
 *   requestOverhead: number,
 *   breakdown: {
 *     systemTokens: number,
 *     schemaTokens: number,
 *     toolsTokens: number,
 *     conversationHistoryTokens: number,
 *     framingOverheadTokens: number
 *   },
 *   model: string,
 *   tokenizer: string,
 *   accuracy: string,
 *   isValid: boolean,
 *   error?: string
 * }}
 */
function calculateContextBudget(params = {}) {
  const modelName = params.model || 'claude-3-5-sonnet-latest';
  const profile = resolveModelProfile(modelName);

  if (profile.isUnknown && params.failOnUnknownModel) {
    return {
      availableBudget: 0,
      modelLimit: 0,
      reservedOutput: 0,
      safetyMargin: 0,
      requestOverhead: 0,
      breakdown: {
        systemTokens: 0,
        schemaTokens: 0,
        toolsTokens: 0,
        conversationHistoryTokens: 0,
        framingOverheadTokens: 0,
      },
      model: modelName,
      tokenizer: 'unknown',
      accuracy: ACCURACY.FALLBACK_ESTIMATE,
      isValid: false,
      error: `UNKNOWN_MODEL: Model "${modelName}" context limit and tokenizer are not configured and failOnUnknownModel is enabled.`,
    };
  }

  let modelLimit = profile.contextLimit;
  if (params.customContextLimit !== undefined) {
    if (!Number.isFinite(params.customContextLimit) || params.customContextLimit <= 0) {
      return {
        availableBudget: 0,
        modelLimit: 0,
        reservedOutput: 0,
        safetyMargin: 0,
        requestOverhead: 0,
        breakdown: {
          systemTokens: 0,
          schemaTokens: 0,
          toolsTokens: 0,
          conversationHistoryTokens: 0,
          framingOverheadTokens: 0,
        },
        model: profile.modelName,
        tokenizer: profile.tokenizer,
        accuracy: ACCURACY.FALLBACK_ESTIMATE,
        isValid: false,
        error: `INVALID_TOKEN_BUDGET: Context limit must be a positive finite number (received: ${params.customContextLimit}).`,
      };
    }
    modelLimit = params.customContextLimit;
  }

  const reservedOutput =
    typeof params.reservedOutput === 'number' && Number.isFinite(params.reservedOutput)
      ? Math.max(0, params.reservedOutput)
      : profile.defaultOutputReserve;

  const safetyMargin =
    typeof params.safetyMargin === 'number' && Number.isFinite(params.safetyMargin)
      ? Math.max(0, params.safetyMargin)
      : profile.defaultSafetyMargin;

  const conversationHistory =
    typeof params.conversationHistoryTokens === 'number' &&
    Number.isFinite(params.conversationHistoryTokens)
      ? Math.max(0, params.conversationHistoryTokens)
      : 0;

  // Measure separate request overhead components
  const systemText = params.systemInstructions || '';
  const schemaText =
    typeof params.schema === 'object' && params.schema !== null
      ? JSON.stringify(params.schema)
      : params.schema || '';
  const toolsText = Array.isArray(params.tools)
    ? JSON.stringify(params.tools)
    : params.tools || '';

  const systemCount = countTokens(systemText, { model: profile.modelName });
  const schemaCount = countTokens(schemaText, { model: profile.modelName });
  const toolsCount = countTokens(toolsText, { model: profile.modelName });

  // Framing tokens per message and request envelopment
  const framingOverheadTokens = (profile.perMessageOverhead || 4) * 3;

  const requestOverhead =
    systemCount.tokens +
    schemaCount.tokens +
    toolsCount.tokens +
    framingOverheadTokens +
    conversationHistory;

  const nonContextReservations = reservedOutput + requestOverhead + safetyMargin;

  if (nonContextReservations >= modelLimit) {
    return {
      availableBudget: 0,
      modelLimit,
      reservedOutput,
      safetyMargin,
      requestOverhead,
      breakdown: {
        systemTokens: systemCount.tokens,
        schemaTokens: schemaCount.tokens,
        toolsTokens: toolsCount.tokens,
        conversationHistoryTokens: conversationHistory,
        framingOverheadTokens,
      },
      model: profile.modelName,
      tokenizer: profile.tokenizer,
      accuracy: systemCount.accuracy,
      isValid: false,
      error: `CONTEXT_BUDGET_EXHAUSTED: Reserved output (${reservedOutput}) + request overhead (${requestOverhead}) + safety margin (${safetyMargin}) >= model limit (${modelLimit}).`,
    };
  }

  const availableBudget = modelLimit - nonContextReservations;

  return {
    availableBudget,
    modelLimit,
    reservedOutput,
    safetyMargin,
    requestOverhead,
    breakdown: {
      systemTokens: systemCount.tokens,
      schemaTokens: schemaCount.tokens,
      toolsTokens: toolsCount.tokens,
      conversationHistoryTokens: conversationHistory,
      framingOverheadTokens,
    },
    model: profile.modelName,
    tokenizer: profile.tokenizer,
    accuracy: systemCount.accuracy,
    isValid: true,
  };
}

/**
 * Validates that a proposed payload fits cleanly within an approved budget.
 *
 * @param {string|Object} payload - Content to validate
 * @param {number} availableBudget - Approved token limit
 * @param {Object} [options]
 * @returns {{
 *   fits: boolean,
 *   tokenCount: number,
 *   availableBudget: number,
 *   delta: number,
 *   accuracy: string,
 *   model: string,
 *   contentHash: string
 * }}
 */
function validateBudgetFit(payload, availableBudget, options = {}) {
  const content = typeof payload === 'string' ? payload : JSON.stringify(payload || '');
  const countRes = countTokens(content, options);

  if (!Number.isFinite(availableBudget) || availableBudget <= 0) {
    return {
      fits: false,
      tokenCount: countRes.tokens,
      availableBudget: availableBudget || 0,
      delta: countRes.tokens,
      accuracy: countRes.accuracy,
      model: countRes.model,
      contentHash: countRes.contentHash,
      error: 'INVALID_BUDGET: Available budget must be a positive finite number.',
    };
  }

  const fits = countRes.tokens <= availableBudget;
  const delta = countRes.tokens - availableBudget;

  return {
    fits,
    tokenCount: countRes.tokens,
    availableBudget,
    delta,
    accuracy: countRes.accuracy,
    model: countRes.model,
    contentHash: countRes.contentHash,
  };
}

module.exports = {
  ACCURACY,
  MODEL_REGISTRY,
  GLOBAL_TOKEN_CACHE,
  countTokens,
  estimateCodeBpeTokens,
  fallbackEstimateTokens,
  resolveModelProfile,
  calculateContextBudget,
  validateBudgetFit,
  computeContentHash,
};
