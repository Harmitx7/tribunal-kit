#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const {
  buildManifest,
  manifestPath,
  serializeManifest,
  verifyManifest,
} = require('../src/autopilot/manifest');
const { assertWithinRoot } = require('../src/utils/path_containment');

function main(args) {
  const root = path.resolve(__dirname, '..');
  if (args.length === 1 && args[0] === '--check') {
    const manifest = verifyManifest(root);
    console.log(`Verified ${manifest.capabilities.length} capability descriptors.`);
    return;
  }
  if (args.length !== 1 || args[0] !== '--write') {
    throw new Error('Usage: node scripts/capability-manifest.js --check | --write');
  }
  const output = serializeManifest(buildManifest(root));
  assertWithinRoot(root, path.dirname(manifestPath));
  const destination = assertWithinRoot(root, manifestPath);
  const temporary = assertWithinRoot(root, manifestPath + '.' + randomUUID() + '.tmp');
  try {
    fs.writeFileSync(temporary, output, { flag: 'wx' });
    fs.renameSync(temporary, destination);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
  console.log(`Generated ${manifestPath}.`);
}

try {
  main(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
