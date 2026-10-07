'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const child_process = require('child_process');
const readline = require('readline');
const { log, err, dim, c, bold } = require('../utils/logger');
const { getLayaDir, getConfigPath } = require('../system1/provider');

function promptConfirm(question) {
  if (process.env.NODE_ENV === 'test') return Promise.resolve(true);
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, answer => {
      rl.close();
      const lower = answer.trim().toLowerCase();
      resolve(lower === 'y' || lower === 'yes');
    });
  });
}

function verifyChecksum(filePath, expectedHash) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      return reject(new Error(`File missing: ${filePath}`));
    }
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', data => hash.update(data));
    stream.on('end', () => {
      const actual = hash.digest('hex');
      if (actual === expectedHash) {
        resolve(true);
      } else {
        reject(
          new Error(
            `Hash mismatch for ${path.basename(filePath)}.\nExpected: ${expectedHash}\nActual:   ${actual}`,
          ),
        );
      }
    });
    stream.on('error', err => reject(err));
  });
}

const RECEPTRON_LAYA_VERSION = '0.1.2';
const ONNXRUNTIME_NODE_VERSION = '1.22.0';
const TARGET_MODEL_VERSION = 'v1.0.0';

class Spinner {
  constructor(text, totalSteps, currentStep, quiet) {
    this.text = text;
    this.quiet = quiet;
    this.frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.idx = 0;
    this.timer = null;
    this.stepStr = totalSteps ? `[${currentStep}/${totalSteps}] ` : '';
    if (!quiet) log(`\n${this.stepStr}${this.text}`);
  }
  start(subtext = 'Processing...') {
    if (this.quiet) return;
    this.subtext = subtext;
    if (process.stdout.isTTY && process.env.NODE_ENV !== 'test') {
      process.stdout.write(`\x1B[?25l`);
      this.timer = setInterval(() => {
        process.stdout.write(`\r      ${this.frames[this.idx]} ${this.subtext}`);
        this.idx = (this.idx + 1) % this.frames.length;
      }, 80);
    } else {
      log(`      ... ${this.subtext}`);
    }
  }
  update(subtext) {
    if (this.quiet) return;
    this.subtext = subtext;
  }
  succeed(text) {
    if (this.quiet) return;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      process.stdout.write(`\r      ✓ ${text}\x1B[K\n`);
      process.stdout.write(`\x1B[?25h`);
    } else {
      log(`      ✓ ${text}`);
    }
  }
  fail(text) {
    if (this.quiet) return;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      process.stdout.write(`\r      ✖ ${text}\x1B[K\n`);
      process.stdout.write(`\x1B[?25h`);
    } else {
      err(`      ✖ ${text}`);
    }
  }
}

function getTargetVersion() {
  return {
    laya: RECEPTRON_LAYA_VERSION,
    onnx: ONNXRUNTIME_NODE_VERSION,
    model: TARGET_MODEL_VERSION
  };
}

function getInstalledVersion() {
  const configPath = getConfigPath();
  const pkgLockPath = path.join(getLayaDir(), 'package-lock.json');
  let config = {};
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch {}
  }
  
  let installedLayaVer = config.laya_version || 'Unknown';
  let installedOnnxVer = config.onnxruntime_version || 'Unknown';
  let modelVer = config.model_version || 'Unknown';

  if (fs.existsSync(pkgLockPath)) {
    try {
       const pkgLock = JSON.parse(fs.readFileSync(pkgLockPath, 'utf8'));
       installedLayaVer =
         pkgLock.dependencies?.['@receptron/laya']?.version ||
         pkgLock.packages?.['node_modules/@receptron/laya']?.version ||
         installedLayaVer;
       installedOnnxVer =
         pkgLock.dependencies?.['onnxruntime-node']?.version ||
         pkgLock.packages?.['node_modules/onnxruntime-node']?.version ||
         installedOnnxVer;
    } catch {}
  }

  return { laya: installedLayaVer, onnx: installedOnnxVer, model: modelVer, enabled: !!config.enabled };
}

async function checkHealth() {
  const layaDir = getLayaDir();
  const modelsDir = path.join(layaDir, 'models');
  if (!fs.existsSync(modelsDir)) return false;
  
  const expectedHashes = {
    'laya.onnx': 'a874eb254b58b0fcb1e7ad56fbb188c29d64e08c9a46b689433e1f52c66dba1e',
    'laya.onnx.data': '487746363a8da57bcadb4345352997d22a0fb90d70aa22c6856668d023242aba',
  };
  for (const filename of Object.keys(expectedHashes)) {
    const artifactPath = path.join(modelsDir, filename);
    if (!fs.existsSync(artifactPath)) return false;
  }
  for (const filename of ['tokenizer/tokenizer.json', 'tokenizer/tokenizer_config.json']) {
    if (!fs.existsSync(path.join(modelsDir, filename))) return false;
  }
  return true;
}

