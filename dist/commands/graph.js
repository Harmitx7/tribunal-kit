"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cmdGraph = cmdGraph;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../utils/logger");
const helpers_1 = require("../utils/helpers");
async function cmdGraph(flags, quiet = false) {
    const targetDir = flags.path ? path_1.default.resolve(flags.path) : process.cwd();
    const agentDest = path_1.default.join(targetDir, '.agent');
    if (!fs_1.default.existsSync(agentDest)) {
        (0, logger_1.err)('.agent/ not found. Run: npx tribunal-kit init');
        process.exit(1);
    }
    (0, helpers_1.banner)(quiet);
    const builderScript = path_1.default.join(agentDest, 'scripts', 'graph_builder.js');
    const visualizerScript = path_1.default.join(agentDest, 'scripts', 'graph_visualizer.js');
    const htmlFile = path_1.default.join(agentDest, 'history', 'architecture-explorer.html');
    try {
        await (0, helpers_1.runShellAsync)(`node "${builderScript}"`, { stdio: 'inherit', cwd: targetDir });
        await (0, helpers_1.runShellAsync)(`node "${visualizerScript}"`, { stdio: 'inherit', cwd: targetDir });
        (0, logger_1.log)(`  ${(0, logger_1.c)('cyan', '▸')} Opening visualizer in browser...`);
        const opener = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
        await (0, helpers_1.runShellAsync)(`${opener} "${htmlFile}"`, { stdio: 'ignore' });
    }
    catch (e) {
        if (e instanceof Error) {
            (0, logger_1.err)(`Graph generation failed: ${e.message}`);
        }
        else {
            (0, logger_1.err)(`Graph generation failed: ${String(e)}`);
        }
        process.exit(1);
    }
}
