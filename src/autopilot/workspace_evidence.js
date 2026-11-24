'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { assertWithinRoot } = require('../utils/path_containment');
const { BlastRadiusEngine } = require('../../.agent/scripts/blast_radius_engine');
const { paths } = require('./intent_context');

function canonicalRealpath(targetPath) {
  return typeof fs.realpathSync.native === 'function'
    ? fs.realpathSync.native(targetPath)
    : fs.realpathSync(targetPath);
}

/**
 * Capture bounded Git evidence. The optional architecture model must describe this snapshot.
 * @param {string} root
 * @param {string[]} targets
 * @param {{model?: any, workingTreeDigest?: string}} [topology]
 * @param {number} [deadline]
 */
function collectWorkspaceEvidence(root, targets, topology = {}, deadline = Infinity) {
  let cwd;
  try {
    cwd = canonicalRealpath(root);
  } catch {
    return null;
  }
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !/^GIT_/i.test(name)),
  );
  const git = args => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error('Workspace evidence deadline expired.');
    return execFileSync(
      'git',
      ['--no-pager', '--no-optional-locks', '-c', 'core.fsmonitor=false', '-C', cwd, ...args],
      {
        env,
        encoding: 'utf8',
        maxBuffer: 64 * 1024,
        timeout: Math.min(2000, remaining),
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
  };
  const diffArgs = [
    'diff',
    '--no-ext-diff',
    '--no-textconv',
    '--no-renames',
    '--binary',
    'HEAD',
    '--',
  ];
  const split = value => value.split('\0').filter(Boolean);
  try {
    const toplevel = canonicalRealpath(git(['rev-parse', '--show-toplevel']).trim());
    const mismatch =
      process.platform === 'win32'
        ? cwd.toLowerCase() !== toplevel.toLowerCase()
        : path.relative(cwd, toplevel) !== '';
    if (mismatch) return null;
    const baseDigest = git(['rev-parse', 'HEAD']).trim();
    const tracked = split(git(['diff', '--no-renames', '--name-only', '-z', 'HEAD', '--']));
    const untrackedArgs = ['ls-files', '--others', '--exclude-standard', '-z'];
    const untracked = split(git(untrackedArgs)).sort();
    const stagedArgs = [...diffArgs.slice(0, 1), '--cached', ...diffArgs.slice(1)];
    const staged = git(stagedArgs);
    const stagedPaths = split(
      git(['diff', '--cached', '--no-renames', '--name-only', '-z', 'HEAD', '--']),
    );
    const diff = git(diffArgs);
    const allTouched = [...new Set([...tracked, ...untracked, ...stagedPaths])];
    const touchedPaths = paths(allTouched);
    if (touchedPaths.length !== allTouched.length) return null;
    const hash = createHash('sha256').update(
      JSON.stringify([baseDigest, touchedPaths, diff, staged]),
    );
    let remaining = 64 * 1024;
    const untrackedHashes = new Map();
    for (const file of untracked) {
      const fullPath = assertWithinRoot(cwd, file);
      const entry = fs.lstatSync(fullPath);
      if (!entry.isFile() || entry.size > remaining) return null;
      const contents = fs.readFileSync(fullPath);
      remaining -= contents.length;
      if (remaining < 0) return null;
      const contentHash = createHash('sha256').update(contents).digest('hex');
      hash.update(JSON.stringify([file, contentHash]));
      untrackedHashes.set(file, { contentHash, size: contents.length });
    }
    const workingTreeDigest = hash.digest('hex');
    const observedPaths = paths(targets).filter(file => {
      try {
        return fs.statSync(assertWithinRoot(cwd, file)).isFile();
      } catch {
        return false;
      }
    });
    const topologyPaths = [];
    const blastPaths = [];
    const blastRisk = Object.create(null);
    if (topology.model && topology.workingTreeDigest === workingTreeDigest) {
      const engine = new BlastRadiusEngine(topology.model);
      for (const file of observedPaths) {
        const entity = topology.model.entities?.find(entry =>
          [entry.scope, ...(entry.sources || []).map(source => source.file)].some(candidate =>
            paths([candidate]).includes(file),
          ),
        );
        if (!entity) continue;
        const result = engine.computeBlastRadius(entity.id, 2);
        if (result.found) {
          topologyPaths.push(file);
          if (result.transitiveRings.length) blastPaths.push(file);
          blastRisk[file] = result.metrics.riskTier;
        }
      }
    }
    if (
      git(['rev-parse', 'HEAD']).trim() !== baseDigest ||
      git(diffArgs) !== diff ||
      git(stagedArgs) !== staged ||
      JSON.stringify(split(git(untrackedArgs)).sort()) !== JSON.stringify(untracked)
    ) {
      return null;
    }
    for (const [file, { contentHash, size }] of untrackedHashes) {
      const fullPath = assertWithinRoot(cwd, file);
      const entry = fs.lstatSync(fullPath);
      if (
        !entry.isFile() ||
        entry.size !== size ||
        createHash('sha256').update(fs.readFileSync(fullPath)).digest('hex') !== contentHash
      )
        return null;
    }
    return {
      root: cwd,
      fresh: true,
      baseDigest,
      workingTreeDigest,
      touchedPaths,
      diff,
      observedPaths,
      topologyPaths,
      blastPaths,
      blastRisk,
    };
  } catch {
    return null;
  }
}

module.exports = { collectWorkspaceEvidence };
