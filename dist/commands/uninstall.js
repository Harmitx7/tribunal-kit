"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cmdUninstall = cmdUninstall;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../utils/logger");
const helpers_1 = require("../utils/helpers");
function cmdUninstall(flags, quiet = false) {
    const targetDir = flags.path ? path_1.default.resolve(flags.path) : process.cwd();
    const agentDest = path_1.default.join(targetDir, '.agent');
    (0, helpers_1.banner)(quiet);
    if (!fs_1.default.existsSync(agentDest)) {
        (0, logger_1.log)(`  ${(0, logger_1.c)('yellow', '⚠')} ${(0, logger_1.bold)('.agent/')} is not installed in this project.`);
        console.log();
        return;
    }
    if (flags.dryRun) {
        (0, logger_1.log)((0, logger_1.colorize)('yellow', '  DRY RUN — would remove:'));
        (0, logger_1.log)(`  ${(0, logger_1.c)('gray', '  ╰─')} ${agentDest}`);
        console.log();
        return;
    }
    try {
        fs_1.default.rmSync(agentDest, { recursive: true, force: true });
        (0, logger_1.log)(`  ${(0, logger_1.c)('green', '✔')} ${(0, logger_1.bold)('.agent/')} has been removed from this project.`);
        console.log();
        (0, logger_1.log)(`  ${(0, logger_1.c)('gray', '▸')} To reinstall: ${(0, logger_1.c)('cyan', 'npx tribunal-kit init')}`);
        console.log();
    }
    catch (e) {
        if (e instanceof Error) {
            (0, logger_1.err)(`Failed to remove .agent/: ${e.message}`);
        }
        else {
            (0, logger_1.err)(`Failed to remove .agent/: ${String(e)}`);
        }
        process.exit(1);
    }
}
