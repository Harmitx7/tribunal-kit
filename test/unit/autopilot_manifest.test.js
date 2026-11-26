'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  buildManifest,
  manifestPath,
  serializeManifest,
  verifyManifest,
} = require('../../src/autopilot/manifest');

const root = path.resolve(__dirname, '../..');

test('independent builds reproduce the packaged five-surface manifest in stable ID order', () => {
  const built = buildManifest(root);
  expect(serializeManifest(verifyManifest(root))).toBe(serializeManifest(built));
  const ids = built.capabilities.map(entry => entry.id);
  expect(ids).toEqual([...new Set(ids)].sort());
  const surfaces = built.capabilities.map(entry => entry.surface);
  expect([...new Set(surfaces)].sort()).toEqual(['agent', 'cli', 'mcp', 'skill', 'workflow']);
});

test('a stale packaged descriptor fails read-only validation', () => {
  const target = path.join(root, manifestPath);
  const original = fs.readFileSync;
  const read = jest.spyOn(fs, 'readFileSync').mockImplementation((file, options) => {
    if (file === target) return '{"schemaVersion":1,"capabilities":[]}\n';
    return original(file, options);
  });
  try {
    expect(() => verifyManifest(root)).toThrow(/manifest drift/i);
  } finally {
    read.mockRestore();
  }
});
