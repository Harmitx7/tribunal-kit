"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cmdSync = cmdSync;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../utils/logger");
const init_1 = require("./init");
async function cmdSync() {
    console.log(`\n╭─ ${(0, logger_1.c)('bold', 'Tribunal IDE Sync')} ──────────────────`);
    console.log('│');
    console.log(`│  ${(0, logger_1.c)('gray', '✦ Regenerating IDE bridge files...')}`);
    const cwd = process.cwd();
    const agentDest = path_1.default.join(cwd, '.agent');
    if (!fs_1.default.existsSync(agentDest)) {
        console.error(`│  ${(0, logger_1.c)('red', '✖ Error: .agent/ directory not found.')}`);
        console.error(`│  ${(0, logger_1.c)('gray', 'Run `tk init` first.')}`);
        process.exit(1);
    }
    await (0, init_1.generateIDEBridges)(cwd, agentDest, false);
    console.log(`│  ${(0, logger_1.c)('green', '✔ Sync complete.')}`);
    console.log('╰────────────────────────────────────────\n');
}
