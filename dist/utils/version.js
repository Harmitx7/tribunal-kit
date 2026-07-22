"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareSemver = compareSemver;
exports.fetchLatestVersion = fetchLatestVersion;
exports.autoUpdateCheck = autoUpdateCheck;
const https_1 = __importDefault(require("https"));
const _child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const logger_1 = require("./logger");

// Cache TTL: 1 hour (in milliseconds)
const CACHE_TTL_MS = 60 * 60 * 1000;

function getCachePath() {
    return path_1.default.join(os_1.default.homedir(), '.tribunal-kit-update-cache.json');
}

/**
 * Read cached version check result.
 * Returns { version, timestamp } or null if cache is missing/expired/corrupt.
 */
function readCache() {
    try {
        const cachePath = getCachePath();
        if (!fs_1.default.existsSync(cachePath)) return null;
        const raw = fs_1.default.readFileSync(cachePath, 'utf8');
        const data = JSON.parse(raw);
        if (!data.version || !data.timestamp) return null;
        // Check TTL
        if (Date.now() - data.timestamp > CACHE_TTL_MS) return null;
        return data;
    } catch {
        return null;
    }
}

/**
 * Write version check result to cache.
 */
function writeCache(version) {
    try {
        const cachePath = getCachePath();
        fs_1.default.writeFileSync(cachePath, JSON.stringify({
            version,
            timestamp: Date.now()
        }), 'utf8');
    } catch {
        // Cache write failure is non-critical — silently ignore
    }
}

/**
 * Compare two semver strings. Returns:
 *   1 if a > b, -1 if a < b, 0 if equal.
 */
function compareSemver(a, b) {
    const pa = a.replace(/^v/, '').split('.').map(Number);
    const pb = b.replace(/^v/, '').split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        const na = pa[i] || 0;
        const nb = pb[i] || 0;
        if (na > nb)
            return 1;
        if (na < nb)
            return -1;
    }
    return 0;
}
/**
 * Fetch the latest version from npm registry.
 * Returns the version string (e.g. '4.0.0') or null on failure.
 * Uses a 1-hour TTL cache to avoid redundant network calls.
 */
function fetchLatestVersion(currentVersion) {
    // Check cache first
    const cached = readCache();
    if (cached) {
        return Promise.resolve(cached.version);
    }

    return new Promise((resolve) => {
        const req = https_1.default.get('https://registry.npmjs.org/tribunal-kit/latest', {
            headers: {
                'Accept': 'application/json',
                'User-Agent': `tribunal-kit/${currentVersion}`
            },
            timeout: 3000  // Reduced from 5s to 3s for faster fallback
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const version = json.version || null;
                    if (version) writeCache(version);
                    resolve(version);
                }
                catch {
                    resolve(null);
                }
            });
        });
        req.on('error', () => resolve(null));
        req.on('timeout', () => { req.destroy(); resolve(null); });
    });
}

/**
 * Non-blocking update check.
 * 
 * PERF: Instead of blocking the command while checking for updates,
 * this fires the HTTP request and shows the result AFTER the command completes.
 * The check runs concurrently with command execution, adding zero latency.
 * 
 * Returns true if a re-invoke happened (caller should exit), false otherwise.
 */
async function autoUpdateCheck(originalArgs, currentVersion) {
    // Recursion guard: if we're already a re-invoked process, skip
    if (process.env.TK_SKIP_UPDATE_CHECK === '1') {
        return false;
    }

    // Fire the fetch but DON'T await it immediately — let the command run first
    const versionPromise = fetchLatestVersion(currentVersion);

    // Register a process.on('beforeExit') hook to show the update notification
    // AFTER the command has finished executing
    process.on('beforeExit', async () => {
        try {
            const latestVersion = await versionPromise;
            if (!latestVersion) return;
            if (compareSemver(latestVersion, currentVersion) <= 0) return;

            // Show a non-intrusive update notification
            console.log();
            console.log((0, logger_1.colorize)('cyan', `  ⬆ Update available: ${(0, logger_1.colorize)('bold', currentVersion)} → ${(0, logger_1.colorize)('bold', latestVersion)}`));
            console.log((0, logger_1.colorize)('gray', `  Run: npx tribunal-kit@${latestVersion} init --force`));
            console.log();
        } catch {
            // Silently ignore — update notification is non-critical
        }
    });

    return false; // Never block — always let the command proceed
}
