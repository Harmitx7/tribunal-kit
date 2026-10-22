'use strict';

/**
 * evidence_pack.js — System-1 Phase 3: Shared Evidence Pack
 * ==========================================================
 * Provides a structured, verifiable, deduplicated, and tamper-resistant
 * Evidence Pack that allows selected reviewers to share repository evidence
 * rather than repeatedly scanning files, duplicating tokens, or reconstructing facts.
 *
 * Core Guarantees:
 * 1. Strict Schema Enforcement (version 1)
 * 2. Deterministic, Content-Addressed Evidence IDs and Canonical Pack Fingerprint
 * 3. Formal Trust Boundaries: OBSERVED, VALIDATED, UNVERIFIED_CLAIM, STALE, INVALID
 * 4. Provenance & Source References with Cryptographic SHA-256 Digests
 * 5. Fail-Closed Path Containment & Anti-Prompt-Injection Sanitization
 * 6. Relevance-Based Slicing & Context Budget Enforcement Per Reviewer
 * 7. Freshness Invalidation against Active Repository Working Tree
 * 8. Reviewer Independence: Unverified Claims Cannot Silently Become Validated Evidence
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { safeContainedPath, resolveCanonicalRoot } = require('../utils/path_containment');
const { normalizePath, estimateTokens } = require('../context/ranker');
const { redactSecrets } = require('./evidence_engine');
const { REVIEWER_CATALOG } = require('./reviewer_orchestrator');

const EVIDENCE_PACK_SCHEMA_VERSION = 1;

// Trust states
const TRUST_STATUS = {
  OBSERVED: 'OBSERVED',
  VALIDATED: 'VALIDATED',
  UNVERIFIED_CLAIM: 'UNVERIFIED_CLAIM',
  STALE: 'STALE',
  INVALID: 'INVALID',
};

// Recognized evidence kinds
const EVIDENCE_KINDS = {
  FILE_SNIPPET: 'file_snippet',
  AST_SYMBOL: 'ast_symbol',
  DEPENDENCY: 'dependency',
  TEST_COVERAGE: 'test_coverage',
  CONFIGURATION: 'configuration',
  SECURITY_POLICY: 'security_policy',
  TEST_RESULT: 'test_result',
  COMMAND_OUTPUT: 'command_output',
  REVIEWER_CLAIM: 'reviewer_claim',
};

// Known trusted internal producers
const TRUSTED_PRODUCERS = new Set([
  'system1:evidence_engine',
  'system1:evidence_pack',
  'system1:ast_scanner',
  'system1:dependency_analyzer',
  'system1:git_inspector',
  'test_runner',
]);

const MAX_RECORD_SNIPPET_BYTES = 32 * 1024; // 32 KB max per evidence record snippet
const MAX_TOTAL_PACK_BYTES = 2 * 1024 * 1024; // 2 MB max total pack payload
const MAX_PACK_RECORDS = 500;

/**
 * Sanitizes untrusted text to prevent prompt injection and control escapes.
 * @param {string} text
 * @returns {string}
 */
function sanitizeEvidenceText(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/]]>/g, ']]&gt;')
    .replace(/<\/?repository_evidence>/gi, match => match.replace('<', '&lt;').replace('>', '&gt;'))
    .replace(/<\/?fact>/gi, match => match.replace('<', '&lt;').replace('>', '&gt;'))
    .replace(/<\/?system_instructions>/gi, match => match.replace('<', '&lt;').replace('>', '&gt;'));
}

/**
 * Computes deterministic SHA-256 hex digest of a string or buffer.
 * @param {string|Buffer} content
 * @returns {string}
 */
