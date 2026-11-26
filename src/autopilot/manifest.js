'use strict';

const fs = require('node:fs');
const { assertWithinRoot } = require('../utils/path_containment');
const { collectContent } = require('./content_inventory');
const { collectDispatch } = require('./dispatch_inventory');
const { CapabilityManifest } = require('./schema');

const manifestPath = 'src/autopilot/capabilities.json';

function buildManifest(root) {
  const capabilities = [...collectContent(root), ...collectDispatch(root)];
  capabilities.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const manifest = CapabilityManifest.parse({ schemaVersion: 1, capabilities });
  for (const file of new Set(manifest.capabilities.map(entry => entry.provenance.sourceFile))) {
    if (!fs.statSync(assertWithinRoot(root, file)).isFile()) {
      throw new Error(`Capability provenance does not resolve to a file: ${file}`);
    }
  }
  return manifest;
}

// Keep each capability on a separate line so inventory changes have localized diffs.
function serializeManifest(manifest) {
  const entries = manifest.capabilities.map(entry => '    ' + JSON.stringify(entry));
  return `{\n  "schemaVersion": ${manifest.schemaVersion},\n  "capabilities": [\n${entries.join(',\n')}\n  ]\n}\n`;
}

function verifyManifest(root) {
  const expected = buildManifest(root);
  const stored = fs.readFileSync(assertWithinRoot(root, manifestPath), 'utf8');
  if (stored.replace(/\r\n/g, '\n') !== serializeManifest(expected)) {
    throw new Error(
      'Capability manifest drift. Review the source change, then run npm run capabilities:build.',
    );
  }
  return expected;
}

module.exports = { buildManifest, manifestPath, serializeManifest, verifyManifest };
