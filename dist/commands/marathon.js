"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cmdMarathon = cmdMarathon;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../utils/logger");
const helpers_1 = require("../utils/helpers");
async function cmdMarathon(flags, processArgs, quiet = false) {
    const targetDir = flags.path ? path_1.default.resolve(flags.path) : process.cwd();
    const agentDest = path_1.default.join(targetDir, '.agent');
    if (!fs_1.default.existsSync(agentDest)) {
        (0, logger_1.err)('.agent/ not found. Run: npx tribunal-kit init');
        process.exit(1);
    }
    const args = processArgs.slice(3);
    const argsStr = args.join(' ');
    if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
        (0, helpers_1.banner)(quiet);
        (0, logger_1.log)(`  ${(0, logger_1.c)('cyan', '╔' + '═'.repeat(60) + '╗')}`);
        (0, logger_1.log)(`  ${(0, logger_1.c)('cyan', '║')}\x1b[1m\x1b[97m  Marathon — Long-Running Agent Harness                  \x1b[0m${(0, logger_1.c)('cyan', '║')}`);
        (0, logger_1.log)(`  ${(0, logger_1.c)('cyan', '╚' + '═'.repeat(60) + '╝')}`);
        console.log();
        (0, logger_1.log)(`  ${(0, logger_1.c)('cyan', 'init'.padEnd(16))}  ${(0, logger_1.c)('gray', 'Start a new marathon (init "spec")')}`);
        (0, logger_1.log)(`  ${(0, logger_1.c)('cyan', 'status'.padEnd(16))}  ${(0, logger_1.c)('gray', 'Show progress dashboard')}`);
        (0, logger_1.log)(`  ${(0, logger_1.c)('cyan', 'next'.padEnd(16))}  ${(0, logger_1.c)('gray', 'Show next unfinished feature')}`);
        (0, logger_1.log)(`  ${(0, logger_1.c)('cyan', 'mark'.padEnd(16))}  ${(0, logger_1.c)('gray', 'Mark feature pass/fail (mark <id> pass)')}`);
        (0, logger_1.log)(`  ${(0, logger_1.c)('cyan', 'log'.padEnd(16))}  ${(0, logger_1.c)('gray', 'Add a progress note')}`);
        (0, logger_1.log)(`  ${(0, logger_1.c)('cyan', 'session-start'.padEnd(16))}  ${(0, logger_1.c)('gray', 'Begin a new work session')}`);
        (0, logger_1.log)(`  ${(0, logger_1.c)('cyan', 'session-end'.padEnd(16))}  ${(0, logger_1.c)('gray', 'End session with summary')}`);
        (0, logger_1.log)(`  ${(0, logger_1.c)('cyan', 'add-feature'.padEnd(16))}  ${(0, logger_1.c)('gray', 'Add feature: "category" "desc" "step1" ...')}`);
        (0, logger_1.log)(`  ${(0, logger_1.c)('cyan', 'reset'.padEnd(16))}  ${(0, logger_1.c)('gray', 'Archive and start fresh')}`);
        console.log();
        return;
    }
    const marathonScript = path_1.default.join(agentDest, 'scripts', 'marathon_harness.js');
    try {
        await (0, helpers_1.runShellAsync)(`node "${marathonScript}" ${argsStr}`, { stdio: 'inherit', cwd: targetDir });
    }
    catch {
        process.exit(1);
    }
}
