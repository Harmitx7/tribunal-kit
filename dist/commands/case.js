"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cmdCase = cmdCase;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../utils/logger");
const helpers_1 = require("../utils/helpers");
async function cmdCase(flags, processArgs, quiet = false) {
    const targetDir = flags.path ? path_1.default.resolve(flags.path) : process.cwd();
    const agentDest = path_1.default.join(targetDir, '.agent');
    if (!fs_1.default.existsSync(agentDest)) {
        (0, logger_1.err)('.agent/ not found. Run: npx tribunal-kit init');
        process.exit(1);
    }
    const args = processArgs.slice(3).join(' ');
    if (!args || args === 'help' || args === '--help' || args === '-h') {
        (0, helpers_1.banner)(quiet);
        (0, logger_1.log)(`  ${(0, logger_1.c)('cyan', '\u2554' + '\u2550'.repeat(60) + '\u2557')}`);
        (0, logger_1.log)(`  ${(0, logger_1.c)('cyan', '\u2551')}${(0, logger_1.bold)((0, logger_1.c)('white', '  Tribunal Case Law Engine \u2014 Supreme Court             '))}${(0, logger_1.c)('cyan', '\u2551')}`);
        (0, logger_1.log)(`  ${(0, logger_1.c)('cyan', '\u255a' + '\u2550'.repeat(60) + '\u255d')}`);
        console.log();
        (0, logger_1.log)(`  ${(0, logger_1.c)('cyan', 'add'.padEnd(10))}  ${(0, logger_1.c)('gray', 'Record a new Case Law rejection pattern')}`);
        (0, logger_1.log)(`  ${(0, logger_1.c)('cyan', 'search'.padEnd(10))}  ${(0, logger_1.c)('gray', 'Search existing cases (e.g., search "query")')}`);
        (0, logger_1.log)(`  ${(0, logger_1.c)('cyan', 'list'.padEnd(10))}  ${(0, logger_1.c)('gray', 'List all recorded case law')}`);
        (0, logger_1.log)(`  ${(0, logger_1.c)('cyan', 'show'.padEnd(10))}  ${(0, logger_1.c)('gray', 'Show full diff for a case (e.g., show --id 1)')}`);
        (0, logger_1.log)(`  ${(0, logger_1.c)('cyan', 'stats'.padEnd(10))}  ${(0, logger_1.c)('gray', 'Show case law stats by domain/verdict')}`);
        (0, logger_1.log)(`  ${(0, logger_1.c)('cyan', 'export'.padEnd(10))}  ${(0, logger_1.c)('gray', 'Export all cases to Markdown')}`);
        (0, logger_1.log)(`  ${(0, logger_1.c)('cyan', 'overrule'.padEnd(10))}  ${(0, logger_1.c)('gray', 'Overrule a past precedent (e.g., overrule --id 1)')}`);
        console.log();
        process.exit(1);
    }
    const caseLawScript = path_1.default.join(agentDest, 'scripts', 'case_law_manager.js');
    // Make shorthand aliases
    let pyArgs = args;
    if (pyArgs.startsWith('add'))
        pyArgs = pyArgs.replace(/^add/, 'add-case');
    if (pyArgs.startsWith('search'))
        pyArgs = pyArgs.replace(/^search/, 'search-cases');
    try {
        await (0, helpers_1.runShellAsync)(`node "${caseLawScript}" ${pyArgs}`, { stdio: 'inherit', cwd: targetDir });
        // Memory Bridge: When a case is added, auto-store a SEMANTIC memory
        if (args.startsWith('add')) {
            try {
                const { _memoryStore } = require('./memory');
                // Extract a summary from the add-case args (best effort)
                const contentMatch = args.match(/--violation\s+"([^"]+)"/i) || args.match(/--violation\s+(\S+)/i);
                const domainMatch = args.match(/--domain\s+"([^"]+)"/i) || args.match(/--domain\s+(\S+)/i);
                const violation = contentMatch ? contentMatch[1] : 'Unknown violation';
                const domain = domainMatch ? domainMatch[1] : 'general';
                _memoryStore(
                    agentDest,
                    'semantic',
                    `CASE LAW REJECTION: ${violation} (domain: ${domain})`,
                    ['case-law', domain, 'rejection'],
                    null
                );
                if (!quiet) {
                    (0, logger_1.log)(`  ${(0, logger_1.c)('cyan', '\u25b8')} Memory bridge: case law rejection stored to memory index`);
                }
            } catch {
                // Non-critical — case law was still saved, memory bridge is a bonus
            }
        }
    }
    catch {
        process.exit(1); // Script already prints errors
    }
}
