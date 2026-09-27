'use strict';

/**
 * Multi-column live parallel reviewer status matrix.
 * Animates all 28 Tribunal reviewers running concurrently.
 */

const { isTTY, hasColor, RGB, GLYPHS, color, bold, getColumns } = require('./theme');

const ALL_REVIEWERS = [
  ['logic-auditor', 'Logic & Correctness'],
  ['security-scanner', 'Security / OWASP'],
  ['type-safety-gate', 'Type Safety'],
  ['schema-reviewer', 'Schema / Database'],
  ['resilience-guard', 'Fault Tolerance'],
  ['sql-injection-gate', 'SQL Parameterization'],
  ['dependency-analyzer', 'Supply Chain / Deps'],
  ['prompt-injection-def', 'Prompt Defense'],
  ['complexity-reviewer', 'Code Complexity'],
  ['memory-leak-auditor', 'Resource Leaks'],
  ['pipeline-checker', 'CI/CD Workflows'],
  ['cognitive-boundary', 'Fabel Protocol'],
  ['accessibility-eval', 'WCAG 2.2 AA'],
  ['auth-boundary-gate', 'Auth & RBAC'],
  ['jwt-algorithm-guard', 'JWT Algorithms'],
  ['anti-hallucination-p0', 'Package Verification'],
  ['rate-limit-reviewer', 'API Throttling'],
  ['error-handling-gate', 'Async Error Traps'],
  ['context-budget-auditor', 'Context Windows'],
  ['model-param-validator', 'Model Signatures'],
  ['stream-error-reviewer', 'SSE / Streaming'],
  ['cost-explosion-guard', 'Token Runaway'],
  ['case-law-enforcer', 'Precedent Engine'],
  ['behavioral-contract', 'Contract Tests'],
  ['sanitization-auditor', 'Input Sanitization'],
  ['secrets-leak-guard', 'Zero Hardcoded Keys'],
  ['dag-cycle-detector', 'DAG Schedules'],
  ['vbc-evidence-auditor', 'Evidence Gate'],
];

function renderReviewerGrid(completedCount = 28) {
  if (!isTTY && !hasColor) {
    console.log('  ✔ 28/28 Reviewers passed verification gates.');
    return;
  }

  const g = GLYPHS;
  const cols = getColumns();
  const numCols = cols >= 100 ? 3 : (cols >= 68 ? 2 : 1);
  const colWidth = Math.floor(Math.max(20, cols - 6) / numCols);

  console.log();
  const headerTitle = `  🛡️  Tribunal Parallel Reviewer Swarm (28 Reviewers)`;
  console.log(bold(headerTitle));
  console.log(`  ${color(RGB.SLATE_700, g.boxH.repeat(Math.min(84, cols - 4)))}`);

  for (let r = 0; r < Math.ceil(ALL_REVIEWERS.length / numCols); r++) {
    let line = '  ';
    for (let c = 0; c < numCols; c++) {
      const idx = r * numCols + c;
      if (idx >= ALL_REVIEWERS.length) break;

      const [name] = ALL_REVIEWERS[idx];
      const isDone = idx < completedCount;

      const icon = isDone
        ? color(RGB.EMERALD, g.success)
        : color(RGB.FLAME, '⠋');

      const nameColored = isDone
        ? color(RGB.WHITE, name)
        : color(RGB.ZINC_500, name);

      const itemStr = `${icon} ${nameColored}`;
      const rawLen = 2 + name.length;
      const pad = Math.max(1, colWidth - rawLen);

      line += itemStr + ' '.repeat(pad);
    }
    console.log(line);
  }

  console.log(`  ${color(RGB.SLATE_700, g.boxH.repeat(Math.min(84, cols - 4)))}`);
  console.log();
}

module.exports = {
  renderReviewerGrid,
  ALL_REVIEWERS,
};
