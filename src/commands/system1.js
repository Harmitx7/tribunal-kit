"use strict";

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const child_process = require('child_process');
const { log, err, dim, c, bold } = require('../utils/logger');
const { getLayaDir, getConfigPath } = require('../system1/provider');

function verifyChecksum(filePath, expectedHash) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(filePath)) {
            return reject(new Error(`File missing: ${filePath}`));
        }
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('data', (data) => hash.update(data));
        stream.on('end', () => {
            const actual = hash.digest('hex');
            if (actual === expectedHash) {
                resolve(true);
            } else {
                reject(new Error(`Hash mismatch for ${path.basename(filePath)}.\nExpected: ${expectedHash}\nActual:   ${actual}`));
            }
        });
        stream.on('error', (err) => reject(err));
    });
}

// Pinned dependencies for reproducible installations
const RECEPTRON_LAYA_VERSION = "0.1.2";
const ONNXRUNTIME_NODE_VERSION = "1.22.0";



async function cmdSystem1Enable(quiet) {
    const layaDir = getLayaDir();
    const configPath = getConfigPath();
    const modelsDir = path.join(layaDir, 'models');
    
    if (!quiet) {
        log(`\n  ${c('cyan', '⚡')} ${bold('Tribunal Kit Laya System-1 Initialization')}`);
        dim('  --------------------------------------------------');
        dim('  This will install the local Laya ONNX decision engine.');
        dim('  - Engine: @receptron/laya & onnxruntime-node');
        dim('  - Model: convaiinnovations/laya (~1.7GB)');
        dim(`  - Path: ${layaDir}`);
        log('');
    }

    if (process.env.TK_MOCK_LAYA_DOWNLOAD) {
        if (!fs.existsSync(layaDir)) fs.mkdirSync(layaDir, { recursive: true });
        if (!fs.existsSync(modelsDir)) fs.mkdirSync(modelsDir, { recursive: true });
        fs.writeFileSync(path.join(modelsDir, 'laya.onnx'), 'mock');
        fs.writeFileSync(configPath, JSON.stringify({ enabled: true, mocked: true }));
        if (!quiet) log(`  ${c('green', '✓')} System-1 successfully mocked!`);
        return;
    }

    try {
        if (!fs.existsSync(layaDir)) fs.mkdirSync(layaDir, { recursive: true });
        if (!fs.existsSync(modelsDir)) fs.mkdirSync(modelsDir, { recursive: true });

        // 1. Install @receptron/laya with strictly reproducible dependency tree
        if (!quiet) log(`  ${c('yellow', '1.')} Installing local runtime dependency (clean install)...`);
        
        fs.copyFileSync(path.join(__dirname, '../system1/laya-package.json'), path.join(layaDir, 'package.json'));
        fs.copyFileSync(path.join(__dirname, '../system1/laya-package-lock.json'), path.join(layaDir, 'package-lock.json'));
        
        // Validate layaDir to prevent shell injection on Windows
        if (/[&|";<>]/.test(layaDir)) {
            throw new Error(`Invalid path characters in Laya directory: ${layaDir}`);
        }

        // Use npm prefix to isolate installation
        const npmExec = process.platform === 'win32' ? 'npm.cmd' : 'npm';
        child_process.execFileSync(npmExec, [
            'ci',
            '--prefix', layaDir,
            '--no-audit',
            '--no-fund'
        ], {
            stdio: quiet ? 'ignore' : 'pipe',
            shell: process.platform === 'win32'
        });

        // 2. Download model safely without initializing ONNX Runtime
        if (!quiet) log(`  ${c('yellow', '2.')} Downloading model weights (~1.7GB, this may take a while)...`);
        
        const layaPkgPath = path.join(layaDir, 'node_modules', '@receptron', 'laya');
        const { Laya, ensureBundle } = require(layaPkgPath);
        
        // This natively downloads via huggingface_hub using pinned commit SHA
        const revision = "68f27dfe5a27a54fb2b1fefc432f43f972e90868";
        const downloadedModelDir = await ensureBundle({
            repo: "receptron/laya-onnx",
            revision: revision,
            cacheDir: modelsDir
        });

        // 3. Verify SHA-256 for artifacts BEFORE consumption
        if (!quiet) log(`  ${c('yellow', '3.')} Verifying artifact integrity (SHA-256)...`);
        
        const expectedHashes = {
            'laya.onnx': 'a874eb254b58b0fcb1e7ad56fbb188c29d64e08c9a46b689433e1f52c66dba1e',
            'laya.onnx.data': '487746363a8da57bcadb4345352997d22a0fb90d70aa22c6856668d023242aba'
        };

        for (const [filename, expectedHash] of Object.entries(expectedHashes)) {
            const artifactPath = path.join(downloadedModelDir, filename);
            try {
                await verifyChecksum(artifactPath, expectedHash);
            } catch (err) {
                // If validation fails, completely purge the corrupted installation to prevent bypass
                fs.rmSync(layaDir, { recursive: true, force: true });
                throw new Error(`Integrity check failed: ${err.message}\nInstallation aborted and quarantined.`);
            }
        }
        
        // Also ensure tokenizer files exist
        for (const filename of ['tokenizer/tokenizer.json', 'tokenizer/tokenizer_config.json']) {
            if (!fs.existsSync(path.join(downloadedModelDir, filename))) {
                fs.rmSync(layaDir, { recursive: true, force: true });
                throw new Error(`Integrity check failed: Missing ${filename}`);
            }
        }

        // 4. Initialize model safely (only after verification)
        if (!quiet) log(`  ${c('yellow', '4.')} Initializing model...`);
        const laya = await Laya.load({
            modelDir: downloadedModelDir,
            executionProviders: ["cpu"]
        });
        await laya.close();

        // 4. Save config
        fs.writeFileSync(configPath, JSON.stringify({
            enabled: true,
            model_version: "v1.0.0",
            checksum_verified: true,
            installed_at: new Date().toISOString()
        }, null, 2));

        if (!quiet) {
            log(`\n  ${c('green', '✓')} System-1 successfully enabled!`);
            dim(`  Impact tier resolution will now use local inference.`);
        }
    } catch (error) {
        err(`\n  ✖ Failed to enable System-1: ${error.message}`);
        process.exitCode = 1;
    }
}

function cmdSystem1Disable(quiet) {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            config.enabled = false;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            if (!quiet) log(`  ${c('green', '✓')} System-1 has been disabled (installation kept intact).`);
        } catch {
            if (!quiet) err(`  ✖ Failed to parse System-1 config.`);
            process.exitCode = 1;
        }
    } else {
        if (!quiet) dim(`  System-1 is not currently installed.`);
    }
}

