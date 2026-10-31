'use strict';

/**
 * Tribunal-Kit Centralized Host & Capability Resolution Engine (Phase 9)
 *
 * Implements deterministic 4-tier capability resolution across all supported
 * AI coding environments, IDEs, CLI sessions, and MCP consumers.
 *
 * Tiers:
 * 1. Explicit caller options (options.environment, options.host, flags)
 * 2. Verified integration context (options.isMcp, options.isCi, etc.)
 * 3. Reliable runtime signals (environment variables, TTY state)
 * 4. Safe default fallbacks (Markdown for chat, PlainText for piped streams)
 */

const { ENVIRONMENTS } = require('./types');

let tuiTheme = null;
try {
  tuiTheme = require('../tui/theme');
} catch {
  // Graceful fallback if theme is unresolvable
}

/**
 * Authoritative registry of supported host environments.
 */
const HOSTS = Object.freeze({
  ANTIGRAVITY: 'antigravity',
  CLAUDE_CODE: 'claude_code',
  CURSOR: 'cursor',
  WINDSURF: 'windsurf',
  COPILOT: 'copilot',
  CODEX: 'codex',
  CLI_INTERACTIVE: 'cli_interactive',
  CLI_PIPED: 'cli_piped',
  CI: 'ci',
  MCP: 'mcp',
  UNKNOWN: 'unknown',
});

/**
 * Baseline capability profiles by host.
 */
const BASE_HOST_CAPABILITIES = Object.freeze({
  [HOSTS.ANTIGRAVITY]: Object.freeze({
    supportsColor: false,
    supportsAnsi: false,
    supportsMarkdown: true,
    supportsHtml: true, // Supports <details> progressive disclosure
    supportsUnicode: true,
    supportsInteractiveProgress: false,
    supportsStreamingTelemetry: true,
    maxRecommendedWidth: 80,
    defaultEnvironment: ENVIRONMENTS.MARKDOWN,
  }),
  [HOSTS.CLAUDE_CODE]: Object.freeze({
    supportsColor: true,
    supportsAnsi: true,
    supportsMarkdown: true,
    supportsHtml: false, // Claude Code renders markdown lists cleanly, not raw HTML details
    supportsUnicode: true,
    supportsInteractiveProgress: false, // Runs in tool subshells
    supportsStreamingTelemetry: false,
    maxRecommendedWidth: 80,
    defaultEnvironment: ENVIRONMENTS.MARKDOWN,
  }),
  [HOSTS.CURSOR]: Object.freeze({
    supportsColor: false,
    supportsAnsi: false,
    supportsMarkdown: true,
    supportsHtml: true,
    supportsUnicode: true,
    supportsInteractiveProgress: false,
    supportsStreamingTelemetry: true,
    maxRecommendedWidth: 60, // Narrow sidebar adaptation
    defaultEnvironment: ENVIRONMENTS.MARKDOWN,
  }),
  [HOSTS.WINDSURF]: Object.freeze({
    supportsColor: false,
    supportsAnsi: false,
    supportsMarkdown: true,
    supportsHtml: true,
    supportsUnicode: true,
    supportsInteractiveProgress: false,
    supportsStreamingTelemetry: true,
    maxRecommendedWidth: 70,
    defaultEnvironment: ENVIRONMENTS.MARKDOWN,
  }),
  [HOSTS.COPILOT]: Object.freeze({
    supportsColor: false,
    supportsAnsi: false,
    supportsMarkdown: true,
    supportsHtml: false,
    supportsUnicode: true,
    supportsInteractiveProgress: false,
    supportsStreamingTelemetry: false,
    maxRecommendedWidth: 75,
    defaultEnvironment: ENVIRONMENTS.MARKDOWN,
  }),
  [HOSTS.CODEX]: Object.freeze({
    supportsColor: false,
    supportsAnsi: false,
    supportsMarkdown: true,
    supportsHtml: false,
    supportsUnicode: true,
    supportsInteractiveProgress: false,
    supportsStreamingTelemetry: false,
    maxRecommendedWidth: 80,
    defaultEnvironment: ENVIRONMENTS.MARKDOWN,
  }),
  [HOSTS.CLI_INTERACTIVE]: Object.freeze({
    supportsColor: true,
    supportsAnsi: true,
    supportsMarkdown: false,
    supportsHtml: false,
    supportsUnicode: true,
    supportsInteractiveProgress: true,
    supportsStreamingTelemetry: true,
    maxRecommendedWidth: 100,
    defaultEnvironment: ENVIRONMENTS.TERMINAL,
  }),
  [HOSTS.CLI_PIPED]: Object.freeze({
    supportsColor: false,
    supportsAnsi: false,
    supportsMarkdown: false,
    supportsHtml: false,
    supportsUnicode: true,
    supportsInteractiveProgress: false,
    supportsStreamingTelemetry: false,
    maxRecommendedWidth: 80,
    defaultEnvironment: ENVIRONMENTS.PLAINTEXT,
  }),
  [HOSTS.CI]: Object.freeze({
    supportsColor: false,
    supportsAnsi: false,
    supportsMarkdown: false,
    supportsHtml: false,
    supportsUnicode: false, // Safe ASCII tokens
    supportsInteractiveProgress: false,
    supportsStreamingTelemetry: false,
    maxRecommendedWidth: 80,
    defaultEnvironment: ENVIRONMENTS.PLAINTEXT,
  }),
  [HOSTS.MCP]: Object.freeze({
    supportsColor: false,
    supportsAnsi: false,
    supportsMarkdown: false,
    supportsHtml: false,
    supportsUnicode: true,
    supportsInteractiveProgress: false,
    supportsStreamingTelemetry: false,
    maxRecommendedWidth: 120,
    defaultEnvironment: ENVIRONMENTS.STRUCTURED,
  }),
  [HOSTS.UNKNOWN]: Object.freeze({
    supportsColor: false,
    supportsAnsi: false,
    supportsMarkdown: true,
    supportsHtml: false,
    supportsUnicode: true,
    supportsInteractiveProgress: false,
    supportsStreamingTelemetry: false,
    maxRecommendedWidth: 80,
    defaultEnvironment: ENVIRONMENTS.MARKDOWN,
  }),
});