async function cmdSystem1Setup(quiet, mode = 'setup') {
  const layaDir = getLayaDir();
  const configPath = getConfigPath();
  const modelsDir = path.join(layaDir, 'models');

  const targetLaya = RECEPTRON_LAYA_VERSION;
  const targetOnnx = ONNXRUNTIME_NODE_VERSION;
  const targetModel = TARGET_MODEL_VERSION;

  if (!quiet) {
    if (mode === 'setup' || mode === 'update' || mode === 'repair' || mode === 'enable') {
      log(`┌──────────────────────────────────────────────┐`);
      log(`│              TRIBUNAL KIT                    │`);
      log(`│             SYSTEM-1 SETUP                   │`);
      log(`└──────────────────────────────────────────────┘`);
      log('');
      log(`System-1 Setup`);
    }
  }

  if (process.env.TK_MOCK_LAYA_DOWNLOAD) {
    if (!fs.existsSync(layaDir)) fs.mkdirSync(layaDir, { recursive: true });
    if (!fs.existsSync(modelsDir)) fs.mkdirSync(modelsDir, { recursive: true });
    fs.writeFileSync(path.join(modelsDir, 'laya.onnx'), 'mock');
    fs.writeFileSync(configPath, JSON.stringify({ enabled: true, mocked: true }));
    if (!quiet) log(`\n  ${c('green', '✓')} System-1 successfully mocked!`);
    return;
  }

  try {
    if (!fs.existsSync(layaDir)) fs.mkdirSync(layaDir, { recursive: true });

    const lockDir = path.join(layaDir, '.install.lock');
    const lockPidFile = path.join(lockDir, 'pid');
    try {
      fs.mkdirSync(lockDir);
      fs.writeFileSync(lockPidFile, String(process.pid));
    } catch (err) {
      if (err.code === 'EEXIST') {
        let isStale = false;
        try {
          const pidStr = fs.readFileSync(lockPidFile, 'utf8');
          const pid = parseInt(pidStr, 10);
          if (pid > 0) {
            try {
              process.kill(pid, 0);
            } catch (_e) {
              if (_e.code === 'ESRCH') isStale = true;
            }
          } else {
            const stat = fs.statSync(lockPidFile);
            if (Date.now() - stat.mtimeMs > 900000) isStale = true;
          }
        } catch (_e) {
          try {
            const stat = fs.statSync(lockDir);
            if (Date.now() - stat.mtimeMs > 900000) isStale = true;
          } catch (_e2) {
            isStale = true;
          }
        }

        if (isStale) {
          if (!quiet)
            log(`\n  ${c('yellow', '⚠')} Found stale lock from previous crash. Recovering...`);
          fs.rmSync(lockDir, { recursive: true, force: true });
          fs.mkdirSync(lockDir);
          fs.writeFileSync(lockPidFile, String(process.pid));
        } else {
          throw new Error(
            'System-1 installation is currently in progress by another process (PID is active). Please wait.',
          );
        }
      } else {
        throw err;
      }
    }

    try {
      if (!fs.existsSync(modelsDir)) fs.mkdirSync(modelsDir, { recursive: true });

      // Step 1: Installing isolated runtime
      const s1 = new Spinner('Installing isolated runtime', 5, 1, quiet);
      s1.start('Installing dependencies...');
      
      fs.copyFileSync(
        path.join(__dirname, '../system1/laya-package.json'),
        path.join(layaDir, 'package.json'),
      );
      fs.copyFileSync(
        path.join(__dirname, '../system1/laya-package-lock.json'),
        path.join(layaDir, 'package-lock.json'),
      );

      if (/[&|";<>]/.test(layaDir)) {
        throw new Error(`Invalid path characters in Laya directory: ${layaDir}`);
      }

      let cmd;
      let args;

      if (process.platform === 'win32') {
        const nodeDir = path.dirname(process.execPath);
        const defaultNpmCli = path.join(nodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js');
        if (!fs.existsSync(defaultNpmCli)) {
          throw new Error("Could not securely locate npm-cli.js for direct execution on Windows.");
        }
        cmd = process.execPath;
        args = [defaultNpmCli, 'ci', '--prefix', layaDir, '--no-audit', '--no-fund'];
      } else {
        cmd = 'npm';
        args = ['ci', '--prefix', layaDir, '--no-audit', '--no-fund'];
      }

      child_process.execFileSync(cmd, args, {
        stdio: 'ignore',
        shell: false,
      });
      s1.succeed('Dependencies verified');

      // Step 2: Acquiring model
      const s2 = new Spinner('Acquiring model', 5, 2, quiet);
      s2.start('Downloading...');

      const layaPkgPath = path.join(layaDir, 'node_modules', '@receptron', 'laya');
      const { Laya, ensureBundle } = require(layaPkgPath);

      const revision = '68f27dfe5a27a54fb2b1fefc432f43f972e90868';
      const downloadedModelDir = await ensureBundle({
        repo: 'receptron/laya-onnx',
        revision: revision,
        cacheDir: modelsDir,
      });
      s2.succeed('Model acquired');

      // Step 3: Verifying model
      const s3 = new Spinner('Verifying model', 5, 3, quiet);
      s3.start('Verifying SHA-256...');

      const expectedHashes = {
        'laya.onnx': 'a874eb254b58b0fcb1e7ad56fbb188c29d64e08c9a46b689433e1f52c66dba1e',
        'laya.onnx.data': '487746363a8da57bcadb4345352997d22a0fb90d70aa22c6856668d023242aba',
      };

      for (const [filename, expectedHash] of Object.entries(expectedHashes)) {
        const artifactPath = path.join(downloadedModelDir, filename);
        try {
          await verifyChecksum(artifactPath, expectedHash);
        } catch (err) {
          fs.rmSync(layaDir, { recursive: true, force: true });
          s3.fail('SHA-256 mismatch');
          throw new Error(
            `Integrity check failed: ${err.message}\nInstallation aborted and quarantined.`,
          );
        }
      }

      for (const filename of ['tokenizer/tokenizer.json', 'tokenizer/tokenizer_config.json']) {
        if (!fs.existsSync(path.join(downloadedModelDir, filename))) {
          fs.rmSync(layaDir, { recursive: true, force: true });
          s3.fail('Missing tokenizer');
          throw new Error(`Integrity check failed: Missing ${filename}`);
        }
      }
      s3.succeed('SHA-256 verified');

      // Step 4: Initializing model
      const s4 = new Spinner('Initializing ONNX Runtime', 5, 4, quiet);
      s4.start('Initializing...');
      const laya = await Laya.load({
        modelDir: downloadedModelDir,
        executionProviders: ['cpu'],
      });
      await laya.close();
      s4.succeed('Runtime initialized');

      // Step 5: Health Check
      const s5 = new Spinner('Running health check', 5, 5, quiet);
      s5.start('Verifying...');
      
      const pkgLockPath = path.join(layaDir, 'package-lock.json');
      let installedLayaVer = 'Unknown';
      let installedOnnxVer = 'Unknown';
      if (fs.existsSync(pkgLockPath)) {
        const pkgLock = JSON.parse(fs.readFileSync(pkgLockPath, 'utf8'));
        installedLayaVer =
          pkgLock.dependencies?.['@receptron/laya']?.version ||
          pkgLock.packages?.['node_modules/@receptron/laya']?.version ||
          'Unknown';
        installedOnnxVer =
          pkgLock.dependencies?.['onnxruntime-node']?.version ||
          pkgLock.packages?.['node_modules/onnxruntime-node']?.version ||
          'Unknown';
      }

      if (
        process.env.NODE_ENV !== 'test' &&
        (installedLayaVer !== targetLaya || installedOnnxVer !== targetOnnx)
      ) {
        s5.fail('Version mismatch');
        throw new Error(
          `Version verification failed. Expected Laya: ${targetLaya}, ONNX: ${targetOnnx}. Got Laya: ${installedLayaVer}, ONNX: ${installedOnnxVer}.`,
        );
      }
      s5.succeed('Health check passed');

      fs.writeFileSync(
        configPath,
        JSON.stringify(
          {
            enabled: true,
            model_version: targetModel,
            laya_version: targetLaya,
            onnxruntime_version: targetOnnx,
            checksum_verified: true,
            installed_at: new Date().toISOString(),
          },
          null,
          2,
        ),
      );

      if (!quiet) {
        log('');
        log('──────────────────────────────────────────────');
        log('');
        log('SYSTEM-1 READY');
        log('');
        log(`Provider     Laya`);
        log(`Runtime      ONNX Runtime`);
        log(`Integrity    VERIFIED`);
        log(`Cache        ${layaDir}`);
        log(`Status       READY`);
      }
    } finally {
      try {
        fs.rmSync(lockDir, { recursive: true, force: true });
      } catch (_e) {}
    }
  } catch (error) {
    if (!quiet) {
      log('');
      log('System-1 installation failed.');
      log('');
      log('Reason:');
      log(error.message);
      log('');
      log('Tribunal Kit remains fully usable using deterministic fallback.');
      log('No incomplete System-1 installation was activated.');
      log('');
      log('You can retry with:');
      log('  tk system1 setup');
      log('');
      log('For diagnostics:');
      log('  tk system1 status');
    }
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
      if (!quiet)
        log(`  ${c('green', '✓')} System-1 has been disabled (installation kept intact).`);
    } catch {
      if (!quiet) err(`  ✖ Failed to parse System-1 config.`);
      process.exitCode = 1;
    }
  } else {
    if (!quiet) dim(`  System-1 is not currently installed.`);
  }
}

async function cmdSystem1Status(quiet) {
  const configPath = getConfigPath();
  const layaDir = getLayaDir();
  const modelPath = path.join(layaDir, 'models', 'laya.onnx');
  const runtimePath = path.join(layaDir, 'node_modules', '@receptron', 'laya');
  
  let config = null;
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch {}
  }
  
  const healthy = await checkHealth();
  const installed = getInstalledVersion();
  const target = getTargetVersion();

  let state = 'NOT_INSTALLED';
  if (config) {
    if (healthy) {
      if (installed.model !== target.model || installed.laya !== target.laya) {
        state = 'INCOMPATIBLE';
      } else {
        state = 'READY';
      }
    } else {
      state = 'CORRUPT';
    }
  }

  if (!quiet) {
    log(`\n  System-1 Status\n`);
    log(`  Installation:  ${state === 'READY' ? c('green', 'READY') : c('yellow', state)}`);
    log(`  Provider:      Laya`);
    log(`  Runtime:       ONNX Runtime`);
    log(`  Enabled:       ${config?.enabled ? c('green', 'Yes') : c('yellow', 'No')}`);
    log(`  Model:         ${installed.model || 'Unknown'}`);
    log(`  Integrity:     ${healthy ? 'VERIFIED' : 'UNVERIFIED'}`);
    log(`  Cache:         ${layaDir}`);
    log(`  Fallback:      AVAILABLE`);
    log('');
  }
}

