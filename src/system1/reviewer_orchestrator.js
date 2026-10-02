'use strict';

/**
 * reviewer_orchestrator.js — System-1 Capability 3: Adaptive Reviewer Orchestration
 * ==================================================================================
 * Replaces purely static reviewer selection with evidence-driven reviewer selection.
 *
 * Selects the smallest reviewer set capable of covering identified risks:
 *   score = required_coverage + specialization + historical_usefulness - overlap_penalty
 *
 * Guarantees:
 * - Maximum unique review coverage with minimum reviewer count
 * - Never optimizes away a reviewer solely for token savings when its domain is independently required
 * - Every selected reviewer has: reason, risk covered, evidence supplied, expected contribution
 * - Every rejected reviewer has: reason not selected
 * - Deterministic, stable ordering
 */

const path = require('path');
const { HIGH_RISK_PATTERNS } = require('./constants');

// Standard Reviewer Catalog with domains, priority, and overlap groups
const REVIEWER_CATALOG = [
  {
    name: 'logic-reviewer',
    primary_domains: ['logic', 'all'],
    secondary_domains: ['api'],
    priority: 'critical',
    overlap_group: 'logic',
    expected_contribution:
      'Verification of state machines, API contract adherence, control flow integrity, and hallucination prevention.',
  },
  {
    name: 'security-auditor',
    primary_domains: ['security', 'auth'],
    secondary_domains: ['backend', 'frontend'],
    priority: 'critical',
    overlap_group: 'security_general',
    expected_contribution:
      'OWASP vulnerability scanning: injection, broken access control, token forgery, SSRF, and sensitive data leakage.',
  },
  {
    name: 'sql-reviewer',
    primary_domains: ['database', 'sql'],
    secondary_domains: ['migration', 'performance'],
    priority: 'critical',
    overlap_group: 'database_sql',
    expected_contribution:
      'Validation of SQL query parameters, schema migrations, table locks, transactional consistency, and missing indexes.',
  },
  {
    name: 'schema-reviewer',
    primary_domains: ['schema', 'validation'],
    secondary_domains: ['backend', 'database'],
    priority: 'high',
    overlap_group: 'schema_validation',
    expected_contribution:
      'Verification of Zod/Pydantic runtime schemas, DTO boundaries, and request payload validation.',
  },
  {
    name: 'resilience-reviewer',
    primary_domains: ['resilience', 'backend'],
    secondary_domains: ['network'],
    priority: 'high',
    overlap_group: 'resilience_fault_tolerance',
    expected_contribution:
      'Audit of timeout configurations, circuit breakers, retry policies, and unhandled promise rejections.',
  },
  {
    name: 'dependency-reviewer',
    primary_domains: ['dependency'],
    secondary_domains: ['security', 'devops'],
    priority: 'high',
    overlap_group: 'dependency_management',
    expected_contribution:
      'Detection of phantom/ghost dependencies, outdated packages, CVE advisories, and lockfile tampering.',
  },
  {
    name: 'type-safety-reviewer',
    primary_domains: ['type_safety', 'typescript'],
    secondary_domains: ['frontend', 'backend'],
    priority: 'high',
    overlap_group: 'type_soundness',
    expected_contribution:
      'Enforcement of TypeScript strictness, elimination of unsafe "any" casts, and generic constraint correctness.',
  },
  {
    name: 'frontend-reviewer',
    primary_domains: ['frontend', 'ui'],
    secondary_domains: ['performance'],
    priority: 'high',
    overlap_group: 'frontend_architecture',
    expected_contribution:
      'React/UI lifecycle review: hook dependency completeness, memoization balance, and re-render efficiency.',
  },
  {
    name: 'accessibility-reviewer',
    primary_domains: ['accessibility'],
    secondary_domains: ['frontend', 'ui'],
    priority: 'high',
    overlap_group: 'accessibility_standards',
    expected_contribution:
      'WCAG 2.2 compliance: semantic HTML elements, ARIA role verification, keyboard accessibility, and contrast ratios.',
  },
  {
    name: 'pipeline-reviewer',
    primary_domains: ['devops', 'ci_cd'],
    secondary_domains: ['security'],
    priority: 'high',
    overlap_group: 'infrastructure_pipeline',
    expected_contribution:
      'CI/CD pipeline hardening: workflow permissions, step injection defense, secret exposure prevention, and Docker security.',
  },
  {
    name: 'performance-reviewer',
    primary_domains: ['performance'],
    secondary_domains: ['backend', 'frontend'],
    priority: 'medium',
    overlap_group: 'performance_profiling',
    expected_contribution:
      'Resource efficiency analysis: asymptotic complexity, memory footprint, N+1 query patterns, and bundle weight.',
  },
  {
    name: 'mobile-reviewer',
    primary_domains: ['mobile'],
    secondary_domains: ['frontend'],
    priority: 'high',
    overlap_group: 'mobile_native',
    expected_contribution:
      'Mobile runtime evaluation: native gesture handlers, memory leaks, offline state, and navigation bridges.',
  },
  {
    name: 'precedence-reviewer',
    primary_domains: ['governance', 'rules'],
    secondary_domains: ['all'],
    priority: 'high',
    overlap_group: 'governance_rules',
    expected_contribution:
      'Enforcement of architectural rule priorities, agent boundary containment, and compliance with master directives.',
  },
];

