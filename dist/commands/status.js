"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cmdStatus = cmdStatus;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../utils/logger");
const helpers_1 = require("../utils/helpers");
function cmdStatus(flags, quiet = false) {
    const targetDir = flags.path ? path_1.default.resolve(flags.path) : process.cwd();
    const agentDest = path_1.default.join(targetDir, '.agent');
    (0, helpers_1.banner)(quiet);
    if (!fs_1.default.existsSync(agentDest)) {
        (0, logger_1.log)(`  ${(0, logger_1.c)('red', '✖')} ${(0, logger_1.bold)('Not installed')} in this project`);
        console.log();
        (0, logger_1.log)(`  ${(0, logger_1.c)('gray', 'Run:')} ${(0, logger_1.c)('cyan', 'npx tribunal-kit init')}`);
        console.log();
        return;
    }
    (0, logger_1.log)(`  ${(0, logger_1.c)('green', '✔')} ${(0, logger_1.bold)((0, logger_1.c)('green', 'Installed'))}  ${(0, logger_1.c)('gray', '→')}  ${(0, logger_1.c)('gray', agentDest)}`);
    console.log();
    const icons = { agents: '🤖', workflows: '⚡', skills: '🧠', scripts: '🔧' };
    const colors = { agents: 'magenta', workflows: 'yellow', skills: 'blue', scripts: 'green' };
    const subdirs = ['agents', 'workflows', 'skills', 'scripts'];
    for (const sub of subdirs) {
        const subPath = path_1.default.join(agentDest, sub);
        if (fs_1.default.existsSync(subPath)) {
            const count = fs_1.default.readdirSync(subPath).filter(f => !fs_1.default.statSync(path_1.default.join(subPath, f)).isDirectory()).length;
            (0, logger_1.log)(`  ${icons[sub]}  ${(0, logger_1.c)(colors[sub], sub.padEnd(12))}${(0, logger_1.c)('white', String(count).padStart(3))} files`);
        }
    }
    console.log();
}
