'use strict';

const fs = require('node:fs');
const { assertWithinRoot } = require('../utils/path_containment');

const CLI = 'src/cli.js';
const WRAPPER = 'bin/wrapper.js';
const MCP = 'bin/mcp-server.js';
const ENGINE = '.agent/scripts/codebase_intelligence.js';
const INTERNAL = ['dispatch_swarm', 'get_ast_context', 'validate_payload'];
const UNIMPLEMENTED = ['similar', 'risk', 'evidence-plan', 'policy-proposals'];
const NATIVE = words(
  'init validate status sync memory min-context dag-schedule context-compress context-broker optimize-step impact-tier sdd fitness telemetry-record telemetry-summary resolve-skills heatmap pollinate leaderboard benchmark genome purge ast-extract hook uninstall',
);

// Explicitly reviewed maximum effects. The wrapper can build and launch a subprocess
// even for queries implemented as local reads inside the native binary.
const CLI_EFFECTS = {
  read: 'help --help -h --version -v context context-rank activity understand tribunal-understand cockpit tui monitor',
  write:
    'align learn compile intelligence cases similar failures risk review-plan evidence-plan reviewer-stats governance-drift simulate-policy policy-proposals',
  exec: 'guardrail update case graph arch mutate marathon minimal optimize-skill redteam evalopt evolve auto-tune contract browse audit-web compare-web deconstruct heal review skill-intel skill-intelligence adapt tk-adapt autopilot',
  policy: 'system1 rsi',
};

const MCP_EFFECTS = {
  read: 'tribunal_preview_write tribunal_get_resolution_certificate list_tribunal_agents get_tribunal_agent list_tribunal_skills get_tribunal_skill align_output exit_plan_mode tk_format_activity tribunal_understand',
  write:
    'tribunal_analyze_finding tribunal_plan_correction recall_memory store_memory tribunal_commit_write',
  exec: 'tribunal_request_write tribunal_execute_correction tribunal_verify_correction tribunal_run_validation run_tribunal_audit search_case_law get_sparse_context verify_contracts query_semantic_graph tk_browser_navigate tk_browser_audit tk_browser_compare tk_browser_screenshot tk_deconstruct_component tk_heal_runtime_errors tk_codify_browser_audit tribunal_get_context dispatch_swarm get_ast_context validate_payload tribunal_autopilot_plan tribunal_autopilot_execute',
  policy: 'tribunal_approve_write sync_ide_bridges tribunal_autopilot_cancel',
};

const ALIASES = {
  tui: 'cockpit',
  monitor: 'cockpit',
  '--help': 'help',
  '-h': 'help',
  '-v': '--version',
  'tribunal-understand': 'understand',
  redteam: 'evalopt',
  'auto-tune': 'evolve',
  'skill-intel': 'skill-intelligence',
  'tk-adapt': 'adapt',
};
const FLAG_IDS = {
  '--help': 'flag-help',
  '-h': 'short-help',
  '--version': 'version',
  '-v': 'short-version',
};

function words(value) {
  return value.trim().split(/\s+/);
}

function read(root, relative) {
  return fs.readFileSync(assertWithinRoot(root, relative), 'utf8');
}

function matches(source, regex) {
  return Array.from(source.matchAll(regex), hit => hit[1]);
}

function section(source, regex, label) {
  const match = regex.exec(source);
  if (!match) throw new Error('Missing dispatch definition: ' + label);
  return match[1];
}

