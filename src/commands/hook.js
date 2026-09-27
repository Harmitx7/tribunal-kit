"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cmdHook = cmdHook;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../utils/logger");
function cmdHook(flags) {
    const targetDir = flags.path ? path_1.default.resolve(flags.path) : process.cwd();
    const gitDir = path_1.default.join(targetDir, '.git');
    if (!fs_1.default.existsSync(gitDir)) {
        (0, logger_1.err)('Not a git repository. Cannot install git hooks here.');
        process.exit(1);
    }
    const hooksDir = path_1.default.join(gitDir, 'hooks');
    if (!fs_1.default.existsSync(hooksDir)) {
        fs_1.default.mkdirSync(hooksDir, { recursive: true });
    }
    const prePushPath = path_1.default.join(hooksDir, 'pre-push');
    const hookScript = `#!/bin/sh\n# Supreme Court - Auto Learn on Push\necho "⚖️  Tribunal Supreme Court: Evolving Skills..."\nnpx tribunal-kit learn --head\necho "✦ Synchronizing IDE bridges..."\nnpx tribunal-kit sync\n`;
    fs_1.default.writeFileSync(prePushPath, hookScript, { mode: 0o755 });
    console.log();
    (0, logger_1.log)(`  ${(0, logger_1.c)('green', '✔')} Installed pre-push git hook.`);
    (0, logger_1.log)(`  ${(0, logger_1.c)('gray', '▸')} Skill Evolution and IDE Sync will now run automatically every time you git push.`);
    console.log();
}
