'use strict';

/**
 * malicious_package_engine.js — Static Analysis of Lifecycle Hooks, Typosquatting & CI/CD Actions
 * ==============================================================================================
 * Domain: Supply Chain Intelligence (supply-chain-intelligence)
 *
 * Responsibilities:
 * 1. Statically audit package lifecycle scripts (preinstall, postinstall) without dynamic execution.
 * 2. Detect typosquatting using Levenshtein distance and homoglyph substitutions against popular packages.
 * 3. Detect dependency confusion risks for un-scoped internal dependencies.
 * 4. Scan GitHub Actions workflow steps for unpinned mutable tags/branches (V11_UNPINNED_CI_ACTION).
 * 5. Generate SupplyChainFindingSchema records for malicious supply chain risks.
 */

const { SupplyChainFindingSchema } = require('./component_inventory_schemas');

const POPULAR_NPM_PACKAGES = [
  'lodash',
  'express',
  'react',
  'react-dom',
  'axios',
  'chalk',
  'tslib',
  'commander',
  'debug',
  'async',
  'moment',
  'dotenv',
  'webpack',
  'babel-core',
  'jest',
  'eslint',
  'zod',
  'cross-env',
  'request',
  'fs-extra',
  'glob',
  'core-js',
];

const DANGEROUS_HOOK_PATTERNS = [
  { pattern: /curl\s+/i, reason: 'Remote network retrieval via curl' },
  { pattern: /wget\s+/i, reason: 'Remote network retrieval via wget' },
  { pattern: /powershell(\.exe)?\s+(-enc|-encodedcommand)/i, reason: 'Obfuscated PowerShell execution' },
  { pattern: /node\s+(-e|--eval)\s+/i, reason: 'Inline Node.js script evaluation' },
  { pattern: /base64\s+-d/i, reason: 'Base64 decode pipeline execution' },
  { pattern: /eval\s*\(/i, reason: 'Dynamic JavaScript eval invocation' },
  { pattern: /child_process/i, reason: 'Child process invocation in install script' },
  { pattern: /process\.env/i, reason: 'Direct environment variable access in install script' },
  { pattern: /nc\s+-/i, reason: 'Netcat reverse shell or raw network connection' },
  { pattern: /http:\/\//i, reason: 'Unencrypted remote HTTP call' },
];

/**
 * Computes Levenshtein edit distance between two strings.
 */
function levenshteinDistance(a, b) {
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

class MaliciousPackageEngine {
  constructor(options = {}) {
    this.popularPackages = options.popularPackages || POPULAR_NPM_PACKAGES;
    this.typosquatThreshold = options.typosquatThreshold || 1;
    this.dangerousHookPatterns = options.dangerousHookPatterns || DANGEROUS_HOOK_PATTERNS;
  }

  /**
   * Statically inspect package lifecycle hooks for malicious or suspicious patterns.
   */
  auditLifecycleScripts(packageData) {
    const findings = [];
    const name = packageData.name || 'unnamed-package';
    const version = packageData.version || '0.0.0';
    const scripts = packageData.scripts || packageData.lifecycleScripts || {};

    const dangerousHooks = ['preinstall', 'install', 'postinstall', 'preuninstall', 'postuninstall'];

    for (const hook of dangerousHooks) {
      const scriptContent = scripts[hook];
      if (!scriptContent || typeof scriptContent !== 'string') continue;

      // Check against dangerous command patterns
      for (const rule of this.dangerousHookPatterns) {
        if (rule.pattern.test(scriptContent)) {
          findings.push(
            SupplyChainFindingSchema.parse({
              id: `mal-hook-${name}-${hook}`,
              category: 'V2_MALICIOUS_PACKAGE_HOOK',
              severity: 'CRITICAL',
              component: name,
              version,
              title: `Suspicious lifecycle script in ${name} (${hook})`,
              description: `Package '${name}' defines a '${hook}' lifecycle hook executing suspicious commands: ${rule.reason}.`,
              evidence: `hook: '${hook}', command: '${scriptContent}', matched: '${rule.pattern}'`,
              remediation: `Remove '${hook}' lifecycle hook or audit source tarball; do not install without sandboxing.`,
              verdict: 'FAIL',
            })
          );
        }
      }
    }

    return {
      status: findings.length === 0 ? 'PASS' : 'FAIL',
      hasLifecycleScripts: Object.keys(scripts).some((k) => dangerousHooks.includes(k)),
      findingsCount: findings.length,
      findings,
    };
  }

  /**
   * Check if a candidate package name is a potential typosquat of a popular package.
   */
  checkTyposquatting(candidateName) {
    const findings = [];
    const lowerCandidate = candidateName.toLowerCase();

    for (const popular of this.popularPackages) {
      if (lowerCandidate === popular) continue; // Exact legitimate match

      // Check hyphen omission: e.g. crossenv vs cross-env
      const strippedPopular = popular.replace(/-/g, '');
      const strippedCandidate = lowerCandidate.replace(/-/g, '');
      const isHyphenOmission = strippedPopular === strippedCandidate;

      const dist = levenshteinDistance(lowerCandidate, popular);
      const isTyposquat = dist <= this.typosquatThreshold || isHyphenOmission;

      if (isTyposquat) {
        findings.push(
          SupplyChainFindingSchema.parse({
            id: `typosquat-${lowerCandidate}-${popular}`,
            category: 'V3_TYPOSQUATTING',
            severity: 'CRITICAL',
            component: candidateName,
            title: `Potential typosquatting package: '${candidateName}' mimicking '${popular}'`,
            description: `Package name '${candidateName}' is deceptively similar to popular package '${popular}' (edit distance: ${dist}).`,
            evidence: `candidate: '${candidateName}', target: '${popular}', editDistance: ${dist}`,
            remediation: `Verify package identity and intended author. Did you mean to install '${popular}' instead?`,
            verdict: 'FAIL',
          })
        );
      }
    }

    return {
      isTyposquat: findings.length > 0,
      findingsCount: findings.length,
      findings,
    };
  }

  /**
   * Detect potential dependency confusion risks for internal or private packages.
   */
  checkDependencyConfusion(packageName, isInternalPrivate = false) {
    const findings = [];
    const isScoped = packageName.startsWith('@');

    if (isInternalPrivate && !isScoped) {
      findings.push(
        SupplyChainFindingSchema.parse({
          id: `dep-confusion-${packageName}`,
          category: 'V4_DEPENDENCY_CONFUSION',
          severity: 'HIGH',
          component: packageName,
          title: `Dependency confusion vulnerability in private package '${packageName}'`,
          description: `Internal private package '${packageName}' is un-scoped, allowing external attackers to register it on public npm with a higher semver.`,
          evidence: `packageName: '${packageName}', isScoped: false, isInternal: true`,
          remediation: `Scope the private package under an approved organization namespace (e.g. '@organization/${packageName}').`,
          verdict: 'FAIL',
        })
      );
    }

    return {
      isVulnerable: findings.length > 0,
      findingsCount: findings.length,
      findings,
    };
  }

  /**
   * Statically audit GitHub Actions workflow steps for unpinned mutable action references (V11).
   */
  auditWorkflowActions(workflowContent, workflowFilePath = '.github/workflows/ci.yml') {
    const findings = [];
    const lines = workflowContent.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^\s*-\s+uses:\s*['"]?([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)@([^#\s'"]+)/);
      if (match) {
        const actionName = match[1];
        const actionRef = match[2];
        const isShaPinned = /^[a-f0-9]{40}$/i.test(actionRef);

        if (!isShaPinned) {
          findings.push(
            SupplyChainFindingSchema.parse({
              id: `unpinned-action-${actionName.replace(/[^a-zA-Z0-9_-]/g, '_')}-${i + 1}`,
              category: 'V11_UNPINNED_CI_ACTION',
              severity: 'HIGH',
              component: actionName,
              version: actionRef,
              title: `Unpinned GitHub Action: ${actionName}@${actionRef}`,
              description: `Workflow '${workflowFilePath}' line ${i + 1} references third-party action using mutable reference '@${actionRef}' instead of immutable 40-character commit SHA.`,
              evidence: `file: ${workflowFilePath}:${i + 1}, uses: ${match[0].trim()}`,
              remediation: `Pin the action to its full 40-character commit SHA with a version comment (e.g. '${actionName}@<sha> # v4').`,
              verdict: 'FAIL',
            })
          );
        }
      }
    }

    return {
      status: findings.length === 0 ? 'PASS' : 'FAIL',
      scannedLines: lines.length,
      findingsCount: findings.length,
      findings,
    };
  }
}

module.exports = {
  POPULAR_NPM_PACKAGES,
  DANGEROUS_HOOK_PATTERNS,
  levenshteinDistance,
  MaliciousPackageEngine,
};

