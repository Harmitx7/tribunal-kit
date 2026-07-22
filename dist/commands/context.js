"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cmdContext = cmdContext;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../utils/logger");
function cmdContext(flags, processArgs) {
    const targetDir = flags.path ? path_1.default.resolve(flags.path) : process.cwd();
    const agentDest = path_1.default.join(targetDir, '.agent');
    if (!fs_1.default.existsSync(agentDest)) {
        (0, logger_1.err)('.agent/ not found. Run: npx tribunal-kit init');
        process.exit(1);
    }
    const args = processArgs.slice(3);
    if (args.length === 0 || args[0] === 'help' || args[0] === '--help') {
        console.error('Usage: npx tribunal-kit context <target_file>');
        process.exit(1);
    }
    const targetFile = args[0].replace(/\\/g, '/');
    const snapshotName = targetFile.replace(/[\\\/]/g, '__') + '.json';
    const snapshotPath = path_1.default.join(agentDest, 'history', 'snapshots', snapshotName);
    if (!fs_1.default.existsSync(snapshotPath)) {
        console.error('  \x1b[91m✖\x1b[0m Context Snapshot not found for: ' + targetFile);
        console.log('    Run: npx tribunal-kit graph  (to generate snapshots)');
        process.exit(1);
    }
    try {
        const snapshot = JSON.parse(fs_1.default.readFileSync(snapshotPath, 'utf8'));
        console.log('\n# Context Snapshot: ' + snapshot.file);
        process.stdout.write('> Size Estimate: ' + (snapshot['estimatedTokens'] || 'Unknown') + '\n');
        console.log('> Risk Score: ' + snapshot.riskScore + ' (Blast Radius: ' + snapshot.blastRadius + ')\n');
        if (Object.keys(snapshot.imports).length > 0) {
            console.log('## Imports');
            for (const [imp, exports] of Object.entries(snapshot.imports)) {
                if (Array.isArray(exports) && exports.length > 0) {
                    console.log('- `' + imp + '` (exports: ' + exports.join(', ') + ')');
                }
                else {
                    console.log('- `' + imp + '`');
                }
            }
            console.log();
        }
        if (snapshot.dependents && snapshot.dependents.length > 0) {
            console.log('## Dependents');
            for (const dep of snapshot.dependents) {
                console.log('- `' + dep + '`');
            }
            console.log();
        }
        console.log('## Source Code');
        console.log('```javascript\n' + snapshot.content + '\n```\n');
    }
    catch (e) {
        if (e instanceof Error) {
            console.error('Failed to read snapshot: ' + e.message);
        }
        else {
            console.error('Failed to read snapshot: ' + String(e));
        }
        process.exit(1);
    }
}
