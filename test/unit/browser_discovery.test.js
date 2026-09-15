'use strict';

const {
  findBrowser,
  findPinchTabBinary,
  detectBrowserType,
} = require('../../dist/browser/discovery');

describe('Browser & Binary Discovery', () => {
  test('discovers an installed browser on this system', () => {
    const browser = findBrowser();
    expect(browser).not.toBeNull();
    expect(typeof browser.path).toBe('string');
    expect(['chrome', 'edge', 'chromium']).toContain(browser.type);
  });

  test('locates PinchTab binary accelerator in workspace or handles absence gracefully', () => {
    const bin = findPinchTabBinary();
    if (bin !== null) {
      expect(typeof bin).toBe('string');
      expect(bin.toLowerCase()).toContain('pinchtab');
    } else {
      expect(bin).toBeNull();
    }
  });

  test('resolves PinchTab via PINCHTAB_PATH environment variable override', () => {
    const originalEnv = process.env.PINCHTAB_PATH;
    try {
      process.env.PINCHTAB_PATH = __filename;
      const bin = findPinchTabBinary();
      expect(bin).toBe(__filename);
    } finally {
      if (originalEnv !== undefined) {
        process.env.PINCHTAB_PATH = originalEnv;
      } else {
        delete process.env.PINCHTAB_PATH;
      }
    }
  });

  test('correctly identifies browser type from binary path', () => {
    expect(detectBrowserType('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')).toBe(
      'chrome',
    );
    expect(
      detectBrowserType('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'),
    ).toBe('edge');
    expect(detectBrowserType('/usr/bin/chromium')).toBe('chromium');
  });
});
