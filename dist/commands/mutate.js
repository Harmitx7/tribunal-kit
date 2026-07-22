"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cmdMutate = cmdMutate;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../utils/logger");
const helpers_1 = require("../utils/helpers");
async function cmdMutate(flags, processArgs) {
    const targetDir = flags.path ? path_1.default.resolve(flags.path) : process.cwd();
    const agentDest = path_1.default.join(targetDir, '.agent');
    if (!fs_1.default.existsSync(agentDest)) {
        (0, logger_1.err)('.agent/ not found. Run: npx tribunal-kit init');
        process.exit(1);
    }
    const args = processArgs.slice(3);
    if (args.length < 2) {
        (0, logger_1.err)('Usage: npx tribunal-kit mutate <target_file> <test_command>');
        process.exit(1);
    }
    const mutateScript = path_1.default.join(agentDest, 'scripts', 'mutation_runner.js');
    try {
        await (0, helpers_1.runShellAsync)(`node "${mutateScript}" ${args.join(' ')}`, { stdio: 'inherit', cwd: targetDir });
    }
    catch {
        process.exit(1);
    }
}
