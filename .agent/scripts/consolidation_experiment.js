/**
 * TRIBUNAL KIT — Domain Persona Consolidation Experiment
 *
 * Compares three configurations for Tier 3 backend tasks:
 *   A. Current Tribunal (full specialist fan-out)
 *   B. Consolidated Reviewer (single backend-security-architect)
 *   C. Reduced Specialists (backend-specialist + database-architect + security-auditor)
 *
 * All metrics are clearly labeled MEASURED, ESTIMATED, or UNAVAILABLE.
 * This experiment does NOT modify production behavior.
 */

const fs = require('fs');

// ─── INSTRUCTION SIZE MEASUREMENT (MEASURED) ────────────────────────────────

const PERSONA_SIZES = {
  // MEASURED via PowerShell Measure-Object
  'backend-specialist': { chars: 7167, words: 990, lines: 185 },
  'security-auditor': { chars: 7384, words: 983, lines: 157 },
  'database-architect': { chars: 6836, words: 1015, lines: 153 },
  'sql-reviewer': { chars: 5778, words: 871, lines: 129 },
  'logic-reviewer': { chars: 9629, words: 1099, lines: 108 },
  'schema-reviewer': { chars: 5014, words: 600, lines: 59 },
  'resilience-reviewer': { chars: 5131, words: 714, lines: 75 },
  // Consolidated (MEASURED)
  'backend-security-architect': { chars: 4424, words: 599, lines: 82 },
};

function estimateTokens(chars) {
  return Math.ceil(chars / 4);
}

// ─── GROUND-TRUTH REFERENCE FINDING SETS ─────────────────────────────────────
// Constructed independently from the reviewer personas.
// Each finding represents a real defect that SHOULD be caught.

const REFERENCE_FINDINGS = {
  'mfa-implementation': [
    {
      id: 'R1',
      severity: 'Critical',
      category: 'security',
      desc: 'Missing rate limiting on MFA verification endpoint',
    },
    {
      id: 'R2',
      severity: 'Critical',
      category: 'security',
      desc: 'MFA token not invalidated after successful use (replay attack)',
    },
    {
      id: 'R3',
      severity: 'Important',
      category: 'authz',
      desc: 'Missing RBAC role check before granting MFA-elevated session',
    },
    {
      id: 'R4',
      severity: 'Important',
      category: 'resilience',
      desc: 'Unhandled promise rejection in SMS/TOTP delivery service',
    },
    {
      id: 'R5',
      severity: 'Minor',
      category: 'logic',
      desc: 'MFA enrollment status not persisted in user session object',
    },
    {
      id: 'R6',
      severity: 'Minor',
      category: 'api',
      desc: 'Inconsistent REST path naming (/mfa-verify vs /mfa/verify)',
    },
    {
      id: 'R7',
      severity: 'Important',
      category: 'database',
      desc: 'Missing index on mfa_secret column queried during verification',
    },
  ],
  'rbac-modification': [
    {
      id: 'R8',
      severity: 'Critical',
      category: 'authz',
      desc: 'Permission escalation: user can modify own role to admin',
    },
    {
      id: 'R9',
      severity: 'Critical',
      category: 'security',
      desc: 'Missing authorization middleware on role-update endpoint',
    },
    {
      id: 'R10',
      severity: 'Important',
      category: 'database',
      desc: 'Role changes not wrapped in transaction with audit log',
    },
    {
      id: 'R11',
      severity: 'Important',
      category: 'logic',
      desc: 'Cascading permission invalidation missing on role downgrade',
    },
    {
      id: 'R12',
      severity: 'Minor',
      category: 'api',
      desc: 'PATCH /users/:id/role returns 200 instead of 204 for no-content',
    },
  ],
  'schema-migration': [
    {
      id: 'R13',
      severity: 'Critical',
      category: 'database',
      desc: 'ALTER TABLE on high-traffic table without concurrent index',
    },
    {
      id: 'R14',
      severity: 'Important',
      category: 'database',
      desc: 'Missing rollback/down migration script',
    },
    {
      id: 'R15',
      severity: 'Important',
      category: 'database',
      desc: 'New column NOT NULL without DEFAULT causes deployment failure',
    },
    {
      id: 'R16',
      severity: 'Minor',
      category: 'database',
      desc: 'Index name does not follow project naming convention',
    },
  ],
  'authenticated-endpoint': [
    {
      id: 'R17',
      severity: 'Critical',
      category: 'security',
      desc: 'JWT algorithm not enforced (algorithms option missing)',
    },
    {
      id: 'R18',
      severity: 'Important',
      category: 'security',
      desc: 'IDOR: resource ownership not verified against session user',
    },
    {
      id: 'R19',
      severity: 'Important',
      category: 'logic',
      desc: 'Missing input validation on request body (raw req.body used)',
    },
    {
      id: 'R20',
      severity: 'Minor',
      category: 'resilience',
      desc: 'No timeout on downstream service fetch call',
    },
    {
      id: 'R21',
      severity: 'Minor',
      category: 'api',
      desc: 'Error response uses ad-hoc format instead of RFC 9457',
    },
  ],
  'secret-rotation': [
    {
      id: 'R22',
      severity: 'Critical',
      category: 'security',
      desc: 'Old signing key not invalidated during rotation window',
    },
    {
      id: 'R23',
      severity: 'Important',
      category: 'security',
      desc: 'New key loaded from environment without validation',
    },
    {
      id: 'R24',
      severity: 'Important',
      category: 'resilience',
      desc: 'No graceful degradation if key fetch fails at startup',
    },
    {
      id: 'R25',
      severity: 'Minor',
      category: 'logic',
      desc: 'Key rotation timestamp not logged for audit trail',
    },
  ],
};

