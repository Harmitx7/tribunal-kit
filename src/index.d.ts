/**
 * tribunal-kit — The operating system for AI software engineering.
 *
 * TypeScript declarations for the public programmatic API.
 * For CLI usage, run: npx tribunal-kit --help
 *
 * @packageDocumentation
 */

// ── CLI Flags ────────────────────────────────────────────────────────────────

/** Flags accepted by all CLI commands. */
export interface CliFlags {
  /** Overwrite existing `.agent/` folder. */
  force?: boolean;
  /** Suppress all output. */
  quiet?: boolean;
  /** Show detailed debug logging. */
  verbose?: boolean;
  /** Preview actions without executing. */
  dryRun?: boolean;
  /** Install core agents/skills only (~13 agents). */
  minimal?: boolean;
  /** Install in a specific directory. */
  path?: string;
  /** Skip the automatic update version check. */
  skipUpdateCheck?: boolean;
  /** Diff against last commit instead of staged (learn command). */
  head?: boolean;
  /** Write aligned output in-place to the target file (align command). */
  write?: boolean;
  /** Target terminal agent for compile (e.g. 'aider'). */
  target?: string;
  /** Git branch for remote operations. */
  branch?: string;
  /** Log file path for marathon command. */
  log?: string;
  /** Memory mutation strategy: 'balanced' | 'harden' | 'repair-only'. */
  strategy?: string;
  /** Install profile: 'full' | 'minimal' | 'web' | 'mobile' | 'backend' | 'ai'. */
  profile?: string;
}

/** Parsed CLI arguments returned by the internal arg parser. */
export interface ParsedArgs {
  command: string | null;
  flags: CliFlags;
}

// ── CLI Commands ─────────────────────────────────────────────────────────────

/**
 * Install the `.agent/` intelligence payload into a target project.
 * Equivalent to `npx tribunal-kit init`.
 */
export function cmdInit(flags: CliFlags, quiet?: boolean): Promise<void>;

/**
 * Re-install `.agent/` to get the latest version.
 * Equivalent to `npx tribunal-kit update`.
 */
export function cmdUpdate(flags: CliFlags): Promise<void>;

/**
 * Check if `.agent/` is installed in the current project.
 * Equivalent to `npx tribunal-kit status`.
 */
export function cmdStatus(flags: CliFlags, quiet?: boolean): void;

/**
 * Evolve project idioms based on git diffs.
 * Equivalent to `npx tribunal-kit learn`.
 */
export function cmdLearn(flags: CliFlags, quiet?: boolean): Promise<void>;

/**
 * Manage Case Law precedents (add, search, list, show, stats, overrule).
 * Equivalent to `npx tribunal-kit case`.
 */
export function cmdCase(flags: CliFlags, argv: string[], quiet?: boolean): Promise<void>;

/**
 * Install pre-push git hook for auto-learning.
 * Equivalent to `npx tribunal-kit hook`.
 */
export function cmdHook(flags: CliFlags): void;

/**
 * Build and visualize the architecture graph.
 * Equivalent to `npx tribunal-kit graph`.
 */
export function cmdGraph(flags: CliFlags, quiet?: boolean): Promise<void>;

/**
 * Run the Mutation Engine to test test-suite reliability.
 * Equivalent to `npx tribunal-kit mutate`.
 */
export function cmdMutate(flags: CliFlags, argv: string[]): Promise<void>;

/**
 * Retrieve a highly-optimized Context Snapshot for a file.
 * Equivalent to `npx tribunal-kit context`.
 */
export function cmdContext(flags: CliFlags, argv: string[]): void;

/**
 * Synchronize IDE bridge files with current rules.
 * Equivalent to `npx tribunal-kit sync`.
 */
export function cmdSync(): Promise<void>;

/**
 * Clean AI outputs (strip slop, collapse lists, validate code traps).
 * Equivalent to `npx tribunal-kit align`.
 */
export function cmdAlign(flags: CliFlags, argv: string[], quiet?: boolean): Promise<void>;

