'use strict';
const __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.cmdLearn = cmdLearn;
const fs_1 = __importDefault(require('fs'));
const path_1 = __importDefault(require('path'));
const logger_1 = require('../utils/logger');
const helpers_1 = require('../utils/helpers');
const {
  loadEvolutionProposals,
  approveEvolutionProposal,
  rejectEvolutionProposal,
} = require('../evolution/engine');

async function cmdLearn(flags, quiet = false) {
  const targetDir = flags.path ? path_1.default.resolve(flags.path) : process.cwd();
  const agentDest = path_1.default.join(targetDir, '.agent');
  if (!fs_1.default.existsSync(agentDest)) {
    (0, logger_1.err)('.agent/ not found. Run: npx tribunal-kit init');
    process.exit(1);
  }

  // Handle explicit proposal actions
  if (flags.approve) {
    try {
      const p = approveEvolutionProposal(String(flags.approve), 'Human Developer', agentDest);
      if (!quiet) (0, logger_1.log)(`  ${(0, logger_1.c)('green', '✓')} Approved evolution proposal: ${(0, logger_1.bold)(p.proposal_id)} [${p.target}]`);
      return;
    } catch (e) {
      (0, logger_1.err)(`Failed to approve proposal: ${e.message}`);
      process.exit(1);
    }
  }

  if (flags.reject) {
    try {
      const p = rejectEvolutionProposal(String(flags.reject), flags.reason || 'Rejected by developer', agentDest);
      if (!quiet) (0, logger_1.log)(`  ${(0, logger_1.c)('yellow', '✓')} Rejected evolution proposal: ${(0, logger_1.bold)(p.proposal_id)}`);
      return;
    } catch (e) {
      (0, logger_1.err)(`Failed to reject proposal: ${e.message}`);
      process.exit(1);
    }
  }

  if (flags.status || flags.proposals) {
    const proposals = loadEvolutionProposals(agentDest);
    (0, logger_1.log)(`\n  ${(0, logger_1.bold)('Tribunal Evolution Proposals')} (${proposals.length} total)`);
    (0, logger_1.dim)('  ──────────────────────────────────────────────────');
    if (proposals.length === 0) {
      (0, logger_1.dim)('  No evolution proposals recorded yet.');
    } else {
      for (const p of proposals) {
        const color = p.status === 'APPROVED' ? 'green' : p.status === 'REJECTED' ? 'red' : 'yellow';
        (0, logger_1.log)(`  ${(0, logger_1.c)(color, `[${p.status}]`)} ${(0, logger_1.bold)(p.proposal_id)} — Target: ${(0, logger_1.c)('cyan', p.target)} (Risk: ${p.risk})`);
        (0, logger_1.dim)(`    Evidence: ${p.observed_evidence}`);
        (0, logger_1.dim)(`    Change:   ${p.proposed_change}`);
      }
    }
    (0, logger_1.log)('');
    return;
  }

  (0, helpers_1.banner)(quiet);
  const W = 62;
  const title = '  Tribunal Learn — Supreme Court Mode';
  const trail = ' '.repeat(Math.max(0, W - title.length));
  console.log(`  ${(0, logger_1.c)('cyan', '\u2554' + '\u2550'.repeat(W) + '\u2557')}`);
  console.log(
    `  ${(0, logger_1.c)('cyan', '\u2551')}${(0, logger_1.bold)((0, logger_1.c)('white', title))}${trail}${(0, logger_1.c)('cyan', '\u2551')}`,
  );
  console.log(`  ${(0, logger_1.c)('cyan', '\u255a' + '\u2550'.repeat(W) + '\u255d')}`);
  console.log();
  const dryRun = flags.dryRun ? '--dry-run' : '';
  const useHead = flags.head ? '--head' : '';

  // Phase 1: Skill Evolution & Proposal Governance
  (0, logger_1.log)(
    `  ${(0, logger_1.c)('cyan', '\u229b')} ${(0, logger_1.bold)('Phase 1')} \u2014 Skill Evolution Forge & Governance Proposals`,
  );
  const existingProposals = loadEvolutionProposals(agentDest);
  const pending = existingProposals.filter(p => p.status === 'PROPOSED');
  if (pending.length > 0) {
    (0, logger_1.log)(
      `    ${(0, logger_1.c)('yellow', '⚠')} ${pending.length} pending evolution proposal(s) awaiting Human Gate approval (run: tk learn --status)`,
    );
  }
  const evoScript = path_1.default.join(agentDest, 'scripts', 'skill_evolution.js');
  if (!fs_1.default.existsSync(evoScript)) {
    (0, logger_1.warn)('skill_evolution.js not found \u2014 run: npx tribunal-kit update');
  } else {
    try {
      const args = [evoScript, 'digest'];
      if (dryRun) args.push('--dry-run');
      if (useHead) args.push('--head');
      await (0, helpers_1.runShellAsync)('node', args, { stdio: 'inherit', cwd: targetDir });
    } catch (e) {
      if (e instanceof Error) {
        (0, logger_1.warn)(`Skill Evolution error: ${e.message}`);
      } else {
        (0, logger_1.warn)(`Skill Evolution error: ${String(e)}`);
      }
    }
  }
  console.log();
  // Phase 2: Case Law prompt
  (0, logger_1.log)(
    `  ${(0, logger_1.c)('cyan', '\u229b')} ${(0, logger_1.bold)('Phase 2')} \u2014 Case Law Engine (building precedence record)`,
  );
  console.log();
  (0, logger_1.log)(`  ${(0, logger_1.c)('gray', '\u25b8')} Record a new rejection precedent:`);
  (0, logger_1.log)(`    ${(0, logger_1.c)('white', 'npx tribunal-kit case add')}`);
  console.log();
  (0, logger_1.log)(`  ${(0, logger_1.c)('gray', '\u25b8')} Search existing case law:`);
  (0, logger_1.log)(`    ${(0, logger_1.c)('white', 'npx tribunal-kit case search "your query"')}`);
  console.log();
  // Phase 3: Memory Distillation
  (0, logger_1.log)(
    `  ${(0, logger_1.c)('cyan', '\u229b')} ${(0, logger_1.bold)('Phase 3')} \u2014 Memory Distillation (storing project knowledge)`,
  );
  try {
    const { _memoryStore } = require('./memory');
    // Auto-extract SEMANTIC memories from project-idioms if it exists
    const idiomsPath = path_1.default.join(agentDest, 'skills', 'project-idioms', 'SKILL.md');
    let memoriesStored = 0;
    if (fs_1.default.existsSync(idiomsPath)) {
      const idiomsContent = fs_1.default.readFileSync(idiomsPath, 'utf8');
      // Extract lines that look like project rules (lines starting with - or * that contain actionable content)
      const ruleLines = idiomsContent
        .split('\n')
        .filter(line => /^[\s]*[-*]\s+/.test(line) && line.trim().length > 20)
        .map(line => line.replace(/^[\s]*[-*]\s+/, '').trim())
        .slice(0, 10); // Cap at 10 to prevent bloat

      for (const rule of ruleLines) {
        try {
          _memoryStore(agentDest, 'semantic', rule, ['project-idiom', 'auto-learned'], null);
          memoriesStored++;
        } catch {
          // Skip duplicates or capacity errors silently
        }
      }
    }
    // Auto-extract PROCEDURAL memories from package.json scripts
    const pkgPath = path_1.default.join(targetDir, 'package.json');
    if (fs_1.default.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs_1.default.readFileSync(pkgPath, 'utf8'));
        if (pkg.scripts) {
          const importantScripts = ['build', 'test', 'dev', 'start', 'deploy', 'lint'];
          for (const key of importantScripts) {
            if (pkg.scripts[key]) {
              try {
                _memoryStore(
                  agentDest,
                  'procedural',
                  `Run \`${pkg.scripts[key]}\` to ${key} the project`,
                  ['build-script', key, 'auto-learned'],
                  null,
                );
                memoriesStored++;
              } catch {
                // Skip
              }
            }
          }
        }
      } catch {
        // Unreadable package.json
      }
    }
    if (memoriesStored > 0) {
      (0, logger_1.log)(
        `    ${(0, logger_1.c)('green', '\u2714')} ${memoriesStored} memories auto-stored (semantic + procedural)`,
      );
    } else {
      (0, logger_1.log)(
        `    ${(0, logger_1.c)('gray', '\u25b8')} No new memories to distill (run again after committing changes)`,
      );
    }
  } catch (e) {
    (0, logger_1.log)(
      `    ${(0, logger_1.c)('yellow', '\u26a0')} Memory distillation skipped: ${e.message || String(e)}`,
    );
  }
  console.log();
  (0, logger_1.log)(
    `  ${(0, logger_1.c)('green', '\u2714')} ${(0, logger_1.bold)('Learn cycle complete.')} Your Tribunal grows smarter with every commit.`,
  );
  console.log();
}