function cmdSystem1Status(quiet) {
    const configPath = getConfigPath();
    const layaDir = getLayaDir();
    const modelPath = path.join(layaDir, 'models', 'laya.onnx');
    const runtimePath = path.join(layaDir, 'node_modules', '@receptron', 'laya');
    
    let config = null;
    if (fs.existsSync(configPath)) {
        try { config = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch {}
    }

    if (!quiet) {
        log(`\n  ${bold('System-1 Status')}`);
        dim('  --------------------------------------------------');
        log(`  Provider:      ${c('white', 'Laya (ONNX CPU)')}`);
        log(`  Enabled:       ${config?.enabled ? c('green', 'Yes') : c('yellow', 'No')}`);
        log(`  Config path:   ${configPath}`);
        log(`  Model found:   ${fs.existsSync(modelPath) ? c('green', 'Yes') : c('red', 'No')}`);
        log(`  Runtime found: ${fs.existsSync(runtimePath) ? c('green', 'Yes') : c('red', 'No')}`);
        log('');
    }
}

function cmdSystem1Clean(quiet) {
    const layaDir = getLayaDir();
    if (fs.existsSync(layaDir)) {
        fs.rmSync(layaDir, { recursive: true, force: true });
        if (!quiet) log(`  ${c('green', '✓')} System-1 installation completely removed.`);
    } else {
        if (!quiet) dim(`  System-1 is not installed.`);
    }
}

async function cmdSystem1(flags, args, quiet) {
    const rawArgs = args.slice(2);
    const subCommand = rawArgs.find(a => !a.startsWith('-') && a !== 'system1');
    
    switch (subCommand) {
        case 'enable':
            await cmdSystem1Enable(quiet);
            break;
        case 'disable':
            cmdSystem1Disable(quiet);
            break;
        case 'status':
            cmdSystem1Status(quiet);
            break;
        case 'clean':
            cmdSystem1Clean(quiet);
            break;
        default:
            err(`Unknown system1 command: "${subCommand || ''}"`);
            dim('Available: enable, disable, status, clean');
            process.exitCode = 1;
    }
}

module.exports = {
    cmdSystem1
};
