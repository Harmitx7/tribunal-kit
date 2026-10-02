'use strict';

const __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.cmdArch = cmdArch;

const fs_1 = __importDefault(require('fs'));
const path_1 = __importDefault(require('path'));
const child_process_1 = require('child_process');
const logger_1 = require('../utils/logger');
const helpers_1 = require('../utils/helpers');

async function cmdArch(flags, rawArgv, quiet = false) {
  const targetDir = flags.path ? path_1.default.resolve(flags.path) : process.cwd();
  const subCommand = rawArgv[3] || 'help';

  (0, helpers_1.banner)(quiet);

  const scriptsDir = path_1.default.join(targetDir, '.agent', 'scripts');
  const historyDir = path_1.default.join(targetDir, '.agent', 'history');
  const modelFile = path_1.default.join(historyDir, 'architecture-model.json');

  switch (subCommand) {
    case 'map': {
      (0, logger_1.log)(
        `  ${(0, logger_1.c)('cyan', '▸')} Extracting architectural facts from source...`,
      );
      const { ArchitectureExtractor } = require(
        path_1.default.join(scriptsDir, 'architecture_extractor.js'),
      );
      const extractor = new ArchitectureExtractor(targetDir);
      const model = extractor.scan();
      const outPath = extractor.save();
      (0, logger_1.ok)(
        `Fact Extraction Complete: ${model.summary.totalEntities} entities, ${model.summary.totalRelations} relations.`,
      );
      (0, logger_1.log)(
        `  ${(0, logger_1.c)('gray', 'Model saved to:')} ${(0, logger_1.c)('cyan', outPath)}`,
      );
      break;
    }

    case 'verify': {
      (0, logger_1.log)(
        `  ${(0, logger_1.c)('cyan', '▸')} Executing Zero-Trust Architecture Verification...`,
      );
      if (!fs_1.default.existsSync(modelFile)) {
        const { ArchitectureExtractor } = require(
          path_1.default.join(scriptsDir, 'architecture_extractor.js'),
        );
        new ArchitectureExtractor(targetDir).scan().save();
      }
      const model = JSON.parse(fs_1.default.readFileSync(modelFile, 'utf8'));
      const { ArchitectureVerifier } = require(
        path_1.default.join(scriptsDir, 'architecture_verifier.js'),
      );
      const verifier = new ArchitectureVerifier(targetDir);
      const results = verifier.verifyModel(model);
      const repPath = verifier.saveReport();

      if (results.verified) {
        (0, logger_1.ok)(
          `Architecture Verified: ${results.stats.verifiedEntities}/${results.stats.totalEntities} entities confirmed against ground truth.`,
        );
      } else {
        (0, logger_1.warn)(
          `Verification completed with warnings: ${results.contradictions.length} contradictions surfaced.`,
        );
      }
      (0, logger_1.log)(
        `  ${(0, logger_1.c)('gray', 'Verification report:')} ${(0, logger_1.c)('cyan', repPath)}`,
      );
      break;
    }

    case 'impact': {
      const targetQuery = rawArgv[4];
      if (!targetQuery) {
        (0, logger_1.err)('Usage: tk arch impact <component-id-or-filepath>');
        process.exit(1);
      }
      if (!fs_1.default.existsSync(modelFile)) {
        const { ArchitectureExtractor } = require(
          path_1.default.join(scriptsDir, 'architecture_extractor.js'),
        );
        const ext = new ArchitectureExtractor(targetDir);
        ext.scan();
        ext.save();
      }
      const model = JSON.parse(fs_1.default.readFileSync(modelFile, 'utf8'));
      const { BlastRadiusEngine } = require(
        path_1.default.join(scriptsDir, 'blast_radius_engine.js'),
      );
      const engine = new BlastRadiusEngine(model);
      const res = engine.computeBlastRadius(targetQuery);

      if (!res.found) {
        (0, logger_1.err)(res.error);
        process.exit(1);
      }

      (0, logger_1.log)(
        `  ${(0, logger_1.bold)('Target:')}                ${(0, logger_1.c)('cyan', res.target.name)} (${res.target.id})`,
      );
      (0, logger_1.log)(
        `  ${(0, logger_1.bold)('Risk Tier:')}             ${(0, logger_1.c)(res.metrics.riskTier === 'CRITICAL' ? 'red' : 'yellow', res.metrics.riskTier)} (${res.metrics.riskScore})`,
      );
      (0, logger_1.log)(
        `  ${(0, logger_1.bold)('Direct Callers:')}        ${res.metrics.directDependentsCount}`,
      );
      (0, logger_1.log)(
        `  ${(0, logger_1.bold)('Transitive Blast:')}      ${res.metrics.transitiveDependentsCount} across ${res.metrics.maxDepthReached} rings`,
      );
      (0, logger_1.log)(
        `  ${(0, logger_1.bold)('Impacted Endpoints:')}    ${res.impactBreakdown.endpoints.length}`,
      );
      (0, logger_1.log)(
        `  ${(0, logger_1.bold)('Impacted Test Suites:')}  ${res.impactBreakdown.testSuites.length}`,
      );
      break;
    }

    case 'diff': {
      const baseFile = rawArgv[4];
      const headFile = rawArgv[5];
      if (!baseFile || !headFile) {
        (0, logger_1.err)('Usage: tk arch diff <base-model.json> <head-model.json>');
        process.exit(1);
      }
      const { ArchitectureDiffer } = require(
        path_1.default.join(scriptsDir, 'architecture_diff.js'),
      );
      const baseModel = JSON.parse(
        fs_1.default.readFileSync(path_1.default.resolve(baseFile), 'utf8'),
      );
      const headModel = JSON.parse(
        fs_1.default.readFileSync(path_1.default.resolve(headFile), 'utf8'),
      );
      const differ = new ArchitectureDiffer(baseModel, headModel);
      const diff = differ.compare();

      (0, logger_1.log)(
        `  ${(0, logger_1.bold)('Architectural Risk:')}     ${(0, logger_1.c)(diff.summary.riskLevel === 'CRITICAL' ? 'red' : 'yellow', diff.summary.riskLevel)} (${diff.summary.architecturalImpactScore})`,
      );
      (0, logger_1.log)(
        `  ${(0, logger_1.bold)('Entities Changed:')}       +${diff.summary.entitiesAdded} / -${diff.summary.entitiesRemoved} / ~${diff.summary.entitiesModified}`,
      );
      (0, logger_1.log)(
        `  ${(0, logger_1.bold)('Trust Violations:')}       ${diff.trustBoundaryViolations.length}`,
      );
      (0, logger_1.log)(
        `  ${(0, logger_1.bold)('Resilience Regressions:')} ${diff.resilienceRegressions.length}`,
      );
      break;
    }

    case 'audit': {
      (0, logger_1.log)(
        `  ${(0, logger_1.c)('cyan', '▸')} Auditing architectural health, SPOFs & circular dependencies...`,
      );
      if (!fs_1.default.existsSync(modelFile)) {
        const { ArchitectureExtractor } = require(
          path_1.default.join(scriptsDir, 'architecture_extractor.js'),
        );
        new ArchitectureExtractor(targetDir).scan().save();
      }
      const model = JSON.parse(fs_1.default.readFileSync(modelFile, 'utf8'));
      const { ArchitectureHealthAuditor } = require(
        path_1.default.join(scriptsDir, 'architecture_health.js'),
      );
      const auditor = new ArchitectureHealthAuditor(model);
      const report = auditor.audit();

      (0, logger_1.log)(
        `  ${(0, logger_1.bold)('Total Signals:')}         ${report.summary.totalSignals}`,
      );
      (0, logger_1.log)(
        `  ${(0, logger_1.bold)('Critical Violations:')}   ${report.summary.critical}`,
      );
      (0, logger_1.log)(`  ${(0, logger_1.bold)('High Risk Issues:')}      ${report.summary.high}`);
      for (const s of report.signals.slice(0, 5)) {
        (0, logger_1.log)(
          `    ${(0, logger_1.c)('yellow', '!')} ${(0, logger_1.bold)(s.title)}: ${(0, logger_1.c)('gray', s.message)}`,
        );
      }
      break;
    }

    case 'project': {
      (0, logger_1.log)(
        `  ${(0, logger_1.c)('cyan', '▸')} Building interactive architecture projections...`,
      );
      if (!fs_1.default.existsSync(modelFile)) {
        const { ArchitectureExtractor } = require(
          path_1.default.join(scriptsDir, 'architecture_extractor.js'),
        );
        const ext = new ArchitectureExtractor(targetDir);
        ext.scan();
        ext.save();
      }
      const model = JSON.parse(fs_1.default.readFileSync(modelFile, 'utf8'));
      const { ArchitectureVisualizer } = require(
        path_1.default.join(scriptsDir, 'architecture_visualizer.js'),
      );
      const visualizer = new ArchitectureVisualizer(model);
      const htmlPath = visualizer.saveHtml();
      (0, logger_1.ok)(`Interactive Explorer Generated: ${htmlPath}`);

      if (rawArgv.includes('--open') || flags.open) {
        (0, logger_1.log)(`  ${(0, logger_1.c)('cyan', '▸')} Opening in browser...`);
        if (process.platform === 'win32') {
          (0, child_process_1.spawn)('cmd.exe', ['/c', 'start', '', htmlPath], {
            stdio: 'ignore',
            detached: true,
          }).unref();
        } else if (process.platform === 'darwin') {
          (0, child_process_1.spawn)('open', [htmlPath], {
            stdio: 'ignore',
            detached: true,
          }).unref();
        } else {
          (0, child_process_1.spawn)('xdg-open', [htmlPath], {
            stdio: 'ignore',
            detached: true,
          }).unref();
        }
      }
      break;
    }

    case 'help':
    default: {
      (0, logger_1.log)((0, logger_1.bold)('  Tribunal Architecture Intelligence Commands'));
      (0, logger_1.log)(`  ${(0, logger_1.c)('gray', '─'.repeat(45))}`);
      (0, logger_1.log)(
        `  ${(0, logger_1.c)('cyan', 'tk arch map')}          Extract fact model from codebase AST`,
      );
      (0, logger_1.log)(
        `  ${(0, logger_1.c)('cyan', 'tk arch verify')}       Zero-trust verify code evidence & confidence`,
      );
      (0, logger_1.log)(
        `  ${(0, logger_1.c)('cyan', 'tk arch impact <x>')}   Simulate change blast radius and affected tests`,
      );
      (0, logger_1.log)(
        `  ${(0, logger_1.c)('cyan', 'tk arch diff <a> <b>')} Semantic diff: trust boundary & resilience shifts`,
      );
      (0, logger_1.log)(
        `  ${(0, logger_1.c)('cyan', 'tk arch audit')}        Detect circular deps, SPOFs, test gaps`,
      );
      (0, logger_1.log)(
        `  ${(0, logger_1.c)('cyan', 'tk arch project')}      Generate standalone multi-projection HTML explorer`,
      );
      console.log();
      break;
    }
  }
}