function computeSha256(content) {
  const buf = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * Computes a stable, deterministic Evidence ID.
 * Input tuple: kind, normalized source, normalized source_range, source_digest
 * Formula: ev_<kind_prefix>_<sha256(canonical_tuple)[0..15]>
 *
 * @param {Object} params
 * @param {string} params.kind
 * @param {string} params.source
 * @param {Object|string|null} [params.source_range]
 * @param {string} [params.source_digest]
 * @param {string} [params.claim]
 * @returns {string}
 */
function computeEvidenceId({ kind, source, source_range, source_digest, claim = '' }) {
  const normKind = String(kind || 'unknown').toLowerCase().trim();
  const normSource = normalizePath(String(source || '')).trim();

  let rangeStr = '';
  if (source_range) {
    if (typeof source_range === 'object') {
      const keys = Object.keys(source_range).sort();
      rangeStr = keys.map(k => `${k}:${source_range[k]}`).join(',');
    } else {
      rangeStr = String(source_range).trim();
    }
  }

  const normDigest = String(source_digest || '').trim();
  // For unverified reviewer claims that lack source digests, bind to the normalized claim text
  const claimBinding = normKind === EVIDENCE_KINDS.REVIEWER_CLAIM ? `:${claim.trim().slice(0, 100)}` : '';

  const canonicalKey = `${normKind}|${normSource}|${rangeStr}|${normDigest}${claimBinding}`;
  const hash = crypto.createHash('sha256').update(canonicalKey, 'utf8').digest('hex').slice(0, 16);

  const prefix = normKind.replace(/[^a-z0-9]/g, '_').slice(0, 12);
  return `ev_${prefix}_${hash}`;
}

/**
 * Canonicalizes an evidence record for deterministic hashing and comparison.
 * @param {Object} record
 * @returns {string}
 */
function canonicalizeRecord(record) {
  return JSON.stringify({
    evidence_id: record.evidence_id,
    schema_version: record.schema_version,
    kind: record.kind,
    claim: record.claim,
    source: record.source,
    source_range: record.source_range || null,
    source_digest: record.source_digest,
    producer: record.producer,
    trust_status: record.trust_status,
  });
}

/**
 * Computes deterministic canonical pack fingerprint over all contained records.
 * Records are sorted by evidence_id to ensure order-independent stability.
 *
 * @param {Array<Object>} records
 * @param {string} [decisionPlanFingerprint]
 * @param {string} [workingTreeFingerprint]
 * @returns {string}
 */
function computePackFingerprint(records, decisionPlanFingerprint = '', workingTreeFingerprint = '') {
  const sortedRecords = [...records].sort((a, b) => a.evidence_id.localeCompare(b.evidence_id));
  const canonicalEntries = sortedRecords.map(canonicalizeRecord);
  const payload = [
    `dp:${decisionPlanFingerprint || ''}`,
    `wt:${workingTreeFingerprint || ''}`,
    ...canonicalEntries,
  ].join('\n');

  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
}

/**
 * Creates and normalizes an individual Evidence Record.
 *
 * @param {Object} options
 * @param {string} options.kind - from EVIDENCE_KINDS
 * @param {string} options.claim - statement supported by evidence
 * @param {string} options.source - repository path or tool source
 * @param {Object|string|null} [options.source_range] - line range or symbol name
 * @param {string} [options.source_digest] - SHA-256 digest of source
 * @param {string} [options.producer] - generator of the record
 * @param {string} [options.trust_status] - target trust status
 * @param {Object} [options.verification] - validation method & result
 * @param {string} [options.snippet] - raw code/content snippet
 * @param {Object} [options.metadata] - supplemental bounded metadata
 * @param {string} [options.repoRoot] - repository root for path containment verification
 * @returns {Object} Validated EvidenceRecord
 */
function createEvidenceRecord(options = {}) {
  const repoRoot = options.repoRoot ? resolveCanonicalRoot(options.repoRoot) : resolveCanonicalRoot(process.cwd());
  const kind = String(options.kind || EVIDENCE_KINDS.FILE_SNIPPET).trim();
  const rawSource = String(options.source || '').trim();
  const producer = String(options.producer || 'system1:evidence_pack').trim();
  const isReviewerProducer = producer.startsWith('reviewer:') || producer.startsWith('llm:');

  // Path containment & authorization check for filesystem sources
  let normalizedSource = rawSource;
  let isPathContained = true;

  if (rawSource && !rawSource.startsWith('tool:') && !rawSource.startsWith('cmd:')) {
    const check = safeContainedPath(rawSource, repoRoot, { operation: 'read' });
    if (!check.ok) {
      isPathContained = false;
      normalizedSource = rawSource;
    } else {
      normalizedSource = check.relativePath || normalizePath(rawSource);
    }
  }

  // Sanitize & redact snippet
  let rawSnippet = options.snippet || '';
  if (typeof rawSnippet !== 'string') rawSnippet = String(rawSnippet || '');
  if (rawSnippet.length > MAX_RECORD_SNIPPET_BYTES) {
    rawSnippet = rawSnippet.slice(0, MAX_RECORD_SNIPPET_BYTES) + '\n... [TRUNCATED_MAX_BYTES]';
  }
  const cleanSnippet = sanitizeEvidenceText(redactSecrets(rawSnippet));

  // Determine Source Digest
  let sourceDigest = options.source_digest || '';
  if (!sourceDigest && isPathContained && normalizedSource) {
    try {
      const fullPath = path.resolve(repoRoot, normalizedSource);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        const fileBytes = fs.readFileSync(fullPath);
        sourceDigest = computeSha256(fileBytes);
      }
    } catch (_) {
      // Inaccessible source will be handled in trust evaluation
    }
  }

  // Derive Trust Status under Strict Governance Boundaries
  let trustStatus = options.trust_status || TRUST_STATUS.OBSERVED;

  // RULE 1: If path traversal or forbidden characters detected -> immediately INVALID
  if (!isPathContained) {
    trustStatus = TRUST_STATUS.INVALID;
  }
  // RULE 2: Reviewers/LLMs cannot forge VALIDATED or OBSERVED status
  else if (isReviewerProducer) {
    trustStatus = TRUST_STATUS.UNVERIFIED_CLAIM;
  }
  // RULE 3: Producer is an untrusted third party claiming VALIDATED without receipt -> UNVERIFIED_CLAIM
  else if (trustStatus === TRUST_STATUS.VALIDATED) {
    const hasValidVerification =
      options.verification &&
      options.verification.valid === true &&
      ['sha256_match', 'ast_parse', 'test_exit_code', 'schema_validation'].includes(options.verification.method);
    if (!hasValidVerification || !TRUSTED_PRODUCERS.has(producer)) {
      trustStatus = TRUST_STATUS.OBSERVED;
    }
  }
  // RULE 4: If source file is missing or digest is empty for file kind -> STALE or OBSERVED
  else if (kind === EVIDENCE_KINDS.FILE_SNIPPET && !sourceDigest) {
    trustStatus = TRUST_STATUS.STALE;
  }

  // Construct stable identifier
  const evidenceId = options.evidence_id || computeEvidenceId({
    kind,
    source: normalizedSource,
    source_range: options.source_range,
    source_digest: sourceDigest,
    claim: options.claim,
  });

  // Construct verification record
  const verification = {
    method: options.verification?.method || (sourceDigest ? 'sha256_match' : 'none'),
    verified_at: options.verification?.verified_at || Date.now(),
    valid: trustStatus !== TRUST_STATUS.INVALID && trustStatus !== TRUST_STATUS.STALE,
    details: options.verification?.details || (isPathContained ? 'Integrity and containment verified.' : 'Path containment violation.'),
  };

  const estimatedTokens = estimateTokens(cleanSnippet || options.claim || 50);

  return {
    evidence_id: evidenceId,
    schema_version: EVIDENCE_PACK_SCHEMA_VERSION,
    kind,
    claim: sanitizeEvidenceText(String(options.claim || '')).slice(0, 500),
    source: normalizedSource,
    source_range: options.source_range || null,
    source_digest: sourceDigest,
    producer,
    trust_status: trustStatus,
    verification,
    created_at: typeof options.created_at === 'number' ? options.created_at : Date.now(),
    snippet: cleanSnippet,
    metadata: {
      estimated_tokens: estimatedTokens,
      is_mandatory: Boolean(options.metadata?.is_mandatory),
      language: options.metadata?.language || '',
      tags: Array.isArray(options.metadata?.tags) ? options.metadata.tags.map(String).slice(0, 10) : [],
      score: typeof options.metadata?.score === 'number' ? options.metadata.score : 1.0,
    },
  };
}

