"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runShellAsync = runShellAsync;
exports.getKitAgent = getKitAgent;
exports.banner = banner;
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("./logger");
function runShellAsync(command, options) {
    return new Promise((resolve, reject) => {
        const child = (0, child_process_1.spawn)(command, [], { ...options, shell: true });
        child.on('close', code => {
            if (code !== 0)
                reject(new Error(`Command failed with exit code ${code}`));
            else
                resolve();
        });
        child.on('error', reject);
    });
}
function getKitAgent() {
    // When installed via npm, the .agent/ folder is next to this script's package (two directories up from dist/commands)
    // In src/utils, __dirname is .../src/utils. We go up to src, then to root. So path.resolve(__dirname, '../../.agent')
    const kitRoot = path_1.default.resolve(__dirname, '../..');
    const agentDir = path_1.default.join(kitRoot, '.agent');
    if (!fs_1.default.existsSync(agentDir)) {
        (0, logger_1.err)(`Kit .agent/ folder not found at: ${agentDir}`);
        (0, logger_1.err)('The package may be corrupted. Try: npm install -g tribunal-kit');
        process.exit(1);
    }
    return agentDir;
}
function banner(quiet) {
    if (quiet)
        return;
    // Big ASCII art (TRIBUNAL-KIT)
    const art = String.raw `
████████╗██████╗ ██╗██████╗ ██╗   ██╗███╗   ██╗ █████╗ ██╗      ██╗  ██╗██╗████████╗
╚══██╔══╝██╔══██╗██║██╔══██╗██║   ██║████╗  ██║██╔══██╗██║      ██║ ██╔╝██║╚══██╔══╝
   ██║   ██████╔╝██║██████╔╝██║   ██║██╔██╗ ██║███████║██║█████╗█████╔╝ ██║   ██║   
   ██║   ██╔══██╗██║██╔══██╗██║   ██║██║╚██╗██║██╔══██║██║╚════╝██╔═██╗ ██║   ██║   
   ██║   ██║  ██║██║██████╔╝╚██████╔╝██║ ╚████║██║  ██║███████╗ ██║  ██╗██║   ██║   
   ╚═╝   ╚═╝  ╚═╝╚═╝╚═════╝  ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝ ╚═╝  ╚═╝╚═╝   ╚═╝   `.split('\n').filter(Boolean);
    console.log();
    for (const line of art) {
        let gradientLine = '  \x1b[1m';
        const len = line.length;
        for (let i = 0; i < len; i++) {
            const char = line[i];
            if (char === ' ') {
                gradientLine += ' ';
                continue;
            }
            // Horizontal gradient: flame red (left) to coral/orange (right)
            const ratio = i / len;
            const r = 255;
            const g = Math.floor(30 + ratio * 100);
            const b = Math.floor(60 - ratio * 40);
            gradientLine += `\x1b[38;2;${r};${g};${b}m${char}`;
        }
        gradientLine += '\x1b[0m';
        (0, logger_1.log)(gradientLine);
    }
    console.log();
    // Subtitle strip
    const W = 84;
    const plainSub = '🛡️  ANTI-HALLUCINATION AGENT SYSTEM';
    const coloredSub = `${(0, logger_1.bold)((0, logger_1.c)('white', '🛡️  ANTI-HALLUCINATION AGENT SYSTEM'))}`;
    const sp = Math.max(0, W - plainSub.length);
    const centred = ' '.repeat(Math.floor(sp / 2)) + coloredSub + ' '.repeat(Math.ceil(sp / 2));
    (0, logger_1.log)(`  ${(0, logger_1.c)('gray', `✦  ${'━'.repeat(W - 6)}  ✦`)}`);
    (0, logger_1.log)(`  ${centred}`);
    (0, logger_1.log)(`  ${(0, logger_1.c)('gray', `✦  ${'━'.repeat(W - 6)}  ✦`)}`);
    console.log();
}

