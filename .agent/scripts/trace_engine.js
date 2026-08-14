'use strict';

/**
 * trace_engine.js — Failure Context Snapshot & Replay Engine
 *
 * Captures, stores, lists, and replays causal trace snapshots when
 * behavioral contracts or guardrails are violated.
 */

const fs = require('fs');
const path = require('path');

function getTracesDir(projectRoot) {
  const tracesDir = path.join(projectRoot, '.tribunal', 'traces');
  if (!fs.existsSync(tracesDir)) {
    fs.mkdirSync(tracesDir, { recursive: true });
  }
  return tracesDir;
}

function captureSnapshot(projectRoot, violation) {
  const tracesDir = getTracesDir(projectRoot);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const contractSlug = (violation.contract || 'violation')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');

  const snapshotId = `trace-${timestamp}-${contractSlug}`;
  const snapshotPath = path.join(tracesDir, `${snapshotId}.json`);

  const payload = {
    id: snapshotId,
    timestamp: new Date().toISOString(),
    contract: violation.contract,
    severity: violation.severity || 'warn',
    target_file: violation.file,
    violation: {
      rule: violation.rule,
      line: violation.line || null,
      snippet: violation.snippet || null,
      message: violation.message,
    },
    context: {
      git_branch: getGitBranch(projectRoot),
      recorded_at: new Date().toLocaleTimeString(),
    },
  };

  fs.writeFileSync(snapshotPath, JSON.stringify(payload, null, 2), 'utf8');
  return payload;
}

function listSnapshots(projectRoot) {
  const tracesDir = getTracesDir(projectRoot);
  const snapshots = [];

  try {
    const files = fs.readdirSync(tracesDir);
    for (const f of files) {
      if (f.endsWith('.json')) {
        const fullPath = path.join(tracesDir, f);
        try {
          const raw = fs.readFileSync(fullPath, 'utf8');
          const data = JSON.parse(raw);
          snapshots.push(data);
        } catch {
          // Ignore corrupt snapshot
        }
      }
    }
  } catch {
    // Ignore read errors
  }

  // Sort newest first
  snapshots.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return snapshots;
}

function replaySnapshot(projectRoot, snapshotId) {
  const tracesDir = getTracesDir(projectRoot);
  let targetFile = snapshotId;

  if (!snapshotId.endsWith('.json')) {
    targetFile = `${snapshotId}.json`;
  }

  const fullPath = path.join(tracesDir, targetFile);
  if (!fs.existsSync(fullPath)) {
    // Search by partial match
    const snapshots = listSnapshots(projectRoot);
    const match = snapshots.find(
      s => (s.id && s.id.includes(snapshotId)) || (s.contract && s.contract.includes(snapshotId)),
    );
    if (match) return match;
    return null;
  }

  try {
    const raw = fs.readFileSync(fullPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getGitBranch(projectRoot) {
  try {
    const headPath = path.join(projectRoot, '.git', 'HEAD');
    if (fs.existsSync(headPath)) {
      const content = fs.readFileSync(headPath, 'utf8').trim();
      const match = content.match(/ref: refs\/heads\/(.+)/);
      if (match) return match[1];
    }
  } catch {
    // Fallback
  }
  return 'main';
}

module.exports = {
  captureSnapshot,
  listSnapshots,
  replaySnapshot,
};
