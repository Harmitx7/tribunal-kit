"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateManifest = generateManifest;
exports.readManifest = readManifest;
exports.writeManifest = writeManifest;
exports.diffManifests = diffManifests;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));

const MANIFEST_FILE = '.manifest.json';

/**
 * Compute SHA-256 hash of a file's contents.
 * Uses streaming to handle large files without high memory usage.
 */
async function hashFile(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto_1.default.createHash('sha256');
        const stream = fs_1.default.createReadStream(filePath);
        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
}

/**
 * Walk a directory recursively and generate a hash manifest.
 * Returns an object mapping relative file paths to their SHA-256 hashes.
 * 
 * @param {string} dir - The directory to walk
 * @param {string} [baseDir] - The base directory for computing relative paths
 * @returns {Promise<Record<string, string>>} Map of relative paths to SHA-256 hashes
 */
async function generateManifest(dir, baseDir) {
    if (!baseDir) baseDir = dir;
    const manifest = {};

    if (!fs_1.default.existsSync(dir)) return manifest;

    const entries = await fs_1.default.promises.readdir(dir, { withFileTypes: true });

    // Process files in parallel batches
    const BATCH_SIZE = 32;
    const files = [];
    const dirs = [];

    for (const entry of entries) {
        const fullPath = path_1.default.join(dir, entry.name);
        if (entry.name === '.backups' || entry.name === '.manifest.json' || entry.name === 'history') {
            continue; // Skip backup dirs, manifest, and history
        }
        if (entry.isDirectory()) {
            dirs.push(fullPath);
        } else {
            files.push(fullPath);
        }
    }

    // Hash files in parallel batches
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(batch.map(async (filePath) => {
            const relativePath = path_1.default.relative(baseDir, filePath).replace(/\\/g, '/');
            const hash = await hashFile(filePath);
            return { relativePath, hash };
        }));
        for (const { relativePath, hash } of results) {
            manifest[relativePath] = hash;
        }
    }

    // Recurse into directories in parallel
    const dirResults = await Promise.all(
        dirs.map(d => generateManifest(d, baseDir))
    );
    for (const dirManifest of dirResults) {
        Object.assign(manifest, dirManifest);
    }

    return manifest;
}

/**
 * Read an existing manifest from the .agent directory.
 * Returns null if no manifest exists.
 */
function readManifest(agentDir) {
    const manifestPath = path_1.default.join(agentDir, MANIFEST_FILE);
    try {
        if (!fs_1.default.existsSync(manifestPath)) return null;
        const raw = fs_1.default.readFileSync(manifestPath, 'utf8');
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

/**
 * Write a manifest to the .agent directory.
 */
function writeManifest(agentDir, manifest) {
    const manifestPath = path_1.default.join(agentDir, MANIFEST_FILE);
    fs_1.default.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
}

/**
 * Compare two manifests and return the diff.
 * 
 * @param {Record<string, string>} oldManifest - Previously installed manifest
 * @param {Record<string, string>} newManifest - Source manifest
 * @returns {{ added: string[], changed: string[], removed: string[], unchanged: number }}
 */
function diffManifests(oldManifest, newManifest) {
    const added = [];
    const changed = [];
    const removed = [];
    let unchanged = 0;

    // Find added and changed files
    for (const [path, hash] of Object.entries(newManifest)) {
        if (!(path in oldManifest)) {
            added.push(path);
        } else if (oldManifest[path] !== hash) {
            changed.push(path);
        } else {
            unchanged++;
        }
    }

    // Find removed files
    for (const path of Object.keys(oldManifest)) {
        if (!(path in newManifest)) {
            removed.push(path);
        }
    }

    return { added, changed, removed, unchanged };
}
