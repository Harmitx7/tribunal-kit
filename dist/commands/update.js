"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cmdUpdate = cmdUpdate;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../utils/logger");
const fs_2 = require("../utils/fs");
const init_1 = require("./init");
async function cmdUpdate(flags) {
    const pkgStr = fs_1.default.readFileSync(path_1.default.resolve(__dirname, '../../package.json'), 'utf8');
    const pkg = JSON.parse(pkgStr);
    // ── Self-install guard (early, before banner) ───────────
    const targetDir = flags.path ? path_1.default.resolve(flags.path) : process.cwd();
    if ((0, fs_2.isSelfInstall)(targetDir, pkg.name, path_1.default.resolve(__dirname, '../..'))) {
        (0, logger_1.err)('Cannot run update inside the tribunal-kit package itself.');
        (0, logger_1.err)(`Target: ${targetDir}`);
        console.log();
        (0, logger_1.dim)('This command is designed to update .agent/ in OTHER projects.');
        (0, logger_1.dim)('Run it from the root of the project you want to update:');
        (0, logger_1.dim)('  cd /path/to/your-project');
        (0, logger_1.dim)('  npx tribunal-kit update');
        console.log();
        process.exit(1);
    }
    // ────────────────────────────────────────────────────────
    const isQuiet = flags.quiet || false;
    // Update = init with --force
    flags.force = true;
    if (!isQuiet) {
        (0, logger_1.log)(`  ${(0, logger_1.c)('cyan', '↻')} ${(0, logger_1.bold)('Updating')} ${(0, logger_1.c)('white', '.agent/')} to latest version...`);
        console.log();
    }
    await (0, init_1.cmdInit)(flags, isQuiet);
}