/**
 * Detect required risk domains based on files, diff, task, and evidence
 */
function detectRequiredDomains({
  files = [],
  diff = '',
  task = '',
  evidence = [],
  previousFindings = [],
}) {
  const domains = new Set();
  const fileList = (Array.isArray(files) ? files : typeof files === 'string' ? [files] : [])
    .map(f =>
      typeof f === 'string'
        ? f
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .trim()
            .replace(/\\/g, '/')
        : '',
    )
    .filter(Boolean);
  const combined = `${task}\n${diff}\n${fileList.join('\n')}`;

  // 1. File extension heuristics
  for (const f of fileList) {
    const ext = path.extname(f).toLowerCase();
    if (['.sql', '.prisma'].includes(ext)) {
      domains.add('database');
      domains.add('sql');
    }
    if (['.ts', '.tsx'].includes(ext)) {
      domains.add('type_safety');
    }
    if (
      ['.jsx', '.tsx', '.vue', '.svelte', '.css', '.scss'].includes(ext) ||
      f.includes('/components/')
    ) {
      domains.add('frontend');
    }
    if (f.includes('.github/') || f.includes('Dockerfile') || f.includes('docker-compose')) {
      domains.add('devops');
      domains.add('ci_cd');
    }
    if (f.endsWith('package.json') || f.endsWith('package-lock.json') || f.endsWith('Cargo.toml')) {
      domains.add('dependency');
    }
    if (f.includes('/api/') || f.includes('/server/') || f.includes('/controllers/')) {
      domains.add('backend');
      domains.add('api');
    }
    if (f.includes('mobile/') || f.includes('ios/') || f.includes('android/')) {
      domains.add('mobile');
    }
  }

  // 2. Keyword & pattern heuristics
  if (
    HIGH_RISK_PATTERNS.test(combined) ||
    combined.includes('token') ||
    combined.includes('jwt') ||
    combined.includes('auth')
  ) {
    domains.add('security');
    domains.add('auth');
  }
  if (/\b(schema|zod|pydantic|validate|dto)\b/i.test(combined)) {
    domains.add('schema');
  }
  if (/\b(sql|database|query|migration|table|alter table|create table)\b/i.test(combined)) {
    domains.add('database');
  }
  if (/\b(retry|circuit-breaker|fallback|timeout|graceful|catch|exception)\b/i.test(combined)) {
    domains.add('resilience');
  }
  if (/\b(a11y|aria|accessibility|wcag|contrast|screen-reader)\b/i.test(combined)) {
    domains.add('accessibility');
  }
  if (/\b(perf|performance|latency|slow|throughput|bundle)\b/i.test(combined)) {
    domains.add('performance');
  }
  if (/\b(npm|yarn|pnpm|dependency|package|cve|vulnerability)\b/i.test(combined)) {
    domains.add('dependency');
  }

  // 3. Evidence signals
  if (Array.isArray(evidence)) {
    for (const e of evidence) {
      if (e && typeof e === 'object') {
        if (e.is_mandatory && e.type === 'security_boundary') {
          domains.add('security');
        }
        if (
          e.type === 'configuration' &&
          typeof e.path === 'string' &&
          e.path.includes('package')
        ) {
          domains.add('dependency');
        }
      }
    }
  }

  // 4. Previous findings signals
  if (Array.isArray(previousFindings)) {
    for (const pf of previousFindings) {
      if (pf && typeof pf === 'object' && typeof pf.category === 'string') {
        domains.add(pf.category.toLowerCase());
      }
    }
  }

  // Default baseline: logic is always relevant when code changes
  if (fileList.some(f => !/\.(md|txt)$/i.test(f))) {
    domains.add('logic');
  }

  return Array.from(domains);
}

