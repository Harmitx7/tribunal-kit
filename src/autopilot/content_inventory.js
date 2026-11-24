'use strict';

const fs = require('fs');
const { parseFrontmatter } = require('../../.agent/scripts/integrity_manifest');
const { assertWithinRoot } = require('../utils/path_containment');

const specialistFile = '.agent/config/specialist-registry.json';
const slashFile = '.agent/config/slash-commands.json';
const namePattern = /^[a-z0-9][a-z0-9-]*$/;
// Configured host directives with no packaged workflow implementation.
const hostDirectives = new Set(['/summon', '/skill', '/intensity']);

function invariant(condition, message) {
  if (!condition) throw new Error(`Content inventory drift: ${message}`);
}

function read(root, file) {
  const checked = assertWithinRoot(root, file);
  invariant(fs.statSync(checked).isFile(), `expected a file at ${file}`);
  return fs.readFileSync(checked, 'utf8');
}

function uniqueNames(entries, label) {
  const names = new Set();
  for (const name of entries) {
    invariant(
      typeof name === 'string' && namePattern.test(name) && !names.has(name),
      `invalid or duplicate ${label}: ${name}`,
    );
    names.add(name);
  }
  return names;
}

function parity(left, right, label) {
  for (const name of left) invariant(right.has(name), `${label}: missing ${name}`);
  for (const name of right.keys()) invariant(left.has(name), `${label}: unexpected ${name}`);
}

// The integrity crawlers suppress I/O errors. Retain their naming conventions
// and frontmatter parser, but require every discovered definition to be readable.
function definitions(root, surface) {
  const directory = `.agent/${surface}s`;
  const result = new Map();
  for (const entry of fs.readdirSync(assertWithinRoot(root, directory), { withFileTypes: true })) {
    const isSkill = surface === 'skill';
    invariant(!entry.isSymbolicLink(), `linked entry in ${directory}: ${entry.name}`);
    if (isSkill ? !entry.isDirectory() : !entry.name.endsWith('.md')) continue;
    const name = isSkill ? entry.name : entry.name.slice(0, -3);
    invariant(namePattern.test(name), `invalid ${surface} name: ${name}`);
    const file = `${directory}/${entry.name}${isSkill ? '/SKILL.md' : ''}`;
    const metadata = parseFrontmatter(read(root, file));
    invariant(Object.keys(metadata).length > 0, `missing frontmatter in ${file}`);
    if (surface !== 'workflow')
      invariant(metadata.name === name, `wrong definition name in ${file}`);
    result.set(name, file);
  }
  return result;
}

// These descriptors address the host's advisory definition, including aliases.
// Tool permissions and scripts mentioned in Markdown are never dispatch adapters.
function advisory(surface, name, file, overrides = {}) {
  const id = `${surface}:${name}`;
  return {
    id,
    operationId: id,
    surface,
    locator: file,
    provenance: { sourceFile: file, definitionKey: name },
    sideEffectClass: 'read',
    riskTier: 0,
    estimatedCostTier: 'low',
    idempotent: true,
    preconditions: [],
    triggerSignals: [],
    verification: ['definition-present'],
    availability: { kind: 'advisory', adapter: 'host' },
    ...overrides,
  };
}

function agents(root, files) {
  const { specialists } = JSON.parse(read(root, specialistFile));
  parity(
    uniqueNames(
      specialists.map(record => record.name),
      'agent',
    ),
    files,
    'specialist registry',
  );
  return specialists.map(({ name, active, status, successor }) => {
    invariant(
      ['production', 'experimental', 'deprecated'].includes(status),
      `unknown status for ${name}`,
    );
    invariant(typeof active === 'boolean', `missing activation state for ${name}`);
    invariant(!active || status === 'production', `active non-production agent ${name}`);
    if (successor) invariant(files.has(successor), `unknown successor for ${name}: ${successor}`);
    return advisory('agent', name, files.get(name), {
      provenance: { sourceFile: specialistFile, definitionKey: `specialists/${name}/${status}` },
      availability: { kind: active ? 'advisory' : 'unavailable', adapter: 'host' },
    });
  });
}

function skills(root, files) {
  const topics = JSON.parse(read(root, '.agent/skill_topic_map.json'));
  const routed = new Set();
  for (const [domain, names] of Object.entries(topics.domain_routes)) {
    for (const name of uniqueNames(names, domain)) routed.add(name);
  }
  parity(routed, files, 'skill topic map');
  invariant(topics.total_skills === files.size, 'skill topic count');
  const byName = new Map([...files].map(([name, file]) => [name, advisory('skill', name, file)]));
  for (const extension of Object.keys(topics.file_extensions).sort()) {
    invariant(/^\.[a-z0-9]+$/.test(extension), `invalid extension ${extension}`);
    for (const name of uniqueNames(topics.file_extensions[extension], extension)) {
      invariant(byName.has(name), `unknown skill ${name} for ${extension}`);
      byName.get(name).triggerSignals.push({ fact: 'path', operator: 'has', value: extension });
    }
  }
  return [...byName.values()];
}

function workflows(root, files, routes) {
  const { commands } = JSON.parse(read(root, slashFile));
  const result = [...files].map(([name, file]) => advisory('workflow', name, file));
  const addressed = new Set();
  const spellings = new Set();
  for (const command of commands) {
    const names = [command.name, ...(command.aliases || [])];
    const matches = names.map(name => name.slice(1)).filter(name => files.has(name));
    const external = hostDirectives.has(command.name) && matches.length === 0;
    invariant(
      external || matches.length === 1,
      `unresolved or ambiguous workflow for ${command.name}`,
    );
    const target = matches[0];
    if (target) {
      invariant(routes.get(target) === command.name, `wrong routing command for ${target}`);
      addressed.add(target);
    }
    for (const locator of names) {
      invariant(
        /^\/[a-z0-9][a-z0-9-]*$/.test(locator) && !spellings.has(locator),
        `invalid or duplicate slash command ${locator}`,
      );
      spellings.add(locator);
      result.push(
        advisory('workflow', locator.slice(1), slashFile, {
          id: `slash:${locator.slice(1)}`,
          operationId: target ? `workflow:${target}` : `slash:${command.name.slice(1)}`,
          locator,
          provenance: { sourceFile: slashFile, definitionKey: command.name },
          availability: { kind: external ? 'unavailable' : 'advisory', adapter: 'host' },
        }),
      );
    }
  }
  parity(addressed, files, 'workflow slash coverage');
  return result;
}

function collectContent(root) {
  const agentFiles = definitions(root, 'agent');
  const skillFiles = definitions(root, 'skill');
  const workflowFiles = definitions(root, 'workflow');
  const routing = JSON.parse(read(root, '.agent/routing_index.json'));
  for (const [key, files] of Object.entries({
    agents: agentFiles,
    skills: skillFiles,
    workflows: workflowFiles,
  })) {
    parity(
      uniqueNames(
        routing[key].map(row => row.name),
        key,
      ),
      files,
      `routing index ${key}`,
    );
    for (const row of routing[key]) {
      if (key !== 'skills')
        invariant(
          `.agent/${row.file}` === files.get(row.name),
          `wrong routing file for ${row.name}`,
        );
    }
  }
  const routes = new Map(routing.workflows.map(row => [row.name, row.command]));
  return [
    ...agents(root, agentFiles),
    ...skills(root, skillFiles),
    ...workflows(root, workflowFiles, routes),
  ];
}

module.exports = { collectContent };
