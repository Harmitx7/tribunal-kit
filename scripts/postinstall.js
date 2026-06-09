#!/usr/bin/env node
/**
 * postinstall.js — Binary Download Script
 * 
 * After `npm install`, this script downloads the pre-compiled Rust binary
 * for the user's platform from the latest GitHub Release.
 * 
 * If the download fails (offline, unsupported platform, etc.), it's a soft failure.
 * The wrapper.js will detect the missing binary and fall back to the JS engine.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');
const crypto = require('crypto');

const PKG = require(path.resolve(__dirname, '..', 'package.json'));
const VERSION = PKG.version;

const BINARY_DIR = path.resolve(__dirname, '..', 'bin');
const REPO = 'Harmitx7/tribunal-kit';

function getPlatformBinary() {
    const platform = os.platform();
    const arch = os.arch();

    const map = {
        'win32-x64':    'tribunal-core-win-x64.exe',
        'win32-arm64':  'tribunal-core-win-arm64.exe',
        'darwin-x64':   'tribunal-core-darwin-x64',
        'darwin-arm64': 'tribunal-core-darwin-arm64',
        'linux-x64':    'tribunal-core-linux-x64',
        'linux-arm64':  'tribunal-core-linux-arm64',
    };

    const key = `${platform}-${arch}`;
    return map[key] || null;
}

function getLocalBinaryPath() {
    const isWindows = os.platform() === 'win32';
    return path.join(BINARY_DIR, `tribunal-core${isWindows ? '.exe' : ''}`);
}

function download(url) {
    return new Promise((resolve, reject) => {
        const request = https.get(url, { headers: { 'User-Agent': `tribunal-kit/${VERSION}` } }, (res) => {
            // Handle redirects (GitHub sends 302 to the actual download URL)
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                download(res.headers.location).then(resolve).catch(reject);
                return;
            }

            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }

            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
        });

        request.on('error', reject);
        request.setTimeout(30000, () => { request.destroy(); reject(new Error('Timeout')); });
    });
}

async function main() {
    const binaryName = getPlatformBinary();

    if (!binaryName) {
        console.log(`[tribunal-kit] No pre-built binary for ${os.platform()}-${os.arch()}. Using JS fallback.`);
        return;
    }

    const localPath = getLocalBinaryPath();

    // Skip if binary already exists (e.g. dev environment with cargo build)
    if (fs.existsSync(localPath)) {
        return;
    }

    const url = `https://github.com/${REPO}/releases/download/v${VERSION}/${binaryName}`;
    const checksumsUrl = `https://github.com/${REPO}/releases/download/v${VERSION}/checksums.txt`;
    
    console.log(`[tribunal-kit] Downloading native binary for ${os.platform()}-${os.arch()}...`);

    try {
        // 1. Download checksums file
        const checksumsData = await download(checksumsUrl);
        const checksumsText = checksumsData.toString('utf-8');
        
        // 2. Extract expected hash
        const hashMatch = checksumsText.split('\n').find(line => line.includes(binaryName));
        if (!hashMatch) {
            throw new Error(`Checksum for ${binaryName} not found in checksums.txt`);
        }
        const expectedHash = hashMatch.split(' ')[0].trim();

        // 3. Download binary
        const data = await download(url);

        // 4. Verify checksum
        const actualHash = crypto.createHash('sha256').update(data).digest('hex');
        if (actualHash !== expectedHash) {
            throw new Error(`Checksum mismatch! Expected ${expectedHash}, got ${actualHash}. Potential tamper detected.`);
        }

        // 5. Write to disk
        fs.writeFileSync(localPath, data);

        // Make executable on Unix
        if (os.platform() !== 'win32') {
            fs.chmodSync(localPath, 0o755);
        }

        console.log(`[tribunal-kit] Native binary installed and verified successfully.`);
    } catch (e) {
        // Soft failure — wrapper.js will use the JS engine
        console.log(`[tribunal-kit] Binary download skipped (${e.message}). Using JS fallback.`);
    }
}

main();
