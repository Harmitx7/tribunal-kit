'use strict';

/**
 * Tribunal-Kit Canonical Activity & State Intelligence Engine (Phase 1 - Phase 9)
 *
 * Provides the shared ActivityEvent contract, runtime validation,
 * secret-safe presentation sanitization, deterministic multi-environment
 * renderers (Markdown, Terminal, PlainText, Structured), lifecycle state machine,
 * operation registry, live progress telemetry, context-aware announcements,
 * and centralized host capability resolution.
 */

const {
  SCHEMA_VERSION,
  EVENT_TYPES,
  STATUSES,
  LIFECYCLE_STATES,
  PROGRESS_STATES,
  AGENT_SKILL_STATES,
  TOOL_STATES,
  AGGREGATION_POLICIES,
  DEFAULT_EVENT_STATUS,
  EVENT_VERBS,
  EVENT_GLYPHS,
  ASCII_GLYPHS,
  ENVIRONMENTS,
  ACTIVITY_STATES,
  ACTIVITY_VERBS,
  ACTIVITY_GLYPHS,
} = require('./types');

const {
  ActivityValidationError,
  validateActivityEvent,
  assertValidActivityEvent,
  createActivityEvent,
  normalizeProgress,
  sanitizeActivityEvent,
  redactSecrets,
  deepClone,
  generateId,
  SECRET_PATTERNS,
} = require('./schema');

const {
  IllegalStateTransitionError,
  LIFECYCLE_TRANSITIONS,
  TERMINAL_STATES,
  canTransition,
  assertValidTransition,
  isTerminalState,
  getLegalNextStates,
} = require('./lifecycle');

const {
  ActivityProgressError,
  OperationRecord,
  OperationRegistry,
  defaultRegistry,
} = require('./registry');

const {
  STATUS_TREATMENTS,
  formatProgressBar,
  formatStagePipeline,
  formatCompactPath,
  formatDisclosure,
} = require('./design_system');

const {
  ANNOUNCEMENT_DECISIONS,
  ANNOUNCEMENT_REASONS,
  AnnouncementDeduplicator,
  AnnouncementIntelligence,
  defaultAnnouncementIntelligence,
} = require('./announcement');

const { MarkdownRenderer, renderMarkdown, stripAnsi, escapeHtmlTags } = require('./renderers/markdown');
const { TerminalRenderer, renderTerminal, STATE_COLORS } = require('./renderers/terminal');
const { PlainTextRenderer, renderPlainText } = require('./renderers/plaintext');
const { StructuredRenderer, renderStructured, renderJson } = require('./renderers/structured');

const { SkillAgentResolver, CORE_AGENT_REGISTRY } = require('./resolver');
const { ActivityTracker } = require('./tracker');

const {
  TelemetryError,
  StaleEventError,
  ProgressCalculator,
  ProgressCoalescer,
  StallDetector,
  ParallelProgressAggregator,
  CRITICAL_EVENT_TYPES,
} = require('./telemetry');

const {
  HOSTS,
  BASE_HOST_CAPABILITIES,
  detectHost,
  getHostCapabilities,
  resolveEnvironment,
} = require('./environment');

const {
  DETAIL_LEVELS,
  PRIORITY_LEVELS,
  resolveDetailLevel,
  getEventPriority,
  shouldDisplayEvent,
} = require('./progressive_disclosure');

const {
  FAILURE_CATEGORIES,
  OperationDiagnosticRecord,
  DiagnosticBuffer,
  classifyFailure,
  defaultDiagnosticBuffer,
} = require('./diagnostics');

const {
  boundArray,
  boundString,
  boundObject,
} = require('./truncation');

const {
  formatDuration,
  normalizeSummaryData,
  formatCompletionSummary,
} = require('./summary');

const defaultResolver = new SkillAgentResolver();

/**
 * Master activity renderer routing to the specified environment renderer.
 * Automatically resolves environment if targetEnvironment is 'auto' or options.auto is true.
 */
function renderActivity(event, targetEnvironment = ENVIRONMENTS.MARKDOWN, options = {}) {
  let resolvedEnv = targetEnvironment;
  if (!resolvedEnv || resolvedEnv === 'auto' || options.auto) {
    resolvedEnv = resolveEnvironment(options);
  }

  const caps = options.capabilities || getHostCapabilities(options.host, options);
  const renderOpts = { capabilities: caps, ...options };

  switch (resolvedEnv) {
    case ENVIRONMENTS.TERMINAL:
      return renderTerminal(event, renderOpts);
    case ENVIRONMENTS.PLAINTEXT:
      return renderPlainText(event, renderOpts);
    case ENVIRONMENTS.STRUCTURED:
    case ENVIRONMENTS.JSON:
      return renderStructured(event, renderOpts);
    case ENVIRONMENTS.MARKDOWN:
    default:
      return renderMarkdown(event, renderOpts);
  }
}

/**
 * Convenience formatter for an event object or partial event.
 */
