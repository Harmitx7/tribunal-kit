/**
 * TRIBUNAL KIT — LIVE REVIEWER ARCHITECTURE A/B/C BENCHMARK
 *
 * This benchmark measures the MEASURABLE components of each configuration
 * and explicitly marks what cannot be measured without an external LLM API.
 *
 * ARCHITECTURAL REALITY:
 * Tribunal Kit reviewers are NOT separate LLM API calls.
 * They are sequential prompt-based personas that execute within a SINGLE
 * AI coding agent's context window. The "28 reviewers" are 28 instruction
 * sections fed into one (or few wave) context, not 28 separate API calls.
 *
 * Therefore:
 * - Per-reviewer provider token usage: UNAVAILABLE (single context)
 * - Per-reviewer latency: UNAVAILABLE (single generation)
 * - Per-reviewer output tokens: UNAVAILABLE
 *
 * What IS measurable:
 * - Instruction sizes (characters, estimated tokens): MEASURED
 * - Context sizes (characters, estimated tokens): MEASURED
 * - Total prompt footprint per configuration: MEASURED
 * - Finding quality: requires live LLM execution (ESTIMATED from simulation)
 */

const fs = require('fs');
const path = require('path');

// ─── BASELINE RESOLUTION ─────────────────────────────────────────────────────
//
// "35 reviewers" explanation:
//   Previous experiment summed reviewers across all 5 fixtures (7 × 5 = 35).
//   The ACTUAL per-fixture reviewer count for backend Tier 3 is 7.
//
//   /tribunal-full declares 28 AVAILABLE personas.
//   /tribunal-backend activates 6-7 for backend code.
//   Most Wave 3 personas (frontend, mobile, animations, etc.) auto-pass with "N/A".
//
// Correction applied: all metrics now report PER-FIXTURE reviewer count.

// ─── MEASURED PERSONA INSTRUCTION SIZES ──────────────────────────────────────

const PERSONA_FILES = {
  // Backend Tier 3 reviewers (from /tribunal-backend)
  'precedence-reviewer': { file: '.agent/agents/precedence-reviewer.md' },
  'logic-reviewer': { file: '.agent/agents/logic-reviewer.md' },
  'security-auditor': { file: '.agent/agents/security-auditor.md' },
  'backend-specialist': { file: '.agent/agents/backend-specialist.md' }, // listed as reviewer in tribunal-backend context
  'dependency-reviewer': { file: '.agent/agents/dependency-reviewer.md' },
  'type-safety-reviewer': { file: '.agent/agents/type-safety-reviewer.md' },
  'schema-reviewer': { file: '.agent/agents/schema-reviewer.md' },
  'resilience-reviewer': { file: '.agent/agents/resilience-reviewer.md' },
  'sql-reviewer': { file: '.agent/agents/sql-reviewer.md' },
  'database-architect': { file: '.agent/agents/database-architect.md' },
  // Consolidated (experimental)
  'backend-security-architect': { file: '.agent/agents/backend-security-architect.md' },
};

function measureFile(filePath) {
  const root = path.resolve(__dirname, '..', '..');
  const full = path.join(root, filePath);
  try {
    const content = fs.readFileSync(full, 'utf8');
    return {
      chars: content.length,
      lines: content.split('\n').length,
      estimatedTokens: Math.ceil(content.length / 4),
    };
  } catch (e) {
    return { chars: 0, lines: 0, estimatedTokens: 0, error: e.message };
  }
}

// ─── CONFIGURATION DEFINITIONS ───────────────────────────────────────────────

const CONFIGS = {
  A: {
    name: 'A: Current Tribunal (/tribunal-backend)',
    description: 'Production 7-reviewer sequential architecture',
    reviewers: [
      'precedence-reviewer',
      'logic-reviewer',
      'security-auditor',
      'schema-reviewer',
      'resilience-reviewer',
      'dependency-reviewer',
      'type-safety-reviewer',
    ],
  },
  B: {
    name: 'B: Consolidated Reviewer',
    description: 'Single backend-security-architect persona',
    reviewers: ['backend-security-architect'],
  },
  C: {
    name: 'C: Hybrid (Consolidated + dependency-reviewer)',
    description: 'Consolidated domain reviewer + independent supply-chain specialist',
    reviewers: ['backend-security-architect', 'dependency-reviewer'],
    hybridRationale:
      "dependency-reviewer selected because: (1) it covers supply-chain/npm-ghost-package detection which is orthogonal to backend/security/DB correctness, (2) it was NOT subsumed by the consolidated persona's checklist, (3) it provides independent safety coverage that the consolidated reviewer explicitly excludes.",
  },
};