/**
 * Cleans AI-generated text by stripping introductory/outro conversational slop,
 * collapsing single-item bullet lists, and validating code traps.
 */
export function alignText(text: string): string;

/**
 * Long-running agent harness (init, status, next, mark).
 * Equivalent to `npx tribunal-kit marathon`.
 */
export function cmdMarathon(flags: CliFlags, argv: string[], quiet?: boolean): Promise<void>;

/**
 * Compile rules into a static instruction file for terminal agents.
 * Equivalent to `npx tribunal-kit compile`.
 */
export function cmdCompile(flags: CliFlags, quiet?: boolean): Promise<void>;

/**
 * 4-Type Taxonomy Persistent Memory Engine.
 * Equivalent to `npx tribunal-kit memory`.
 */
export function cmdMemory(flags: CliFlags, argv: string[], quiet?: boolean): Promise<void>;

/**
 * Remove `.agent/` folder from project.
 * Equivalent to `npx tribunal-kit uninstall`.
 */
export function cmdUninstall(flags: CliFlags, quiet?: boolean): void;

/**
 * Generate IDE bridge files (Cursor, Windsurf, Gemini, Copilot, Claude).
 * Called internally by `cmdInit` but exported for programmatic use.
 */
export function generateIDEBridges(cwd: string, agentDest: string, quiet?: boolean): Promise<void>;

/**
 * Validate `.agent/` integrity (phantom refs, count mismatches, drift).
 * Equivalent to `npx tribunal-kit guardrail`.
 */
export function cmdGuardrail(flags: CliFlags, argv: string[], quiet?: boolean): Promise<void>;

/**
 * AI Agent Behavioral Contract Testing (init, verify, list, trace, replay).
 * Equivalent to `npx tribunal-kit contract`.
 */
export function cmdContract(flags: CliFlags, argv: string[], quiet?: boolean): Promise<void>;

/**
 * Optimize project skills using SkillOpt validation gates.
 * Equivalent to `npx tribunal-kit optimize-skill`.
 */
export function cmdOptimizeSkill(flags: CliFlags, argv: string[], quiet?: boolean): Promise<void>;

/**
 * Show minimal change analysis for the current project.
 * Equivalent to `npx tribunal-kit minimal`.
 */
export function cmdMinimal(flags: CliFlags, quiet?: boolean): void;

/**
 * Validate a JSON payload against a Tribunal schema.
 * Equivalent to `npx tribunal-kit validate`.
 */
export function cmdValidate(flags: CliFlags, argv: string[], quiet?: boolean): void;

/**
 * Remove empty lines from a context file.
 * Equivalent to `npx tribunal-kit min-context`.
 */
export function cmdMinContext(argv: string[], quiet?: boolean): void;

/**
 * Compute parallel execution waves from task dependencies.
 * Equivalent to `npx tribunal-kit dag-schedule`.
 */
export function cmdDagSchedule(argv: string[], quiet?: boolean): void;

/**
 * Compress a context file while retaining VERIFY comments.
 * Equivalent to `npx tribunal-kit context-compress`.
 */
export function cmdContextCompress(argv: string[], quiet?: boolean): void;

/**
 * Apply bounded SkillOpt edits from a JSON payload.
 * Equivalent to `npx tribunal-kit optimize-step`.
 */
export function cmdOptimizeStep(argv: string[], quiet?: boolean): void;

/**
 * Classify task governance impact tier (0-3).
 * Equivalent to `npx tribunal-kit impact-tier`.
 */
export function cmdImpactTier(argv: string[], quiet?: boolean): void;

// ── Logger Utilities ─────────────────────────────────────────────────────────

/** ANSI color code map. */
export const C: Record<string, string>;

/** Colorize text with an ANSI escape code. */
export function colorize(color: string, text: string): string;

/** Short alias for `colorize`. */
export function c(color: string, text: string): string;

/** Wrap text in bold ANSI escape codes. */
export function bold(text: string): string;

/** Set global quiet and verbose log levels. */
export function setLogLevels(quiet: boolean, verbose: boolean): void;

/** Log a message (suppressed in quiet mode). */
export function log(msg: string): void;