function formatActivity(eventOrPartial, targetEnvironment = ENVIRONMENTS.MARKDOWN, options = {}) {
  if (!eventOrPartial || typeof eventOrPartial !== 'object') {
    return renderActivity(
      { eventType: EVENT_TYPES.OPERATION_STARTED, title: String(eventOrPartial || 'Unknown Event') },
      targetEnvironment,
      options,
    );
  }
  const event = eventOrPartial.eventId ? eventOrPartial : createActivityEvent(eventOrPartial);
  return renderActivity(event, targetEnvironment, options);
}

/**
 * Generates an agent activation announcement.
 */
function announceAgent(agentName, context = '', targetEnvironment = ENVIRONMENTS.MARKDOWN, options = {}) {
  const event = defaultResolver.createAgentActivationEvent(agentName, context);
  return formatActivity(event, targetEnvironment, options);
}

/**
 * Generates a skill application announcement.
 */
function announceSkill(skillName, context = '', targetEnvironment = ENVIRONMENTS.MARKDOWN, options = {}) {
  const event = defaultResolver.createSkillActivationEvent(skillName, context);
  return formatActivity(event, targetEnvironment, options);
}

module.exports = {
  // Constants & Enums
  SCHEMA_VERSION,
  EVENT_TYPES,
  STATUSES,
  LIFECYCLE_STATES,
  PROGRESS_STATES,
  AGENT_SKILL_STATES,
  TOOL_STATES,
  AGGREGATION_POLICIES,
  DEFAULT_EVENT_STATUS,
  EVENT_VERBS,
  EVENT_GLYPHS,
  ASCII_GLYPHS,
  ENVIRONMENTS,
  ACTIVITY_STATES,
  ACTIVITY_VERBS,
  ACTIVITY_GLYPHS,

  // Contract & Validation
  ActivityValidationError,
  validateActivityEvent,
  assertValidActivityEvent,
  createActivityEvent,
  createEvent: createActivityEvent,
  normalizeProgress,
  sanitizeActivityEvent,
  redactSecrets,
  deepClone,
  generateId,
  SECRET_PATTERNS,

  // Lifecycle State Machine (Phase 2)
  IllegalStateTransitionError,
  LIFECYCLE_TRANSITIONS,
  TERMINAL_STATES,
  canTransition,
  assertValidTransition,
  isTerminalState,
  getLegalNextStates,

  // Operation Registry & Records (Phase 2)
  ActivityProgressError,
  OperationRecord,
  OperationRegistry,
  defaultRegistry,

  // Design System & Presentation (Phase 3)
  STATUS_TREATMENTS,
  formatProgressBar,
  formatStagePipeline,
  formatCompactPath,
  formatDisclosure,

  // Renderers (Classes and Functions)
  MarkdownRenderer,
  renderMarkdown,
  stripAnsi,
  escapeHtmlTags,
  TerminalRenderer,
  renderTerminal,
  STATE_COLORS,
  PlainTextRenderer,
  renderPlainText,
  StructuredRenderer,
  renderStructured,
  renderJson,
  renderActivity,

  // Resolvers & Trackers
  SkillAgentResolver,
  CORE_AGENT_REGISTRY,
  ActivityTracker,

  // Announcement Intelligence (Phase 4)
  ANNOUNCEMENT_DECISIONS,
  ANNOUNCEMENT_REASONS,
  AnnouncementDeduplicator,
  AnnouncementIntelligence,
  defaultAnnouncementIntelligence,

  // Live Progress & Telemetry Engine (Phase 5)
  PROGRESS_STATES,
  AGGREGATION_POLICIES,
  TelemetryError,
  StaleEventError,
  ProgressCalculator,
  ProgressCoalescer,
  StallDetector,
  ParallelProgressAggregator,
  CRITICAL_EVENT_TYPES,

  // Host Capability & Environment Resolution (Phase 9)
  HOSTS,
  BASE_HOST_CAPABILITIES,
  detectHost,
  getHostCapabilities,
  resolveEnvironment,

  // Progressive Disclosure & Priority (Phase 10)
  DETAIL_LEVELS,
  PRIORITY_LEVELS,
  resolveDetailLevel,
  getEventPriority,
  shouldDisplayEvent,

  // Diagnostic Retention & Intelligence (Phase 10)
  FAILURE_CATEGORIES,
  OperationDiagnosticRecord,
  DiagnosticBuffer,
  classifyFailure,
  defaultDiagnosticBuffer,
  getDiagnostics: (opId) => defaultDiagnosticBuffer.getDiagnostics(opId),
  getDiagnosticReport: (opId, opts) => defaultDiagnosticBuffer.getDiagnosticReport(opId, opts),

  // Semantic Output Truncation & Bounding (Phase 10)
  boundArray,
  boundString,
  boundObject,

  // High-Information Completion Summaries (Phase 10)
  formatDuration,
  normalizeSummaryData,
  formatCompletionSummary,

  // High-Level Convenience Helpers
  formatActivity,
  announceAgent,
  announceSkill,
};