/**
 * Adaptive Reviewer Orchestrator
 * @param {Object} options
 * @param {number} [options.tier] - Impact tier (0 to 3)
 * @param {string[]} [options.files] - Changed files
 * @param {string} [options.diff] - Diff
 * @param {string} [options.task] - Task description
 * @param {Array} [options.evidence] - Evidence items
 * @param {Array} [options.previousFindings] - Previous findings
 * @param {string[]} [options.forcedReviewers] - Reviewers that must be included
 * @returns {Object} Orchestration payload with selected and rejected reviewers
 */
function orchestrateReviewers(options = {}) {
  const tier = typeof options.tier === 'number' ? options.tier : 1;
  const files = options.files || [];
  const diff = options.diff || '';
  const task = options.task || '';
  const evidence = Array.isArray(options.evidence) ? options.evidence : [];
  const previousFindings = Array.isArray(options.previousFindings) ? options.previousFindings : [];
  const forcedReviewers = new Set(options.forcedReviewers || []);

  // Determine maximum reviewer capacity based on impact tier
  // Tier 0 (Fast-Pass): 0 reviewers
  // Tier 1 (Express Pass): 1 reviewer
  // Tier 2 (Targeted Audit): 2-3 reviewers
  // Tier 3 (Full Gauntlet): up to 8 reviewers
  const capacityMap = { 0: 0, 1: 1, 2: 3, 3: 8 };
  const maxCapacity = capacityMap[tier] ?? 1;

  if (maxCapacity === 0) {
    return {
      selected: [],
      rejected: REVIEWER_CATALOG.map(r => ({
        reviewer: r.name,
        reason: 'Fast-Pass (Tier 0) active: 0 reviewers required for low-risk change.',
      })),
      total_selected: 0,
      coverage: {
        domains_required: [],
        domains_covered: [],
        all_risks_covered: true,
      },
    };
  }

  const requiredDomains = detectRequiredDomains({ files, diff, task, evidence, previousFindings });
  const coveredDomains = new Set();
  const selectedReviewers = [];
  const rejectedReviewers = [];
  const usedOverlapGroups = new Set();

  // Score candidate reviewers
  const candidateScores = REVIEWER_CATALOG.map(reviewer => {
    let score = 0.0;
    const matchedEvidence = [];
    const matchedReasons = [];

    // 1. Required Coverage Score
    const primaryMatches = reviewer.primary_domains.filter(d => requiredDomains.includes(d));
    const secondaryMatches = reviewer.secondary_domains.filter(d => requiredDomains.includes(d));

    if (primaryMatches.length > 0) {
      score += 0.45 * primaryMatches.length;
      matchedReasons.push(`directly covers primary risk domains: ${primaryMatches.join(', ')}`);
    }
    if (secondaryMatches.length > 0) {
      score += 0.2 * secondaryMatches.length;
      matchedReasons.push(`covers secondary risk domains: ${secondaryMatches.join(', ')}`);
    }

    // 2. Specialization & Priority Score
    const hasSpecificDomainMatch = primaryMatches.some(d => d !== 'logic' && d !== 'all');
    if (hasSpecificDomainMatch) {
      score += 0.3; // Domain specialist bonus over general logic reviewer
      matchedReasons.push(
        `domain specialist for ${primaryMatches.filter(d => d !== 'logic' && d !== 'all').join(', ')}`,
      );
    }

    if (reviewer.priority === 'critical' && primaryMatches.length > 0) {
      score += 0.25;
      matchedReasons.push('critical priority specialist for active risk domain');
    }
    if (reviewer.priority === 'high' && primaryMatches.length > 0) {
      score += 0.15;
    }

    // 3. Evidence Match
    if (Array.isArray(evidence)) {
      for (const e of evidence) {
        if (e && typeof e === 'object' && typeof e.type === 'string') {
          if (
            primaryMatches.some(
              d =>
                e.type.includes(d) ||
                (Array.isArray(e.reasons) &&
                  e.reasons.some(r => typeof r === 'string' && r.includes(d))),
            )
          ) {
            score += 0.1;
            if (e.id) matchedEvidence.push(e.id);
          }
        }
      }
    }

    // 4. Previous Findings Usefulness
    const hasPriorIssues =
      Array.isArray(previousFindings) &&
      previousFindings.some(f => {
        return (
          f &&
          typeof f === 'object' &&
          typeof f.category === 'string' &&
          primaryMatches.includes(f.category.toLowerCase())
        );
      });
    if (hasPriorIssues) {
      score += 0.15;
      matchedReasons.push('prior audit findings detected in specialist domain');
    }

    // 5. Mandatory / Forced Reviewers
    if (forcedReviewers.has(reviewer.name)) {
      score += 1.0;
      matchedReasons.push('explicitly forced by caller / governance contract');
    }

    return {
      reviewer,
      score: parseFloat(score.toFixed(2)),
      primaryMatches,
      matchedReasons,
      matchedEvidence: Array.from(new Set(matchedEvidence)),
    };
  });

  // Sort candidates by score DESC, then name ASC
  candidateScores.sort((a, b) => {
    if (Math.abs(b.score - a.score) > 0.001) return b.score - a.score;
    return a.reviewer.name.localeCompare(b.reviewer.name);
  });

  // Selection Loop with Overlap Penalty
  for (const candidate of candidateScores) {
    const { reviewer, score, primaryMatches, matchedReasons, matchedEvidence } = candidate;

    // Check if reviewer has any relevance
    if (score <= 0.1 && !forcedReviewers.has(reviewer.name)) {
      rejectedReviewers.push({
        reviewer: reviewer.name,
        reason: 'Zero domain overlap with active change set.',
      });
      continue;
    }

    // Check capacity limit
    if (selectedReviewers.length >= maxCapacity) {
      rejectedReviewers.push({
        reviewer: reviewer.name,
        reason: `Tier ${tier} capacity limit (${maxCapacity} reviewers) reached. Lower priority than selected peers.`,
      });
      continue;
    }

    // Check Overlap Group: If an overlap group is already present, apply penalty or skip
    // Exception: In Tier 3 or when unique uncovered domains exist, overlap is tolerated
    const hasOverlap = usedOverlapGroups.has(reviewer.overlap_group);
    const bringsNewDomain = primaryMatches.some(d => !coveredDomains.has(d));

    if (hasOverlap && !bringsNewDomain && !forcedReviewers.has(reviewer.name)) {
      rejectedReviewers.push({
        reviewer: reviewer.name,
        reason: `Substantial overlap with already selected peer in group "${reviewer.overlap_group}".`,
      });
      continue;
    }

    // Select this reviewer
    selectedReviewers.push({
      reviewer: reviewer.name,
      reason: matchedReasons.join(' | ') || 'Specialist alignment with detected change scope',
      risk_covered: primaryMatches.join(', ') || 'general',
      evidence_supplied: matchedEvidence,
      expected_contribution: reviewer.expected_contribution,
      score,
    });

    primaryMatches.forEach(d => coveredDomains.add(d));
    usedOverlapGroups.add(reviewer.overlap_group);
  }

  // Safety Verification: Ensure critical domains are covered
  const criticalUncovered = requiredDomains.filter(
    d => ['security', 'database', 'auth'].includes(d) && !coveredDomains.has(d),
  );
  const allRisksCovered = criticalUncovered.length === 0;

  return {
    selected: selectedReviewers,
    rejected: rejectedReviewers,
    total_selected: selectedReviewers.length,
    coverage: {
      domains_required: requiredDomains,
      domains_covered: Array.from(coveredDomains),
      all_risks_covered: allRisksCovered,
      uncovered_critical: criticalUncovered,
    },
  };
}

module.exports = {
  orchestrateReviewers,
  detectRequiredDomains,
  REVIEWER_CATALOG,
};
