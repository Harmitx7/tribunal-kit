'use strict';

/**
 * repository_cache.js — System-1 Phase 9: Repository Intelligence Cache Engine
 * ==============================================================================
 * Local-first, content-addressed, tamper-evident repository intelligence cache.
 * Provides caching of expensive derived analysis artifacts (AST units, file digests,
 * dependency graphs, symbol tables) with strict freshness invalidation and
 * zero-compromise governance isolation.
 *
 * Core Governance Invariant:
 * Cached information is strictly an optimization, never an authority. Cache hits
 * must not bypass deterministic policy, evidence freshness checks, security checks,
 * mandatory reviewers, verification requirements, or the Human Gate.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  CACHE_SCHEMA_VERSION,
  MAX_PAYLOAD_BYTES,
  computeRepositoryId,
  computeCacheKey,
  createCacheEntry,
  validateCacheEntry,
} = require('./repository_cache_contract');
const {
  PathSecurityError,
  assertContainedPath,
} = require('../utils/path_containment');

const WINDOWS_RESERVED_NAMES = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;
const DEFAULT_MAX_ENTRIES = 1000;
const DEFAULT_MAX_STORAGE_BYTES = 50 * 1024 * 1024; // 50 MB
const DEFAULT_LRU_MEMORY_LIMIT = 200;
const DEFAULT_LRU_MEMORY_BYTES = 10 * 1024 * 1024; // 10 MB

// ============================================================================
// Process Concurrency Locking
// ============================================================================

function acquireCacheLock(locksDir, timeoutMs = 15000, staleThresholdMs = 15000) {
  if (!fs.existsSync(locksDir)) {
    fs.mkdirSync(locksDir, { recursive: true });
  }
  const lockPath = path.join(locksDir, 'cache.lock');
  const startTime = Date.now();
  const maxRetries = 50;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const fd = fs.openSync(lockPath, 'wx');
      try {
        const meta = Buffer.from(JSON.stringify({ pid: process.pid, createdAt: Date.now() }), 'utf8');
        fs.writeSync(fd, meta, 0, meta.length, 0);
      } finally {
        fs.closeSync(fd);
      }
      return lockPath;
    } catch (err) {
      if (err.code !== 'EEXIST') {
        throw err;
      }
      // Check for stale lock with owner PID aliveness verification
      try {
        const stats = fs.statSync(lockPath);
        const age = Date.now() - stats.mtimeMs;
        if (age > staleThresholdMs) {
          let shouldEvict = false;
          try {
            const raw = fs.readFileSync(lockPath, 'utf8');
            const data = JSON.parse(raw);
            if (data && typeof data.pid === 'number') {
              try {
                // kill(pid, 0) tests if process exists
                process.kill(data.pid, 0);
                // If alive, only evict on emergency timeout (30s)
                if (age > 30000) shouldEvict = true;
              } catch (killErr) {
                if (killErr.code === 'ESRCH') {
                  // Process does not exist; owner is dead
                  shouldEvict = true;
                }
              }
            } else {
              shouldEvict = true;
            }
          } catch (_) {
            shouldEvict = true;
          }

          if (shouldEvict) {
            try { fs.unlinkSync(lockPath); } catch (_) {}
            const fd = fs.openSync(lockPath, 'wx');
            try {
              const meta = Buffer.from(JSON.stringify({ pid: process.pid, createdAt: Date.now() }), 'utf8');
              fs.writeSync(fd, meta, 0, meta.length, 0);
            } finally {
              fs.closeSync(fd);
            }
            return lockPath;
          }
        }
      } catch (_) {}

      // Sleep briefly before retry
      try {
        const waitBuf = new Int32Array(new SharedArrayBuffer(4));
        Atomics.wait(waitBuf, 0, 0, 20);
      } catch (_) {
        const s = Date.now();
        while (Date.now() - s < 20) {}
      }

      if (Date.now() - startTime > timeoutMs) {
        break;
      }
    }
  }

  // Force break stale lock if timeout exceeded and owner is dead or emergency
  try {
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
      const fd = fs.openSync(lockPath, 'wx');
      try {
        const meta = Buffer.from(JSON.stringify({ pid: process.pid, createdAt: Date.now() }), 'utf8');
        fs.writeSync(fd, meta, 0, meta.length, 0);
      } finally {
        fs.closeSync(fd);
      }
      return lockPath;
    }
  } catch (_) {}

  throw new Error('Could not acquire concurrency lock for repository intelligence cache');
}

function releaseCacheLock(lockPath) {
  try {
    if (lockPath && fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
    }
  } catch (_) {}
}

/**
 * Writes data atomically by writing to a unique temporary file and renaming.
 */
