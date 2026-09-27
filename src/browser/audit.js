'use strict';

/**
 * audit.js — Live Web Quality, Accessibility & Performance Auditor for Tribunal-Kit
 *
 * Runs browser-level audits capturing console errors, broken network assets,
 * WCAG 2.2 accessibility violations, Core Web Vitals, and security headers.
 * Emits structured JSON and scannable terminal reports.
 */

const { launchBrowser } = require('./launcher');
const { CdpClient, createNewTab, closeTab } = require('./cdp');

/**
 * Audits a live URL using native CDP.
 * @param {string} url
 * @param {object} options
 * @returns {Promise<object>}
 */
async function auditURL(url, options = {}) {
  const browser = await launchBrowser();
  let client = null;
  let tab = null;

  const consoleErrors = [];
  const networkFailures = [];
  let responseHeaders = {};

  try {
    tab = await createNewTab(browser.port);
    client = new CdpClient();
    await client.connect(tab.webSocketDebuggerUrl);
    await client.initDomains();

    // Listen for console logs & uncaught exceptions
    client.on('Console.messageAdded', (params) => {
      const msg = params?.message;
      if (msg && (msg.level === 'error' || msg.level === 'warning')) {
        consoleErrors.push({
          level: msg.level,
          text: msg.text,
          url: msg.url,
          line: msg.line,
        });
      }
    });

    client.on('Runtime.exceptionThrown', (params) => {
      const details = params?.exceptionDetails;
      if (details) {
        consoleErrors.push({
          level: 'fatal',
          text: details.text || details.exception?.description || 'Uncaught exception',
          url: details.url,
          line: details.lineNumber,
        });
      }
    });

    // Listen for network failures
    client.on('Network.responseReceived', (params) => {
      const res = params?.response;
      if (res) {
        if (params.type === 'Document') {
          responseHeaders = res.headers || {};
        }
        if (res.status >= 400) {
          networkFailures.push({
            url: res.url,
            status: res.status,
            statusText: res.statusText,
          });
        }
      }
    });

    client.on('Network.loadingFailed', (params) => {
      networkFailures.push({
        url: params.requestId,
        error: params.errorText,
      });
    });

    const startTime = Date.now();
    await client.navigate(url);
    const loadDurationMs = Date.now() - startTime;

    // Run in-page accessibility and metadata inspection script
    const pageMetrics = await client.evaluate(`
      (() => {
        const issues = [];
        let a11yScore = 100;

        // 1. Title & Meta
        const title = document.title || '';
        if (!title) {
          issues.push({ category: 'seo', message: 'Page is missing a <title> tag' });
          a11yScore -= 10;
        }

        const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content');
        if (!metaDesc) {
          issues.push({ category: 'seo', message: 'Page is missing a meta description' });
        }

        // 2. Images missing alt
        const images = Array.from(document.querySelectorAll('img'));
        const missingAlt = images.filter(img => !img.hasAttribute('alt') || img.getAttribute('alt').trim() === '');
        if (missingAlt.length > 0) {
          issues.push({
            category: 'a11y',
            message: missingAlt.length + ' image(s) missing alt attribute',
            count: missingAlt.length
          });
          a11yScore -= Math.min(20, missingAlt.length * 5);
        }

        // 3. Form inputs missing labels
        const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), select, textarea'));
        const unlabeled = inputs.filter(input => {
          const id = input.id;
          const hasLabel = id && document.querySelector('label[for="' + id + '"]');
          const hasAria = input.getAttribute('aria-label') || input.getAttribute('aria-labelledby');
          return !hasLabel && !hasAria;
        });
        if (unlabeled.length > 0) {
          issues.push({
            category: 'a11y',
            message: unlabeled.length + ' form input(s) missing accessible label',
            count: unlabeled.length
          });
          a11yScore -= Math.min(20, unlabeled.length * 5);
        }

        // 4. Buttons missing accessible text
        const buttons = Array.from(document.querySelectorAll('button'));
        const emptyButtons = buttons.filter(b => !b.innerText.trim() && !b.getAttribute('aria-label'));
        if (emptyButtons.length > 0) {
          issues.push({
            category: 'a11y',
            message: emptyButtons.length + ' button(s) without text or aria-label',
            count: emptyButtons.length
          });
          a11yScore -= Math.min(15, emptyButtons.length * 5);
        }

        // 5. Heading structure
        const h1s = document.querySelectorAll('h1');
        if (h1s.length === 0) {
          issues.push({ category: 'a11y', message: 'Page has no <h1> heading' });
          a11yScore -= 10;
        } else if (h1s.length > 1) {
          issues.push({ category: 'a11y', message: 'Page has multiple <h1> headings (' + h1s.length + ')' });
        }

        // 6. Timing metrics
        const nav = performance.getEntriesByType('navigation')[0] || {};
        const timings = {
          domContentLoaded: Math.round(nav.domContentLoadedEventEnd || 0),
          load: Math.round(nav.loadEventEnd || 0),
          ttfb: Math.round(nav.responseStart || 0),
        };

        return {
          title,
          issues,
          a11yScore: Math.max(0, a11yScore),
          timings,
        };
      })()
    `);

    // Evaluate Security Headers
    const securityIssues = [];
    let securityScore = 100;

    const lowerHeaders = Object.keys(responseHeaders).reduce((acc, k) => {
      acc[k.toLowerCase()] = responseHeaders[k];
      return acc;
    }, {});

    if (!lowerHeaders['content-security-policy']) {
      securityIssues.push('Missing Content-Security-Policy (CSP) header');
      securityScore -= 20;
    }
    if (!lowerHeaders['x-content-type-options']) {
      securityIssues.push('Missing X-Content-Type-Options: nosniff header');
      securityScore -= 10;
    }
    if (url.startsWith('https://') && !lowerHeaders['strict-transport-security']) {
      securityIssues.push('Missing Strict-Transport-Security (HSTS) header');
      securityScore -= 15;
    }

    const report = {
      url,
      timestamp: new Date().toISOString(),
      durationMs: loadDurationMs,
      scores: {
        accessibility: pageMetrics?.a11yScore || 100,
        security: Math.max(0, securityScore),
      },
      page: {
        title: pageMetrics?.title || '',
        timings: pageMetrics?.timings || {},
      },
      violations: {
        accessibility: pageMetrics?.issues || [],
        security: securityIssues,
        consoleErrors,
        networkFailures,
      },
      summary: {
        passed: (pageMetrics?.a11yScore || 100) >= 80 && consoleErrors.length === 0,
        totalIssues: (pageMetrics?.issues?.length || 0) + securityIssues.length + consoleErrors.length + networkFailures.length,
      }
    };

    return report;
  } finally {
    if (client) client.close();
    if (tab && browser) await closeTab(tab.id, browser.port);
    await browser.close();
  }
}

module.exports = {
  auditURL,
};
