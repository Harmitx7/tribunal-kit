const FIXTURES = [
  {
    complexity: 'Low',
    desc: 'Frontend accessibility issue',
    reviewer: 'frontend-reviewer',
    findings: [
      {
        severity: 'Minor',
        loc: 'src/Header.jsx:12',
        issue: 'Missing alt attribute on img',
        fix: 'Add descriptive alt text',
      },
    ],
  },
  {
    complexity: 'Medium',
    desc: 'API change missing boundary',
    reviewer: 'backend-specialist',
    findings: [
      {
        severity: 'Important',
        loc: 'src/api/users.js:45',
        issue: 'Pagination logic lacks max boundary check',
        fix: 'Add Math.min(limit, 100) to prevent denial of service',
      },
    ],
  },
  {
    complexity: 'High',
    desc: 'Authentication bypass risk',
    reviewer: 'security-auditor',
    findings: [
      {
        severity: 'Critical',
        loc: 'src/auth.js:23',
        issue: 'Missing role check before granting admin token',
        fix: 'Ensure req.user.role === "ADMIN" is validated before signing JWT',
      },
      {
        severity: 'Important',
        loc: 'src/auth.js:10',
        issue: 'JWT secret is hardcoded in test environment',
        fix: 'Use process.env.JWT_SECRET even in tests',
      },
    ],
  },
];

function generateMarkdown(fixture) {
  let status = '✅ APPROVED';
  if (fixture.findings.some(f => f.severity === 'Critical')) status = '❌ REJECTED';
  else if (fixture.findings.length > 0) status = '⚠️ WARNING';

  let md = `━━━ Verdicts ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  md += `${fixture.reviewer}:      ${status}\n\n`;

  if (fixture.findings.length > 0) {
    md += `━━━ Warnings ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    md += `${fixture.reviewer}:\n`;
    for (const f of fixture.findings) {
      md += `  ⚠️ ${f.severity} — ${f.loc}: ${f.issue}\n`;
      md += `  Fix: ${f.fix}\n\n`;
    }
  }
  return md;
}

function generateJSON(fixture) {
  let status = 'APPROVED';
  if (fixture.findings.some(f => f.severity === 'Critical')) status = 'REJECTED';
  else if (fixture.findings.length > 0) status = 'WARN';

  const obj = {
    reviewer: fixture.reviewer,
    status: status,
    findings: fixture.findings.map(f => ({
      severity: f.severity,
      loc: f.loc,
      issue: f.issue,
      fix: f.fix,
    })),
  };
  return JSON.stringify([obj], null, 0); // compact JSON array
}

function estimateTokens(text) {
  // Rough estimate: ~4 chars per token
  return Math.ceil(text.length / 4);
}

function runExperiment() {
  const results = [];

  for (const fix of FIXTURES) {
    const md = generateMarkdown(fix);
    const js = generateJSON(fix);

    const mdTokens = estimateTokens(md);
    const jsTokens = estimateTokens(js);

    // Simulate parsing latency and reliability
    const startParse = process.hrtime.bigint();
    let parsedCount = 0;
    let parseSuccess = false;
    try {
      const parsed = JSON.parse(js);
      parsedCount = parsed[0].findings.length;
      parseSuccess = true;
    } catch (_e) {}
    const endParse = process.hrtime.bigint();
    const parseLat = Number(endParse - startParse) / 1e6;

    results.push({
      desc: fix.desc,
      md_tokens: mdTokens,
      js_tokens: jsTokens,
      tokens_saved: mdTokens - jsTokens,
      parse_latency_ms: parseLat,
      findings_preserved_md: fix.findings.length,
      findings_preserved_js: parsedCount,
      parse_success: parseSuccess,
    });
  }

  console.log('=== A/B EXPERIMENT RESULTS ===');
  console.table(results);
}

runExperiment();
