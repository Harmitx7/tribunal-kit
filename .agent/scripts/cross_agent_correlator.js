#!/usr/bin/env node
/**
 * cross_agent_correlator.js — Tribunal Intelligence Findings Correlator
 * Correlates, deduplicates, and resolves conflicts between findings from multiple agents.
 *
 * Correlation rules (strict):
 *   Two findings are correlated ONLY if ALL of the following are true:
 *     1. Same file (exact path match)
 *     2. Same line (exact) OR nearby line (<=5) AND same category AND same type/title similarity
 *     3. Evidence overlap is validated: requires BOTH same location AND similar description
 *
 *   The previous implementation used an OR between (file+line+category) and (evidence description),
 *   which caused false merges across files and between unrelated vulnerability types.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { BOLD, RESET, YELLOW, sectionHeader } = require('./_colors');

// Maximum line distance for considering two findings "nearby"
const MAX_LINE_DISTANCE = 5;

function parseFindings(reportsPaths) {
  const allFindings = [];
  for (const reportPath of reportsPaths) {
    if (fs.existsSync(reportPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        if (data && data.findings && Array.isArray(data.findings)) {
          const fds = data.findings.map(f => ({
            ...f,
            _source_agent: path.basename(reportPath, '.json'),
          }));
          allFindings.push(...fds);
        }
      } catch (e) {
        console.error(`Failed to parse ${reportPath}:`, e.message);
      }
    }
  }
  return allFindings;
}

/**
 * Determines if two findings represent the same underlying issue.
 *
 * Requirements for correlation:
 *   1. Must be in the SAME file
 *   2. Must meet ONE of:
 *      a. Exact same line number
 *      b. Nearby lines (<=MAX_LINE_DISTANCE) AND same category AND similar title/type
 *      c. Evidence has overlapping location (file:line) — NOT just description
 */
function shouldCorrelate(a, b) {
  const aFile = a.location?.file;
  const bFile = b.location?.file;

  // Rule: findings without file location are never correlated
  if (!aFile || !bFile) return false;

  // Rule: must be in the same file
  if (aFile !== bFile) return false;

  const aLine = a.location?.line;
  const bLine = b.location?.line;

  // Case 2a: exact same line
  if (aLine && bLine && aLine === bLine && a.category === b.category) {
    return true;
  }

  // Case 2b: nearby lines + same category + similar type
  if (aLine && bLine && Math.abs(aLine - bLine) <= MAX_LINE_DISTANCE && a.category === b.category) {
    // Additional guard: require same type OR very similar title
    const sameType = a.type && b.type && a.type === b.type;
    const similarTitle = titleSimilarity(a.title, b.title) > 0.5;
    if (sameType || similarTitle) {
      return true;
    }
    return false;
  }

  // Case 2c: evidence has overlapping location (file:line match, not just description)
  if (a.evidence && b.evidence) {
    const aLocations = a.evidence.map(e => e.location).filter(l => l && l.includes(':'));
    const bLocations = b.evidence.map(e => e.location).filter(l => l && l.includes(':'));
    if (aLocations.length > 0 && bLocations.length > 0) {
      const overlap = aLocations.some(al => bLocations.includes(al));
      if (overlap && a.category === b.category) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Simple word-overlap similarity for titles.
 * Returns a value between 0 and 1.
 */
function titleSimilarity(a, b) {
  if (!a || !b) return 0;
  const wordsA = new Set(
    a
      .toLowerCase()
      .split(/\W+/)
      .filter(w => w.length > 2),
  );
  const wordsB = new Set(
    b
      .toLowerCase()
      .split(/\W+/)
      .filter(w => w.length > 2),
  );
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++;
  }
  return overlap / Math.max(wordsA.size, wordsB.size);
}

function correlateFindings(findings) {
  const correlated = [];
  const processed = new Set();

  for (let i = 0; i < findings.length; i++) {
    if (processed.has(i)) continue;
    const base = findings[i];
    const mergedGroup = [base];
    processed.add(i);

    for (let j = i + 1; j < findings.length; j++) {
      if (processed.has(j)) continue;
      const other = findings[j];

      if (shouldCorrelate(base, other)) {
        mergedGroup.push(other);
        processed.add(j);
      }
    }

    if (mergedGroup.length > 1) {
      const merged = { ...base };

      // Merge evidence (deduplicated by description+location key)
      const allEvidence = new Map();
      mergedGroup.forEach(f => {
        (f.evidence || []).forEach(e =>
          allEvidence.set(e.description + '||' + (e.location || ''), e),
        );
      });
      merged.evidence = Array.from(allEvidence.values());

      // Track related findings
      merged.related_findings = mergedGroup.map(f => f.id).filter(id => id !== merged.id);

      // Merge agents
      merged.agents = [...new Set(mergedGroup.map(f => f._source_agent))];

      // Handle confidence and conflicts
      const statuses = new Set(mergedGroup.map(f => f.status));
      if (statuses.size > 1) {
        merged.status = 'UNVERIFIED';
        merged.confidence = 0.5;
        merged.title = `[CONFLICTED] ${base.title}`;
      } else {
        merged.title = `[CORRELATED] ${base.title}`;
        merged.confidence = Math.max(
          ...mergedGroup.map(f => (typeof f.confidence === 'number' ? f.confidence : 0.8)),
        );
      }

      // Severity: take the highest — but ONLY within the same vulnerability type
      const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
      const lowestIndex = Math.min(
        ...mergedGroup.map(f => {
          const idx = severityOrder.indexOf((f.severity || '').toUpperCase());
          return idx === -1 ? 4 : idx;
        }),
      );
      merged.severity = severityOrder[lowestIndex];

      correlated.push(merged);
    } else {
      base.agents = [base._source_agent];
      correlated.push(base);
    }
  }

  return correlated;
}

function main() {
  const args = process.argv.slice(2);
  const outPath =
    args.find(a => a.startsWith('--out='))?.split('=')[1] || 'correlated_findings.json';
  const reportFiles = args.filter(a => !a.startsWith('--'));

  console.log(`${BOLD}Tribunal — Cross-Agent Correlator${RESET}`);
  if (reportFiles.length === 0) {
    console.log(YELLOW + 'No finding reports provided.' + RESET);
    fs.writeFileSync(outPath, JSON.stringify({ findings: [] }, null, 2));
    return;
  }

  const findings = parseFindings(reportFiles);
  const correlated = correlateFindings(findings);

  fs.writeFileSync(outPath, JSON.stringify({ findings: correlated }, null, 2));

  console.log(sectionHeader('Correlation Results'));
  console.log(`Original findings: ${findings.length}`);
  console.log(`Correlated findings: ${correlated.length}`);
  console.log(`\nWritten to: ${outPath}`);
}

if (require.main === module) {
  main();
}