function quoted(source) {
  return matches(source, /['"]([\w-]+)['"]/g);
}

function cases(source) {
  return matches(source, /^\s*case\s+['"]([\w-]+)['"]\s*:/gm);
}

function compare(label, observed, reviewed) {
  const found = new Set(observed);
  const expected = new Set(reviewed);
  const extra = observed.filter(name => !expected.has(name));
  const missing = reviewed.filter(name => !found.has(name));
  if (
    extra.length ||
    missing.length ||
    found.size !== observed.length ||
    expected.size !== reviewed.length
  ) {
    throw new Error(
      `Dispatch drift in ${label}: unexpected [${extra}], missing [${missing}] or duplicate definition`,
    );
  }
}

function effects(groups) {
  return new Map(
    Object.entries(groups).flatMap(([effect, names]) => words(names).map(name => [name, effect])),
  );
}

function identifier(surface, locator) {
  return [
    surface,
    ...locator.split(' ').map(token => FLAG_IDS[token] || token.replace(/^-+/, 'flag-')),
  ].join(':');
}

function descriptor(
  surface,
  locator,
  sourceFile,
  definitionKey,
  effect,
  adapter,
  canonical = locator,
  available = true,
) {
  if (!effect) throw new Error('Unclassified dispatch: ' + locator);
  const riskTier = { read: 0, write: 2, exec: 3, policy: 3 }[effect];
  return {
    id: identifier(surface, locator),
    operationId: identifier(surface, canonical),
    surface,
    locator,
    provenance: { sourceFile, definitionKey },
    sideEffectClass: effect,
    riskTier,
    estimatedCostTier: effect === 'read' ? 'low' : effect === 'write' ? 'medium' : 'high',
    idempotent: effect === 'read',
    preconditions: [{ fact: 'availability', operator: 'equals', value: 'executable' }],
    triggerSignals: [],
    verification: ['dispatch-result'],
    availability: { kind: available ? 'executable' : 'unavailable', adapter },
  };
}

const ACTIONS = {
  activity: { read: 'announce skill event help' },
  arch: { exec: 'map verify impact diff audit project', read: 'help' },
  contract: { exec: 'init list verify trace replay generate' },
  intelligence: {
    write: 'cases case failures reviewer-stats governance-drift simulate-policy review-plan',
  },
  memory: { exec: 'store recall gc stats export' },
  rsi: { write: 'status', exec: 'run watch', policy: 'rollback unfreeze freeze' },
  system1: {
    exec: 'enable setup update repair',
    read: 'status verify plan reviewers',
    policy: 'disable clean uninstall',
  },
  sdd: { exec: 'workspace brief scratchpad diff', read: 'help' },
  marathon: {
    exec: 'init status next mark log session-start session-end add-feature distill reset',
  },
  case: { exec: 'add-case auto-record search-cases list show overrule export stats' },
};

function checkNativeSource(root, nativeNames) {
  // Rust sources ship in the checkout, while npm distributes precompiled optional packages.
  const file = 'crates/core/src/main.rs';
  if (!fs.existsSync(assertWithinRoot(root, file))) return;
  const main = read(root, file);
  const kebab = name => name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  const expected = [...nativeNames, 'compile', 'graph', 'cockpit'];
  const dispatched = matches(main, /^\s*Commands::(\w+)\s*\{/gm).map(kebab);
  compare('Rust dispatcher (graph and compile use JS in the wrapper)', dispatched, expected);
  for (const [type, actions] of Object.entries({
    MemoryAction: 'store recall gc stats export',
    SddAction: 'workspace brief diff',
  })) {
    const pattern = new RegExp('^\\s*' + type + '::(\\w+)\\s*(?:\\{|=>)', 'gm');
    compare(type, matches(main, pattern).map(kebab), words(actions));
  }
}

function collectCli(root) {
  const source = read(root, CLI);
  const jsNames = cases(section(source, /switch\s*\(command\)\s*\{([\s\S]*?)\bdefault\s*:/, CLI));
  const lazyModules = matches(source, /loadCmd\(\s*['"]\.\/(commands\/[\w-]+)['"]/g);
  for (const module of new Set(lazyModules)) {
    const file = 'src/' + module + '.js';
    if (!fs.statSync(assertWithinRoot(root, file)).isFile())
      throw new Error('Missing CLI handler: ' + file);
  }
  const wrapper = read(root, WRAPPER);
  const nativeNames = quoted(
    section(wrapper, /RUST_COMMANDS\s*=\s*new Set\(\[([\s\S]*?)\]\)/, WRAPPER),
  );
  compare(WRAPPER, nativeNames, NATIVE);
  checkNativeSource(root, nativeNames);
  const metadata = effects(CLI_EFFECTS);
  for (const name of nativeNames) metadata.set(name, 'exec');
  const all = [...new Set([...jsNames, ...nativeNames])];
  compare(CLI, all, [...metadata.keys()]);
  const nativeOnly = words(
    'context-broker fitness telemetry-record telemetry-summary resolve-skills heatmap pollinate leaderboard benchmark genome purge ast-extract',
  );
  compare(
    'native-only CLI commands',
    nativeNames.filter(name => !jsNames.includes(name)),
    nativeOnly,
  );
  const adapter = name =>
    nativeNames.includes(name)
      ? jsNames.includes(name)
        ? 'cli-native-or-js'
        : 'cli-native'
      : 'cli-js';
  const intActions = words(ACTIONS.intelligence.write);
  const result = all.map(name => {
    const canonical =
      intActions.includes(name) && name !== 'case' ? 'intelligence ' + name : ALIASES[name] || name;
    return descriptor(
      'cli',
      name,
      jsNames.includes(name) ? CLI : WRAPPER,
      name,
      metadata.get(name),
      adapter(name),
      canonical,
      !UNIMPLEMENTED.includes(name),
    );
  });

  for (const [command, groups] of Object.entries(ACTIONS)) {
    let file = 'src/commands/' + command + '.js';
    if (command === 'marathon') file = '.agent/scripts/marathon_harness.js';
    if (command === 'case') file = '.agent/scripts/case_law_manager.js';
    const input = read(root, file);
    let observed = cases(input);
    if (command === 'sdd') observed = matches(input, /if\s*\(subcommand\s*===\s*['"]([\w-]+)['"]/g);
    if (command === 'case') {
      const table = section(input, /const COMMANDS\s*=\s*\{([\s\S]*?)\};/, file);
      observed = matches(table, /^\s*['"]?([\w-]+)['"]?\s*:\s*cmd\w+/gm);
    }
    const classified = effects(groups);
    compare(file, observed, [...classified.keys()]);
    for (const action of observed) {
      const locator = command + ' ' + action;
      let canonical = locator;
      if (command === 'system1' && action === 'enable') canonical = 'system1 setup';
      if (command === 'system1' && action === 'uninstall') canonical = 'system1 clean';
      const jsOnly = command === 'sdd' && ['scratchpad', 'help'].includes(action);
      result.push(
        descriptor(
          'cli',
          locator,
          file,
          action,
          classified.get(action),
          jsOnly ? 'cli-js' : adapter(command),
          canonical,
        ),
      );
    }
  }
  const caseAliases = matches(
    read(root, 'src/commands/case.js'),
    /if\s*\(pyArgs\[0\]\s*===\s*['"]([\w-]+)['"]\)/g,
  );
  compare('case shorthand', caseAliases, ['add', 'search']);
  for (const alias of caseAliases) {
    const canonical = alias === 'add' ? 'add-case' : 'search-cases';
    result.push(
      descriptor(
        'cli',
        'case ' + alias,
        'src/commands/case.js',
        alias,
        'exec',
        'cli-js',
        'case ' + canonical,
      ),
    );
  }
  // These entry points dispatch modes through flags instead of positional subcommands.
  const reviewFile = 'src/commands/review.js';
  const review = read(root, reviewFile);
  const reviewModes = matches(review, /if\s*\(arg === '(--[\w-]+)'\)\s*\{\s*mode\w+ = true;/g);
  compare('review mode flags', reviewModes, ['--plan', '--execute']);
  for (const flag of reviewModes) {
    result.push(descriptor('cli', 'review ' + flag, reviewFile, flag, 'exec', 'cli-js'));
  }
  const skillFile = 'src/commands/skill-intelligence.js';
  const modes = [...read(root, skillFile).matchAll(/const is\w+\s*=\s*([^;]+);/g)];
  const modeFlags = modes.flatMap(([, expr]) => matches(expr, /raw\.includes\('(-[\w-]+)'\)/g));
  compare(
    'skill intelligence modes',
    modeFlags,
    words(
      '--gate -g --contract --judgment --anti-slop --memory --failures --proposals --telemetry --pre-mortem --premortem --simulate --chains --claims --cross-domain --crossdomain --interactions --outcome --decisions --complexity --assumptions',
    ),
  );
  for (const flag of modeFlags) {
    for (const command of ['skill-intelligence', 'skill-intel']) {
      const canonical = 'skill-intelligence ' + (flag === '-g' ? '--gate' : flag);
      result.push(
        descriptor('cli', command + ' ' + flag, skillFile, flag, 'exec', 'cli-js', canonical),
      );
    }
  }
  const autopilotFile = 'src/commands/autopilot.js';
  const autopilotActions = quoted(section(read(root, autopilotFile),
    /if\s*\(!\[([^\]]+)\]\.includes\(action\)/, 'autopilot CLI actions'));
  compare('autopilot CLI actions', autopilotActions, ['plan', 'inspect']);
  for (const action of autopilotActions) {
    result.push(descriptor('cli', 'autopilot ' + action, autopilotFile, action, 'exec', 'cli-js'));
  }
  return result;
}

function collectDispatch(root) {
  const result = collectCli(root);
  const server = read(root, MCP);
  const listed = section(
    server,
    /if\s*\(req\.method\s*===\s*['"]tools\/list['"]\)\s*\{([\s\S]*?)if\s*\(req\.method\s*===\s*['"]tools\/call['"]\)/,
    MCP,
  );
  const advertised = matches(listed, /\bname:\s*['"]([\w-]+)['"]\s*,\s*description:/g);
  const handled = matches(server, /\bif\s*\(toolName\s*===\s*['"]([\w-]+)['"]\)/g);
  compare('MCP advertised and internal handlers', handled, [...advertised, ...INTERNAL]);
  const metadata = effects(MCP_EFFECTS);
  compare('MCP effect metadata', handled, [...metadata.keys()]);
  for (const name of handled) {
    result.push(
      descriptor('mcp', name, MCP, name, metadata.get(name), 'mcp', name, !INTERNAL.includes(name)),
    );
  }

  const engine = read(root, ENGINE);
  const implemented = cases(
    section(engine, /switch\s*\(normalizedSub\)\s*\{([\s\S]*?)\bdefault\s*:/, ENGINE),
  );
  const names = words(
    'overview trace dependencies relevant-files impact dead-code onboard prepare change-impact investigate',
  );
  const aliases = { deps: 'dependencies', change_impact: 'change-impact' };
  compare('understand engine', implemented, [...names, ...Object.keys(aliases)]);
  const advertisedActions = quoted(
    section(listed, /subcommand:\s*\{[\s\S]*?enum:\s*\[([\s\S]*?)\]/, 'MCP understand enum'),
  );
  compare('MCP understand actions', advertisedActions, names);
  const cliActions = [...engine.matchAll(/const validSubs\s*=\s*\[([\s\S]*?)\]/g)];
  if (!cliActions.length) throw new Error('Missing CLI understand action definitions');
  for (const [, body] of cliActions)
    compare('CLI understand actions', quoted(body), [...names, 'deps']);
  for (const action of [...names, 'deps']) {
    for (const command of ['understand', 'tribunal-understand']) {
      result.push(
        descriptor(
          'cli',
          command + ' ' + action,
          ENGINE,
          action,
          'read',
          'cli-js',
          'understand ' + (aliases[action] || action),
        ),
      );
    }
  }
  for (const action of implemented) {
    const locator = 'tribunal_understand ' + action;
    const available = advertisedActions.includes(action);
    result.push({
      ...descriptor(
        'mcp',
        locator,
        available ? MCP : ENGINE,
        action,
        'read',
        'mcp',
        locator,
        available,
      ),
      locator: 'tribunal_understand',
      fixedArguments: { subcommand: action },
    });
  }
  return result;
}

module.exports = { collectDispatch };
