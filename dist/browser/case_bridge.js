'use strict';

/**
 * case_bridge.js — Empirical Case Law Bridge for Browser Audits
 *
 * Converts live web audit failures (WCAG 2.2 accessibility violations,
 * missing security headers, uncaught runtime/console errors, network drops)
 * into binding Case Law precedents stored in .agent/history/case-law/
 */

const path = require('path');
const caseLaw = require('../../.agent/scripts/case_law_manager');

/**
 * Codifies violations from an audit report into binding Case Law records.
 *
 * @param {object} auditReport Report produced by auditURL
 * @param {object} options Options { stackVersion, reviewer, prRef }
 * @returns {object} { codifiedCount, cases: Array<object> }
 */
function codifyAuditViolations(auditReport, options = {}) {
  if (!auditReport || !auditReport.violations) {
    return { codifiedCount: 0, cases: [] };
  }

  const index = caseLaw.loadIndex();
  const existingFingerprints = new Set(index.cases.map((c) => c.fingerprint));
  const newCases = [];
  const now = new Date().toISOString().slice(0, 19);
  const targetUrl = auditReport.url || 'http://localhost';

  // 1. Accessibility Violations
  const a11yIssues = auditReport.violations.accessibility || [];
  for (const issue of a11yIssues) {
    const rawDiff = [
      `// [Violation] WCAG 2.2 Accessibility: ${issue.message}`,
      `// Target: ${targetUrl}`,
      `<div role="region" aria-invalid="true">`,
      `  <!-- Offending pattern: ${issue.category || 'a11y'} issue -->`,
      `  <!-- Count: ${issue.count || 1} -->`,
      `</div>`,
    ].join('\n');

    const fp = caseLaw.contentHash(rawDiff);
    if (existingFingerprints.has(fp)) continue;

    const caseId = index.next_id;
    const reason = `[Web Audit] Accessibility violation: ${issue.message} on ${targetUrl}`;
    const tags = caseLaw.extractTags(`accessibility wcag a11y ${issue.message} ${issue.category || ''}`);

    const caseRecord = {
      id: caseId,
      fingerprint: fp,
      timestamp: now,
      domain: 'frontend',
      verdict: 'REJECTED',
      reason,
      pr_ref: options.prRef || targetUrl,
      reviewer: options.reviewer || 'browser-audit',
      tags,
      stack_version: options.stackVersion || null,
      diff_raw: rawDiff,
      diff_delta: caseLaw.semanticDelta(rawDiff),
    };

    caseLaw.saveCase(caseRecord);
    index.cases.push({
      id: caseId,
      fingerprint: fp,
      domain: caseRecord.domain,
      verdict: caseRecord.verdict,
      tags,
      timestamp: now,
      reason_summary: reason.slice(0, 120),
      stack_version: caseRecord.stack_version,
    });
    index.next_id = caseId + 1;
    existingFingerprints.add(fp);
    newCases.push(caseRecord);
  }

  // 2. Security Violations
  const secIssues = auditReport.violations.security || [];
  for (const sec of secIssues) {
    const rawDiff = [
      `// [Violation] Missing Security Header: ${sec}`,
      `// Target: ${targetUrl}`,
      `HTTP/1.1 200 OK`,
      `- ${sec}`,
    ].join('\n');

    const fp = caseLaw.contentHash(rawDiff);
    if (existingFingerprints.has(fp)) continue;

    const caseId = index.next_id;
    const reason = `[Web Audit] Security violation: ${sec} on ${targetUrl}`;
    const tags = caseLaw.extractTags(`security header ${sec}`);

    const caseRecord = {
      id: caseId,
      fingerprint: fp,
      timestamp: now,
      domain: 'security',
      verdict: 'REJECTED',
      reason,
      pr_ref: options.prRef || targetUrl,
      reviewer: options.reviewer || 'browser-audit',
      tags,
      stack_version: options.stackVersion || null,
      diff_raw: rawDiff,
      diff_delta: caseLaw.semanticDelta(rawDiff),
    };

    caseLaw.saveCase(caseRecord);
    index.cases.push({
      id: caseId,
      fingerprint: fp,
      domain: caseRecord.domain,
      verdict: caseRecord.verdict,
      tags,
      timestamp: now,
      reason_summary: reason.slice(0, 120),
      stack_version: caseRecord.stack_version,
    });
    index.next_id = caseId + 1;
    existingFingerprints.add(fp);
    newCases.push(caseRecord);
  }

  // 3. Console & Runtime Errors
  const consoleErrors = auditReport.violations.consoleErrors || [];
  for (const err of consoleErrors) {
    const rawDiff = [
      `// [Violation] Browser Console Exception (${err.level || 'error'})`,
      `// Source: ${err.url || targetUrl}:${err.line || 0}`,
      `throw new Error("${(err.text || 'Uncaught exception').replace(/"/g, '\\"')}");`,
    ].join('\n');

    const fp = caseLaw.contentHash(rawDiff);
    if (existingFingerprints.has(fp)) continue;

    const caseId = index.next_id;
    const reason = `[Web Audit] Uncaught browser exception: ${err.text} at ${err.url || targetUrl}:${err.line || 0}`;
    const tags = caseLaw.extractTags(`console error exception ${err.text}`);

    const caseRecord = {
      id: caseId,
      fingerprint: fp,
      timestamp: now,
      domain: 'frontend',
      verdict: 'REJECTED',
      reason,
      pr_ref: options.prRef || targetUrl,
      reviewer: options.reviewer || 'browser-audit',
      tags,
      stack_version: options.stackVersion || null,
      diff_raw: rawDiff,
      diff_delta: caseLaw.semanticDelta(rawDiff),
    };

    caseLaw.saveCase(caseRecord);
    index.cases.push({
      id: caseId,
      fingerprint: fp,
      domain: caseRecord.domain,
      verdict: caseRecord.verdict,
      tags,
      timestamp: now,
      reason_summary: reason.slice(0, 120),
      stack_version: caseRecord.stack_version,
    });
    index.next_id = caseId + 1;
    existingFingerprints.add(fp);
    newCases.push(caseRecord);
  }

  if (newCases.length > 0) {
    caseLaw.saveIndex(index);
  }

  return {
    codifiedCount: newCases.length,
    cases: newCases,
  };
}

module.exports = {
  codifyAuditViolations,
};
