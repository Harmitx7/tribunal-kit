'use strict';

/**
 * repository_cache_contract.js — System-1 Phase 9: Repository Intelligence Cache Contract
 * =======================================================================================
 * Defines schema definitions, deterministic key derivation, validation gates,
 * canonical serialization, and security boundaries for cached repository artifacts.
 *
 * Core Governance Invariant:
 * Cached information is strictly an optimization, never an authority. Cache hits must
 * not bypass deterministic policy, evidence freshness checks, security checks,
 * mandatory reviewers, verification requirements, or the Human Gate.
 */

const crypto = require('crypto');

const CACHE_SCHEMA_VERSION = 1;

/**
 * Permitted artifact types eligible for caching.
 * Only deterministic, derived static metadata may be cached.
 */
const ALLOWED_ARTIFACT_TYPES = {
  FILE_DIGEST: 'FILE_DIGEST',
  AST_UNITS: 'AST_UNITS',
  DEPENDENCY_GRAPH: 'DEPENDENCY_GRAPH',
  SYMBOL_TABLE: 'SYMBOL_TABLE',
  REPO_STRUCTURE: 'REPO_STRUCTURE',
  SAFE_DERIVED_METADATA: 'SAFE_DERIVED_METADATA',
};

/**
 * Explicitly forbidden artifact types.
 * Governance decisions, approvals, and confidence scores MUST NEVER be cached.
 */
const FORBIDDEN_ARTIFACT_TYPES = new Set([
  'DECISION_PLAN',
  'REVIEWER_SELECTION',
  'CONFIDENCE_ASSESSMENT',
  'EVIDENCE_TRUST_STATE',
  'HUMAN_APPROVAL',
  'HUMAN_APPROVAL_RECORDED',
  'FINAL_VERDICT',
  'PROMPT_TEXT',
  'SECURITY_POLICY',
  'RAW_SECRETS',
]);

const MAX_PAYLOAD_BYTES = 2 * 1024 * 1024; // 2 MB max per single entry
const MAX_NESTING_DEPTH = 10;
const MAX_KEY_LENGTH = 128;
const HASH_REGEX = /^[0-9a-f]{64}$/i;
const PROTOTYPE_POLLUTION_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Recursively inspects an object graph to ensure no prototype pollution keys
 * and enforce maximum nesting depth.
 *
 * @param {any} val
 * @param {number} depth
 * @param {WeakSet} seen
 */
function assertSafeObjectGraph(val, depth = 0, seen = new WeakSet()) {
  if (depth > MAX_NESTING_DEPTH) {
    throw new Error(`Payload exceeds maximum nesting depth of ${MAX_NESTING_DEPTH}`);
  }
  if (val === null || typeof val !== 'object') {
    return;
  }
  if (seen.has(val)) {
    throw new Error('Circular reference detected in payload');
  }
  seen.add(val);

  if (Array.isArray(val)) {
    for (const item of val) {
      assertSafeObjectGraph(item, depth + 1, seen);
    }
  } else {
    for (const [key, propVal] of Object.entries(val)) {
      if (PROTOTYPE_POLLUTION_KEYS.has(key)) {
        throw new Error(`Prototype pollution attempt detected with key "${key}"`);
      }
      assertSafeObjectGraph(propVal, depth + 1, seen);
    }
  }
}

/**
 * Deterministically stringifies an object graph with sorted keys and cycle detection.
 *
 * @param {any} value
 * @param {WeakSet} [seen]
 * @returns {string}
 */
function canonicalJsonStringify(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (seen.has(value)) {
    throw new Error('Circular reference detected during canonical serialization');
  }
  seen.add(value);

  if (Array.isArray(value)) {
    const serializedItems = value.map(item => canonicalJsonStringify(item, seen));
    return `[${serializedItems.join(',')}]`;
  }

  const keys = Object.keys(value).sort();
  const entries = [];
  for (const k of keys) {
    if (PROTOTYPE_POLLUTION_KEYS.has(k)) {
      throw new Error(`Prototype pollution attempt detected with key "${k}"`);
    }
    const val = value[k];
    if (val !== undefined) {
      entries.push(`${JSON.stringify(k)}:${canonicalJsonStringify(val, seen)}`);
    }
  }
  return `{${entries.join(',')}}`;
}

/**
 * Derives a deterministic repository ID from the canonical root path.
 *
 * @param {string} repositoryRoot
 * @returns {string} 64-char hex SHA-256
 */