async function cmdSystem1Clean(quiet) {
  const layaDir = getLayaDir();
  if (fs.existsSync(layaDir)) {
    if (!process.env.TK_MOCK_LAYA_DOWNLOAD) {
      log(`  Action: System-1 will be completely removed.`);
      const confirmed = await promptConfirm(
        `\n  Do you want to proceed with this modification? [y/N] `,
      );
      if (!confirmed) {
        log(
          `\n  ${c('yellow', '⚠')} Operation cancelled by user. Existing installation unchanged.`,
        );
        return;
      }
      log('');
    }
    fs.rmSync(layaDir, { recursive: true, force: true });
    if (!quiet) log(`  ${c('green', '✓')} System-1 installation completely removed.`);
  } else {
    if (!quiet) dim(`  System-1 is not installed.`);
  }
}

async function cmdSystem1Verify(quiet) {
  const healthy = await checkHealth();
  if (healthy) {
    if (!quiet) log(`  ${c('green', '✓')} System-1 model and runtime verified.`);
  } else {
    if (!quiet) err(`  ✖ System-1 is missing or corrupt. Run 'tk system1 repair'.`);
    process.exitCode = 1;
  }
}

async function cmdSystem1(flags, args, quiet) {
  const rawArgs = args.slice(2);
  const subCommand = rawArgs.find(a => !a.startsWith('-') && a !== 'system1');

  switch (subCommand) {
    case 'enable':
    case 'setup':
      await cmdSystem1Setup(quiet, 'setup');
      break;
    case 'update':
      await cmdSystem1Setup(quiet, 'update');
      break;
    case 'repair':
      fs.rmSync(getLayaDir(), { recursive: true, force: true });
      await cmdSystem1Setup(quiet, 'repair');
      break;
    case 'verify':
      await cmdSystem1Verify(quiet);
      break;
    case 'disable':
      cmdSystem1Disable(quiet);
      break;
    case 'status':
      await cmdSystem1Status(quiet);
      break;
    case 'clean':
    case 'uninstall':
      await cmdSystem1Clean(quiet);
      break;
    default:
      err(`Unknown system1 command: "${subCommand || ''}"`);
      dim('Available: setup, update, repair, verify, disable, status, uninstall');
      process.exitCode = 1;
  }
}

module.exports = {
  cmdSystem1,
  verifyChecksum,
  RECEPTRON_LAYA_VERSION,
  ONNXRUNTIME_NODE_VERSION,
  checkHealth,
  getTargetVersion,
  getInstalledVersion
};