/**
 * Validates a single Evidence Record against the Phase 3 schema.
 * @param {Object} record
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateEvidenceRecord(record) {
  const errors = [];
  if (!record || typeof record !== 'object') {
    return { valid: false, errors: ['Record must be an object'] };
  }

  if (record.schema_version !== EVIDENCE_PACK_SCHEMA_VERSION) {
    errors.push(`Invalid schema_version: expected ${EVIDENCE_PACK_SCHEMA_VERSION}, got ${record.schema_version}`);
  }

  if (!record.evidence_id || typeof record.evidence_id !== 'string' || !record.evidence_id.startsWith('ev_')) {
    errors.push(`Invalid evidence_id format: ${record.evidence_id}`);
  }

  if (!record.kind || typeof record.kind !== 'string') {
    errors.push('Missing or invalid kind field');
  }

  if (!Object.values(TRUST_STATUS).includes(record.trust_status)) {
    errors.push(`Invalid trust_status: ${record.trust_status}`);
  }

  if (!record.producer || typeof record.producer !== 'string') {
    errors.push('Missing producer field');
  }

  // Security invariant: Reviewer producer cannot possess VALIDATED trust status
  // Security invariant: Reviewer producer cannot possess VALIDATED trust status
  if (
    (record.producer.startsWith('reviewer:') || record.producer.startsWith('llm:')) &&
    record.trust_status === TRUST_STATUS.VALIDATED
  ) {
    errors.push(`Security violation: Reviewer producer "${record.producer}" cannot assign VALIDATED trust status`);
  }

  // Security invariant: Path traversal check
  if (record.source && (record.source.includes('../') || record.source.includes('..\\'))) {
    errors.push(`Path traversal detected in evidence source: ${record.source}`);
  }

  // Schema invariant: metadata must be an object if provided
  if (record.metadata !== undefined && (typeof record.metadata !== 'object' || record.metadata === null)) {
    errors.push('Record metadata must be an object if provided');
  }

  // Schema invariant: source_range validation
  if (record.source_range && typeof record.source_range === 'object') {
    if (
      typeof record.source_range.start_line === 'number' &&
      typeof record.source_range.end_line === 'number' &&
      record.source_range.start_line > record.source_range.end_line
    ) {
      errors.push(`Invalid source_range: start_line (${record.source_range.start_line}) > end_line (${record.source_range.end_line})`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates an entire Evidence Pack envelope and all constituent records.
 * @param {Object} pack
 * @param {Object} [options]
 * @param {string} [options.expectedPackFingerprint]
 * @param {string} [options.expectedDecisionPlanFingerprint]
 * @param {string} [options.expectedWorkingTreeFingerprint]
 * @param {string} [options.repoRoot]
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateEvidencePack(pack, options = {}) {
  const errors = [];

  if (!pack || typeof pack !== 'object') {
    return { valid: false, errors: ['Evidence Pack must be a non-null object'] };
  }

  if (pack.schema_version !== EVIDENCE_PACK_SCHEMA_VERSION) {
    errors.push(`Invalid pack schema_version: expected ${EVIDENCE_PACK_SCHEMA_VERSION}, got ${pack.schema_version}`);
  }

  if (!pack.pack_id || typeof pack.pack_id !== 'string') {
    errors.push('Missing or invalid pack_id');
  }

  if (!Array.isArray(pack.records)) {
    errors.push('Evidence Pack records must be an array');
    return { valid: false, errors };
  }

  if (pack.records.length > MAX_PACK_RECORDS) {
    errors.push(`Evidence Pack exceeds maximum record limit (${pack.records.length} > ${MAX_PACK_RECORDS})`);
  }

  // Check expected pack fingerprint against external trust reference
  if (
    options.expectedPackFingerprint &&
    pack.pack_fingerprint !== options.expectedPackFingerprint
  ) {
    errors.push(`Expected pack fingerprint mismatch: expected ${options.expectedPackFingerprint}, got ${pack.pack_fingerprint || '(none)'}`);
  }

  // Check decision plan fingerprint if expected
  if (
    options.expectedDecisionPlanFingerprint &&
    pack.decision_plan_fingerprint !== options.expectedDecisionPlanFingerprint
  ) {
    errors.push(`Decision Plan fingerprint mismatch: expected ${options.expectedDecisionPlanFingerprint}, got ${pack.decision_plan_fingerprint || '(none)'}`);
  }

  // Check working tree fingerprint if expected
  if (
    options.expectedWorkingTreeFingerprint &&
    pack.working_tree_fingerprint !== options.expectedWorkingTreeFingerprint
  ) {
    errors.push(`Working tree fingerprint mismatch: expected ${options.expectedWorkingTreeFingerprint}, got ${pack.working_tree_fingerprint || '(none)'}`);
  }

  // Check repoRoot containment if expected
  if (options.repoRoot) {
    const expectedRoot = resolveCanonicalRoot(options.repoRoot);
    const actualRoot = pack.repo_root ? resolveCanonicalRoot(pack.repo_root) : '';
    if (actualRoot !== expectedRoot) {
      errors.push(`Repository root mismatch: expected ${expectedRoot}, got ${actualRoot || '(none)'}`);
    }
  }

  // Validate each record
  const seenIds = new Set();
  let totalBytes = 0;

  for (let idx = 0; idx < pack.records.length; idx++) {
    const record = pack.records[idx];
    const recVal = validateEvidenceRecord(record);
    if (!recVal.valid) {
      errors.push(`Record [${idx}] (${record?.evidence_id || 'unknown'}): ${recVal.errors.join('; ')}`);
    }

    if (record && record.evidence_id) {
      if (seenIds.has(record.evidence_id)) {
        errors.push(`Duplicate evidence_id detected in pack: ${record.evidence_id}`);
      } else {
        seenIds.add(record.evidence_id);
      }
    }

    try {
      totalBytes += JSON.stringify(record).length;
    } catch (err) {
      errors.push(`Record serialization failed (possible circular reference): ${err.message}`);
    }
  }

  if (totalBytes > MAX_TOTAL_PACK_BYTES) {
    errors.push(`Total Evidence Pack payload exceeds size boundary (${totalBytes} > ${MAX_TOTAL_PACK_BYTES} bytes)`);
  }

  // Validate canonical pack fingerprint
  if (pack.pack_fingerprint) {
    const computed = computePackFingerprint(
      pack.records,
      pack.decision_plan_fingerprint,
      pack.working_tree_fingerprint,
    );
    if (computed !== pack.pack_fingerprint) {
      errors.push(`Pack fingerprint integrity violation: computed ${computed}, expected ${pack.pack_fingerprint}`);
    }
  } else {
    errors.push('Missing required pack_fingerprint');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Creates an Evidence Pack from repository facts and decision plan context.
 * Reuses audited `collectAndRankEvidence` engine to avoid redundant file system scans.
 *
 * @param {Object} options
 * @param {Object} [options.decisionPlan]
 * @param {string[]|string} [options.files]
 * @param {string} [options.diff]
 * @param {string} [options.task]
 * @param {string} [options.repoRoot]
 * @param {Array} [options.customRecords]
 * @param {Array} [options.memory]
 * @param {Array} [options.previousFindings]
 * @param {number} [options.maxItems]
 * @param {number} [options.maxTokens]
 * @returns {Object} Canonical Evidence Pack
 */