function writeFileSyncAtomic(filePath, data, encoding = 'utf8') {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmpPath = path.join(
    dir,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${crypto.randomBytes(4).toString('hex')}.tmp`,
  );
  fs.writeFileSync(tmpPath, data, encoding);
  fs.renameSync(tmpPath, filePath);
}

/**
 * Computes a SHA-256 digest of a file's content directly from disk.
 *
 * @param {string} filePath Absolute path to file
 * @returns {string} 64-char hex SHA-256
 */
function computeFileContentDigest(filePath) {
  const raw = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// ============================================================================
// Repository Intelligence Cache Class
// ============================================================================

class RepositoryIntelligenceCache {
  /**
   * @param {object} options
   * @param {string} options.workspace - Workspace root directory
   * @param {string} [options.cacheDir] - Custom cache storage directory
   * @param {number} [options.maxEntries=1000]
   * @param {number} [options.maxStorageBytes=52428800]
   * @param {number} [options.maxPayloadBytes=2097152]
   * @param {number} [options.lruMemoryLimit=200]
   */
  constructor(options = {}) {
    if (!options.workspace || typeof options.workspace !== 'string') {
      throw new Error('RepositoryIntelligenceCache requires options.workspace as a non-empty string');
    }

    this.workspace = path.resolve(options.workspace);
    this.repositoryId = computeRepositoryId(this.workspace);

    this.cacheDir = options.cacheDir
      ? path.resolve(options.cacheDir)
      : path.join(this.workspace, '.agent', 'intelligence', 'cache');

    this.entriesDir = path.join(this.cacheDir, 'entries');
    this.locksDir = path.join(this.cacheDir, 'locks');
    this.indexPath = path.join(this.cacheDir, 'index.json');

    this.maxEntries = options.maxEntries || DEFAULT_MAX_ENTRIES;
    this.maxStorageBytes = options.maxStorageBytes || DEFAULT_MAX_STORAGE_BYTES;
    this.maxPayloadBytes = options.maxPayloadBytes || MAX_PAYLOAD_BYTES;
    this.lruMemoryLimit = options.lruMemoryLimit || DEFAULT_LRU_MEMORY_LIMIT;
    this.lruMemoryBytes = options.lruMemoryBytes || DEFAULT_LRU_MEMORY_BYTES;
    this._lruMemoryBytes = 0;

    // Security check: Containment verification
    assertContainedPath(this.cacheDir, this.workspace, { allowAbsolute: true });
    assertContainedPath(this.entriesDir, this.workspace, { allowAbsolute: true });

    this._ensureDirs();

    // In-memory L1 LRU Cache: Map<cache_key, { entry, accessedAt: number, byteSize: number }>
    this._lruCache = new Map();

    // Observability Metrics
    this._metrics = {
      hits: 0,
      misses: 0,
      invalidations: 0,
      corrupt_rejections: 0,
      freshness_failures: 0,
      evictions: 0,
      entries_created: 0,
      bytes_read: 0,
      bytes_written: 0,
      reads_avoided: 0,
    };
  }

  _addLru(cacheKey, entry, byteSize = 0) {
    const size = byteSize || Buffer.byteLength(JSON.stringify(entry), 'utf8');
    if (this._lruCache.has(cacheKey)) {
      const prev = this._lruCache.get(cacheKey);
      this._lruMemoryBytes -= (prev && prev.byteSize) || 0;
    }

    while (
      (this._lruCache.size >= this.lruMemoryLimit || (this._lruMemoryBytes + size) > this.lruMemoryBytes) &&
      this._lruCache.size > 0
    ) {
      const oldestKey = this._lruCache.keys().next().value;
      const oldest = this._lruCache.get(oldestKey);
      this._lruMemoryBytes -= (oldest && oldest.byteSize) || 0;
      this._lruCache.delete(oldestKey);
    }

    this._lruCache.set(cacheKey, { entry, accessedAt: Date.now(), byteSize: size });
    this._lruMemoryBytes += size;
  }

  _ensureDirs() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
    if (!fs.existsSync(this.entriesDir)) {
      fs.mkdirSync(this.entriesDir, { recursive: true });
    }
    if (!fs.existsSync(this.locksDir)) {
      fs.mkdirSync(this.locksDir, { recursive: true });
    }
  }

  /**
   * Validates and returns the safe file path for a cache key.
   */
  _getEntryFilePath(cacheKey) {
    if (typeof cacheKey !== 'string' || !cacheKey.trim()) {
      throw new Error('Invalid cacheKey');
    }
    // Reject lexical path traversal attempts
    if (cacheKey.includes('..') || cacheKey.includes('/') || cacheKey.includes('\\') || cacheKey.includes('\0')) {
      throw new PathSecurityError(`Path security violation: Illegal directory traversal in cacheKey "${cacheKey}"`, 'ERR_PATH_TRAVERSAL');
    }
    // Reject Windows reserved device names
    const baseName = cacheKey.split('.')[0];
    if (WINDOWS_RESERVED_NAMES.test(baseName)) {
      throw new PathSecurityError(`Path security violation: Illegal Windows reserved device name in cacheKey "${cacheKey}"`, 'ERR_PATH_RESERVED_NAME');
    }
    const target = path.join(this.entriesDir, `${cacheKey}.json`);
    assertContainedPath(target, this.workspace, { allowAbsolute: true });
    return target;
  }

  /**
   * Safely loads the index manifest from disk or reconstructs it if missing/corrupt.
   */
  _loadIndex() {
    this._ensureDirs();
    if (!fs.existsSync(this.indexPath)) {
      return this.reconstructIndex();
    }
    try {
      const raw = fs.readFileSync(this.indexPath, 'utf8');
      const idx = JSON.parse(raw);
      if (idx && typeof idx === 'object' && idx.entries && typeof idx.entries === 'object') {
        return idx;
      }
      return this.reconstructIndex();
    } catch (_) {
      return this.reconstructIndex();
    }
  }

  /**
   * Reconstructs the index manifest by scanning and validating existing entry files.
   */
  reconstructIndex() {
    this._ensureDirs();
    const files = fs.readdirSync(this.entriesDir).filter(f => f.endsWith('.json'));
    const indexData = {
      schema_version: CACHE_SCHEMA_VERSION,
      reconstructed_at: new Date().toISOString(),
      entries: {},
    };

    for (const f of files) {
      const cacheKey = f.replace(/\.json$/, '');
      const filePath = path.join(this.entriesDir, f);
      try {
        const stat = fs.statSync(filePath);
        const raw = fs.readFileSync(filePath, 'utf8');
        const entry = JSON.parse(raw);
        const validation = validateCacheEntry(entry);
        if (validation.valid) {
          indexData.entries[cacheKey] = {
            cache_key: cacheKey,
            artifact_type: entry.artifact_type,
            relative_path: entry.relative_path,
            content_digest: entry.content_digest,
            size_bytes: stat.size,
            created_at: entry.created_at,
            last_accessed_at: stat.mtime.toISOString(),
            access_count: 1,
          };
        } else {
          // Unlink invalid entry on reconstruction
          try { fs.unlinkSync(filePath); } catch (_) {}
        }
      } catch (_) {
        try { fs.unlinkSync(filePath); } catch (_) {}
      }
    }

    try {
      writeFileSyncAtomic(this.indexPath, JSON.stringify(indexData, null, 2), 'utf8');
    } catch (_) {}

    return indexData;
  }

  /**
   * Updates an entry's access telemetry in the index manifest.
   */
  _touchIndexEntry(cacheKey) {
    try {
      const idx = this._loadIndex();
      if (idx.entries && idx.entries[cacheKey]) {
        idx.entries[cacheKey].last_accessed_at = new Date().toISOString();
        idx.entries[cacheKey].access_count = (idx.entries[cacheKey].access_count || 1) + 1;
        writeFileSyncAtomic(this.indexPath, JSON.stringify(idx, null, 2), 'utf8');
      }
    } catch (_) {}
  }

  /**
   * Enforces retention policy by removing least recently used (LRU) entries
   * when entry count or total disk storage exceeds limits.
   */
  _pruneIfExceeded() {
    try {
      const idx = this._loadIndex();
      const entries = Object.values(idx.entries || {});
      let totalBytes = entries.reduce((acc, e) => acc + (e.size_bytes || 0), 0);
      let totalCount = entries.length;

      if (totalCount <= this.maxEntries && totalBytes <= this.maxStorageBytes) {
        return;
      }

      // Sort LRU: oldest last_accessed_at first
      entries.sort((a, b) => Date.parse(a.last_accessed_at || a.created_at) - Date.parse(b.last_accessed_at || b.created_at));

      while ((totalCount > this.maxEntries || totalBytes > this.maxStorageBytes) && entries.length > 0) {
        const victim = entries.shift();
        const victimPath = path.join(this.entriesDir, `${victim.cache_key}.json`);
        try {
          if (fs.existsSync(victimPath)) {
            fs.unlinkSync(victimPath);
          }
        } catch (_) {}

        this._lruCache.delete(victim.cache_key);
        delete idx.entries[victim.cache_key];
        totalBytes -= (victim.size_bytes || 0);
        totalCount -= 1;
        this._metrics.evictions += 1;
      }

      writeFileSyncAtomic(this.indexPath, JSON.stringify(idx, null, 2), 'utf8');
    } catch (_) {}
  }

  /**
   * Verifies freshness of a cached entry against active disk state.
   *
   * @param {object} entry
   * @param {object} [options]
   * @returns {{ fresh: boolean, reason?: string }}
   */
  _verifyFreshness(entry, options = {}) {
    if (!entry.relative_path || !entry.content_digest) {
      return { fresh: true };
    }

    const fullPath = path.resolve(this.workspace, entry.relative_path);

    // Verify containment
    const contained = assertContainedPath(fullPath, this.workspace, { allowAbsolute: true });
    if (!contained) {
      return { fresh: false, reason: 'PATH_CONTAINMENT_VIOLATION' };
    }

    if (!fs.existsSync(fullPath)) {
      return { fresh: false, reason: 'FILE_DELETED' };
    }

    try {
      const currentDigest = computeFileContentDigest(fullPath);
      if (currentDigest !== entry.content_digest) {
        return { fresh: false, reason: 'FILE_MODIFIED' };
      }
    } catch (err) {
      return { fresh: false, reason: `READ_ERROR: ${err.message}` };
    }

    // Verify dependency digests if provided in options or entry
    if (Array.isArray(entry.dependency_digests) && entry.dependency_digests.length > 0 && Array.isArray(options.dependencyPaths)) {
      for (const depPath of options.dependencyPaths) {
        const fullDepPath = path.resolve(this.workspace, depPath);
        if (!fs.existsSync(fullDepPath)) {
          return { fresh: false, reason: `DEPENDENCY_DELETED: ${depPath}` };
        }
        try {
          const currentDepDigest = computeFileContentDigest(fullDepPath);
          if (!entry.dependency_digests.includes(currentDepDigest)) {
            return { fresh: false, reason: `DEPENDENCY_MODIFIED: ${depPath}` };
          }
        } catch (_) {
          return { fresh: false, reason: `DEPENDENCY_READ_ERROR: ${depPath}` };
        }
      }
    }

    return { fresh: true };
  }

  _buildProvenance(entry) {
    return {
      source: 'REPOSITORY_INTELLIGENCE_CACHE',
      cache_key: entry.cache_key,
      artifact_type: entry.artifact_type,
      repository_id: entry.repository_id,
      content_digest: entry.content_digest,
      retrieved_at: new Date().toISOString(),
      is_derived_optimization: true,
      governance_authority: 'NONE_ADVISORY_ONLY',
    };
  }

  /**
   * Retrieves a cached artifact by key with deterministic freshness validation.
   * Never throws to callers; returns { hit: false } on any verification error.
   *
   * @param {string} cacheKey
   * @param {object} [options]
   * @param {boolean} [options.validateFreshness=true]
   * @param {string[]} [options.dependencyPaths]
   * @returns {{ hit: boolean, payload?: any, entry?: object, provenance?: object, reason?: string, error?: string }}
   */
  get(cacheKey, options = {}) {
    const validateFreshness = options.validateFreshness !== false;

    try {
      let entry = null;

      // 1. Check in-memory L1 cache
      if (this._lruCache.has(cacheKey)) {
        const cachedItem = this._lruCache.get(cacheKey);
        cachedItem.accessedAt = Date.now();
        entry = cachedItem.entry;
      }

      // 2. Fall back to L2 disk cache
      if (!entry) {
        const filePath = this._getEntryFilePath(cacheKey);
        if (!fs.existsSync(filePath)) {
          this._metrics.misses += 1;
          return { hit: false, reason: 'KEY_NOT_FOUND' };
        }

        const stat = fs.statSync(filePath);
        if (stat.size > this.maxPayloadBytes) {
          this._metrics.corrupt_rejections += 1;
          this._metrics.misses += 1;
          try { fs.unlinkSync(filePath); } catch (_) {}
          return {
            hit: false,
            reason: 'OVERSIZED_PAYLOAD',
            error: `File size (${stat.size}) exceeds maximum allowed payload limit (${this.maxPayloadBytes} bytes)`,
          };
        }

        const raw = fs.readFileSync(filePath, 'utf8');
        this._metrics.bytes_read += Buffer.byteLength(raw, 'utf8');
        entry = JSON.parse(raw);

        const validation = validateCacheEntry(entry);
        if (!validation.valid) {
          this._metrics.corrupt_rejections += 1;
          this._metrics.misses += 1;
          try { fs.unlinkSync(filePath); } catch (_) {}
          return { hit: false, reason: 'CORRUPT_ENTRY', error: validation.error };
        }

        // Store into in-memory L1 with byte accounting
        this._addLru(cacheKey, entry, Buffer.byteLength(raw, 'utf8'));
      }

      // 3. Verify freshness against active repository working tree
      if (validateFreshness) {
        const freshness = this._verifyFreshness(entry, options);
        if (!freshness.fresh) {
          this._metrics.freshness_failures += 1;
          this._metrics.misses += 1;
          // Invalidate stale entry
          this.invalidateKey(cacheKey);
          return { hit: false, reason: 'STALE', error: freshness.reason };
        }
      }

      // 4. Record access telemetry
      this._metrics.hits += 1;
      this._metrics.reads_avoided += 1;
      this._touchIndexEntry(cacheKey);

      return {
        hit: true,
        payload: entry.payload,
        entry,
        provenance: this._buildProvenance(entry),
      };
    } catch (err) {
      this._metrics.misses += 1;
      return { hit: false, reason: 'CACHE_ERROR', error: err.message };
    }
  }

  /**
   * Convenience helper to retrieve an artifact by high-level descriptor.
   */
  getArtifact(artifactType, relativePath, options = {}) {
    try {
      const contentDigest = options.content_digest || (options.autoDigest && options.workspace
        ? computeFileContentDigest(path.resolve(options.workspace, relativePath))
        : '');

      const cacheKey = computeCacheKey({
        artifact_type: artifactType,
        repository_id: this.repositoryId,
        relative_path: relativePath,
        content_digest: contentDigest,
        dependency_digests: options.dependency_digests || [],
        producer_version: options.producer_version || '1.0.0',
        configuration_fingerprint: options.configuration_fingerprint || '0'.repeat(64),
      });

      return this.get(cacheKey, options);
    } catch (err) {
      this._metrics.misses += 1;
      return { hit: false, reason: 'KEY_COMPUTATION_ERROR', error: err.message };
    }
  }

  /**
   * Stores a new derived artifact in the cache with atomic file writes and concurrency locking.
   *
   * @param {object} params
   * @returns {object} Sealed cache entry
   */
  set(params = {}) {
    const entry = createCacheEntry({
      ...params,
      repository_id: this.repositoryId,
    });

    const lockPath = acquireCacheLock(this.locksDir);

    try {
      const filePath = this._getEntryFilePath(entry.cache_key);
      const serialized = JSON.stringify(entry, null, 2);
      const byteSize = Buffer.byteLength(serialized, 'utf8');

      if (byteSize > this.maxPayloadBytes) {
        throw new Error(`Serialized entry exceeds maximum allowed payload limit (${this.maxPayloadBytes} bytes)`);
      }

      writeFileSyncAtomic(filePath, serialized, 'utf8');
      this._metrics.bytes_written += byteSize;
      this._metrics.entries_created += 1;

      // Update in-memory L1 with byte accounting
      this._addLru(entry.cache_key, entry, byteSize);

      // Update index manifest
      const idx = this._loadIndex();
      idx.entries[entry.cache_key] = {
        cache_key: entry.cache_key,
        artifact_type: entry.artifact_type,
        relative_path: entry.relative_path,
        content_digest: entry.content_digest,
        size_bytes: byteSize,
        created_at: entry.created_at,
        last_accessed_at: entry.created_at,
        access_count: 1,
      };

      writeFileSyncAtomic(this.indexPath, JSON.stringify(idx, null, 2), 'utf8');

      // Prune if exceeded limits
      this._pruneIfExceeded();

      return entry;
    } finally {
      releaseCacheLock(lockPath);
    }
  }

  /**
   * Invalidates a specific key.
   */
  invalidateKey(cacheKey) {
    if (this._lruCache.has(cacheKey)) {
      const item = this._lruCache.get(cacheKey);
      this._lruMemoryBytes -= (item && item.byteSize) || 0;
      this._lruCache.delete(cacheKey);
    }

    const lockPath = acquireCacheLock(this.locksDir);
    try {
      const filePath = this._getEntryFilePath(cacheKey);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      const idx = this._loadIndex();
      if (idx.entries && idx.entries[cacheKey]) {
        delete idx.entries[cacheKey];
        writeFileSyncAtomic(this.indexPath, JSON.stringify(idx, null, 2), 'utf8');
      }
      this._metrics.invalidations += 1;
      return true;
    } catch (_) {
      return false;
    } finally {
      releaseCacheLock(lockPath);
    }
  }

  /**
   * Invalidates all cache entries referencing a relative file path.
   */
  invalidateFile(relativePath) {
    const normalized = (relativePath || '').replace(/\\/g, '/');
    const lockPath = acquireCacheLock(this.locksDir);
    let count = 0;

    try {
      const idx = this._loadIndex();
      const entries = Object.values(idx.entries || {});

      for (const e of entries) {
        const matches = e.relative_path === normalized ||
          (process.platform === 'win32' && e.relative_path.toLowerCase() === normalized.toLowerCase());
        if (matches) {
          const filePath = path.join(this.entriesDir, `${e.cache_key}.json`);
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          } catch (_) {}
          if (this._lruCache.has(e.cache_key)) {
            const item = this._lruCache.get(e.cache_key);
            this._lruMemoryBytes -= (item && item.byteSize) || 0;
            this._lruCache.delete(e.cache_key);
          }
          delete idx.entries[e.cache_key];
          count += 1;
        }
      }

      if (count > 0) {
        writeFileSyncAtomic(this.indexPath, JSON.stringify(idx, null, 2), 'utf8');
      }
      this._metrics.invalidations += count;
      return count;
    } finally {
      releaseCacheLock(lockPath);
    }
  }

  /**
   * Purges all cache entries and resets the manifest index.
   */
  invalidateAll() {
    this._lruCache.clear();
    this._lruMemoryBytes = 0;
    const lockPath = acquireCacheLock(this.locksDir);

    try {
      const files = fs.readdirSync(this.entriesDir).filter(f => f.endsWith('.json'));
      for (const f of files) {
        try {
          fs.unlinkSync(path.join(this.entriesDir, f));
        } catch (_) {}
      }

      const freshIndex = {
        schema_version: CACHE_SCHEMA_VERSION,
        reconstructed_at: new Date().toISOString(),
        entries: {},
      };
      writeFileSyncAtomic(this.indexPath, JSON.stringify(freshIndex, null, 2), 'utf8');
      this._metrics.invalidations += files.length;
      return files.length;
    } finally {
      releaseCacheLock(lockPath);
    }
  }

  /**
   * Returns a copy of privacy-safe operational metrics.
   */
  getMetrics() {
    const totalRequests = this._metrics.hits + this._metrics.misses;
    const hitRate = totalRequests > 0 ? (this._metrics.hits / totalRequests) : 0;

    return {
      ...this._metrics,
      total_requests: totalRequests,
      hit_rate: Math.round(hitRate * 1000) / 1000,
      active_l1_entries: this._lruCache.size,
    };
  }
}

/**
 * Factory helper for creating or retrieving a repository intelligence cache instance.
 */
function createRepositoryCache(options = {}) {
  return new RepositoryIntelligenceCache(options);
}

module.exports = {
  RepositoryIntelligenceCache,
  createRepositoryCache,
  acquireCacheLock,
  releaseCacheLock,
  computeFileContentDigest,
  DEFAULT_MAX_ENTRIES,
  DEFAULT_MAX_STORAGE_BYTES,
};
