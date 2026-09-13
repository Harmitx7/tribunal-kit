'use strict';

/**
 * sentinel.js — Runtime Sentinel & Live Error Hunter
 *
 * Connects to a local dev server via headless Chrome, intercepts uncaught exceptions,
 * React runtime errors, hydration mismatches, and failed API requests, mapping them
 * to specific source file locations for automated diagnosis and fix verification.
 */

const path = require('path');
const fs = require('fs');
const { launchBrowser } = require('./launcher');
const { CdpClient, createNewTab, closeTab } = require('./cdp');

/**
 * Parses stack trace string to find local source file references.
 * @param {string} stackText
 * @param {string} projectRoot
 * @returns {Array<{ filePath: string, existsLocally: boolean, line: number, column: number, rawUrl: string }>}
 */
function extractSourceLocations(stackText, projectRoot = process.cwd()) {
  if (!stackText) return [];
  const locations = [];
  const lines = stackText.split('\n');

  const fileRegex = /(?:at\s+(?:.*?\s+)?\(?|webpack-internal:\/\/\/\.?\/)(https?:\/\/[^\/]+)?(\/[^\s:)]+):(\d+):(\d+)\)?/g;

  for (const line of lines) {
    let match;
    while ((match = fileRegex.exec(line)) !== null) {
      const rawPath = match[2];
      const lineNum = parseInt(match[3], 10);
      const colNum = parseInt(match[4], 10);

      const cleaned = rawPath.replace(/^\/_next\/static\/chunks\//, '').replace(/^\/src\//, 'src/');
      const candidates = [
        path.resolve(projectRoot, cleaned),
        path.resolve(projectRoot, rawPath.replace(/^\//, '')),
      ];

      let resolvedFile = null;
      for (const cand of candidates) {
        if (fs.existsSync(cand)) {
          resolvedFile = cand;
          break;
        }
      }

      locations.push({
        rawUrl: match[0],
        filePath: resolvedFile || rawPath,
        existsLocally: !!resolvedFile,
        line: lineNum,
        column: colNum,
      });
    }
  }

  return locations;
}

/**
 * Captures live runtime errors, uncaught exceptions, and console errors from a web page.
 * @param {string} url Target URL (e.g. http://localhost:3000)
 * @param {object} options Options { timeoutMs, settleWaitMs }
 * @returns {Promise<object>} Diagnostic report
 */
async function captureRuntimeErrors(url, options = {}) {
  const browser = await launchBrowser();
  let client = null;
  let tab = null;

  const exceptions = [];
  const consoleErrors = [];
  const networkFailures = [];

  try {
    tab = await createNewTab(browser.port);
    client = new CdpClient();
    await client.connect(tab.webSocketDebuggerUrl);
    await client.initDomains();

    client.on('Runtime.exceptionThrown', (params) => {
      const details = params?.exceptionDetails;
      if (!details) return;

      const text = details.text || details.exception?.description || 'Uncaught exception';
      const stack = details.stackTrace
        ? details.stackTrace.callFrames
            ?.map((f) => `    at ${f.functionName || '<anonymous>'} (${f.url}:${f.lineNumber}:${f.columnNumber})`)
            .join('\n')
        : details.exception?.description || '';

      exceptions.push({
        text,
        url: details.url,
        line: details.lineNumber,
        column: details.columnNumber,
        stack,
        locations: extractSourceLocations(stack),
      });
    });

    client.on('Console.messageAdded', (params) => {
      const msg = params?.message;
      if (msg && msg.level === 'error') {
        consoleErrors.push({
          level: msg.level,
          text: msg.text,
          url: msg.url,
          line: msg.line,
          column: msg.column,
          locations: extractSourceLocations(msg.text + (msg.url ? `\n at ${msg.url}:${msg.line}:0` : '')),
        });
      }
    });

    client.on('Network.responseReceived', (params) => {
      const res = params?.response;
      if (res && res.status >= 400) {
        networkFailures.push({
          url: res.url,
          status: res.status,
          statusText: res.statusText,
        });
      }
    });

    const startTime = Date.now();
    await client.navigate(url);
    const settleWaitMs = options.settleWaitMs || 1000;
    await new Promise((r) => setTimeout(r, settleWaitMs));

    // Check for standard error overlays (Next.js, Vite, CRA)
    const overlayInfo = await client.evaluate(`
      (() => {
        const nextOverlay = document.querySelector('nextjs-portal, [data-nextjs-dialog-overlay]');
        const viteOverlay = document.querySelector('vite-error-overlay');
        const reactOverlay = document.querySelector('iframe[srcdoc*="error"], #webpack-dev-server-client-overlay');

        return {
          hasOverlay: !!(nextOverlay || viteOverlay || reactOverlay),
          overlayType: nextOverlay ? 'Next.js' : viteOverlay ? 'Vite' : reactOverlay ? 'Webpack/CRA' : null,
          bodyText: (document.body ? document.body.innerText.slice(0, 500) : ''),
        };
      })()
    `);

    const totalIssues =
      exceptions.length +
      consoleErrors.length +
      networkFailures.length +
      (overlayInfo?.hasOverlay ? 1 : 0);

    return {
      url,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      healthy: totalIssues === 0,
      overlay: overlayInfo || { hasOverlay: false },
      exceptions,
      consoleErrors,
      networkFailures,
      summary: {
        totalExceptions: exceptions.length,
        totalConsoleErrors: consoleErrors.length,
        totalNetworkFailures: networkFailures.length,
        hasErrorOverlay: !!overlayInfo?.hasOverlay,
      },
    };
  } finally {
    if (client) client.close();
    if (tab && browser) await closeTab(tab.id, browser.port);
    await browser.close();
  }
}

/**
 * Re-navigates to target URL to verify whether runtime errors have cleared.
 * @param {string} url
 * @param {object} options
 * @returns {Promise<{ isFixed: boolean, remainingIssues: number, report: object }>}
 */
async function verifyRuntimeFix(url, options = {}) {
  const report = await captureRuntimeErrors(url, options);
  const remaining =
    report.summary.totalExceptions +
    report.summary.totalConsoleErrors +
    (report.overlay.hasOverlay ? 1 : 0);
  return {
    isFixed: remaining === 0,
    remainingIssues: remaining,
    report,
  };
}

module.exports = {
  extractSourceLocations,
  captureRuntimeErrors,
  verifyRuntimeFix,
};
