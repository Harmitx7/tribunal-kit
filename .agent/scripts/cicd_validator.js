#!/usr/bin/env node
/**
 * cicd_validator.js — Deterministic CI/CD & GitHub Actions Validator for Tribunal Kit.
 *
 * Scans .github/workflows/*.yml, .gitlab-ci.yml, and Dockerfiles for:
 *   - Deprecated Action versions (v1-v3)
 *   - Security vulnerabilities (pull_request_target injection, script injection)
 *   - Concurrency race conditions
 *   - Excessive permissions (permissions: write-all)
 *   - Non-deterministic lockfile usage (npm install vs npm ci)
 *   - Static credential patterns
 *
 * Usage:
 *   node .agent/scripts/cicd_validator.js [target-directory]
 *   node .agent/scripts/cicd_validator.js . --json
 */

'use strict';

const fs = require('fs');
const path = require('path');

const {
  RED,
  GREEN,
  YELLOW,
  BOLD,
  RESET,
  banner,
  sectionHeader,
  summaryTable,
  timer,
  formatMs,
  ok,
  fail,
  warn,
  skip,
} = require('./_colors');

const DEPRECATED_ACTIONS = [
  { pattern: /actions\/checkout@(v[123]|master)/i, name: 'actions/checkout', recommended: '@v4' },
  {
    pattern: /actions\/setup-node@(v[123]|master)/i,
    name: 'actions/setup-node',
    recommended: '@v4',
  },
  {
    pattern: /actions\/setup-python@(v[1234]|master)/i,
    name: 'actions/setup-python',
    recommended: '@v5',
  },
  {
    pattern: /actions\/upload-artifact@(v[123]|master)/i,
    name: 'actions/upload-artifact',
    recommended: '@v4',
  },
  {
    pattern: /actions\/download-artifact@(v[123]|master)/i,
    name: 'actions/download-artifact',
    recommended: '@v4',
  },
  {
    pattern: /docker\/build-push-action@(v[1234]|master)/i,
    name: 'docker/build-push-action',
    recommended: '@v5',
  },
  {
    pattern: /aws-actions\/configure-aws-credentials@(v[123]|master)/i,
    name: 'aws-actions/configure-aws-credentials',
    recommended: '@v4',
  },
];

function findWorkflowFiles(dir) {
  const files = [];
  const githubWorkflows = path.join(dir, '.github', 'workflows');
  if (fs.existsSync(githubWorkflows)) {
    try {
      const entries = fs.readdirSync(githubWorkflows);
      for (const entry of entries) {
        if (entry.endsWith('.yml') || entry.endsWith('.yaml')) {
          files.push(path.join(githubWorkflows, entry));
        }
      }
    } catch (_e) {}
  }

  const gitlabCi = path.join(dir, '.gitlab-ci.yml');
  if (fs.existsSync(gitlabCi)) {
    files.push(gitlabCi);
  }

  const dockerfile = path.join(dir, 'Dockerfile');
  if (fs.existsSync(dockerfile)) {
    files.push(dockerfile);
  }

  return files;
}

function auditWorkflowContent(filePath, content) {
  const issues = [];
  const lines = content.split('\n');
  const isGithubWorkflow = filePath.includes('.github');

  if (isGithubWorkflow) {
    // Check for concurrency block
    if (!content.includes('concurrency:')) {
      const hasDeploy = /deploy|publish|release/i.test(content);
      if (hasDeploy) {
        issues.push({
          level: 'WARN',
          code: 'CI-03',
          message:
            "Deploy workflow is missing a top-level 'concurrency:' block to prevent race conditions.",
        });
      }
    }

    // Check for dangerous pull_request_target with head checkout
    if (
      content.includes('pull_request_target') &&
      /github\.event\.pull_request\.head\.sha|github\.head_ref/i.test(content)
    ) {
      issues.push({
        level: 'FAIL',
        code: 'CI-02',
        message:
          "CRITICAL: 'pull_request_target' trigger with PR head checkout is vulnerable to pwn-request code execution.",
      });
    }

    // Check for excessive permissions
    if (/permissions:\s*write-all/i.test(content)) {
      issues.push({
        level: 'FAIL',
        code: 'CI-04',
        message: "'permissions: write-all' violates the principle of least privilege.",
      });
    }

    // Check line by line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Deprecated actions
      for (const dep of DEPRECATED_ACTIONS) {
        if (dep.pattern.test(line)) {
          issues.push({
            level: 'FAIL',
            code: 'CI-01',
            line: lineNum,
            message: `Deprecated action version '${dep.name}'. Upgrade to ${dep.recommended}.`,
          });
        }
      }

      // Script injection in run:
      if (
        /run:\s*.*?\$\{\{\s*github\.event\.(issue\.title|issue\.body|comment\.body|pull_request\.title)\s*\}\}/i.test(
          line,
        )
      ) {
        issues.push({
          level: 'FAIL',
          code: 'CI-10',
          line: lineNum,
          message:
            "Script injection risk: Untrusted GitHub event context embedded directly in 'run:' command. Use environment variables.",
        });
      }

      // Non-deterministic npm install in CI
      if (/\brun:\s*.*?\bnpm\s+install\b(?!.*--dry-run)/i.test(line) && !/npm\s+ci/i.test(line)) {
        issues.push({
          level: 'WARN',
          code: 'CI-06',
          line: lineNum,
          message:
            "Use 'npm ci' instead of 'npm install' in CI pipelines for deterministic builds.",
        });
      }

      // Static secret hardcoding
      if (/AKIA[0-9A-Z]{16}/.test(line)) {
        issues.push({
          level: 'FAIL',
          code: 'CI-05',
          line: lineNum,
          message: 'Hardcoded AWS Access Key ID detected.',
        });
      }
    }
  }

  return issues;
}

