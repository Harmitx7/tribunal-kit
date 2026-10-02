'use strict';

/**
 * browser_intelligence.js — System-1 Capability 5: Browser / Interaction Intelligence
 * ====================================================================================
 * Reasons about browser/UI verification signals to determine whether
 * browser validation is required, which level of verification is needed,
 * and whether the browser infrastructure is safely available.
 *
 * Routing Levels:
 * - NONE: No UI impact -> skip browser stage
 * - SMOKE: CSS-only / styling change -> lightweight smoke test
 * - FUNCTIONAL: Form / interactive component / navigation -> functional verification
 * - HIGH_RISK: Payment / session / access-control / auth UI -> high-risk verification
 *
 * Safety Invariant:
 * If browser infrastructure is not available when validation is required,
 * return deterministic UNAVAILABLE state and signal escalation rather than
 * pretending validation occurred.
 */

const path = require('path');
const { findBrowser } = require('../browser/discovery');

const UI_EXTENSIONS = new Set([
  '.css',
  '.scss',
  '.less',
  '.html',
  '.htm',
  '.jsx',
  '.tsx',
  '.vue',
  '.svelte',
  '.astro',
]);

const CSS_EXTENSIONS = new Set(['.css', '.scss', '.less']);

const FORM_PATTERNS = [
  /<form\b/i,
  /<input\b/i,
  /<textarea\b/i,
  /<select\b/i,
  /\bonSubmit\b/i,
  /\bhandleSubmit\b/i,
  /\bFormData\b/i,
  /\buseForm\b/i,
  /\bvalidationSchema\b/i,
  /\bzodResolver\b/i,
];

const AUTH_UI_PATTERNS = [
  /\b(login|sign-?in|signup|sign-?up|register|password|passphrase|mfa|totp|oauth|sso|credentials?)\b/i,
  /\b(auth-form|auth-dialog|login-button|session-expire)\b/i,
];

const PAYMENT_UI_PATTERNS = [
  /\b(stripe|paypal|checkout|payment|credit-card|card-number|cvv|billing-form|invoice)\b/i,
];

const DOM_INTERACTION_PATTERNS = [
  /\b(addEventListener|removeEventListener|querySelector|getElementById|innerHTML|innerText)\b/i,
  /\b(onClick|onKeyDown|onKeyUp|onChange|onBlur|onFocus)\b/i,
];

const OS_SYSTEM_ROOTS = new Set([
  'usr',
  'etc',
  'tmp',
  'var',
  'home',
  'bin',
  'lib',
  'lib64',
  'opt',
  'dev',
  'proc',
  'sys',
  'node_modules',
  'Users',
  'Program Files',
  'Windows',
  'sbin',
]);

function isTestFilePath(filePath) {
  const norm = filePath.replace(/\\/g, '/');
  return (
    /\.(test|spec)\.[a-zA-Z0-9]+$/i.test(norm) ||
    norm.includes('/__tests__/') ||
    norm.includes('/test/') ||
    norm.includes('/tests/')
  );
}

/**
 * Extract affected route or page names from file paths and task/diff
 */
function extractAffectedRoutes(files = [], task = '', diff = '') {
  const routes = new Set();

  for (const f of files) {
    const norm = f.replace(/\\/g, '/');
    // Next.js App Router / Pages Router / Vue pages
    const pageMatch = norm.match(/(?:app|pages|routes|views)\/([^.]+)/i);
    if (pageMatch) {
      let r = pageMatch[1].replace(/\/page$/, '').replace(/\/route$/, '');
      if (!r.startsWith('/')) r = '/' + r;
      routes.add(r);
    }
  }

  // Regex for route mentions in task or diff (e.g. /login, /checkout)
  const routeMentionRegex = /(?:^|\s)(\/(?:[a-zA-Z0-9_-]+\/?){1,4})/g;
  let match;
  while ((match = routeMentionRegex.exec(task + ' ' + diff)) !== null) {
    const r = match[1].trim();
    if (r.length > 1 && !r.startsWith('/.') && !r.includes('//')) {
      const topSegment = r.replace(/^\/+/, '').split('/')[0];
      if (!OS_SYSTEM_ROOTS.has(topSegment)) {
        routes.add(r);
      }
    }
  }

  return Array.from(routes);
}

/**
 * Reason about browser verification requirement and level
 * @param {Object} options
 * @param {string[]|string} [options.files]
 * @param {string} [options.diff]
 * @param {string} [options.task]
 * @param {Object} [options.environment] - Optional override for testing browser availability
 * @returns {Object} Browser Intelligence Decision
 */
