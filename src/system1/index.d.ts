/**
 * Tribunal Kit System-1 Capability Suite Type Definitions
 */

import {
  EvidenceResult,
  EvidenceItem,
  DecisionPayload,
  ReviewerOrchestrationResult,
  BrowserRequirementResult,
  EvolutionCandidate,
} from '../index';

export class System1Provider {
  constructor();
  isAvailable(): boolean;
  classifyImpact(task: string, files: string[]): Promise<number>;
}

export function getLayaDir(): string;
export function getConfigPath(): string;

// Capability 1: Evidence Intelligence
export interface EvidenceOptions {
  task?: string;
  diff?: string;
  files?: string[] | string;
  repoRoot?: string;
  memory?: any[];
  previousFindings?: any[];
  maxItems?: number;
  maxTokens?: number;
}

export function collectAndRankEvidence(options?: EvidenceOptions): EvidenceResult;
export function extractChangedSymbols(
  diff?: string,
  content?: string,
): Array<{ name: string; type: string; line?: number }>;
export function extractBoundedSnippet(
  content: string,
  targetLine?: number | null,
  targetSymbol?: string | null,
  maxLines?: number,
): string;
export function redactSecrets(text: string): string;

export const TYPE_PRIORITY: Record<string, number>;
export const SECURITY_BOUNDARIES: RegExp[];

// Capability 2: Decision Engine
export interface DecisionOptions {
  files?: string[];
  lines?: number;
  task?: string;
  diff?: string;
  layaTier?: number | null;
  memory?: any[];
  previousFindings?: any[];
  tierResolver?: (options: any) => number;
}

export function evaluateDecision(options?: DecisionOptions): DecisionPayload;
export function resolveMonotonicImpactTier(options?: any): number;
export const HIGH_RISK_PATTERNS: RegExp;
export const HIGH_RISK_EXTENSIONS: RegExp;
export const TIER_NAMES: Record<number, string>;
export const ROUTING_NAMES: Record<number, string>;

// Capability 3: Reviewer Orchestration
export function orchestrateReviewers(
  evidenceResult?: any,
  options?: any,
): ReviewerOrchestrationResult;
export function detectRequiredDomains(evidenceResult: any): string[];
export const REVIEWER_CATALOG: Record<string, any>;

// Capability 4: Self-Evolution
export function createCandidateFromOutcome(outcome: any, id?: string): EvolutionCandidate;
export function validateCandidateAgainstCorpus(
  candidate: EvolutionCandidate,
  testSuites: any[],
): Promise<{ valid: boolean; results: any[] }>;
export function approveCandidate(
  candidate: EvolutionCandidate,
  approvedBy: string,
  agentDir?: string,
): EvolutionCandidate;
export function promoteCandidate(
  candidate: EvolutionCandidate,
  agentDir?: string,
): { promoted: boolean; candidate_id: string; target: string };
export function rollbackCandidate(
  candidateId: string,
  agentDir?: string,
): { rolled_back: boolean; candidate_id: string; target: string; restored_state: any };
export function saveCandidate(candidate: EvolutionCandidate, agentDir?: string): string;
export function loadCandidate(candidateId: string, agentDir?: string): EvolutionCandidate | null;
export function loadAllCandidates(agentDir?: string): EvolutionCandidate[];
export function getActiveEvolutionsPath(agentDir?: string): string;
export function acquireEvolutionLock(agentDir?: string): string;
export function releaseEvolutionLock(lockPath: string): void;
export function writeFileSyncAtomic(filePath: string, data: string, encoding?: string): void;

export const VALID_SOURCES: string[];
export const CANDIDATE_STATES: string[];

// Capability 5: Browser Intelligence
export function evaluateBrowserRequirement(
  task?: string,
  changedFiles?: string[],
  diff?: string,
): BrowserRequirementResult;
export function extractAffectedRoutes(changedFiles?: string[], diff?: string): string[];
