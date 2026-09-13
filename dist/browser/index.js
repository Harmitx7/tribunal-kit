'use strict';

/**
 * index.js — Native Browser Subsystem Entry Point for Tribunal-Kit
 */

const { findBrowser, findPinchTabBinary, isPortOpen } = require('./discovery');
const { launchBrowser, cleanupAll } = require('./launcher');
const { CdpClient, createNewTab, closeTab } = require('./cdp');
const { trimHTML, toSemanticMarkdown, truncateUTF8Bytes, MAX_TRIMMED_BYTES } = require('./trimmer');
const { scanContent, sanitizeContent, sandboxWebContent, isDomainAllowed } = require('./idpi');
const { auditURL } = require('./audit');
const { compareURLs } = require('./compare');
const { deconstructElement, mapStylesToTailwind, synthesizeReactComponent } = require('./synapse');
const { codifyAuditViolations } = require('./case_bridge');
const { captureRuntimeErrors, verifyRuntimeFix } = require('./sentinel');

/**
 * High-level helper: browse a URL and return token-pruned semantic markdown.
 * Protected by IDPI scanning and strict token budgeting (< 4,000 bytes).
 * @param {string} url
 * @param {object} options
 * @returns {Promise<{ url: string, markdown: string, sandboxed: string, isClean: boolean, threatLevel: string }>}
 */
async function browse(url, options = {}) {
  const browser = await launchBrowser();
  let client = null;
  let tab = null;

  try {
    tab = await createNewTab(browser.port);
    client = new CdpClient();
    await client.connect(tab.webSocketDebuggerUrl);
    await client.initDomains();

    await client.navigate(url);
    const html = await client.getHTML();

    // 1. Scan for prompt injection
    const scan = scanContent(html);

    // 2. Convert to semantic markdown and trim to 4,000 bytes
    const markdown = toSemanticMarkdown(html);

    // 3. Wrap in isolated sandbox
    const sandboxed = sandboxWebContent(markdown, url);

    return {
      url,
      markdown,
      sandboxed,
      isClean: scan.isClean,
      threatLevel: scan.threatLevel,
      threats: scan.threats,
    };
  } finally {
    if (client) client.close();
    if (tab && browser) await closeTab(tab.id, browser.port);
    await browser.close();
  }
}

module.exports = {
  findBrowser,
  findPinchTabBinary,
  isPortOpen,
  launchBrowser,
  cleanupAll,
  CdpClient,
  createNewTab,
  closeTab,
  trimHTML,
  toSemanticMarkdown,
  truncateUTF8Bytes,
  MAX_TRIMMED_BYTES,
  scanContent,
  sanitizeContent,
  sandboxWebContent,
  isDomainAllowed,
  auditURL,
  compareURLs,
  browse,
  deconstructElement,
  mapStylesToTailwind,
  synthesizeReactComponent,
  codifyAuditViolations,
  captureRuntimeErrors,
  verifyRuntimeFix,
};
