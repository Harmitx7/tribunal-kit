#!/usr/bin/env node
/**
 * package-cores.js — Automates bundling of @tribunal-kit/core-* platform npm packages.
 *
 * Reads npm/core-template/package.json and generates platform-specific packages
 * for Darwin, Linux, and Windows (x64 and arm64).
 *
 * Usage:
 *   node scripts/package-cores.js            # Generate package directories
 *   node scripts/package-cores.js --pack     # Run npm pack in each generated package
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATE_PKG = path.join(ROOT, 'npm', 'core-template', 'package.json');
const OUTPUT_DIR = path.join(ROOT, 'npm', 'packages');
const PKG = require(path.join(ROOT, 'package.json'));
const VERSION = PKG.version;

const PLATFORMS = [
  { platform: 'darwin', arch: 'arm64', ext: '', rustTarget: 'aarch64-apple-darwin' },
  { platform: 'darwin', arch: 'x64', ext: '', rustTarget: 'x86_64-apple-darwin' },
  { platform: 'linux', arch: 'arm64', ext: '', rustTarget: 'aarch64-unknown-linux-gnu' },
  { platform: 'linux', arch: 'x64', ext: '', rustTarget: 'x86_64-unknown-linux-gnu' },
  { platform: 'win32', arch: 'arm64', ext: '.exe', rustTarget: 'aarch64-pc-windows-msvc' },
  { platform: 'win32', arch: 'x64', ext: '.exe', rustTarget: 'x86_64-pc-windows-msvc' },
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function findBinary(platform, ext, rustTarget) {
  const binaryName = `tribunal-core${ext}`;
  const candidates = [
    path.join(ROOT, 'target', rustTarget, 'release', binaryName),
    path.join(ROOT, 'target', 'release', binaryName),
    path.join(
      ROOT,
      `tribunal-core-${platform}-${rustTarget.includes('arm64') || rustTarget.includes('aarch64') ? 'arm64' : 'x64'}${ext}`,
    ),
  ];

  for (const cand of candidates) {
    if (fs.existsSync(cand)) return cand;
  }
  return null;
}

function buildPackages(shouldPack = false) {
  if (!fs.existsSync(TEMPLATE_PKG)) {
    console.error(`Missing template: ${TEMPLATE_PKG}`);
    process.exit(1);
  }

  const templateRaw = fs.readFileSync(TEMPLATE_PKG, 'utf8');
  ensureDir(OUTPUT_DIR);

  console.log(`\n  🔱 Packaging Tribunal Core Platform Packages (v${VERSION})\n`);

  for (const target of PLATFORMS) {
    const pkgName = `core-${target.platform}-${target.arch}`;
    const pkgDir = path.join(OUTPUT_DIR, pkgName);
    const binDir = path.join(pkgDir, 'bin');
    ensureDir(binDir);

    const pkgContent = templateRaw
      .replace(/\$\{PLATFORM\}/g, target.platform)
      .replace(/\$\{ARCH\}/g, target.arch)
      .replace(/\$\{EXT\}/g, target.ext);

    const pkgJson = JSON.parse(pkgContent);
    pkgJson.version = VERSION;

    fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify(pkgJson, null, 2));

    // Write README
    fs.writeFileSync(
      path.join(pkgDir, 'README.md'),
      `# @tribunal-kit/${pkgName}\n\nPrecompiled native Rust binary of Tribunal Core for ${target.platform} (${target.arch}).\n`,
    );

    // Copy binary if available
    const binarySource = findBinary(target.platform, target.ext, target.rustTarget);
    const destBinary = path.join(binDir, `tribunal-core${target.ext}`);

    if (binarySource && fs.existsSync(binarySource)) {
      fs.copyFileSync(binarySource, destBinary);
      if (target.platform !== 'win32') {
        fs.chmodSync(destBinary, 0o755);
      }
      console.log(`  ✓ Built ${pkgName} (with binary)`);
    } else {
      console.log(`  ⚠ Built ${pkgName} (staged, binary not found in build tree)`);
    }

    if (shouldPack) {
      try {
        execSync('npm pack', { cwd: pkgDir, stdio: 'ignore' });
        console.log(`    ↳ Packed .tgz`);
      } catch (e) {
        console.error(`    ↳ Failed to pack: ${e.message}`);
      }
    }
  }

  console.log(`\n  ✓ Generated 6 platform packages in ${OUTPUT_DIR}\n`);
}

const isPack = process.argv.includes('--pack');
buildPackages(isPack);