function createEvidencePack(options = {}) {
  const repoRoot = options.repoRoot ? resolveCanonicalRoot(options.repoRoot) : resolveCanonicalRoot(process.cwd());
  const decisionPlan = options.decisionPlan || {};
  const rawFiles = options.files || decisionPlan.files || [];
  const files = (Array.isArray(rawFiles) ? rawFiles : typeof rawFiles === 'string' ? rawFiles.split(',') : [])
    .map(f => (typeof f === 'string' ? f.trim() : ''))
    .filter(Boolean);

  const diff = options.diff || '';
  const task = options.task || '';

  // 1. Gather repository facts using existing evidence intelligence
  const { collectAndRankEvidence } = require('./evidence_engine');
  const gathered = collectAndRankEvidence({
    task,
    diff,
    files,
    repoRoot,
    memory: options.memory || [],
    previousFindings: options.previousFindings || [],
    maxItems: options.maxItems || 50,
    maxTokens: options.maxTokens || 12000,
  });

  const recordMap = new Map(); // evidence_id -> record (deterministic deduplication)

  // Map internal evidence engine types to Evidence Pack kinds
  const kindMapping = {
    changed_file: EVIDENCE_KINDS.FILE_SNIPPET,
    changed_symbol: EVIDENCE_KINDS.AST_SYMBOL,
    direct_dependency: EVIDENCE_KINDS.DEPENDENCY,
    relevant_test: EVIDENCE_KINDS.TEST_COVERAGE,
    configuration: EVIDENCE_KINDS.CONFIGURATION,
    security_boundary: EVIDENCE_KINDS.SECURITY_POLICY,
    historical_memory: EVIDENCE_KINDS.COMMAND_OUTPUT,
    previous_finding: EVIDENCE_KINDS.COMMAND_OUTPUT,
  };

  // 2. Normalize and ingest gathered evidence items
  for (const item of gathered.evidence) {
    const kind = kindMapping[item.type] || EVIDENCE_KINDS.FILE_SNIPPET;
    const isSecurity = item.type === 'security_boundary' || Boolean(item.is_mandatory);

    let sourceRange = null;
    if (item.symbol) {
      sourceRange = { symbol: item.symbol };
    }

    const rec = createEvidenceRecord({
      kind,
      claim: (item.reasons && item.reasons[0]) || `Observed ${kind} in ${item.path}`,
      source: item.path,
      source_range: sourceRange,
      producer: 'system1:evidence_engine',
      trust_status: TRUST_STATUS.OBSERVED,
      snippet: item.snippet,
      repoRoot,
      metadata: {
        estimated_tokens: item.estimated_tokens || estimateTokens(item.snippet || 50),
        is_mandatory: isSecurity,
        score: item.score || 1.0,
      },
    });

    // Validate on ingestion
    const val = validateEvidenceRecord(rec);
    if (val.valid && !recordMap.has(rec.evidence_id)) {
      recordMap.set(rec.evidence_id, rec);
    }
  }

  // 3. Ingest optional custom records (e.g. test runner results, reviewer claims)
  if (Array.isArray(options.customRecords)) {
    for (const custom of options.customRecords) {
      const rec = createEvidenceRecord({
        ...custom,
        repoRoot,
      });
      const val = validateEvidenceRecord(rec);
      if (val.valid && !recordMap.has(rec.evidence_id)) {
        recordMap.set(rec.evidence_id, rec);
      }
    }
  }

  // 4. Stable canonical sorting by evidence_id
  const sortedRecords = Array.from(recordMap.values()).sort((a, b) => a.evidence_id.localeCompare(b.evidence_id));

  // 5. Compute working tree fingerprint
  const workingTreeDigestPayload = sortedRecords
    .filter(r => r.source_digest)
    .map(r => `${r.source}:${r.source_digest}`)
    .sort()
    .join('\n');
  const workingTreeFingerprint = computeSha256(workingTreeDigestPayload || repoRoot);

  const decisionPlanFingerprint = decisionPlan.fingerprint || decisionPlan.plan_fingerprint || '';
  const packFingerprint = computePackFingerprint(sortedRecords, decisionPlanFingerprint, workingTreeFingerprint);
  const packId = `ep_${packFingerprint.slice(0, 16)}`;

  // 6. Summary metrics
  let totalTokens = 0;
  let observedCount = 0;
  let validatedCount = 0;
  let unverifiedCount = 0;
  let staleCount = 0;
  let invalidCount = 0;
  let mandatoryCount = 0;

  for (const r of sortedRecords) {
    totalTokens += r.metadata?.estimated_tokens || 0;
    if (r.trust_status === TRUST_STATUS.OBSERVED) observedCount++;
    else if (r.trust_status === TRUST_STATUS.VALIDATED) validatedCount++;
    else if (r.trust_status === TRUST_STATUS.UNVERIFIED_CLAIM) unverifiedCount++;
    else if (r.trust_status === TRUST_STATUS.STALE) staleCount++;
    else if (r.trust_status === TRUST_STATUS.INVALID) invalidCount++;
    if (r.metadata?.is_mandatory) mandatoryCount++;
  }

  return {
    schema_version: EVIDENCE_PACK_SCHEMA_VERSION,
    pack_id: packId,
    decision_plan_fingerprint: decisionPlanFingerprint,
    repo_root: repoRoot,
    working_tree_fingerprint: workingTreeFingerprint,
    records: sortedRecords,
    pack_fingerprint: packFingerprint,
    created_at: Date.now(),
    summary: {
      total_records: sortedRecords.length,
      observed_count: observedCount,
      validated_count: validatedCount,
      unverified_count: unverifiedCount,
      stale_count: staleCount,
      invalid_count: invalidCount,
      mandatory_count: mandatoryCount,
      total_tokens: totalTokens,
    },
  };
}