/** Log a success message with ✔ prefix. */
export function ok(msg: string): void;

/** Log a warning message with ⚠ prefix. */
export function warn(msg: string): void;

/** Log an error message with ✖ prefix (always shown). */
export function err(msg: string): void;

/** Log a dimmed/gray message. */
export function dim(msg: string): void;

/** Log a debug message (only shown in verbose mode). */
export function dbg(msg: string): void;

// ── Helper Utilities ─────────────────────────────────────────────────────────

/**
 * Run a shell command asynchronously with inherited stdio.
 */
export function runShellAsync(command: string, options?: object): Promise<void>;

/**
 * Resolve the path to the kit's bundled `.agent/` directory.
 * Exits the process if the directory is not found.
 */
export function getKitAgent(): string;

/**
 * Print the ASCII art banner to stdout.
 */
export function banner(quiet: boolean): void;

// ── MCP Server Types ─────────────────────────────────────────────────────────

/** Memory types supported by the 4-Type Taxonomy Memory Engine. */
export type MemoryType = 'semantic' | 'procedural' | 'episodic' | 'working';

/** A memory entry stored by the Memory Engine. */
export interface MemoryEntry {
  id: string;
  type: MemoryType;
  content: string;
  tags?: string[];
  created: string;
  ttl?: number;
  priority?: number;
}

/** Input for the `store_memory` MCP tool. */
export interface StoreMemoryInput {
  type: MemoryType;
  content: string;
  tags?: string[];
}

/** Input for the `recall_memory` MCP tool. */
export interface RecallMemoryInput {
  query: string;
  budget?: number;
}

/** Input for the `search_case_law` MCP tool. */
export interface SearchCaseLawInput {
  query: string;
}

/** Input for the `get_tribunal_agent` MCP tool. */
export interface GetAgentInput {
  name: string;
}

/** Input for the `get_tribunal_skill` MCP tool. */
export interface GetSkillInput {
  name: string;
}

/** Input for the `get_sparse_context` MCP tool. */
export interface GetSparseContextInput {
  task: string;
  files?: string[];
  model?: 'large' | 'small';
}

/** Input for the `align_output` MCP tool. */
export interface AlignOutputInput {
  text: string;
}

/** MCP tool call result content. */
export interface McpTextContent {
  type: 'text';
  text: string;
}

/** MCP tool call result. */
export interface McpToolResult {
  content: McpTextContent[];
}

/** Names of all MCP tools exposed by tribunal-kit. */
export type McpToolName =
  | 'run_tribunal_audit'
  | 'sync_ide_bridges'
  | 'search_case_law'
  | 'list_tribunal_agents'
  | 'get_tribunal_agent'
  | 'list_tribunal_skills'
  | 'get_tribunal_skill'
  | 'recall_memory'
  | 'store_memory'
  | 'get_sparse_context'
  | 'align_output'
  | 'verify_contracts'
  | 'tribunal_understand'
  | 'tribunal_get_context';

// ── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * The main CLI entry point. Parses `process.argv` and routes to the
 * appropriate command handler.
 */
export function main(): Promise<void>;

/**
 * Executes codebase intelligence exploration, feature tracing, dependency analysis,
 * impact assessment, dead-code detection, onboarding, and change preparation.
 */
export function cmdUnderstand(
  flags?: CliFlags,
  argv?: string[] | string,
  quiet?: boolean,
): Promise<any>;

// ── Activity Presentation System (Phase 1) ────────────────────────────────

export const SCHEMA_VERSION: '1.0.0';

export type ActivityEventType =
  | 'operation_started'
  | 'agent_activated'
  | 'skill_activated'
  | 'analysis_started'
  | 'tool_execution_started'
  | 'progress_updated'
  | 'evidence_collected'
  | 'validation_passed'
  | 'validation_failed'
  | 'warning_detected'
  | 'approval_required'
  | 'operation_blocked'
  | 'retry_started'
  | 'operation_completed'
  | 'operation_cancelled';