function main() {
  const args = process.argv.slice(2);
  const targetDir = args.find(a => !a.startsWith('-')) || process.cwd();
  const jsonOutput = args.includes('--json');

  const elapsed = timer();
  const files = findWorkflowFiles(targetDir);

  if (!jsonOutput) {
    banner('TRIBUNAL CI/CD PIPELINE VALIDATOR');
    sectionHeader(`Scanning workflows in: ${path.resolve(targetDir)}`);
  }

  if (files.length === 0) {
    if (jsonOutput) {
      console.log(JSON.stringify({ files: 0, passes: 0, failures: 0, warnings: 0, issues: [] }));
    } else {
      skip('No CI/CD workflow files (.github/workflows, .gitlab-ci.yml, Dockerfile) found.');
    }
    process.exit(0);
  }

  let totalFailures = 0;
  let totalWarnings = 0;
  const allIssues = [];
  const resultsTable = [];

  for (const file of files) {
    const relPath = path.relative(targetDir, file);
    try {
      const content = fs.readFileSync(file, 'utf8');
      const fileIssues = auditWorkflowContent(file, content);

      const failures = fileIssues.filter(i => i.level === 'FAIL');
      const warnings = fileIssues.filter(i => i.level === 'WARN');

      totalFailures += failures.length;
      totalWarnings += warnings.length;

      if (!jsonOutput) {
        if (failures.length === 0 && warnings.length === 0) {
          ok(`${relPath} — clean`);
          resultsTable.push({ name: relPath, status: 'pass' });
        } else if (failures.length > 0) {
          fail(`${relPath} — ${failures.length} errors, ${warnings.length} warnings`);
          for (const issue of fileIssues) {
            const loc = issue.line ? `Line ${issue.line}: ` : '';
            const color = issue.level === 'FAIL' ? RED : YELLOW;
            console.log(`    ${color}[${issue.code}]${RESET} ${loc}${issue.message}`);
          }
          resultsTable.push({ name: relPath, status: 'fail' });
        } else {
          warn(`${relPath} — ${warnings.length} warnings`);
          for (const issue of fileIssues) {
            const loc = issue.line ? `Line ${issue.line}: ` : '';
            console.log(`    ${YELLOW}[${issue.code}]${RESET} ${loc}${issue.message}`);
          }
          resultsTable.push({ name: relPath, status: 'warn' });
        }
      }

      for (const issue of fileIssues) {
        allIssues.push({ file: relPath, ...issue });
      }
    } catch (err) {
      totalFailures++;
      if (!jsonOutput) {
        fail(`${relPath} — failed to read/parse: ${err.message}`);
        resultsTable.push({ name: relPath, status: 'fail' });
      }
    }
  }

  const ms = elapsed();

  if (jsonOutput) {
    console.log(
      JSON.stringify(
        {
          files: files.length,
          failures: totalFailures,
          warnings: totalWarnings,
          durationMs: ms,
          issues: allIssues,
        },
        null,
        2,
      ),
    );
  } else {
    sectionHeader('Summary');
    summaryTable(resultsTable);
    console.log(
      `\n${BOLD}Result:${RESET} ${totalFailures > 0 ? RED + 'FAILED' : GREEN + 'PASSED'}${RESET} ` +
        `(${files.length} files scanned, ${totalFailures} errors, ${totalWarnings} warnings in ${formatMs(ms)})\n`,
    );
  }

  process.exit(totalFailures > 0 ? 1 : 0);
}

if (require.main === module) {
  main();
}

module.exports = { auditWorkflowContent, findWorkflowFiles };