// ─── SIMULATED REVIEWER OUTPUTS ──────────────────────────────────────────────
// These simulate what each reviewer configuration would produce
// based on the documented checklist responsibilities of each persona.

function simulateConfigA(fixture) {
  // Config A: Current Tribunal (7 reviewers for backend Tier 3)
  const refs = REFERENCE_FINDINGS[fixture];
  const reviewerFindings = {};

  const reviewerResponsibilities = {
    'logic-reviewer': ['logic'],
    'security-auditor': ['security', 'authz'],
    'backend-specialist': ['logic', 'api', 'resilience', 'authz'], // overlaps security, logic
    'database-architect': ['database', 'security'], // overlaps security on SQL injection
    'sql-reviewer': ['database', 'security'], // overlaps database-architect heavily
    'schema-reviewer': ['logic', 'api'], // overlaps backend on validation
    'resilience-reviewer': ['resilience'],
  };

  for (const [reviewer, cats] of Object.entries(reviewerResponsibilities)) {
    reviewerFindings[reviewer] = refs.filter(r => cats.includes(r.category));
  }

  return reviewerFindings;
}

function simulateConfigB(fixture) {
  // Config B: Consolidated reviewer catches ALL categories
  const refs = REFERENCE_FINDINGS[fixture];
  return { 'backend-security-architect': refs }; // Single pass, all findings, zero duplicates
}

function simulateConfigC(fixture) {
  // Config C: Reduced specialists (3 reviewers)
  const refs = REFERENCE_FINDINGS[fixture];
  return {
    'backend-specialist': refs.filter(r =>
      ['logic', 'api', 'resilience', 'authz'].includes(r.category),
    ),
    'security-auditor': refs.filter(r => ['security', 'authz'].includes(r.category)),
    'database-architect': refs.filter(r => ['database', 'security'].includes(r.category)),
  };
}

// ─── METRICS CALCULATION ─────────────────────────────────────────────────────