function computeRepositoryId(repositoryRoot) {
  if (typeof repositoryRoot !== 'string' || !repositoryRoot.trim()) {
    throw new Error('repositoryRoot must be a non-empty string');
  }
  const normalized = repositoryRoot.trim().replace(/\\/g, '/').toLowerCase();
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * Computes a SHA-256 digest of payload content.
 *
 * @param {any} payload
 * @returns {string} 64-char hex SHA-256
 */
function computePayloadDigest(payload) {
  assertSafeObjectGraph(payload);
  const canonical = canonicalJsonStringify(payload);
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/**
 * Generates a deterministic cache key from input dependencies.
 *
 * @param {object} params
 * @param {string} params.artifact_type
 * @param {string} params.repository_id
 * @param {string} params.relative_path
 * @param {string} params.content_digest
 * @param {string[]} [params.dependency_digests=[]]
 * @param {string} [params.producer_version='1.0.0']
 * @param {string} [params.configuration_fingerprint]
 * @returns {string} Bounded deterministic cache key
 */
function computeCacheKey(params = {}) {
  const {
    artifact_type,
    repository_id,
    relative_path = '',
    content_digest = '',
    dependency_digests = [],
    producer_version = '1.0.0',
    configuration_fingerprint = '0'.repeat(64),
  } = params;

  if (!ALLOWED_ARTIFACT_TYPES[artifact_type]) {
    throw new Error(`Invalid or disallowed artifact_type: "${artifact_type}"`);
  }
  if (!repository_id || !HASH_REGEX.test(repository_id)) {
    throw new Error('Invalid repository_id: must be a 64-character hex SHA-256 hash');
  }

  const normalizedPath = (relative_path || '').replace(/\\/g, '/');
  const sortedDeps = Array.isArray(dependency_digests) ? [...dependency_digests].sort() : [];

  const keyDescriptor = {
    artifact_type,
    repository_id,
    relative_path: normalizedPath,
    content_digest: content_digest || '',
    dependency_digests: sortedDeps,
    producer_version,
    configuration_fingerprint,
    schema_version: CACHE_SCHEMA_VERSION,
  };

  const descriptorHash = crypto
    .createHash('sha256')
    .update(canonicalJsonStringify(keyDescriptor), 'utf8')
    .digest('hex');

  const shortType = artifact_type.toLowerCase();
  return `tk9_${shortType}_${descriptorHash.slice(0, 32)}`;
}

/**
 * Computes the cryptographic integrity hash over a complete cache entry
 * (excluding the integrity_hash field itself).
 *
 * @param {object} entry
 * @returns {string} 64-char hex SHA-256
 */
function computeEntryIntegrityHash(entry) {
  if (!entry || typeof entry !== 'object') {
    throw new Error('Entry must be a non-null object');
  }

  const { integrity_hash: _ignored, ...fieldsToHash } = entry;
  const canonical = canonicalJsonStringify(fieldsToHash);
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/**
 * Validates a cache entry against schema rules and integrity hashes.
 *
 * @param {any} entry
 * @returns {{ valid: boolean, error?: string }}
 */
function validateCacheEntry(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return { valid: false, error: 'Cache entry must be a non-null plain object' };
  }

  if (entry.schema_version !== CACHE_SCHEMA_VERSION) {
    return {
      valid: false,
      error: `Unsupported schema_version: expected ${CACHE_SCHEMA_VERSION}, received ${entry.schema_version}`,
    };
  }

  if (typeof entry.cache_key !== 'string' || !entry.cache_key.startsWith('tk9_') || entry.cache_key.length > MAX_KEY_LENGTH) {
    return { valid: false, error: 'Invalid or missing cache_key' };
  }

  if (FORBIDDEN_ARTIFACT_TYPES.has(entry.artifact_type)) {
    return {
      valid: false,
      error: `Forbidden artifact_type: "${entry.artifact_type}" is prohibited from caching by governance invariant`,
    };
  }

  if (!ALLOWED_ARTIFACT_TYPES[entry.artifact_type]) {
    return { valid: false, error: `Disallowed artifact_type: "${entry.artifact_type}"` };
  }

  if (!HASH_REGEX.test(entry.repository_id || '')) {
    return { valid: false, error: 'repository_id must be a valid 64-character hex SHA-256' };
  }

  if (typeof entry.relative_path !== 'string') {
    return { valid: false, error: 'relative_path must be a string' };
  }

  if (entry.content_digest && !HASH_REGEX.test(entry.content_digest)) {
    return { valid: false, error: 'content_digest must be a 64-character hex SHA-256' };
  }

  if (!Array.isArray(entry.dependency_digests)) {
    return { valid: false, error: 'dependency_digests must be an array' };
  }

  for (const dep of entry.dependency_digests) {
    if (typeof dep !== 'string' || (dep && !HASH_REGEX.test(dep))) {
      return { valid: false, error: 'Each dependency_digest must be a 64-character hex SHA-256' };
    }
  }

  if (typeof entry.producer_version !== 'string' || !entry.producer_version.trim()) {
    return { valid: false, error: 'producer_version must be a non-empty string' };
  }

  if (!HASH_REGEX.test(entry.configuration_fingerprint || '')) {
    return { valid: false, error: 'configuration_fingerprint must be a 64-character hex SHA-256' };
  }

  if (!entry.created_at || isNaN(Date.parse(entry.created_at))) {
    return { valid: false, error: 'created_at must be a valid ISO timestamp' };
  }

  if (!entry.payload || typeof entry.payload !== 'object') {
    return { valid: false, error: 'payload must be a non-null object or array' };
  }

  try {
    assertSafeObjectGraph(entry.payload);
  } catch (err) {
    return { valid: false, error: `Payload validation failed: ${err.message}` };
  }

  const payloadStr = canonicalJsonStringify(entry.payload);
  if (Buffer.byteLength(payloadStr, 'utf8') > MAX_PAYLOAD_BYTES) {
    return { valid: false, error: `Payload exceeds maximum size limit of ${MAX_PAYLOAD_BYTES} bytes` };
  }

  const computedPayloadDigest = crypto.createHash('sha256').update(payloadStr, 'utf8').digest('hex');
  if (computedPayloadDigest !== entry.payload_digest) {
    return {
      valid: false,
      error: `payload_digest mismatch: expected ${entry.payload_digest}, computed ${computedPayloadDigest}`,
    };
  }

  const computedIntegrityHash = computeEntryIntegrityHash(entry);
  if (computedIntegrityHash !== entry.integrity_hash) {
    return {
      valid: false,
      error: `integrity_hash mismatch: expected ${entry.integrity_hash}, computed ${computedIntegrityHash}`,
    };
  }

  return { valid: true };
}

/**
 * Creates and seals a new immutable cache entry with computed hashes.
 *
 * @param {object} params
 * @returns {object} Sealed cache entry
 */
function createCacheEntry(params = {}) {
  const {
    artifact_type,
    repository_id,
    relative_path = '',
    content_digest = '',
    dependency_digests = [],
    producer_version = '1.0.0',
    configuration_fingerprint = '0'.repeat(64),
    payload,
    trust_metadata = {},
  } = params;

  if (FORBIDDEN_ARTIFACT_TYPES.has(artifact_type)) {
    throw new Error(`Governance violation: Cannot create cache entry for forbidden artifact_type "${artifact_type}"`);
  }
  if (!ALLOWED_ARTIFACT_TYPES[artifact_type]) {
    throw new Error(`Disallowed artifact_type: "${artifact_type}"`);
  }
  if (!repository_id || !HASH_REGEX.test(repository_id)) {
    throw new Error('repository_id must be a valid 64-character hex SHA-256');
  }
  if (!payload || typeof payload !== 'object') {
    throw new Error('payload must be a non-null object or array');
  }

  assertSafeObjectGraph(payload);
  const payloadStr = canonicalJsonStringify(payload);
  if (Buffer.byteLength(payloadStr, 'utf8') > MAX_PAYLOAD_BYTES) {
    throw new Error(`Payload exceeds maximum size limit of ${MAX_PAYLOAD_BYTES} bytes`);
  }

  const payload_digest = crypto.createHash('sha256').update(payloadStr, 'utf8').digest('hex');

  const cache_key = computeCacheKey({
    artifact_type,
    repository_id,
    relative_path,
    content_digest,
    dependency_digests,
    producer_version,
    configuration_fingerprint,
  });

  const now = new Date().toISOString();

  const entry = {
    schema_version: CACHE_SCHEMA_VERSION,
    cache_key,
    artifact_type,
    artifact_version: 1,
    repository_id,
    relative_path: (relative_path || '').replace(/\\/g, '/'),
    content_digest: content_digest || '',
    dependency_digests: Array.isArray(dependency_digests) ? [...dependency_digests].sort() : [],
    producer_version,
    configuration_fingerprint,
    created_at: now,
    validated_at: now,
    trust_metadata: {
      is_derived: true,
      is_advisory_only: true,
      trust_state_unpromoted: true,
      ...trust_metadata,
    },
    payload,
    payload_digest,
  };

  entry.integrity_hash = computeEntryIntegrityHash(entry);

  const validation = validateCacheEntry(entry);
  if (!validation.valid) {
    throw new Error(`Failed to seal valid cache entry: ${validation.error}`);
  }

  return Object.freeze(entry);
}

module.exports = {
  CACHE_SCHEMA_VERSION,
  ALLOWED_ARTIFACT_TYPES,
  FORBIDDEN_ARTIFACT_TYPES,
  MAX_PAYLOAD_BYTES,
  MAX_NESTING_DEPTH,
  MAX_KEY_LENGTH,
  canonicalJsonStringify,
  assertSafeObjectGraph,
  computeRepositoryId,
  computePayloadDigest,
  computeCacheKey,
  computeEntryIntegrityHash,
  validateCacheEntry,
  createCacheEntry,
};
