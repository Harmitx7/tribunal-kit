"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cmdMinimal = cmdMinimal;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../utils/logger");
const helpers_1 = require("../utils/helpers");

function cmdMinimal(flags, quiet = false) {
    const targetDir = flags.path ? path_1.default.resolve(flags.path) : process.cwd();
    const agentDest = path_1.default.join(targetDir, '.agent');
    (0, helpers_1.banner)(quiet);

    if (!fs_1.default.existsSync(agentDest)) {
        (0, logger_1.log)(`  ${(0, logger_1.c)('red', '✖')} ${(0, logger_1.bold)('Not installed')} in this project`);
        return;
    }

    const enginePath = path_1.default.join(agentDest, 'scripts', 'minimal_change_engine.js');
    if (!fs_1.default.existsSync(enginePath)) {
        (0, logger_1.log)(`  ${(0, logger_1.c)('red', '✖')} minimal_change_engine.js not found`);
        return;
    }

    try {
        const engine = require(enginePath);
        const task = flags.task || flags._?.slice(1).join(' ') || 'Default task evaluation';
        const mode = flags.mode || 'balanced';
        const result = engine.evaluateMinimalChange(task, {
            files_added: flags.filesAdded ? parseInt(flags.filesAdded, 10) : 0,
            files_modified: flags.filesModified ? parseInt(flags.filesModified, 10) : 1,
            estimated_lines_added: flags.linesAdded ? parseInt(flags.linesAdded, 10) : 20,
        }, { mode, cwd: targetDir });

        if (flags.json) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }

        (0, logger_1.log)(`  ${(0, logger_1.bold)('Minimal Change Governance Audit')}`);
        (0, logger_1.log)(`  Minimality Score:          ${result.passed ? (0, logger_1.c)('green', result.minimality_score + '/100') : (0, logger_1.c)('red', result.minimality_score + '/100')}`);
        (0, logger_1.log)(`  Decision Classification:   ${(0, logger_1.c)('cyan', result.minimality_classification)}`);
        (0, logger_1.log)(`  Strictness Mode:           ${(0, logger_1.c)('yellow', mode)}`);
        console.log();

        if (result.change_budget) {
            (0, logger_1.log)(`  ${(0, logger_1.bold)('Change Budget:')}`);
            (0, logger_1.log)(`    files_added:           ${result.change_budget.files_added}`);
            (0, logger_1.log)(`    files_modified:        ${result.change_budget.files_modified}`);
            (0, logger_1.log)(`    dependencies_added:    ${result.change_budget.dependencies_added}`);
            (0, logger_1.log)(`    new_abstractions:      ${result.change_budget.new_abstractions}`);
            console.log();
        }

        if (result.complexity_flags.length > 0) {
            (0, logger_1.log)(`  ${(0, logger_1.c)('yellow', 'Complexity Flags Detected:')}`);
            result.complexity_flags.forEach(f => {
                (0, logger_1.log)(`    • [${f.severity.toUpperCase()}] ${f.type}: ${f.evidence}`);
            });
            console.log();
        } else {
            (0, logger_1.log)(`  ${(0, logger_1.c)('green', '✔ Zero Complexity Flags Detected')}`);
            console.log();
        }
    } catch (err) {
        (0, logger_1.log)(`  ${(0, logger_1.c)('red', '✖ Error executing Minimal Change Engine:')} ${err.message}`);
    }
}