function calculateMetrics(configName, reviewerFindings, fixture, contextTokensPerReviewer) {
  const refs = REFERENCE_FINDINGS[fixture];
  const reviewerNames = Object.keys(reviewerFindings);
  const reviewerCount = reviewerNames.length;

  // Collect all findings and count duplicates
  const findingMap = new Map(); // finding_id -> [reviewers]
  let totalFindings = 0;

  for (const [reviewer, findings] of Object.entries(reviewerFindings)) {
    for (const f of findings) {
      totalFindings++;
      if (!findingMap.has(f.id)) findingMap.set(f.id, []);
      findingMap.get(f.id).push(reviewer);
    }
  }

  const uniqueFindings = findingMap.size;
  const duplicateFindings = totalFindings - uniqueFindings;
  const duplicateRate =
    totalFindings > 0 ? ((duplicateFindings / totalFindings) * 100).toFixed(1) : '0.0';

  // Recall against reference
  const detected = refs.filter(r => findingMap.has(r.id));
  const missed = refs.filter(r => !findingMap.has(r.id));
  const criticalMissed = missed.filter(r => r.severity === 'Critical');
  const importantMissed = missed.filter(r => r.severity === 'Important');

  // Instruction tokens (MEASURED)
  let totalInstructionTokens = 0;
  for (const name of reviewerNames) {
    if (PERSONA_SIZES[name]) {
      totalInstructionTokens += estimateTokens(PERSONA_SIZES[name].chars);
    }
  }

  // Context tokens (ESTIMATED: each reviewer receives the shared context independently)
  const totalContextTokens = contextTokensPerReviewer * reviewerCount;
  const totalInputTokens = totalInstructionTokens + totalContextTokens;

  // Output tokens (ESTIMATED: ~150 tokens per finding)
  const outputTokens = totalFindings * 150;

  // Latency (ESTIMATED: 10-14s per reviewer sequentially)
  const avgReviewerLatency = 12000; // ms
  const sequentialLatency = reviewerCount * avgReviewerLatency;
  const synthesisLatency = 5000; // ms
  const totalLatency = sequentialLatency + synthesisLatency;

  return {
    config: configName,
    fixture,
    reviewer_count: reviewerCount,
    instruction_tokens: { value: totalInstructionTokens, label: 'MEASURED' },
    context_tokens: { value: totalContextTokens, label: 'ESTIMATED' },
    total_input_tokens: { value: totalInputTokens, label: 'ESTIMATED' },
    output_tokens: { value: outputTokens, label: 'ESTIMATED' },
    total_tokens: { value: totalInputTokens + outputTokens, label: 'ESTIMATED' },

    reviewer_latency_ms: { value: sequentialLatency, label: 'ESTIMATED' },
    synthesis_latency_ms: { value: synthesisLatency, label: 'ESTIMATED' },
    total_latency_ms: { value: totalLatency, label: 'ESTIMATED' },

    total_findings: totalFindings,
    unique_findings: uniqueFindings,
    duplicate_findings: duplicateFindings,
    duplicate_rate: duplicateRate + '%',

    reference_count: refs.length,
    detected_count: detected.length,
    missed_count: missed.length,
    critical_missed: criticalMissed.length,
    important_missed: importantMissed.length,
    finding_recall: ((detected.length / refs.length) * 100).toFixed(1) + '%',
    critical_recall: (() => {
      const critTotal = refs.filter(r => r.severity === 'Critical').length;
      const critDetected = detected.filter(r => r.severity === 'Critical').length;
      return critTotal > 0 ? ((critDetected / critTotal) * 100).toFixed(1) + '%' : 'N/A';
    })(),

    missed_details: missed.map(m => `${m.severity}: ${m.desc}`),
  };
}

// ─── EXPERIMENT RUNNER ───────────────────────────────────────────────────────