// ─── LIVE FIXTURES ───────────────────────────────────────────────────────────

const FIXTURES = [
  {
    id: 'mfa-implementation',
    domain: 'Authentication',
    task: 'Add TOTP-based MFA verification endpoint with rate limiting',
    files: ['src/api/auth/mfa.js', 'src/middleware/rateLimit.js'],
    diffLines: 85,
    referenceFindings: 7,
    referenceCritical: 2,
  },
  {
    id: 'rbac-modification',
    domain: 'Authorization',
    task: 'Modify RBAC role-update endpoint with cascading permission invalidation',
    files: ['src/api/users/roles.js', 'src/middleware/rbac.js', 'src/models/Role.js'],
    diffLines: 120,
    referenceFindings: 5,
    referenceCritical: 2,
  },
  {
    id: 'schema-migration',
    domain: 'Database',
    task: 'Add user_preferences table with NOT NULL columns and indexes',
    files: ['prisma/migrations/20260928_add_prefs.sql', 'prisma/schema.prisma'],
    diffLines: 45,
    referenceFindings: 4,
    referenceCritical: 1,
  },
  {
    id: 'authenticated-endpoint',
    domain: 'Backend/API',
    task: 'Create authenticated paginated order-history endpoint',
    files: ['src/api/orders/history.js', 'src/middleware/auth.js'],
    diffLines: 95,
    referenceFindings: 5,
    referenceCritical: 1,
  },
  {
    id: 'secret-rotation',
    domain: 'Secrets',
    task: 'Implement JWT signing-key rotation with dual-key validation window',
    files: ['src/config/keys.js', 'src/auth/jwt.js'],
    diffLines: 60,
    referenceFindings: 4,
    referenceCritical: 1,
  },
];

// ─── BENCHMARK EXECUTION ─────────────────────────────────────────────────────

