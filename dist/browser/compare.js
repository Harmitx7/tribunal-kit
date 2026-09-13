'use strict';

/**
 * compare.js — Visual Regression & Viewport Differ for Tribunal-Kit
 *
 * Compares two URLs visually by capturing synchronized viewport snapshots and
 * computing the pixel mismatch ratio. Used as an automated gate in CI and releases.
 */

const { launchBrowser } = require('./launcher');
const { CdpClient, createNewTab, closeTab } = require('./cdp');

/**
 * Compares two URLs visually.
 * @param {string} url1
 * @param {string} url2
 * @param {object} options
 * @param {number} options.maxDiffPercent (default 1.0)
 * @param {number} options.width (default 1280)
 * @param {number} options.height (default 800)
 * @returns {Promise<object>}
 */
async function compareURLs(url1, url2, options = {}) {
  const maxDiff = options.maxDiffPercent !== undefined ? options.maxDiffPercent : 1.0;
  const width = options.width || 1280;
  const height = options.height || 800;

  const browser = await launchBrowser();
  let client = null;
  let tab = null;

  try {
    tab = await createNewTab(browser.port);
    client = new CdpClient();
    await client.connect(tab.webSocketDebuggerUrl);
    await client.initDomains();

    // Set standard viewport
    await client.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // Capture 1
    await client.navigate(url1);
    await new Promise(r => setTimeout(r, 500)); // Allow animations to settle
    const shot1 = await client.captureScreenshot('png');

    // Capture 2
    await client.navigate(url2);
    await new Promise(r => setTimeout(r, 500));
    const shot2 = await client.captureScreenshot('png');

    // Calculate buffer difference
    const buf1 = Buffer.from(shot1, 'base64');
    const buf2 = Buffer.from(shot2, 'base64');

    const diff = computeBufferDiff(buf1, buf2);

    const passed = diff.diffPercentage <= maxDiff;

    return {
      url1,
      url2,
      diffPercentage: diff.diffPercentage,
      passed,
      maxAllowedDiff: maxDiff,
      totalPixelsCompared: diff.totalBytes,
      mismatchBytes: diff.mismatches,
    };
  } finally {
    if (client) client.close();
    if (tab && browser) await closeTab(tab.id, browser.port);
    await browser.close();
  }
}

/**
 * Fast byte-level comparison of image data buffers.
 * @param {Buffer} b1
 * @param {Buffer} b2
 * @returns {{ diffPercentage: number, mismatches: number, totalBytes: number }}
 */
function computeBufferDiff(b1, b2) {
  const len = Math.min(b1.length, b2.length);
  const maxLen = Math.max(b1.length, b2.length);

  let mismatches = Math.abs(b1.length - b2.length);

  for (let i = 0; i < len; i++) {
    if (b1[i] !== b2[i]) {
      mismatches++;
    }
  }

  const diffPercentage = maxLen === 0 ? 0 : parseFloat(((mismatches / maxLen) * 100).toFixed(2));

  return {
    diffPercentage,
    mismatches,
    totalBytes: maxLen,
  };
}

module.exports = {
  compareURLs,
  computeBufferDiff,
};