export type ActivityStatus =
  | 'pending'
  | 'running'
  | 'passed'
  | 'failed'
  | 'warning'
  | 'blocked'
  | 'completed'
  | 'cancelled';

export interface ActivityTimestamps {
  startedAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface ActivityProgress {
  current?: number;
  total?: number;
  unit?: string;
  percentage?: number;
  isAuthoritative: boolean;
  stages?: Array<{ name: string; status: 'pending' | 'running' | 'completed' }>;
}

export interface ActivityEvent {
  schemaVersion: '1.0.0';
  eventId: string;
  operationId: string;
  eventType: ActivityEventType;
  status: ActivityStatus;
  title: string;
  summary?: string | null;
  phase?: string | null;
  agent?: string | null;
  skill?: string | null;
  domain?: string | null;
  progress?: ActivityProgress | null;
  evidence?: any;
  verified?: boolean;
  error?: { message: string; code?: string | null; suggestion?: string | null } | null;
  warning?: { message: string; impact?: string | null } | null;
  nextAction?: string | null;
  reportReferences?: string[];
  timestamps: ActivityTimestamps;
  startedAt?: string;
  updatedAt?: string;
  completedAt?: string | null;
}

export class ActivityValidationError extends Error {
  code: string;
  errors: string[];
}

export function validateActivityEvent(event: any): { valid: boolean; errors: string[] };
export function assertValidActivityEvent(event: any): boolean;
export function createActivityEvent(partial?: Partial<ActivityEvent>): Readonly<ActivityEvent>;
export function sanitizeActivityEvent(event: ActivityEvent): ActivityEvent;
export function redactSecrets(input: any): any;
export function deepClone<T = any>(obj: T): T;

export class MarkdownRenderer {
  render(event: ActivityEvent, options?: any): string;
}
export function renderMarkdown(event: ActivityEvent, options?: any): string;
export const activity: Readonly<Record<string, unknown>>;
export class ActivityTracker {
  constructor(options?: Record<string, unknown>);
}

export class TerminalRenderer {
  render(event: ActivityEvent, options?: any): string;
}
export function renderTerminal(event: ActivityEvent, options?: any): string;

export class PlainTextRenderer {
  render(event: ActivityEvent, options?: any): string;
}
export function renderPlainText(event: ActivityEvent, options?: any): string;

export class StructuredRenderer {
  render(event: ActivityEvent, options?: any): string;
}
export function renderStructured(event: ActivityEvent, options?: any): string;
export function renderActivity(event: ActivityEvent, environment?: string, options?: any): string;

export function formatActivity(event: Partial<ActivityEvent>, targetEnvironment?: 'markdown' | 'terminal' | 'plaintext' | 'structured' | 'json', options?: any): string;
export function announceAgent(agentName: string, context?: string, targetEnvironment?: string, options?: any): string;
export function announceSkill(skillName: string, context?: string, targetEnvironment?: string, options?: any): string;

export type LifecycleState = 'pending' | 'running' | 'waiting' | 'blocked' | 'retrying' | 'completed' | 'failed' | 'cancelled';
export type AgentSkillState = 'selected' | 'activated' | 'executing' | 'finished' | 'failed';
export type ToolState = 'started' | 'executing' | 'completed' | 'failed';

export const LIFECYCLE_STATES: Record<string, LifecycleState>;
export const AGENT_SKILL_STATES: Record<string, AgentSkillState>;
export const TOOL_STATES: Record<string, ToolState>;

export class IllegalStateTransitionError extends Error {
  code: string;
  fromState: string;
  toState: string;
  operationId?: string | null;
}

export function canTransition(fromState: string, toState: string): boolean;
export function assertValidTransition(fromState: string, toState: string, operationId?: string | null): void;
export function isTerminalState(state: string): boolean;
export function getLegalNextStates(state: string): string[];

export class ActivityProgressError extends Error {
  code: string;
  operationId?: string | null;
  details: Record<string, any>;
}

export class OperationRecord {
  operationId: string;
  parentOperationId?: string | null;
  childOperationIds: string[];
  title: string;
  status: LifecycleState;
  phase?: string | null;
  timestamps: { startedAt: string; updatedAt: string; completedAt?: string | null };
  attempt: number;
  maxAttempts: number;
  retries: Array<{ attempt: number; failedAt: string; reason: string; error?: any; durationMs?: number | null }>;
  progress?: ActivityProgress | null;
  activeAgent?: { name: string; state: AgentSkillState; context?: string | null; timestamp: string } | null;
  activeSkill?: { name: string; state: AgentSkillState; context?: string | null; timestamp: string } | null;
  agentHistory: Array<any>;
  skillHistory: Array<any>;
  stages: Array<{ name: string; status: string }>;
  tools: Array<{ toolName: string; status: ToolState; startedAt: string; completedAt?: string | null; durationMs?: number | null; resultRef?: string | null }>;
  evidence: Array<{ ref: string; hash?: string | null; description?: string | null; verified: boolean; collectedAt: string }>;
  verified: boolean;
  events: ActivityEvent[];
  error?: { message: string; code?: string | null; suggestion?: string | null } | null;
  warnings: Array<{ message: string; impact?: string | null; detectedAt: string }>;
  cancellation?: { reason: string; cancelledAt: string } | null;
  metadata: Record<string, any>;