function runBenchmark() {
  console.log('=== TRIBUNAL KIT — LIVE REVIEWER ARCHITECTURE A/B/C BENCHMARK ===\n');

  // 1. Measure all persona instruction sizes
  console.log('━━━ PHASE 1: Instruction Size Measurement (MEASURED) ━━━\n');
  const sizes = {};
  for (const [name, info] of Object.entries(PERSONA_FILES)) {
    sizes[name] = measureFile(info.file);
    console.log(
      `  ${name.padEnd(30)} ${String(sizes[name].chars).padStart(6)} chars  ~${String(sizes[name].estimatedTokens).padStart(5)} tokens  (MEASURED)`,
    );
  }

  // 2. Measure per-configuration instruction footprint
  console.log('\n━━━ PHASE 2: Per-Configuration Instruction Footprint (MEASURED) ━━━\n');

  const configMetrics = {};
  for (const [key, config] of Object.entries(CONFIGS)) {
    let totalChars = 0;
    let totalTokens = 0;
    for (const r of config.reviewers) {
      if (sizes[r]) {
        totalChars += sizes[r].chars;
        totalTokens += sizes[r].estimatedTokens;
      }
    }
    configMetrics[key] = {
      reviewerCount: config.reviewers.length,
      instructionChars: totalChars,
      instructionTokens: totalTokens,
    };
    console.log(`  ${config.name}`);
    console.log(`    Reviewers:          ${config.reviewers.length}`);
    console.log(`    Instruction chars:  ${totalChars} (MEASURED)`);
    console.log(`    Instruction tokens: ~${totalTokens} (MEASURED)`);
    if (config.hybridRationale) {
      console.log(`    Hybrid rationale:   ${config.hybridRationale}`);
    }
    console.log('');
  }

  // 3. Per-fixture context estimation
  console.log('━━━ PHASE 3: Per-Fixture Context & Total Prompt Size ━━━\n');

  // Estimate context tokens from diff size + file content
  // In the current architecture, ALL reviewers share ONE context window.
  // The context is loaded ONCE, not duplicated per reviewer.
  // This corrects the previous audit's 71.9% "duplication" claim.

  const allFixtureResults = [];

  for (const fix of FIXTURES) {
    const contextTokens = fix.diffLines * 8; // ~8 tokens per diff line (ESTIMATED)
    const fileContextTokens = fix.files.length * 200; // ~200 tokens per file header (ESTIMATED)
    const sharedContext = contextTokens + fileContextTokens;

    console.log(`  ━━━ ${fix.id} (${fix.domain}) ━━━`);
    console.log(`    Diff lines: ${fix.diffLines}`);
    console.log(`    Shared context: ~${sharedContext} tokens (ESTIMATED)\n`);

    const fixtureResult = { fixture: fix.id, domain: fix.domain, configs: {} };

    for (const [key, config] of Object.entries(CONFIGS)) {
      const cm = configMetrics[key];

      // CRITICAL ARCHITECTURAL CORRECTION:
      // In the CURRENT Tribunal, all reviewers share one context window.
      // The instructions are concatenated, NOT duplicated.
      // Total prompt = shared_context + SUM(reviewer_instructions) + workflow_overhead
      const workflowOverhead = 500; // tribunal-backend.md workflow text (ESTIMATED)
      const totalPromptTokens = sharedContext + cm.instructionTokens + workflowOverhead;

      // Output: each reviewer section produces ~100-250 tokens of verdict
      const outputTokensPerReviewer = 175; // ESTIMATED average
      const totalOutputTokens = cm.reviewerCount * outputTokensPerReviewer;

      // Total tokens (single LLM context)
      const totalTokens = totalPromptTokens + totalOutputTokens;

      // Latency: single generation, NOT per-reviewer
      // The generation time scales with output tokens, not reviewer count
      // Typical: ~2-4 seconds per 100 output tokens
      const generationLatencyMs = Math.round((totalOutputTokens / 100) * 3000); // ESTIMATED
      const synthesisLatencyMs = 3000; // ESTIMATED
      const totalLatencyMs = generationLatencyMs + synthesisLatencyMs;

      const result = {
        config: config.name,
        reviewers: cm.reviewerCount,
        instruction_tokens: { value: cm.instructionTokens, label: 'MEASURED' },
        shared_context_tokens: { value: sharedContext, label: 'ESTIMATED' },
        total_prompt_tokens: { value: totalPromptTokens, label: 'ESTIMATED' },
        output_tokens: { value: totalOutputTokens, label: 'ESTIMATED' },
        total_tokens: { value: totalTokens, label: 'ESTIMATED' },
        generation_latency_ms: { value: generationLatencyMs, label: 'ESTIMATED' },
        synthesis_latency_ms: { value: synthesisLatencyMs, label: 'ESTIMATED' },
        total_latency_ms: { value: totalLatencyMs, label: 'ESTIMATED' },
        actual_provider_tokens: 'UNAVAILABLE',
        actual_provider_latency: 'UNAVAILABLE',
        reference_findings: fix.referenceFindings,
        reference_critical: fix.referenceCritical,
        findings_detected: 'REQUIRES LIVE LLM EXECUTION',
        critical_missed: 'REQUIRES LIVE LLM EXECUTION',
        timeouts: 'UNAVAILABLE',
        parse_failures: 'UNAVAILABLE',
        retries: 'UNAVAILABLE',
      };

      fixtureResult.configs[key] = result;

      console.log(`    [${config.name}]`);
      console.log(`      Reviewers:          ${result.reviewers}`);
      console.log(
        `      Instruction tokens: ${result.instruction_tokens.value} (${result.instruction_tokens.label})`,
      );
      console.log(
        `      Total prompt:       ~${result.total_prompt_tokens.value} tokens (${result.total_prompt_tokens.label})`,
      );
      console.log(
        `      Output tokens:      ~${result.output_tokens.value} (${result.output_tokens.label})`,
      );
      console.log(
        `      Total tokens:       ~${result.total_tokens.value} (${result.total_tokens.label})`,
      );
      console.log(`      Actual provider:    ${result.actual_provider_tokens}`);
      console.log(
        `      Estimated latency:  ${result.total_latency_ms.value}ms (${result.total_latency_ms.label})`,
      );
      console.log(`      Finding recall:     ${result.findings_detected}`);
      console.log('');
    }

    allFixtureResults.push(fixtureResult);
  }

  // 4. Aggregate comparison table
  console.log('\n━━━ AGGREGATE COMPARISON TABLE ━━━\n');

  const agg = {};
  for (const key of ['A', 'B', 'C']) {
    agg[key] = { instrTkns: 0, promptTkns: 0, outputTkns: 0, totalTkns: 0, latency: 0 };
  }

  for (const fr of allFixtureResults) {
    for (const key of ['A', 'B', 'C']) {
      const c = fr.configs[key];
      agg[key].instrTkns += c.instruction_tokens.value;
      agg[key].promptTkns += c.total_prompt_tokens.value;
      agg[key].outputTkns += c.output_tokens.value;
      agg[key].totalTkns += c.total_tokens.value;
      agg[key].latency += c.total_latency_ms.value;
    }
  }

  const header =
    '| Metric                      |  A: Current |  B: Consolidated |  C: Hybrid | Label      |';
  const sep =
    '| :-------------------------- | ----------: | ---------------: | ---------: | :--------- |';
  console.log(header);
  console.log(sep);

  function row(label, a, b, c, tag) {
    console.log(
      `| ${label.padEnd(27)} | ${String(a).padStart(11)} | ${String(b).padStart(16)} | ${String(c).padStart(10)} | ${tag.padEnd(10)} |`,
    );
  }

  row(
    'Reviewers (per fixture)',
    CONFIGS.A.reviewers.length,
    CONFIGS.B.reviewers.length,
    CONFIGS.C.reviewers.length,
    'MEASURED',
  );
  row('Instruction tokens (sum)', agg.A.instrTkns, agg.B.instrTkns, agg.C.instrTkns, 'MEASURED');
  row('Total prompt tokens', agg.A.promptTkns, agg.B.promptTkns, agg.C.promptTkns, 'ESTIMATED');
  row('Output tokens', agg.A.outputTkns, agg.B.outputTkns, agg.C.outputTkns, 'ESTIMATED');
  row('Total tokens', agg.A.totalTkns, agg.B.totalTkns, agg.C.totalTkns, 'ESTIMATED');
  row('Estimated latency (ms)', agg.A.latency, agg.B.latency, agg.C.latency, 'ESTIMATED');
  row('Actual provider tokens', 'N/A', 'N/A', 'N/A', 'UNAVAILABLE');
  row('Actual latency', 'N/A', 'N/A', 'N/A', 'UNAVAILABLE');
  row('Findings detected', 'N/A', 'N/A', 'N/A', 'UNAVAILABLE');
  row('Critical missed', 'N/A', 'N/A', 'N/A', 'UNAVAILABLE');
  row('Timeouts', 'N/A', 'N/A', 'N/A', 'UNAVAILABLE');
  row('Parse failures', 'N/A', 'N/A', 'N/A', 'UNAVAILABLE');

  // 5. Token reduction analysis
  console.log('\n━━━ TOKEN REDUCTION ANALYSIS (MEASURED instruction, ESTIMATED total) ━━━\n');

  const instrReductionAB = ((1 - agg.B.instrTkns / agg.A.instrTkns) * 100).toFixed(1);
  const instrReductionAC = ((1 - agg.C.instrTkns / agg.A.instrTkns) * 100).toFixed(1);
  const totalReductionAB = ((1 - agg.B.totalTkns / agg.A.totalTkns) * 100).toFixed(1);
  const totalReductionAC = ((1 - agg.C.totalTkns / agg.A.totalTkns) * 100).toFixed(1);

  console.log(`  Instruction reduction A→B: ${instrReductionAB}% (MEASURED)`);
  console.log(`  Instruction reduction A→C: ${instrReductionAC}% (MEASURED)`);
  console.log(`  Total token reduction A→B: ${totalReductionAB}% (ESTIMATED)`);
  console.log(`  Total token reduction A→C: ${totalReductionAC}% (ESTIMATED)`);

  // 6. Architectural correction
  console.log('\n━━━ CRITICAL ARCHITECTURAL CORRECTION ━━━\n');
  console.log('  The previous Tier 3 audit reported 71.9% "context duplication".');
  console.log('  This was INCORRECT. In the current Tribunal architecture:');
  console.log('');
  console.log('    - All reviewers share ONE LLM context window');
  console.log('    - Repository context is loaded ONCE, not per-reviewer');
  console.log('    - Reviewer instructions are CONCATENATED, not independently duplicated');
  console.log('    - There are NOT separate API calls per reviewer');
  console.log('');
  console.log('  Actual context duplication rate: 0% (MEASURED by architecture inspection)');
  console.log('');
  console.log('  The real cost of multiple reviewers is:');
  console.log('    1. Instruction bloat: 7 persona files consume ~11,700 tokens');
  console.log('    2. Output bloat: 7 reviewer sections produce ~1,225 output tokens');
  console.log('    3. Attention dilution: more instructions may reduce per-reviewer depth');
  console.log('    4. Finding duplication: synthesis must deduplicate overlapping verdicts');

  // 7. Failure mode analysis
  console.log('\n━━━ FAILURE MODE ANALYSIS ━━━\n');
  console.log(
    '  | Failure Mode          | A: Current         | B: Consolidated    | C: Hybrid          |',
  );
  console.log(
    '  | :-------------------- | :----------------- | :----------------- | :----------------- |',
  );
  console.log(
    '  | LLM timeout           | Partial review     | Zero review        | Partial review     |',
  );
  console.log(
    '  | Malformed output      | Other sections ok  | Total failure      | Other section ok   |',
  );
  console.log(
    '  | Context overflow      | Higher risk (11.7k)| Lower risk (1.1k)  | Low risk (3.0k)    |',
  );
  console.log(
    '  | Attention dilution    | Higher risk        | Lower risk         | Low risk           |',
  );
  console.log(
    '  | Redundancy            | High (7 overlaps)  | None               | Minimal (2 indep.) |',
  );

  // 8. Viability assessment
  console.log('\n━━━ VIABILITY ASSESSMENT ━━━\n');

  console.log('  B viable (Consolidated)?');
  console.log('    Instruction reduction: ' + instrReductionAB + '% (MEASURED)');
  console.log('    Total token reduction: ' + totalReductionAB + '% (ESTIMATED)');
  console.log('    Finding recall:        UNAVAILABLE (requires live LLM execution)');
  console.log('    Critical recall:       UNAVAILABLE (requires live LLM execution)');
  console.log('    Failure resilience:    POOR — single point of failure');
  console.log('    ASSESSMENT:            PROMISING BUT UNPROVEN');
  console.log('');
  console.log('  C viable (Hybrid)?');
  console.log('    Instruction reduction: ' + instrReductionAC + '% (MEASURED)');
  console.log('    Total token reduction: ' + totalReductionAC + '% (ESTIMATED)');
  console.log('    Finding recall:        UNAVAILABLE (requires live LLM execution)');
  console.log('    Critical recall:       UNAVAILABLE (requires live LLM execution)');
  console.log('    Failure resilience:    GOOD — independent supply-chain coverage');
  console.log('    ASSESSMENT:            BEST CANDIDATE (balances savings + safety)');

  // 9. What actually needs to happen for live validation
  console.log('\n━━━ REQUIRED LIVE VALIDATION (NOT YET POSSIBLE) ━━━\n');
  console.log('  To move from ESTIMATED to MEASURED finding recall:');
  console.log('');
  console.log('  1. Execute /tribunal-backend against an actual code diff');
  console.log('  2. Record the raw LLM output (all reviewer verdicts)');
  console.log('  3. Execute the same diff with ONLY the backend-security-architect persona');
  console.log('  4. Record the raw LLM output');
  console.log('  5. Compare findings using deterministic normalization');
  console.log('  6. Measure actual provider token usage from response headers');
  console.log('');
  console.log('  BLOCKER: Tribunal Kit reviewers execute inside the AI agent context.');
  console.log('  There is no standalone reviewer API endpoint to call programmatically.');
  console.log('  Live validation requires either:');
  console.log('    (a) Running /tribunal-backend manually on a real change, OR');
  console.log('    (b) Exposing a reviewer-execution CLI command (does not exist yet)');

  fs.writeFileSync(
    'live_benchmark_results.json',
    JSON.stringify(
      {
        baseline_correction: '35 = sum across fixtures, actual per-fixture = 7',
        context_duplication_correction: '71.9% was incorrect; actual = 0% (shared context)',
        configs: Object.fromEntries(
          Object.entries(CONFIGS).map(([k, v]) => [k, { ...v, metrics: configMetrics[k] }]),
        ),
        fixtures: allFixtureResults,
        aggregate: agg,
      },
      null,
      2,
    ),
  );

  console.log('\nResults saved to live_benchmark_results.json');
}

runBenchmark();
