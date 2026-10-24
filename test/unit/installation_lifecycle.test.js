'use strict';

const path = require('path');
const pkg = require('../../package.json');

describe('npm Installation & Packaging Hardening', () => {
  test('strictly enforces zero install-time lifecycle scripts in package.json', () => {
    const scripts = pkg.scripts || {};
    expect(scripts.preinstall).toBeUndefined();
    expect(scripts.install).toBeUndefined();
    expect(scripts.postinstall).toBeUndefined();
    expect(scripts.prepare).toBeUndefined();
    expect(scripts.prepublish).toBeUndefined();
    expect(scripts.prepublishOnly).toBeUndefined();
  });

  test('declares all 6 native platform packages in optionalDependencies', () => {
    const optionalDeps = pkg.optionalDependencies || {};
    const expectedTargets = [
      '@tribunal-kit/core-darwin-arm64',
      '@tribunal-kit/core-darwin-x64',
      '@tribunal-kit/core-linux-arm64',
      '@tribunal-kit/core-linux-x64',
      '@tribunal-kit/core-win32-arm64',
      '@tribunal-kit/core-win32-x64',
    ];

    for (const target of expectedTargets) {
      expect(optionalDeps[target]).toBeDefined();
    }
  });

  test('verifies bin mappings point to valid executable entrypoints', () => {
    const bin = pkg.bin || {};
    expect(bin['tribunal-kit']).toBe('bin/wrapper.js');
    expect(bin['tk']).toBe('bin/wrapper.js');
    expect(bin['tk-proxy']).toBe('bin/tk-proxy.js');
    expect(bin['tk-adapt']).toBe('bin/adapter-install.js');
  });
});
