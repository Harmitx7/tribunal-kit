'use strict';

const fs = require('fs');
const path = require('path');
const { buildPackages, findBinary, PLATFORMS } = require('../../scripts/package-cores');

describe('Supply-Chain & Release Packaging (package-cores.js)', () => {
  const rootDir = path.resolve(__dirname, '../..');
  const packagesDir = path.join(rootDir, 'npm', 'packages');
  const rootPkg = require(path.join(rootDir, 'package.json'));

  test('PLATFORMS matrix covers all 6 supported release targets', () => {
    expect(PLATFORMS).toHaveLength(6);
    const expectedTargets = [
      'darwin-arm64',
      'darwin-x64',
      'linux-arm64',
      'linux-x64',
      'win32-arm64',
      'win32-x64',
    ];

    const actualTargets = PLATFORMS.map(p => `${p.platform}-${p.arch}`);
    expect(actualTargets).toEqual(expect.arrayContaining(expectedTargets));
  });

  test('buildPackages stages all 6 platform packages with valid metadata and LICENSE', () => {
    // Non-strict mode staging
    buildPackages(false, false);

    expect(fs.existsSync(packagesDir)).toBe(true);

    for (const target of PLATFORMS) {
      const pkgName = `core-${target.platform}-${target.arch}`;
      const pkgDir = path.join(packagesDir, pkgName);

      expect(fs.existsSync(pkgDir)).toBe(true);

      // Verify package.json
      const pkgJsonPath = path.join(pkgDir, 'package.json');
      expect(fs.existsSync(pkgJsonPath)).toBe(true);
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

      expect(pkgJson.name).toBe(`@tribunal-kit/${pkgName}`);
      expect(pkgJson.version).toBe(rootPkg.version);
      expect(pkgJson.os).toEqual([target.platform]);
      expect(pkgJson.cpu).toEqual([target.arch]);
      expect(pkgJson.license).toBe('MIT');
      expect(pkgJson.bin).toBeDefined();

      // Verify README
      const readmePath = path.join(pkgDir, 'README.md');
      expect(fs.existsSync(readmePath)).toBe(true);

      // Verify LICENSE (SC-001)
      const licensePath = path.join(pkgDir, 'LICENSE');
      expect(fs.existsSync(licensePath)).toBe(true);
      const licenseContent = fs.readFileSync(licensePath, 'utf8');
      expect(licenseContent).toContain('MIT License');
    }
  });

  test('buildPackages throws in strict mode when binaries are missing (SC-002)', () => {
    // In our test environment, cross-compiled darwin/linux binaries are absent in the local tree
    // Calling buildPackages with strict=true should fail and throw
    expect(() => {
      buildPackages(false, true);
    }).toThrow('Packaging failed with errors');
  });

  test('findBinary returns null or existing path for non-existent target', () => {
    const fakeTarget = findBinary('fakeos', '', 'fake-target-triple');
    expect(fakeTarget).toBeNull();
  });
});
