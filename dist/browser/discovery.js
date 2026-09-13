'use strict';

/**
 * discovery.js — Cross-Platform Browser & Engine Locator for Tribunal-Kit
 *
 * Discovers Google Chrome, Microsoft Edge, Chromium, or existing CDP debug ports.
 * Also checks for local PinchTab binary if available as an accelerator.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');

/**
 * Standard browser binary paths by platform
 */
const WINDOWS_PATHS = [
  // Chrome 64-bit & 32-bit
  path.join(process.env['ProgramFiles'] || 'C:\\Program Files', 'Google\\Chrome\\Application\\chrome.exe'),
  path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Google\\Chrome\\Application\\chrome.exe'),
  path.join(process.env['LocalAppData'] || '', 'Google\\Chrome\\Application\\chrome.exe'),
  // Edge
  path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Microsoft\\Edge\\Application\\msedge.exe'),
  path.join(process.env['ProgramFiles'] || 'C:\\Program Files', 'Microsoft\\Edge\\Application\\msedge.exe'),
  path.join(process.env['LocalAppData'] || '', 'Microsoft\\Edge\\Application\\msedge.exe'),
];

const DARWIN_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  path.join(os.homedir(), 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
];

const LINUX_PATHS = [
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/snap/bin/chromium',
  '/usr/bin/microsoft-edge-stable',
];

/**
 * Resolves the path to an installed browser executable.
 * @returns {{ path: string, type: string } | null}
 */
function findBrowser() {
  // 1. Check explicit environment override
  const envPath = process.env.CHROME_PATH || process.env.BROWSER_PATH || process.env.PINCHTAB_BROWSER_BINARY;
  if (envPath && fs.existsSync(envPath)) {
    return { path: envPath, type: detectBrowserType(envPath) };
  }

  // 2. Platform-specific paths
  const platform = os.platform();
  const candidates = platform === 'win32'
    ? WINDOWS_PATHS
    : platform === 'darwin'
      ? DARWIN_PATHS
      : LINUX_PATHS;

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return { path: candidate, type: detectBrowserType(candidate) };
    }
  }

  return null;
}

/**
 * Infer browser engine type from executable path
 */
function detectBrowserType(execPath) {
  const lower = execPath.toLowerCase();
  if (lower.includes('msedge') || lower.includes('edge')) return 'edge';
  if (lower.includes('chromium')) return 'chromium';
  return 'chrome';
}

/**
 * Locates the PinchTab executable if present in the workspace or PATH.
 * @returns {string | null}
 */
function findPinchTabBinary() {
  const envPath = process.env.PINCHTAB_PATH || process.env.PINCHTAB_BINARY;
  if (envPath && fs.existsSync(envPath)) {
    return envPath;
  }

  const isWin = os.platform() === 'win32';
  const binName = isWin ? 'pinchtab.exe' : 'pinchtab';

  const searchLocations = [
    // Next to tribunal-kit in the workspace
    path.resolve(__dirname, '../../../pinchtab/bin', binName),
    path.resolve(__dirname, '../../bin', binName),
    path.resolve(__dirname, '../bin', binName),
    // Standard config state directory
    isWin
      ? path.join(process.env['APPDATA'] || '', 'pinchtab', binName)
      : path.join(os.homedir(), '.pinchtab', binName),
  ];

  for (const loc of searchLocations) {
    if (fs.existsSync(loc)) {
      return loc;
    }
  }

  return null;
}

/**
 * Probes whether a CDP debug port is actively responding.
 * @param {number} port
 * @param {string} host
 * @returns {Promise<boolean>}
 */
function isPortOpen(port = 9222, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const req = http.get({ host, port, path: '/json/version', timeout: 500 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

module.exports = {
  findBrowser,
  findPinchTabBinary,
  isPortOpen,
  detectBrowserType,
};
