'use strict';

const { CapabilityDescriptor, CapabilityManifest } = require('../../src/autopilot/schema');

const record = {
  id: 'cli:status',
  operationId: 'cli:status',
  surface: 'cli',
  locator: 'status',
  provenance: { sourceFile: 'src/cli.js', definitionKey: 'status' },
  sideEffectClass: 'read',
  riskTier: 0,
  estimatedCostTier: 'low',
  idempotent: true,
  preconditions: [],
  triggerSignals: [],
  verification: ['definition-present'],
  availability: { kind: 'executable', adapter: 'cli-js' },
};
const manifest = (...capabilities) => ({ schemaVersion: 1, capabilities });
const alias = { ...record, id: 'cli:info', locator: 'info' };

test('preserves declarative records and canonical aliases independent of input order', () => {
  const input = manifest(alias, record);
  expect(CapabilityManifest.parse(input)).toEqual(input);
});

test.each([
  { extra: true },
  { id: 'status' },
  { id: 'mcp:status' },
  { preconditions: [{ fact: 'path', operator: 'atLeast', value: 1 }] },
  { preconditions: [{ fact: 'impactTier', operator: 'equals', value: '2' }] },
  { preconditions: [{ fact: 'mode', operator: 'equals', value: '$(echo)' }] },
  { triggerSignals: [{ fact: 'mode', operator: 'equals', value: 'modify' }] },
  { triggerSignals: [{ fact: 'symbol', operator: 'has', value: 'x', script: 'evil' }] },
  { sideEffectClass: 'policy', riskTier: 2 },
  { sideEffectClass: 'write', riskTier: 0 },
  { availability: { kind: 'executable', adapter: 'host' } },
  { verification: [] },
  { verification: ['definition-present', 'definition-present'] },
  { locator: 'check && another' },
])('rejects inconsistent descriptors %#', patch => {
  expect(CapabilityDescriptor.safeParse({ ...record, ...patch }).success).toBe(false);
});

test.each([
  '../src/file',
  'src/../cli.js',
  '/cli.js',
  'src//cli.js',
  'C:/cli.js',
  'src\\cli.js',
  'src/./cli.js',
  'src/nul.txt',
  'src/file.',
  'src/file.js:stream',
])('rejects noncanonical source path %s', sourceFile => {
  expect(
    CapabilityDescriptor.safeParse({
      ...record,
      provenance: { ...record.provenance, sourceFile },
    }).success,
  ).toBe(false);
});

test('admits typed corroborating signals and numeric impact thresholds', () => {
  const descriptor = {
    ...record,
    triggerSignals: [
      { fact: 'path', operator: 'has', value: 'src/cli.js' },
      { fact: 'impactTier', operator: 'atLeast', value: 2 },
    ],
  };
  expect(CapabilityDescriptor.parse(descriptor)).toEqual(descriptor);
});

test.each([
  manifest(record, record),
  manifest(alias),
  manifest(record, { ...alias, locator: record.locator }),
  manifest(record, alias, { ...alias, id: 'cli:other', operationId: alias.id }),
  manifest(record, { ...alias, sideEffectClass: 'write', riskTier: 2 }),
  manifest(record, { ...alias, idempotent: false }),
  manifest(record, {
    ...alias,
    preconditions: [{ fact: 'impactTier', operator: 'equals', value: 1 }],
  }),
  { ...manifest(record), authorization: true },
  { ...manifest(record), schemaVersion: 2 },
])('rejects ambiguous, unreferenced or inconsistent manifest input %#', input => {
  expect(CapabilityManifest.safeParse(input).success).toBe(false);
});