/**
 * Checks the freshness of all filesystem-backed evidence records against current disk state.
 * Marks records whose disk content digest has changed or whose files have been deleted as STALE.
 *
 * @param {Object} pack - Evidence Pack
 * @param {string} [repoRoot]
 * @returns {{ fresh: boolean, totalChecked: number, staleCount: number, staleRecordIds: string[] }}
 */
function checkEvidenceFreshness(pack, repoRoot) {
  const root = repoRoot ? resolveCanonicalRoot(repoRoot) : pack.repo_root || resolveCanonicalRoot(process.cwd());
  const staleRecordIds = [];
  let checkedCount = 0;

  if (!pack || !Array.isArray(pack.records)) {
    return { fresh: false, totalChecked: 0, staleCount: 0, staleRecordIds: [] };
  }

  for (const record of pack.records) {
    // Only file-backed records with source digests need disk freshness check
    if (
      record.source &&
      record.source_digest &&
      !record.source.startsWith('tool:') &&
      !record.source.startsWith('cmd:')
    ) {
      checkedCount++;
      const check = safeContainedPath(record.source, root, { operation: 'read' });
      if (!check.ok) {
        staleRecordIds.push(record.evidence_id);
        record.trust_status = TRUST_STATUS.STALE;
        continue;
      }

      const fullPath = check.canonicalPath || path.resolve(root, record.source);
      try {
        if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
          staleRecordIds.push(record.evidence_id);
          record.trust_status = TRUST_STATUS.STALE;
        } else {
          const currentBytes = fs.readFileSync(fullPath);
          const currentDigest = computeSha256(currentBytes);
          if (currentDigest !== record.source_digest) {
            staleRecordIds.push(record.evidence_id);
            record.trust_status = TRUST_STATUS.STALE;
            record.verification = {
              method: 'sha256_match',
              verified_at: Date.now(),
              valid: false,
              details: `Source digest mismatch: expected ${record.source_digest.slice(0, 8)}, found ${currentDigest.slice(0, 8)}`,
            };
          }
        }
      } catch (_) {
        staleRecordIds.push(record.evidence_id);
        record.trust_status = TRUST_STATUS.STALE;
      }
    }
  }

  // Synchronize pack summary metrics with active trust states
  let obs = 0, val = 0, unv = 0, stl = 0, inv = 0;
  for (const r of pack.records) {
    if (r.trust_status === TRUST_STATUS.OBSERVED) obs++;
    else if (r.trust_status === TRUST_STATUS.VALIDATED) val++;
    else if (r.trust_status === TRUST_STATUS.UNVERIFIED_CLAIM) unv++;
    else if (r.trust_status === TRUST_STATUS.STALE) stl++;
    else if (r.trust_status === TRUST_STATUS.INVALID) inv++;
  }
  pack.summary.observed_count = obs;
  pack.summary.validated_count = val;
  pack.summary.unverified_count = unv;
  pack.summary.stale_count = stl;
  pack.summary.invalid_count = inv;

  return {
    fresh: staleRecordIds.length === 0,
    totalChecked: checkedCount,
    staleCount: staleRecordIds.length,
    staleRecordIds,
  };
}

