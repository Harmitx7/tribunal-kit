'use strict';

/**
 * Multi-column live parallel reviewer status matrix.
 * Animates all 28 Tribunal reviewers running concurrently.
 */

const { isTTY, hasColor, RGB, GLYPHS, color, bold, dim, getColumns } = require('./theme');
const { renderProgressBar } = require('./progress');

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
    console.log(`  ✔ ${completedCount}/${ALL_REVIEWERS.length} Reviewers passed verification gates.`);
    return;
  }

  const g = GLYPHS;
  const cols = getColumns();
  const numCols = cols >= 110 ? 3 : cols >= 72 ? 2 : 1;
  const colWidth = Math.floor(Math.max(25, cols - 6) / numCols);

  console.log();
  const pct = (completedCount / ALL_REVIEWERS.length) * 100;
  console.log(renderProgressBar('Tribunal Swarm', pct, { width: 30, color: RGB.CYAN, labelWidth: 16 }));
  console.log();

  for (let r = 0; r < Math.ceil(ALL_REVIEWERS.length / numCols); r++) {
    let line = '  ';
    for (let c = 0; c < numCols; c++) {
      const idx = r * numCols + c;
      if (idx >= ALL_REVIEWERS.length) break;

      const [name] = ALL_REVIEWERS[idx];
      const isDone = idx < completedCount;

      const icon = isDone ? color(RGB.EMERALD, g.success) : color(RGB.FLAME, '⠋');
      const nameColored = isDone ? color(RGB.ZINC_200, name) : dim(name);

      const itemStr = `${icon} ${nameColored}`;
      const rawLen = 2 + name.length;
      const pad = Math.max(1, colWidth - rawLen);

      line += itemStr + ' '.repeat(pad);
    }
    console.log(line);
  }

  console.log();
}

module.exports = {
  renderReviewerGrid,
  ALL_REVIEWERS,
};
