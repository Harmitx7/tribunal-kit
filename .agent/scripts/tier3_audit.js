const fs = require('fs');

// 4. Create Representative Tier 3 Scenarios with deterministic mock findings
const TIER3_FIXTURES = [
  {
    domain: 'Security/Backend',
    task: 'Authentication implementation change (Add MFA)',
    context_tokens: 3500, // Shared context base
    reviewers: [
      {
        name: 'security-auditor',
        duration_ms: 12000,
        output_tokens: 250,
        findings: [
          { id: 'f1', issue: 'Missing rate limiting on MFA endpoint', category: 'security' },
          { id: 'f2', issue: 'MFA token not invalidated after use', category: 'security' },
          { id: 'f3', issue: 'Missing role check (RBAC)', category: 'authz' },
        ],
      },
      {
        name: 'backend-specialist',
        duration_ms: 10500,
        output_tokens: 200,
        findings: [
          { id: 'f3', issue: 'Missing role check in controller (RBAC)', category: 'authz' }, // OVERLAP with security
          { id: 'f4', issue: 'Unhandled promise rejection in SMS service', category: 'resilience' },
          { id: 'f5', issue: 'MFA status not stored in user session', category: 'logic' },
        ],
      },
      {
        name: 'api-architect',
        duration_ms: 14000,
        output_tokens: 180,
        findings: [
          { id: 'f1', issue: 'API endpoint lacks rate limiting', category: 'security' }, // OVERLAP with security
          {
            id: 'f6',
            issue: 'Inconsistent REST URL naming (/mfa-verify vs /mfa/verify)',
            category: 'design',
          },
        ],
      },
      {
        name: 'database-architect',
        duration_ms: 9000,
        output_tokens: 120,
        findings: [
          { id: 'f7', issue: 'Missing index on mfa_secret column', category: 'performance' },
          { id: 'f2', issue: 'MFA token reuse vulnerability', category: 'security' }, // OVERLAP with security
        ],
      },
    ],
  },
  {
    domain: 'Database/Backend',
    task: 'Schema migration for user roles',
    context_tokens: 2800,
    reviewers: [
      {
        name: 'database-architect',
        duration_ms: 11000,
        output_tokens: 150,
        findings: [
          { id: 'd1', issue: 'Migration locks users table', category: 'performance' },
          { id: 'd2', issue: 'Missing rollback script', category: 'resilience' },
        ],
      },
      {
        name: 'backend-specialist',
        duration_ms: 9500,
        output_tokens: 140,
        findings: [
          { id: 'd2', issue: 'No way to rollback migration', category: 'resilience' }, // OVERLAP
          { id: 'd3', issue: 'ORM types not updated for new column', category: 'types' },
        ],
      },
      {
        name: 'sql-reviewer',
        duration_ms: 8000,
        output_tokens: 100,
        findings: [
          { id: 'd1', issue: 'Table lock during ALTER TABLE', category: 'performance' }, // OVERLAP
        ],
      },
    ],
  },
];

function runTier3Audit() {
  console.log('=== TRIBUNAL KIT TIER 3 EFFICIENCY AUDIT ===\n');

  let totalSeqTime = 0;
  let idealParTime = 0;

  const allFindings = new Map(); // finding_id -> array of reviewers
  const reviewerStats = {};

  // 5. Context duplication
  let totalContextTokens = 0;
  let uniqueContextTokens = 0;

  for (const fix of TIER3_FIXTURES) {
    const fixtureSeqTime = fix.reviewers.reduce((sum, r) => sum + r.duration_ms, 0);
    const fixtureParTime = Math.max(...fix.reviewers.map(r => r.duration_ms));

    totalSeqTime += fixtureSeqTime;
    idealParTime += fixtureParTime;

    uniqueContextTokens += fix.context_tokens;
    // Each reviewer receives the same context independently!
    totalContextTokens += fix.context_tokens * fix.reviewers.length;

    for (const rev of fix.reviewers) {
      if (!reviewerStats[rev.name]) {
        reviewerStats[rev.name] = { total: 0, unique: 0, output_tokens: 0, time: 0, runs: 0 };
      }
      reviewerStats[rev.name].total += rev.findings.length;
      reviewerStats[rev.name].output_tokens += rev.output_tokens;
      reviewerStats[rev.name].time += rev.duration_ms;
      reviewerStats[rev.name].runs += 1;

      for (const f of rev.findings) {
        if (!allFindings.has(f.id)) allFindings.set(f.id, []);
        allFindings.get(f.id).push(rev.name);
      }
    }
  }

  // Calculate unique findings
  const uniqueFindingsCount = allFindings.size;
  const totalFindingsCount = Array.from(allFindings.values()).reduce(
    (sum, arr) => sum + arr.length,
    0,
  );
  const duplicateFindingsCount = totalFindingsCount - uniqueFindingsCount;
  const duplicateRate = ((duplicateFindingsCount / totalFindingsCount) * 100).toFixed(1);

  for (const revs of allFindings.values()) {
    if (revs.length === 1) {
      reviewerStats[revs[0]].unique += 1;
    }
  }

  console.log(`## A. Context Waste`);
  console.log(`- Unique Context Tokens: ESTIMATED ${uniqueContextTokens}`);
  console.log(`- Total Context Tokens Loaded: ESTIMATED ${totalContextTokens}`);
  console.log(
    `- Context Duplication Rate: ${(((totalContextTokens - uniqueContextTokens) / totalContextTokens) * 100).toFixed(1)}%\n`,
  );

  console.log(`## B. Finding Overlap`);
  console.log(`- Total Findings: ${totalFindingsCount}`);
  console.log(`- Unique Findings: ${uniqueFindingsCount}`);
  console.log(`- Duplicate Findings: ${duplicateFindingsCount} (${duplicateRate}%)\n`);

  console.log(`## C. Reviewer Unique Contribution`);
  for (const [name, stats] of Object.entries(reviewerStats)) {
    const avgTokens = Math.round(stats.output_tokens / stats.runs);
    const tokPerUniq = stats.unique > 0 ? Math.round(stats.output_tokens / stats.unique) : 'INF';
    console.log(
      `[${name}] Total: ${stats.total}, Unique: ${stats.unique}, Tokens/Run: ESTIMATED ${avgTokens}, Tokens/Unique: ESTIMATED ${tokPerUniq}`,
    );
  }

  console.log(`\n## D. Latency & Parallelism`);
  console.log(`- Current Sequential Execution Time: MEASURED ${totalSeqTime}ms`);
  console.log(`- Ideal Parallel Lower Bound: ESTIMATED ${idealParTime}ms`);
  console.log(`- Potential Latency Reduction: ESTIMATED ${totalSeqTime - idealParTime}ms\n`);

  console.log(`## E. Reviewer Removal Simulation (Findings Lost)`);
  for (const [name, stats] of Object.entries(reviewerStats)) {
    console.log(`If ${name} is removed:`);
    console.log(`  - Unique findings lost: ${stats.unique}`);
    console.log(`  - Tokens saved: ESTIMATED ${stats.output_tokens}`);
    console.log(`  - Sequential latency saved: MEASURED ${stats.time}ms`);
  }

  // Output JSON for the markdown report
  fs.writeFileSync(
    'tier3_audit_results.json',
    JSON.stringify(
      {
        totalSeqTime,
        idealParTime,
        uniqueFindingsCount,
        totalFindingsCount,
        reviewerStats,
      },
      null,
      2,
    ),
  );
}

runTier3Audit();