/**
 * Deterministically resolves the current host environment using 4-tier precedence.
 *
 * @param {Object} [options]
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string} One of HOSTS enum values
 */
function detectHost(options = {}, env = process.env) {
  // Tier 1: Explicit configuration
  if (options.host && Object.values(HOSTS).includes(options.host)) {
    return options.host;
  }
  if (env.TRIBUNAL_HOST && Object.values(HOSTS).includes(env.TRIBUNAL_HOST.toLowerCase())) {
    return env.TRIBUNAL_HOST.toLowerCase();
  }

  // Tier 2: Verified integration context
  if (options.isMcp || env.TRIBUNAL_MCP === '1') {
    return HOSTS.MCP;
  }
  if (options.isCi || env.CI === 'true' || env.CI === '1' || env.GITHUB_ACTIONS || env.GITLAB_CI) {
    return HOSTS.CI;
  }

  // Tier 3: Reliable runtime signals
  if (env.ANTIGRAVITY_SESSION || env.GEMINI_CLI) {
    return HOSTS.ANTIGRAVITY;
  }
  if (env.CLAUDE_CODE || env.CLAUDE_PROJECT_DIR) {
    return HOSTS.CLAUDE_CODE;
  }
  if (env.CURSOR_AGENT || env.CURSOR_TRACE || env.CURSOR_VERSION) {
    return HOSTS.CURSOR;
  }
  if (env.WINDSURF_SESSION || env.CASCADE_SESSION) {
    return HOSTS.WINDSURF;
  }
  if (env.GITHUB_COPILOT || env.COPILOT_AGENT) {
    return HOSTS.COPILOT;
  }
  if (env.CODEX_SESSION) {
    return HOSTS.CODEX;
  }

  // Check stdout stream properties
  const isTTY = Boolean(process.stdout && process.stdout.isTTY);
  if (!isTTY) {
    return HOSTS.CLI_PIPED;
  }
  if (isTTY) {
    return HOSTS.CLI_INTERACTIVE;
  }

  // Tier 4: Unknown fallback
  return HOSTS.UNKNOWN;
}

/**
 * Retrieves the resolved capability profile for a given host or from detected environment.
 *
 * @param {string} [host]
 * @param {Object} [options]
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {Object} Frozen capability record
 */
function getHostCapabilities(host, options = {}, env = process.env) {
  const resolvedHost = host || detectHost(options, env);
  const base = BASE_HOST_CAPABILITIES[resolvedHost] || BASE_HOST_CAPABILITIES[HOSTS.UNKNOWN];

  const hasColorEnv = !env.NO_COLOR && (env.FORCE_COLOR !== undefined ? env.FORCE_COLOR !== '0' : base.supportsColor);
  const isUtf = options.ascii ? false : (tuiTheme ? tuiTheme.isUtf8 : base.supportsUnicode);

  const capabilities = {
    ...base,
    host: resolvedHost,
    supportsColor: Boolean(options.color !== undefined ? options.color : hasColorEnv),
    supportsAnsi: Boolean(options.ansi !== undefined ? options.ansi : hasColorEnv),
    supportsHtml: Boolean(options.allowHtml !== undefined ? options.allowHtml : base.supportsHtml),
    supportsUnicode: Boolean(isUtf),
  };

  // If NO_COLOR is explicitly set, strip color and ANSI support
  if (env.NO_COLOR) {
    capabilities.supportsColor = false;
    capabilities.supportsAnsi = false;
  }

  return Object.freeze(capabilities);
}

/**
 * Resolves the appropriate rendering environment according to precedence.
 *
 * @param {Object} [options]
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string} One of ENVIRONMENTS enum values
 */
function resolveEnvironment(options = {}, env = process.env) {
  // Tier 1: Explicit options
  if (options.environment && Object.values(ENVIRONMENTS).includes(options.environment)) {
    return options.environment;
  }
  if (options.json) {
    return ENVIRONMENTS.JSON;
  }
  if (options.terminal) {
    return ENVIRONMENTS.TERMINAL;
  }
  if (options.plain) {
    return ENVIRONMENTS.PLAINTEXT;
  }
  if (options.markdown) {
    return ENVIRONMENTS.MARKDOWN;
  }

  // Explicit env var
  if (env.TRIBUNAL_ENV && Object.values(ENVIRONMENTS).includes(env.TRIBUNAL_ENV.toLowerCase())) {
    return env.TRIBUNAL_ENV.toLowerCase();
  }

  // Tier 2 & 3: Inferred from resolved host
  const caps = getHostCapabilities(null, options, env);
  return caps.defaultEnvironment || ENVIRONMENTS.MARKDOWN;
}

module.exports = {
  HOSTS,
  BASE_HOST_CAPABILITIES,
  detectHost,
  getHostCapabilities,
  resolveEnvironment,
};

