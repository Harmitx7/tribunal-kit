'use strict';
const __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.cmdContext = cmdContext;
exports.cmdContextRank = cmdContextRank;
const fs_1 = __importDefault(require('fs'));
const path_1 = __importDefault(require('path'));
const logger_1 = require('../utils/logger');
const { rankContext } = require('../context/ranker');

function cmdContextRank(flags, processArgs, quiet = false) {
  const targetDir = flags.path ? path_1.default.resolve(flags.path) : process.cwd();
  const args = processArgs.slice(3);

  let targetFiles = [];
  let candidateFiles = [];
  let maxTokens = flags.maxTokens ? parseInt(flags.maxTokens, 10) : undefined;
  let maxItems = flags.maxItems ? parseInt(flags.maxItems, 10) : undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--target' && args[i + 1]) {
      targetFiles = args[++i]
        .split(',')
        .map(f => f.trim())
        .filter(Boolean);
    } else if (arg.startsWith('--target=')) {
      targetFiles = arg
        .split('=')[1]
        .split(',')
        .map(f => f.trim())
        .filter(Boolean);
    } else if (arg === '--candidates' && args[i + 1]) {
      candidateFiles = args[++i]
        .split(',')
        .map(f => f.trim())
        .filter(Boolean);
    } else if (arg.startsWith('--candidates=')) {
      candidateFiles = arg
        .split('=')[1]
        .split(',')
        .map(f => f.trim())
        .filter(Boolean);
    } else if (arg === '--max-tokens' && args[i + 1]) {
      maxTokens = parseInt(args[++i], 10);
    } else if (arg.startsWith('--max-tokens=')) {
      maxTokens = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--max-items' && args[i + 1]) {
      maxItems = parseInt(args[++i], 10);
    } else if (arg.startsWith('--max-items=')) {
      maxItems = parseInt(arg.split('=')[1], 10);
    } else if (!arg.startsWith('-') && targetFiles.length === 0) {
      targetFiles = [arg];
    }
  }

  const result = rankContext({
    repoRoot: targetDir,
    targetFiles,
    candidateFiles: candidateFiles.length > 0 ? candidateFiles : undefined,
    maxTokens,
    maxItems,
  });

  if (flags.json || args.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
    return result;
  }

  if (!quiet) {
    console.log(`\n━━━ Deterministic Context Ranking ━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(
      `  Items Evaluated:  ${result.metrics.context_items_before} -> ${result.metrics.context_items_after} retained`,
    );
    console.log(
      `  Token Budget:     ~${result.metrics.estimated_tokens_before} -> ~${result.metrics.estimated_tokens_after} tokens`,
    );
    console.log(
      `  Critical Evidence: ${result.metrics.critical_evidence_retained} mandatory file(s) retained\n`,
    );

    console.log(`  Ranked Evidence Items:`);
    for (const item of result.ranked_items) {
      const tag = item.is_mandatory ? ' [MANDATORY]' : '';
      console.log(`  - \x1b[96m${item.path}\x1b[0m (score: \x1b[93m${item.score}\x1b[0m${tag})`);
      for (const reason of item.reasons) {
        console.log(`      * ${reason}`);
      }
    }

    if (result.truncated_items.length > 0) {
      console.log(`\n  Truncated from Context Budget (${result.truncated_items.length}):`);
      for (const item of result.truncated_items) {
        console.log(`  - \x1b[90m${item.path} (score: ${item.score})\x1b[0m`);
      }
    }
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  }

  return result;
}

function cmdContext(flags, processArgs) {
  if (flags.rank || processArgs.includes('--rank')) {
    return cmdContextRank(flags, processArgs);
  }

  const targetDir = flags.path ? path_1.default.resolve(flags.path) : process.cwd();
  const agentDest = path_1.default.join(targetDir, '.agent');
  if (!fs_1.default.existsSync(agentDest)) {
    (0, logger_1.err)('.agent/ not found. Run: npx tribunal-kit init');
    process.exit(1);
  }
  const args = processArgs.slice(3);
  if (args.length === 0 || args[0] === 'help' || args[0] === '--help') {
    console.error('Usage: npx tribunal-kit context <target_file>');
    process.exit(1);
  }
  const resolvedTarget = path_1.default.resolve(targetDir, args[0]);
  const relativePath = path_1.default.relative(targetDir, resolvedTarget).replace(/\\/g, '/');
  if (
    relativePath.startsWith('../') ||
    relativePath === '..' ||
    path_1.default.isAbsolute(relativePath)
  ) {
    console.error('  \x1b[91m✖\x1b[0m File must be within the project directory: ' + args[0]);
    process.exit(1);
  }
  const snapshotName = relativePath.replace(/[\\\/]/g, '__') + '.json';
  const snapshotPath = path_1.default.join(agentDest, 'history', 'snapshots', snapshotName);
  if (!fs_1.default.existsSync(snapshotPath)) {
    console.error('  \x1b[91m✖\x1b[0m Context Snapshot not found for: ' + args[0]);
    console.log('    Run: npx tribunal-kit graph  (to generate snapshots)');
    process.exit(1);
  }
  try {
    const snapshot = JSON.parse(fs_1.default.readFileSync(snapshotPath, 'utf8'));
    console.log('\n# Context Snapshot: ' + snapshot.file);
    process.stdout.write('> Size Estimate: ' + (snapshot['estimatedTokens'] || 'Unknown') + '\n');
    console.log(
      '> Risk Score: ' + snapshot.riskScore + ' (Blast Radius: ' + snapshot.blastRadius + ')\n',
    );
    if (Object.keys(snapshot.imports).length > 0) {
      console.log('## Imports');
      for (const [imp, exports] of Object.entries(snapshot.imports)) {
        if (Array.isArray(exports) && exports.length > 0) {
          console.log('- `' + imp + '` (exports: ' + exports.join(', ') + ')');
        } else {
          console.log('- `' + imp + '`');
        }
      }
      console.log();
    }
    if (snapshot.dependents && snapshot.dependents.length > 0) {
      console.log('## Dependents');
      for (const dep of snapshot.dependents) {
        console.log('- `' + dep + '`');
      }
      console.log();
    }
    console.log('## Source Code');
    console.log('```javascript\n' + snapshot.content + '\n```\n');
  } catch (e) {
    if (e instanceof Error) {
      console.error('Failed to read snapshot: ' + e.message);
    } else {
      console.error('Failed to read snapshot: ' + String(e));
    }
    process.exit(1);
  }
}
