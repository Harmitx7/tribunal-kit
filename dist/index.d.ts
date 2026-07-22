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
  /** Enable token-optimized output. */
  tokenOptimized?: boolean;
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
  | 'align_output';

// ── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * The main CLI entry point. Parses `process.argv` and routes to the
 * appropriate command handler.
 */
export function main(): Promise<void>;
