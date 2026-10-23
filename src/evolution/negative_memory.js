'use strict';

/**
 * negative_memory.js — Negative Case-Based Reasoning (CBR) & Anti-Oscillation Buffer
 * ===================================================================================
 * Tracks and persists rejected skill and prompt mutations to prevent the optimizer
 * from repeating known failure modes or oscillating between alternating edits.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { assertWithinRoot, validateResourceId } = require('../security/boundary');

/**
 * Computes Levenshtein distance between two strings.
 */
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Computes normalized similarity between 0.0 (completely different) and 1.0 (identical).
 */
function normalizedSimilarity(a, b) {
  const sA = (a || '').trim();
  const sB = (b || '').trim();
  if (sA.length === 0 && sB.length === 0) return 1.0;
  const maxLen = Math.max(sA.length, sB.length);
  if (maxLen === 0) return 1.0;
  return 1.0 - levenshtein(sA, sB) / maxLen;
}

function getBufferPath(agentDir) {
  return path.join(agentDir, 'history', 'skill-optimization', 'rejected-buffer.json');
}

/**
 * Records a rejected edit batch into persistent history.
 */
function recordRejection(agentDir, skillName, epoch, edits = [], reason = '') {
  const dir = path.join(agentDir, 'history', 'skill-optimization');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filePath = getBufferPath(agentDir);
  let buffer = [];

  if (fs.existsSync(filePath)) {
    try {
      buffer = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (_) {
      buffer = [];
    }
  }

  const id = `REJ-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const record = {
    id,
    skillName,
    epoch,
    timestamp: new Date().toISOString(),
    edits: Array.isArray(edits) ? edits : [edits],
    reason: String(reason || 'Rejected by validation gate'),
  };

  buffer.push(record);

  // Write atomically
  const tmpPath = `${filePath}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(buffer, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);

  return record;
}

/**
 * Loads all rejection records from history, optionally filtered by skill name.
 */
function loadRejections(agentDir, skillName = null) {
  const filePath = getBufferPath(agentDir);
  if (!fs.existsSync(filePath)) return [];

  let buffer = [];
  try {
    buffer = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return [];
  }

  if (skillName) {
    return buffer.filter(b => b.skillName === skillName);
  }
  return buffer;
}

/**
 * Formats rejection history as negative constraints for LLM reflection prompts.
 */
function formatNegativeConstraints(rejections, limit = 5) {
  if (!rejections || rejections.length === 0) return '';

  const recent = rejections.slice(-limit).reverse();
  const lines = [
    '### Previously Rejected Edits (Negative Constraints):',
    'Do NOT propose edits identical or substantially similar to these failed attempts:',
  ];

  for (const r of recent) {
    lines.push(`\n- **Epoch ${r.epoch} Failure** (Reason: ${r.reason}):`);
    for (const edit of r.edits) {
      if (typeof edit === 'string') {
        lines.push(`  - Content: ${edit.slice(0, 150)}`);
      } else if (edit && typeof edit === 'object') {
        const op = edit.op || 'edit';
        const target = edit.target ? ` on "${edit.target}"` : '';
        const contentSnippet = (edit.content || '').slice(0, 150).replace(/\n/g, ' ');
        lines.push(`  - [OP: ${op}]${target} -> "${contentSnippet}"`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Checks if a candidate edit is identical or near-identical to any previously rejected edit.
 */
function isPreviouslyRejected(candidateEdit, rejections, threshold = 0.85) {
  if (!candidateEdit || !rejections || rejections.length === 0) {
    return { rejected: false };
  }

  const candidateContent = (typeof candidateEdit === 'string' ? candidateEdit : candidateEdit.content || '').trim();
  const candidateOp = typeof candidateEdit === 'object' ? candidateEdit.op || '' : '';
  const candidateTarget = typeof candidateEdit === 'object' ? (candidateEdit.target || '').trim() : '';

  for (const r of rejections) {
    for (const pastEdit of r.edits || []) {
      const pastContent = (typeof pastEdit === 'string' ? pastEdit : pastEdit.content || '').trim();
      const pastOp = typeof pastEdit === 'object' ? pastEdit.op || '' : '';
      const pastTarget = typeof pastEdit === 'object' ? (pastEdit.target || '').trim() : '';

      // Direct exact match
      if (candidateContent === pastContent) {
        return {
          rejected: true,
          matchType: 'EXACT',
          pastRecordId: r.id,
          reason: r.reason,
        };
      }

      // High similarity match if content length > 15 chars
      if (candidateContent.length > 15 && pastContent.length > 15) {
        const sim = normalizedSimilarity(candidateContent, pastContent);
        if (sim >= threshold) {
          return {
            rejected: true,
            matchType: 'FUZZY',
            similarity: sim,
            pastRecordId: r.id,
            reason: r.reason,
          };
        }
      }
    }
  }

  return { rejected: false };
}

module.exports = {
  recordRejection,
  loadRejections,
  formatNegativeConstraints,
  isPreviouslyRejected,
  normalizedSimilarity,
};