  executeSerialized<T>(taskFn: (record: OperationRecord) => Promise<T>): Promise<T>;
  setProgress(progress: any): void;
  transitionTo(targetStatus: LifecycleState, metadata?: Record<string, any>): this;
  recordAgent(agentName: string, state: AgentSkillState, context?: string | null, error?: any): any;
  recordSkill(skillName: string, state: AgentSkillState, context?: string | null, error?: any): any;
  recordTool(toolName: string, status: ToolState, options?: any): any;
  recordEvidence(evidenceItem: any): any;
  recordRetry(options?: any): any;
  recordCancellation(reason?: string, metadata?: any): this;
  addEvent(event: ActivityEvent): void;
  toJSON(): Record<string, any>;
}

export class OperationRegistry {
  constructor(options?: { maxCompletedRetention?: number; completedTtlMs?: number });
  maxCompletedRetention: number;
  completedTtlMs: number;
  register(options?: any): OperationRecord;
  get(operationId: string): OperationRecord | null;
  has(operationId: string): boolean;
  transition(operationId: string, targetStatus: LifecycleState, metadata?: any): OperationRecord;
  updateProgress(operationId: string, progressData: any): any;
  recordAgentState(operationId: string, agentName: string, state: AgentSkillState, context?: string | null, error?: any): any;
  recordSkillState(operationId: string, skillName: string, state: AgentSkillState, context?: string | null, error?: any): any;
  recordToolExecution(operationId: string, toolName: string, status: ToolState, options?: any): any;
  recordEvidence(operationId: string, evidenceItem: any): any;
  recordRetry(operationId: string, options?: any): any;
  recordCancellation(operationId: string, reason?: string, metadata?: any): OperationRecord;
  recordEvent(operationId: string, eventOrPartial: any): ActivityEvent;
  listActive(): OperationRecord[];
  listCompleted(): OperationRecord[];
  getChildren(parentOperationId: string): OperationRecord[];
  query(filters?: any): OperationRecord[];
  cleanup(options?: { maxCompleted?: number; ttlMs?: number }): { evictedCount: number; activeCount: number; completedCount: number };
  reset(): void;
}

export const defaultRegistry: OperationRegistry;

export interface StatusTreatment {
  glyph: string;
  verb: string;
  tone: 'neutral' | 'accent' | 'success' | 'warning' | 'error' | 'gate' | 'muted';
}

export const STATUS_TREATMENTS: Record<string, StatusTreatment>;
export function formatProgressBar(percentage: number, barWidth?: number): string;
export function formatStagePipeline(stages: Array<{ name: string; status?: string }>): string;
export function formatCompactPath(fullPath: string, maxLen?: number): string;
export function formatDisclosure(summary: string, content: string, allowHtml?: boolean): string;

export type AnnouncementDecision = 'announce' | 'suppress' | 'defer';
export const ANNOUNCEMENT_DECISIONS: Record<string, AnnouncementDecision>;
export const ANNOUNCEMENT_REASONS: Record<string, string>;

export class AnnouncementDeduplicator {
  constructor(operationId: string);
  operationId: string;
  resetForAttempt(newAttempt: number): void;
  evaluate(event: ActivityEvent, options?: any): { verdict: AnnouncementDecision; reason: string };
}

export class AnnouncementIntelligence {
  constructor();
  getDeduplicator(operationId: string): AnnouncementDeduplicator;
  evaluate(event: ActivityEvent, options?: any): { shouldAnnounce: boolean; verdict: AnnouncementDecision; reason: string };
  cleanup(operationId: string): void;
  reset(): void;
}

export const defaultAnnouncementIntelligence: AnnouncementIntelligence;

// ── Live Progress & Execution Telemetry Engine (Phase 5) ─────

export type ProgressState =
  | 'queued'
  | 'starting'
  | 'running'
  | 'waiting'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'interrupted'
  | 'unknown';

export const PROGRESS_STATES: Record<string, ProgressState>;

export type AggregationPolicy = 'all_must_pass' | 'permit_partial_success' | 'any_pass';
export const AGGREGATION_POLICIES: Record<string, AggregationPolicy>;

export class TelemetryError extends Error {
  constructor(message: string, operationId?: string | null, details?: any);
  code: string;
  operationId: string | null;
  details: any;
}

export class StaleEventError extends TelemetryError {}

export class ProgressCalculator {
  static calculate(input: any, options?: any): {
    current: number | null;
    total: number | null;
    percentage: number | null;
    unit: string;
    isAuthoritative: boolean;
    stages: any[];
  };
}

export class ProgressCoalescer {
  constructor(options?: {
    windowMs?: number;
    maxBurstSize?: number;
    onFlush?: (event: ActivityEvent) => void;
    isCriticalEvent?: (event: ActivityEvent) => boolean;
  });
  windowMs: number;
  maxBurstSize: number;
  push(event: ActivityEvent, options?: any): { coalesced: boolean; immediate: boolean; sampleCount?: number; event?: ActivityEvent };
  flush(operationId?: string | null): ActivityEvent | ActivityEvent[] | null;
  dispose(): void;
}

export class StallDetector {
  constructor(options?: {
    stallThresholdMs?: number;
    checkIntervalMs?: number;
    onStall?: (event: any) => void;
  });
  stallThresholdMs: number;
  checkIntervalMs: number;
  startMonitoring(operationId: string, options?: any): void;
  heartbeat(operationId: string, metadata?: any): void;
  recordActivity(operationId: string, event: any): void;
  stopMonitoring(operationId: string): void;
  check(): any[];
  dispose(): void;
}

export class ParallelProgressAggregator {
  constructor(options?: {
    parentOperationId?: string;
    policy?: AggregationPolicy;
    partialSuccessThreshold?: number;
    optionalSubtasks?: string[];
    totalExpected?: number;
    onUpdate?: (snapshot: any) => void;
  });
  registerChild(childId: string, options?: any): void;
  updateChildProgress(childId: string, progressPayload: any, options?: any): void;
  updateChildState(childId: string, state: ProgressState, options?: any): void;
  getSnapshot(): any;
  dispose(): void;
}

export const CRITICAL_EVENT_TYPES: Set<string>;

// ── CLI & TUI Components (Phase 8) ───────────────────────────────────────────

export interface PanelOptions {
  width?: number;
  borderColor?: [number, number, number];
  titleColor?: [number, number, number];
  accessory?: string;
  accessoryColor?: [number, number, number];
  sanitize?: boolean;
}

export interface TerminalSanitizeOptions {
  stripAnsi?: boolean;
  redactSecrets?: boolean;
  stripControl?: boolean;
  maxLength?: number;
}

export function visibleWidth(text: string): number;
export function visibleLength(text: string): number;
export function sanitizeTerminal(input: any, options?: TerminalSanitizeOptions): string;
export function renderPanel(title: string, lines?: (string | null | undefined)[], options?: PanelOptions): void;
export function renderProgressBar(
  label: string,
  percentage: number | null,
  options?: { width?: number; color?: [number, number, number]; labelWidth?: number; requireTerminalConfirmation?: boolean }
): string;
export function renderReviewerGrid(completedCount?: number): void;

// ── Host Capability & Environment Resolution (Phase 9) ───────────────────────

export type HostType =
  | 'antigravity'
  | 'claude_code'
  | 'cursor'
  | 'windsurf'
  | 'copilot'
  | 'codex'
  | 'cli_interactive'
  | 'cli_piped'
  | 'ci'
  | 'mcp'
  | 'unknown';

export interface HostCapabilities {
  readonly host: HostType;
  readonly supportsColor: boolean;
  readonly supportsAnsi: boolean;
  readonly supportsMarkdown: boolean;
  readonly supportsHtml: boolean;
  readonly supportsUnicode: boolean;
  readonly supportsInteractiveProgress: boolean;
  readonly supportsStreamingTelemetry: boolean;
  readonly maxRecommendedWidth: number;
  readonly defaultEnvironment: string;
}

export const HOSTS: Record<string, HostType>;
export const BASE_HOST_CAPABILITIES: Record<HostType, HostCapabilities>;

export function detectHost(options?: { host?: HostType; isMcp?: boolean; isCi?: boolean }, env?: NodeJS.ProcessEnv): HostType;
export function getHostCapabilities(host?: HostType | null, options?: any, env?: NodeJS.ProcessEnv): HostCapabilities;
export function resolveEnvironment(options?: any, env?: NodeJS.ProcessEnv): string;

// ── Progressive Disclosure & Output Optimization (Phase 10) ───────────────────

export type DetailLevel = 'essential' | 'expanded' | 'diagnostic';
export const DETAIL_LEVELS: Record<string, DetailLevel>;

export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';
export const PRIORITY_LEVELS: Record<string, PriorityLevel>;

export function resolveDetailLevel(options?: any): DetailLevel;
export function getEventPriority(event: any): PriorityLevel;
export function shouldDisplayEvent(
  event: any,
  detailLevel?: DetailLevel,
  options?: any
): { visible: boolean; reason: string; priority: string };

export const FAILURE_CATEGORIES: Record<string, string>;

export class OperationDiagnosticRecord {
  constructor(operationId: string, options?: any);
  operationId: string;
  maxEvents: number;
  events: any[];
  truncatedCount: number;
  error: any;
  failureCategory: string | null;
  remedy: string | null;
  push(event: any): void;
  getRetentionInfo(): { operationId: string; retainedCount: number; truncatedCount: number; capacity: number; isTruncated: boolean };
}

export class DiagnosticBuffer {
  constructor(options?: { maxOperations?: number; maxEventsPerOperation?: number });
  record(event: any): void;
  getDiagnostics(operationId?: string): any;
  getDiagnosticReport(operationId?: string, options?: any): string;
  exportDiagnostics(operationId?: string, format?: string): string;
  clear(operationId: string): boolean;
  clearAll(): void;
}

export const defaultDiagnosticBuffer: DiagnosticBuffer;
export function getDiagnostics(operationId?: string): any;
export function getDiagnosticReport(operationId?: string, options?: any): string;

export function boundArray<T = any>(
  items: T[],
  options?: { maxItems?: number; diagnosticRef?: string; verboseHint?: boolean }
): {
  items: T[];
  pagination: {
    total: number;
    shown: number;
    omitted: number;
    isTruncated: boolean;
    notice: string | null;
  };
};

export function boundString(
  text: string,
  options?: { maxLength?: number; headRatio?: number; diagnosticRef?: string }
): {
  text: string;
  isTruncated: boolean;
  originalLength: number;
  truncatedChars: number;
};

export function boundObject(obj: any, options?: any): any;

export function formatDuration(ms: number | null | undefined): string;
export function normalizeSummaryData(input: any): any;
export function formatCompletionSummary(input: any, options?: any): string;