/**
 * Filters the shared Evidence Pack to extract relevant evidence for a specific reviewer.
 * Enforces domain relevance, mandatory retention, context budgets, and independence boundaries.
 *
 * @param {Object} pack - Canonical Evidence Pack
 * @param {string} reviewerId - e.g. 'security-auditor', 'logic-reviewer'
 * @param {Object} [reviewerSpec] - Resolved catalog entry
 * @param {Object} [contextBudget] - { max_tokens: number, max_items: number }
 * @returns {Array<Object>} Tailored evidence items ready for reviewer prompt consumption
 */
function filterEvidenceForReviewer(pack, reviewerId, reviewerSpec, contextBudget = {}) {
  if (!pack || !Array.isArray(pack.records)) {
    return [];
  }

  const catalogEntry =
    reviewerSpec ||
    REVIEWER_CATALOG.find(r => r.name === reviewerId) || {
      name: reviewerId,
      primary_domains: ['logic'],
      secondary_domains: [],
    };

  const domains = new Set([
    ...(catalogEntry.primary_domains || []),
    ...(catalogEntry.secondary_domains || []),
  ]);
  if (domains.size === 0) domains.add('logic');

  const maxItems = typeof contextBudget.max_items === 'number' && contextBudget.max_items > 0 ? contextBudget.max_items : 15;
  const maxTokens = typeof contextBudget.max_tokens === 'number' && contextBudget.max_tokens > 0 ? contextBudget.max_tokens : 4000;

  // Domain relevance evaluation function
  function isRecordRelevant(record) {
    // 1. Mandatory records (e.g. security policies) are included for all reviewers
    if (record.metadata?.is_mandatory) return true;

    // 2. Reject stale and invalid records from reviewer consumption
    if (record.trust_status === TRUST_STATUS.INVALID || record.trust_status === TRUST_STATUS.STALE) {
      return false;
    }

    // 3. UNVERIFIED_CLAIM: Reviewers must NOT consume another reviewer's unverified claim as fact
    if (record.trust_status === TRUST_STATUS.UNVERIFIED_CLAIM) {
      return false;
    }

    // 4. Domain-specific relevance matching
    switch (record.kind) {
      case EVIDENCE_KINDS.SECURITY_POLICY:
        return domains.has('security') || reviewerId.includes('security') || reviewerId.includes('logic');

      case EVIDENCE_KINDS.CONFIGURATION:
        return domains.has('dependency') || domains.has('cicd') || domains.has('backend') || domains.has('all');

      case EVIDENCE_KINDS.TEST_COVERAGE:
      case EVIDENCE_KINDS.TEST_RESULT:
        return domains.has('test') || domains.has('logic') || reviewerId.includes('test') || reviewerId.includes('logic');

      case EVIDENCE_KINDS.DEPENDENCY:
        return domains.has('dependency') || domains.has('security') || domains.has('backend') || domains.has('frontend');

      case EVIDENCE_KINDS.AST_SYMBOL:
      case EVIDENCE_KINDS.FILE_SNIPPET:
      default:
        return true; // Modified files and AST symbols are relevant across core reviewers
    }
  }

  // Filter records & prioritize mandatory items
  const relevantRecords = pack.records.filter(isRecordRelevant);

  // Deterministic sorting:
  // 1. Mandatory first
  // 2. Score descending
  // 3. Evidence ID ascending
  relevantRecords.sort((a, b) => {
    const aMandatory = a.metadata?.is_mandatory ? 1 : 0;
    const bMandatory = b.metadata?.is_mandatory ? 1 : 0;
    if (aMandatory !== bMandatory) return bMandatory - aMandatory;

    const scoreA = a.metadata?.score || 1.0;
    const scoreB = b.metadata?.score || 1.0;
    if (Math.abs(scoreB - scoreA) > 0.001) return scoreB - scoreA;

    return a.evidence_id.localeCompare(b.evidence_id);
  });

  // Apply context budget
  const selected = [];
  let tokenCount = 0;

  for (const record of relevantRecords) {
    const cost = record.metadata?.estimated_tokens || 50;
    if (record.metadata?.is_mandatory) {
      selected.push(record);
      tokenCount += cost;
    } else if (selected.length < maxItems && tokenCount + cost <= maxTokens) {
      selected.push(record);
      tokenCount += cost;
    }
  }

  // Format into prompt-ready items adhering to the reviewer prompt contract
  return selected.map(r => ({
    id: r.evidence_id,
    type: r.kind,
    description: `${r.claim}${r.source ? ` [${r.source}${r.source_range?.symbol ? `:${r.source_range.symbol}` : ''}]` : ''}`,
    path: r.source,
    snippet: r.snippet,
    trust_status: r.trust_status,
    digest: r.source_digest ? r.source_digest.slice(0, 12) : null,
    is_mandatory: Boolean(r.metadata?.is_mandatory),
  }));
}

module.exports = {
  EVIDENCE_PACK_SCHEMA_VERSION,
  TRUST_STATUS,
  EVIDENCE_KINDS,
  TRUSTED_PRODUCERS,
  computeEvidenceId,
  computePackFingerprint,
  createEvidenceRecord,
  validateEvidenceRecord,
  createEvidencePack,
  validateEvidencePack,
  checkEvidenceFreshness,
  filterEvidenceForReviewer,
  sanitizeEvidenceText,
  computeSha256,
};