function evaluateBrowserRequirement(options = {}) {
  const rawFiles = options.files;
  const files = (
    Array.isArray(rawFiles) ? rawFiles : typeof rawFiles === 'string' ? rawFiles.split(',') : []
  )
    .map(f =>
      typeof f === 'string'
        ? f
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .trim()
            .replace(/\\/g, '/')
        : '',
    )
    .filter(Boolean);

  const diff = typeof options.diff === 'string' ? options.diff : '';
  const task = typeof options.task === 'string' ? options.task : '';
  const combinedContext = `${task}\n${diff}\n${files.join('\n')}`;

  // 1. Analyze UI files (exclude test files)
  const uiFiles = files.filter(
    f =>
      !isTestFilePath(f) &&
      (UI_EXTENSIONS.has(path.extname(f).toLowerCase()) || f.includes('/components/')),
  );
  const hasUiFiles = uiFiles.length > 0;
  const isAllCss =
    hasUiFiles && uiFiles.every(f => CSS_EXTENSIONS.has(path.extname(f).toLowerCase()));

  // 2. Identify UI signals
  const hasForms = FORM_PATTERNS.some(pat => pat.test(combinedContext));
  const hasAuthUi = AUTH_UI_PATTERNS.some(pat => pat.test(combinedContext));
  const hasPaymentUi = PAYMENT_UI_PATTERNS.some(pat => pat.test(combinedContext));
  const hasDomInteraction = DOM_INTERACTION_PATTERNS.some(pat => pat.test(diff));
  const affectedRoutes = extractAffectedRoutes(files, task, diff);

  // 3. Determine Validation Level
  let validationLevel = 'NONE';
  const reasons = [];

  if (!hasUiFiles && !hasForms && !hasAuthUi && !hasPaymentUi && affectedRoutes.length === 0) {
    validationLevel = 'NONE';
    reasons.push('No UI or browser interaction impact detected');
  } else if (hasPaymentUi || (hasAuthUi && (hasForms || hasUiFiles))) {
    validationLevel = 'HIGH_RISK';
    reasons.push(
      'High-risk browser verification: touches payment, checkout, or authentication UI flow',
    );
  } else if (hasForms || hasDomInteraction || (hasUiFiles && !isAllCss)) {
    validationLevel = 'FUNCTIONAL';
    reasons.push(
      'Functional browser verification: interactive components, form elements, or client-side routing',
    );
  } else if (isAllCss) {
    validationLevel = 'SMOKE';
    reasons.push(
      'Lightweight smoke verification: CSS-only styling changes without logic mutations',
    );
  } else {
    validationLevel = 'NONE';
    reasons.push('No substantive UI impact');
  }

  // 4. Check Browser Infrastructure Availability
  let browserFound = null;
  if (options.environment && typeof options.environment.browserFound !== 'undefined') {
    browserFound = options.environment.browserFound;
  } else {
    try {
      browserFound = findBrowser();
    } catch (_) {
      browserFound = null;
    }
  }

  const isBrowserAvailable = !!browserFound;
  const requiresVerification = validationLevel !== 'NONE';

  // 5. Determine Execution Status & Safety Routing
  let status = 'SKIPPED';
  let escalate = false;
  let safetyNotice = null;

  if (!requiresVerification) {
    status = 'SKIPPED';
    escalate = false;
  } else if (!isBrowserAvailable) {
    status = 'UNAVAILABLE';
    // Monotonic safety: high risk or functional verification cannot be skipped silently if browser is missing
    escalate = true;
    safetyNotice = `Browser verification (${validationLevel}) is required but no compatible browser binary was discovered. Automatic escalation enforced.`;
    reasons.push(safetyNotice);
  } else {
    status = 'READY';
    escalate = false;
  }

  // 6. Recommended checks and evidence
  const expectedChecks = [];
  const suggestedActions = [];

  if (validationLevel === 'SMOKE') {
    expectedChecks.push('layout_shift_check', 'visual_smoke_audit');
    suggestedActions.push('cdp_snapshot', 'check_error_overlay');
  } else if (validationLevel === 'FUNCTIONAL') {
    expectedChecks.push(
      'console_exceptions',
      'network_failures',
      'react_error_overlay',
      'form_submission',
    );
    suggestedActions.push('captureRuntimeErrors', 'verifyRuntimeFix', 'auditURL');
  } else if (validationLevel === 'HIGH_RISK') {
    expectedChecks.push(
      'console_exceptions',
      'network_failures',
      'react_error_overlay',
      'auth_cookie_state',
      'form_submission',
      'security_headers',
      'wcag22_accessibility',
    );
    suggestedActions.push('captureRuntimeErrors', 'auditURL', 'verifyRuntimeFix');
  }

  return {
    requires_browser_verification: requiresVerification,
    validation_level: validationLevel,
    browser_available: isBrowserAvailable ? true : 'UNAVAILABLE',
    status,
    escalate,
    safety_notice: safetyNotice,
    signals: {
      has_ui_files: hasUiFiles,
      has_css_only: isAllCss,
      has_forms: hasForms,
      has_auth_ui: hasAuthUi,
      has_payment_ui: hasPaymentUi,
      has_dom_interaction: hasDomInteraction,
      affected_routes: affectedRoutes,
    },
    evidence: {
      expected_checks: expectedChecks,
      suggested_actions: suggestedActions,
      affected_routes: affectedRoutes,
    },
    affected_routes: affectedRoutes,
    ui_files: uiFiles,
    reasons,
    browser_details: browserFound ? { type: browserFound.type, path: browserFound.path } : null,
  };
}

module.exports = {
  evaluateBrowserRequirement,
  extractAffectedRoutes,
  UI_EXTENSIONS,
  CSS_EXTENSIONS,
  FORM_PATTERNS,
  AUTH_UI_PATTERNS,
  PAYMENT_UI_PATTERNS,
};