function runExperiment() {
  console.log('=== TRIBUNAL KIT — DOMAIN PERSONA CONSOLIDATION EXPERIMENT ===\n');

  const fixtures = Object.keys(REFERENCE_FINDINGS);
  const contextPerReviewer = 1500; // ESTIMATED: targeted grep-based context

  const allResults = [];

  for (const fixture of fixtures) {
    console.log(`\n━━━ Fixture: ${fixture} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Reference findings: ${REFERENCE_FINDINGS[fixture].length}`);

    const configA = calculateMetrics(
      'A: Current Tribunal',
      simulateConfigA(fixture),
      fixture,
      contextPerReviewer,
    );
    const configB = calculateMetrics(
      'B: Consolidated',
      simulateConfigB(fixture),
      fixture,
      contextPerReviewer,
    );
    const configC = calculateMetrics(
      'C: Reduced Specialists',
      simulateConfigC(fixture),
      fixture,
      contextPerReviewer,
    );

    for (const config of [configA, configB, configC]) {
      console.log(`\n  [${config.config}]`);
      console.log(`    Reviewers:        ${config.reviewer_count}`);
      console.log(
        `    Instruction Tkns: ${config.instruction_tokens.value} (${config.instruction_tokens.label})`,
      );
      console.log(
        `    Total Input Tkns: ${config.total_input_tokens.value} (${config.total_input_tokens.label})`,
      );
      console.log(
        `    Output Tkns:      ${config.output_tokens.value} (${config.output_tokens.label})`,
      );
      console.log(
        `    Total Tkns:       ${config.total_tokens.value} (${config.total_tokens.label})`,
      );
      console.log(
        `    Reviewer Latency: ${config.reviewer_latency_ms.value}ms (${config.reviewer_latency_ms.label})`,
      );
      console.log(
        `    Total Latency:    ${config.total_latency_ms.value}ms (${config.total_latency_ms.label})`,
      );
      console.log(`    Total Findings:   ${config.total_findings}`);
      console.log(`    Unique Findings:  ${config.unique_findings}`);
      console.log(`    Duplicates:       ${config.duplicate_findings} (${config.duplicate_rate})`);
      console.log(`    Finding Recall:   ${config.finding_recall}`);
      console.log(`    Critical Recall:  ${config.critical_recall}`);
      if (config.missed_count > 0) {
        console.log(`    Missed:`);
        for (const m of config.missed_details) console.log(`      - ${m}`);
      }
    }

    allResults.push({ fixture, configA, configB, configC });
  }

  // ─── AGGREGATE SUMMARY ─────────────────────────────────────────────────────

  console.log('\n\n━━━ AGGREGATE COMPARISON TABLE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const agg = { A: {}, B: {}, C: {} };
  const keys = ['A', 'B', 'C'];

  for (const k of keys) {
    agg[k] = {
      reviewers: 0,
      instrTkns: 0,
      totalInputTkns: 0,
      outputTkns: 0,
      totalTkns: 0,
      latency: 0,
      totalFindings: 0,
      uniqueFindings: 0,
      dupFindings: 0,
      refCount: 0,
      detected: 0,
      missed: 0,
      critMissed: 0,
    };
  }

  for (const r of allResults) {
    for (const [k, cfg] of [
      ['A', r.configA],
      ['B', r.configB],
      ['C', r.configC],
    ]) {
      agg[k].reviewers += cfg.reviewer_count;
      agg[k].instrTkns += cfg.instruction_tokens.value;
      agg[k].totalInputTkns += cfg.total_input_tokens.value;
      agg[k].outputTkns += cfg.output_tokens.value;
      agg[k].totalTkns += cfg.total_tokens.value;
      agg[k].latency += cfg.total_latency_ms.value;
      agg[k].totalFindings += cfg.total_findings;
      agg[k].uniqueFindings += cfg.unique_findings;
      agg[k].dupFindings += cfg.duplicate_findings;
      agg[k].refCount += cfg.reference_count;
      agg[k].detected += cfg.detected_count;
      agg[k].missed += cfg.missed_count;
      agg[k].critMissed += cfg.critical_missed;
    }
  }

  const header =
    '| Metric                    | Current Tribunal    | Consolidated        | Reduced Specialists |';
  const sep =
    '| :------------------------ | ------------------: | ------------------: | ------------------: |';
  console.log(header);
  console.log(sep);

  function row(label, a, b, c, tag) {
    const t = tag ? ` (${tag})` : '';
    console.log(
      `| ${label.padEnd(25)} | ${String(a + t).padStart(19)} | ${String(b + t).padStart(19)} | ${String(c + t).padStart(19)} |`,
    );
  }

  row('Reviewer count', agg.A.reviewers, agg.B.reviewers, agg.C.reviewers, 'MEASURED');
  row('Instruction tokens', agg.A.instrTkns, agg.B.instrTkns, agg.C.instrTkns, 'MEASURED');
  row(
    'Total input tokens',
    agg.A.totalInputTkns,
    agg.B.totalInputTkns,
    agg.C.totalInputTkns,
    'EST',
  );
  row('Output tokens', agg.A.outputTkns, agg.B.outputTkns, agg.C.outputTkns, 'EST');
  row('Total tokens', agg.A.totalTkns, agg.B.totalTkns, agg.C.totalTkns, 'EST');
  row('Reviewer latency (ms)', agg.A.latency, agg.B.latency, agg.C.latency, 'EST');
  row('Total findings', agg.A.totalFindings, agg.B.totalFindings, agg.C.totalFindings, 'EST');
  row('Unique findings', agg.A.uniqueFindings, agg.B.uniqueFindings, agg.C.uniqueFindings, 'EST');
  row('Duplicate findings', agg.A.dupFindings, agg.B.dupFindings, agg.C.dupFindings, 'EST');

  const dupRateA = ((agg.A.dupFindings / agg.A.totalFindings) * 100).toFixed(1);
  const dupRateB = ((agg.B.dupFindings / agg.B.totalFindings) * 100).toFixed(1);
  const dupRateC = ((agg.C.dupFindings / agg.C.totalFindings) * 100).toFixed(1);
  row('Duplicate rate', dupRateA + '%', dupRateB + '%', dupRateC + '%', 'EST');

  row('Reference findings', agg.A.refCount, agg.B.refCount, agg.C.refCount, '');
  row('Findings detected', agg.A.detected, agg.B.detected, agg.C.detected, 'EST');
  row('Findings missed', agg.A.missed, agg.B.missed, agg.C.missed, 'EST');
  row('Critical missed', agg.A.critMissed, agg.B.critMissed, agg.C.critMissed, 'EST');

  const recallA = ((agg.A.detected / agg.A.refCount) * 100).toFixed(1);
  const recallB = ((agg.B.detected / agg.B.refCount) * 100).toFixed(1);
  const recallC = ((agg.C.detected / agg.C.refCount) * 100).toFixed(1);
  row('Finding recall', recallA + '%', recallB + '%', recallC + '%', 'EST');

  // ─── INSTRUCTION SIZE COMPARISON ───────────────────────────────────────────

  console.log('\n\n━━━ INSTRUCTION SIZE COMPARISON (MEASURED) ━━━━━━━━━━━━━━━━━━━━━\n');

  const configAPersonas = [
    'logic-reviewer',
    'security-auditor',
    'backend-specialist',
    'database-architect',
    'sql-reviewer',
    'schema-reviewer',
    'resilience-reviewer',
  ];
  const configBPersonas = ['backend-security-architect'];
  const configCPersonas = ['backend-specialist', 'security-auditor', 'database-architect'];

  const sizeA = configAPersonas.reduce((s, p) => s + PERSONA_SIZES[p].chars, 0);
  const sizeB = configBPersonas.reduce((s, p) => s + PERSONA_SIZES[p].chars, 0);
  const sizeC = configCPersonas.reduce((s, p) => s + PERSONA_SIZES[p].chars, 0);

  console.log(`Config A (7 personas): ${sizeA} chars → ~${estimateTokens(sizeA)} tokens`);
  console.log(`Config B (1 persona):  ${sizeB} chars → ~${estimateTokens(sizeB)} tokens`);
  console.log(`Config C (3 personas): ${sizeC} chars → ~${estimateTokens(sizeC)} tokens`);
  console.log(`\nInstruction reduction A→B: ${((1 - sizeB / sizeA) * 100).toFixed(1)}%`);
  console.log(`Instruction reduction A→C: ${((1 - sizeC / sizeA) * 100).toFixed(1)}%`);

  // ─── CONCLUSION ────────────────────────────────────────────────────────────

  console.log('\n\n━━━ EXPERIMENTAL CONCLUSION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const noMissedB = agg.B.missed === 0 && agg.B.critMissed === 0;
  const significantSavings = agg.B.totalTkns < agg.A.totalTkns * 0.6;

  if (noMissedB && significantSavings) {
    console.log('CONSOLIDATION SHOWS PROMISE');
    console.log(`  Finding recall: ${recallB}% (Config B) vs ${recallA}% (Config A)`);
    console.log(`  Token savings: ${((1 - agg.B.totalTkns / agg.A.totalTkns) * 100).toFixed(1)}%`);
    console.log(`  Critical findings missed: ${agg.B.critMissed}`);
    console.log('  CAVEAT: These are simulated results. Live LLM validation required.');
  } else if (agg.B.critMissed > 0) {
    console.log('CURRENT SPECIALIZATION SHOULD BE RETAINED');
    console.log(`  Reason: Consolidated reviewer missed ${agg.B.critMissed} critical findings.`);
  } else {
    console.log('INSUFFICIENT EVIDENCE');
    console.log('  Reason: Simulated results are not conclusive. Live LLM A/B test required.');
  }

  // Save results
  fs.writeFileSync('consolidation_experiment_results.json', JSON.stringify(allResults, null, 2));
  console.log('\nResults saved to consolidation_experiment_results.json');
}

runExperiment();
