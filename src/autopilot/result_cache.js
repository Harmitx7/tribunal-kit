'use strict';

const fs = require('node:fs');
const { createHash } = require('node:crypto');
const { z } = require('zod');
const { walkRepository } = require('../../.agent/scripts/architecture_extractor');
const { assertWithinRoot } = require('../utils/path_containment');
const {
  computeCacheKey,
  computePayloadDigest,
  computeRepositoryId,
} = require('../system1/repository_cache_contract');
const { deepClone, redactSecrets } = require('../activity/schema');

const scanLimits = Object.freeze({ maxFiles: 600, maxDepth: 12, maxFileSize: 256 * 1024 });
const evidenceSchema = z
  .array(
    z.strictObject({
      file: z.string().max(256),
      tier: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
      affected: z.int().nonnegative(),
    }),
  )
  .min(1)
  .max(6);

// Hash actual scanner inputs, including ignored source that Git status would omit.
// Saturation, unreadable inputs, and non-regular files make the result ineligible.
function fingerprintSources(root, deadline) {
  try {
    const files = walkRepository(root, root, [], 0, {
      ...scanLimits,
      sourceOnly: true,
      assertWithinRoot,
    });
    if (files.length >= scanLimits.maxFiles) return null;
    const hash = createHash('sha256');
    let remaining = 8 * 1024 * 1024;
    for (const { relPath } of files) {
      if (Date.now() >= deadline) return null;
      const file = assertWithinRoot(root, relPath);
      const stat = fs.lstatSync(file);
      if (!stat.isFile() || stat.size > scanLimits.maxFileSize || stat.size > remaining)
        return null;
      const contents = fs.readFileSync(file);
      remaining -= contents.length;
      if (contents.length !== stat.size || remaining < 0) return null;
      hash.update(JSON.stringify([relPath, createHash('sha256').update(contents).digest('hex')]));
    }
    return hash.digest('hex');
  } catch {
    return null;
  }
}

function createResultCache(root, configuration) {
  const entries = new Map();
  const ttl = 120000;
  const capacity = 64;
  let repositoryId;
  function key(capabilityId, targetScope, repoStateHash, sourceHash) {
    if (!sourceHash) return null;
    repositoryId ||= computeRepositoryId(fs.realpathSync(root));
    return computeCacheKey({
      artifact_type: 'SAFE_DERIVED_METADATA',
      repository_id: repositoryId,
      content_digest: repoStateHash,
      dependency_digests: [
        sourceHash,
        computePayloadDigest([capabilityId, [...targetScope].sort()]),
      ],
      configuration_fingerprint: configuration,
    });
  }
  function get(id) {
    const entry = id && entries.get(id);
    if (!entry) return null;
    entries.delete(id);
    if (entry.expires <= Date.now()) return null;
    entries.set(id, entry);
    return deepClone(entry.evidence);
  }
  function set(id, evidence) {
    if (!id) return;
    const checked = evidenceSchema.safeParse(redactSecrets(evidence));
    if (!checked.success) return;
    entries.delete(id);
    entries.set(id, { evidence: checked.data, expires: Date.now() + ttl });
    if (entries.size > capacity) entries.delete(entries.keys().next().value);
  }
  return { key, get, set };
}

module.exports = { createResultCache, evidenceSchema, fingerprintSources, scanLimits };
