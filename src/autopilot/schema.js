'use strict';

const { z } = require('zod');

const stableId = z
  .string()
  .max(160)
  .regex(/^[a-z][a-z0-9-]*(?::[a-z0-9][a-z0-9_.-]*)+$/);
const boundedText = z.string().min(1).max(256);
const tier = z.int().min(0).max(3);
const availabilityKind = z.enum(['executable', 'advisory', 'unavailable']);
const packagePath = boundedText.refine(
  value =>
    value
      .split('/')
      .every(
        part =>
          /^(?!\.{1,2}$)[A-Za-z0-9_.-]+$/.test(part) &&
          !part.endsWith('.') &&
          !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part),
      ),
  'Expected a canonical package-relative path',
);
const identifier = boundedText.regex(/^[A-Za-z0-9_.:-]+$/);
const workspaceFacts = new Set(['path', 'symbol', 'topology']);

function predicate(fact, operator, value) {
  return z.strictObject({ fact: z.literal(fact), operator, value });
}

const equals = z.literal('equals');
const membership = z.enum(['equals', 'has']);
const signal = z.discriminatedUnion('fact', [
  predicate('mode', equals, z.enum(['discuss', 'plan', 'implement', 'modify', 'debug'])),
  predicate('path', membership, packagePath),
  predicate('symbol', membership, identifier),
  predicate('topology', membership, identifier),
  predicate('impactTier', z.enum(['equals', 'atLeast']), tier),
  predicate('availability', equals, availabilityKind),
]);

const surfaces = {
  cli: {
    adapters: ['cli-js', 'cli-native', 'cli-native-or-js'],
    locator: /^-{0,2}[a-z0-9][a-z0-9_-]*(?: -{0,2}[a-z0-9][a-z0-9_-]*)*$/,
  },
  mcp: { adapters: ['mcp'], locator: /^[a-z][a-z0-9_]*$/ },
  agent: { adapters: ['host'], locator: /^\.agent\/agents\/[a-z0-9_-]+\.md$/ },
  skill: { adapters: ['host'], locator: /^\.agent\/skills\/[a-z0-9_-]+\/SKILL\.md$/ },
  workflow: { adapters: ['host'], locator: /^\.agent\/workflows\/[a-z0-9_-]+\.md$/ },
};
const minimumTier = { read: 0, write: 1, exec: 2, policy: 3 };

function issue(ctx, path, message) {
  ctx.addIssue({ code: 'custom', path, message });
}

const CapabilityDescriptor = z
  .strictObject({
    id: stableId,
    operationId: stableId,
    surface: z.enum(['cli', 'mcp', 'agent', 'skill', 'workflow']),
    locator: boundedText,
    fixedArguments: z.strictObject({ subcommand: identifier }).optional(),
    provenance: z.strictObject({
      sourceFile: packagePath,
      definitionKey: boundedText.regex(/^[A-Za-z0-9_./: -]+$/),
    }),
    sideEffectClass: z.enum(['read', 'write', 'exec', 'policy']),
    riskTier: tier,
    estimatedCostTier: z.enum(['low', 'medium', 'high']),
    idempotent: z.boolean(),
    preconditions: z.array(signal),
    triggerSignals: z.array(signal),
    verification: z
      .array(identifier)
      .min(1)
      .refine(ids => new Set(ids).size === ids.length, 'Duplicate verification requirement'),
    availability: z.strictObject({ kind: availabilityKind, adapter: identifier }),
  })
  .superRefine((entry, ctx) => {
    const surface = surfaces[entry.surface];
    if (
      entry.fixedArguments &&
      (entry.surface !== 'mcp' ||
        entry.id !== 'mcp:' + entry.locator + ':' + entry.fixedArguments.subcommand)
    ) {
      issue(
        ctx,
        ['fixedArguments'],
        'Bound MCP arguments must match the parameterized capability ID',
      );
    }
    const slashCommand = entry.surface === 'workflow' && entry.id.startsWith('slash:');
    const expectedNamespace = slashCommand ? 'slash' : entry.surface;
    if (!entry.id.startsWith(expectedNamespace + ':')) {
      issue(ctx, ['id'], 'Descriptor namespace must match its surface');
    }
    if (slashCommand) {
      if (
        entry.locator !== '/' + entry.id.slice(6) ||
        entry.provenance.sourceFile !== '.agent/config/slash-commands.json'
      ) {
        issue(ctx, ['locator'], 'Slash locator must name a registered slash definition');
      }
    } else if (!surface.locator.test(entry.locator)) {
      issue(ctx, ['locator'], 'Invalid locator for this surface');
    }
    if (
      !surface.adapters.includes(entry.availability.adapter) ||
      (entry.availability.kind === 'executable' && entry.availability.adapter === 'host')
    ) {
      issue(ctx, ['availability'], 'Availability is incompatible with the surface adapter');
    }
    if (entry.riskTier < minimumTier[entry.sideEffectClass]) {
      issue(ctx, ['riskTier'], 'Risk tier understates the declared effect');
    }
    if (
      entry.triggerSignals.length &&
      !entry.triggerSignals.some(({ fact }) => workspaceFacts.has(fact))
    ) {
      issue(ctx, ['triggerSignals'], 'Automatic triggers require a workspace fact');
    }
  });

const CapabilityManifest = z
  .strictObject({
    schemaVersion: z.literal(1),
    capabilities: z.array(CapabilityDescriptor),
  })
  .superRefine(({ capabilities }, ctx) => {
    const byId = new Map();
    const addresses = new Set();
    for (const [index, entry] of capabilities.entries()) {
      if (byId.has(entry.id)) issue(ctx, ['capabilities', index, 'id'], 'Duplicate capability ID');
      byId.set(entry.id, entry);
      const address = JSON.stringify([entry.surface, entry.locator, entry.fixedArguments]);
      if (addresses.has(address))
        issue(ctx, ['capabilities', index, 'locator'], 'Duplicate surface locator');
      addresses.add(address);
    }
    for (const [index, entry] of capabilities.entries()) {
      if (entry.operationId === entry.id) continue;
      const canonical = byId.get(entry.operationId);
      const path = ['capabilities', index, 'operationId'];
      if (!canonical || canonical.operationId !== canonical.id) {
        issue(ctx, path, 'Alias must refer directly to a canonical capability');
        continue;
      }
      // Both records have been parsed through the same strict schemas and key order.
      const equivalent = [
        'sideEffectClass',
        'riskTier',
        'idempotent',
        'preconditions',
        'verification',
      ].every(field => JSON.stringify(entry[field]) === JSON.stringify(canonical[field]));
      if (
        !equivalent ||
        (entry.availability.kind === 'executable' && canonical.availability.kind !== 'executable')
      ) {
        issue(ctx, path, 'Alias permissions or verification differ from the canonical capability');
      }
    }
  });

module.exports = { CapabilityDescriptor, CapabilityManifest };
