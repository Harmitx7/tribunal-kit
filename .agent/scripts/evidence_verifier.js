#!/usr/bin/env node
/**
 * evidence_verifier.js — Source Evidence Verification
 *
 * Verifies that evidence locations actually exist in the repository.
 * Detects fabricated source locations and stale evidence.
 *
 * Trust boundary: evidence is UNTRUSTED until this module confirms it.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Parse an evidence location string into file and line.
 * Accepts formats: "file.py:42", "file.py", "path/to/file.py:100"
 */
function parseEvidenceLocation(loc) {
  if (!loc || typeof loc !== 'string') return null;
  const match = loc.match(/^(.+?)(?::(\d+))?$/);
  if (!match) return null;
  return { file: match[1], line: match[2] ? parseInt(match[2], 10) : null };
}

/**
 * Verify a single evidence item against the repository.
 *
 * Returns:
 *   { verified: true, content_hash, actual_content }  — if file+line exist
 *   { verified: false, reason }                       — if fabricated/stale
 */
function verifyEvidence(evidence, repoRoot) {
  if (!evidence.location) {
    return { verified: false, reason: 'No location specified in evidence.' };
  }

  const parsed = parseEvidenceLocation(evidence.location);
  if (!parsed) {
    return { verified: false, reason: `Cannot parse location: ${evidence.location}` };
  }

  // Resolve and enforce path boundary
  const resolvedFile = path.resolve(repoRoot, parsed.file);
  const normalizedRepo = path.resolve(repoRoot);
  if (!resolvedFile.startsWith(normalizedRepo)) {
    return { verified: false, reason: `Path traversal detected: ${parsed.file}` };
  }

  if (!fs.existsSync(resolvedFile)) {
    return { verified: false, reason: `File does not exist: ${parsed.file}` };
  }

  let fileContent;
  try {
    fileContent = fs.readFileSync(resolvedFile, 'utf8');
  } catch (e) {
    return { verified: false, reason: `Cannot read file: ${e.message}` };
  }

  const lines = fileContent.split('\n');

  if (parsed.line !== null) {
    if (parsed.line < 1 || parsed.line > lines.length) {
      return {
        verified: false,
        reason: `Line ${parsed.line} does not exist in ${parsed.file} (file has ${lines.length} lines)`,
      };
    }

    const actualLine = lines[parsed.line - 1];
    const lineHash = crypto.createHash('sha256').update(actualLine).digest('hex').substring(0, 16);

    return {
      verified: true,
      actual_content: actualLine.trim(),
      content_hash: lineHash,
      file: parsed.file,
      line: parsed.line,
    };
  }

  // File exists but no line specified
  const fileHash = crypto.createHash('sha256').update(fileContent).digest('hex').substring(0, 16);
  return {
    verified: true,
    content_hash: fileHash,
    file: parsed.file,
    line: null,
  };
}

/**
 * Verify all evidence items in a finding.
 * Returns the finding with evidence_verification results attached.
 */
function verifyFindingEvidence(finding, repoRoot) {
  if (!finding.evidence || !Array.isArray(finding.evidence)) {
    return { ...finding, evidence_verification: { status: 'NO_EVIDENCE' } };
  }

  const results = finding.evidence.map(e => ({
    evidence: e,
    verification: verifyEvidence(e, repoRoot),
  }));

  const verifiedCount = results.filter(r => r.verification.verified).length;
  const totalCount = results.length;

  let status;
  if (verifiedCount === 0) {
    status = 'ALL_FABRICATED';
  } else if (verifiedCount === totalCount) {
    status = 'ALL_VERIFIED';
  } else {
    status = 'PARTIAL';
  }

  return {
    ...finding,
    evidence_verification: {
      status,
      verified_count: verifiedCount,
      total_count: totalCount,
      details: results.map(r => ({
        location: r.evidence.location,
        verified: r.verification.verified,
        reason: r.verification.reason,
        content_hash: r.verification.content_hash,
      })),
    },
  };
}

/**
 * Check if evidence has become stale by comparing content hashes.
 * A hash mismatch means the code changed after the finding was generated.
 */
function checkStaleEvidence(finding, repoRoot) {
  if (!finding.evidence || !Array.isArray(finding.evidence)) return finding;

  const staleItems = [];
  for (const e of finding.evidence) {
    if (!e.location || !e.content_hash) continue;
    const current = verifyEvidence(e, repoRoot);
    if (current.verified && current.content_hash !== e.content_hash) {
      staleItems.push({
        location: e.location,
        original_hash: e.content_hash,
        current_hash: current.content_hash,
      });
    }
  }

  if (staleItems.length > 0) {
    return {
      ...finding,
      stale_evidence: staleItems,
    };
  }
  return finding;
}

module.exports = {
  parseEvidenceLocation,
  verifyEvidence,
  verifyFindingEvidence,
  checkStaleEvidence,
};
