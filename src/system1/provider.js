'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const EXPECTED_MODEL_HASHES = {
  'laya.onnx': 'a874eb254b58b0fcb1e7ad56fbb188c29d64e08c9a46b689433e1f52c66dba1e',
  'laya.onnx.data': '487746363a8da57bcadb4345352997d22a0fb90d70aa22c6856668d023242aba',
};

// Process-level cache for model integrity verification
// Map<filePath, { mtimeMs: number, size: number, verified: boolean }>
const _modelHashCache = new Map();

function verifyModelFileHash(filePath, expectedHash) {
  if (!fs.existsSync(filePath)) return false;
  try {
    const stat = fs.statSync(filePath);
    const cached = _modelHashCache.get(filePath);
    if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
      return cached.verified;
    }

    const hash = crypto.createHash('sha256');
    const buffer = fs.readFileSync(filePath);
    hash.update(buffer);
    const actual = hash.digest('hex');
    const verified = (actual.toLowerCase() === expectedHash.toLowerCase());

    _modelHashCache.set(filePath, {
      mtimeMs: stat.mtimeMs,
      size: stat.size,
      verified,
    });

    return verified;
  } catch {
    return false;
  }
}

function getLayaDir() {
  return path.join(os.homedir(), '.tribunal-kit', 'laya');
}

function getConfigPath() {
  return path.join(getLayaDir(), 'config.json');
}

class System1Provider {
  constructor() {
    this.layaDir = getLayaDir();
    this.configPath = getConfigPath();
    this.ort = null;
    this.session = null;
  }

  /**
   * Checks if Laya is explicitly enabled, installed, and cryptographic integrity is intact.
   * @returns {boolean}
   */
  isAvailable() {
    if (!fs.existsSync(this.configPath)) return false;
    try {
      if (!this.config) {
        this.config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      }
      if (!this.config.enabled) return false;

      const modelPath = path.join(this.layaDir, 'models', 'laya.onnx');
      if (!fs.existsSync(modelPath)) return false;

      // Allow mocked configuration in test environments
      if (this.config.mocked || process.env.TK_MOCK_LAYA_DOWNLOAD) {
        return true;
      }

      // Verify SHA-256 integrity of the model file
      return verifyModelFileHash(modelPath, EXPECTED_MODEL_HASHES['laya.onnx']);
    } catch {
      return false;
    }
  }

  /**
   * Lazy-loads the out-of-band ONNX runtime and initializes the model session.
   */
  async _initSession() {
    // Only load the module once, but we will instantiate Laya in classifyImpact
    if (this.Laya) return;

    const layaPkgPath = path.join(this.layaDir, 'node_modules', '@receptron', 'laya');
    try {
      const { Laya } = require(layaPkgPath);
      this.Laya = Laya;
    } catch (error) {
      throw new Error(`Failed to load @receptron/laya from ${layaPkgPath}: ${error.message}`);
    }
  }

  /**
   * Normalizes inputs and runs inference.
   * @param {string[]} files
   * @param {string} task
   * @returns {Promise<number>} Returns impact tier (0-3)
   */
  async classifyImpact(files, task) {
    if (!this.isAvailable()) {
      throw new Error('System-1 is not available or disabled.');
    }

    await this._initSession();

    // If the configuration tells us it is mocked, gracefully fallback (for tests)
    if (this.config && this.config.mocked) {
      throw new Error(
        'Laya model tokenization and tensor metadata missing from repository. Inference blocked until production model integrated.',
      );
    }

    const modelPath = path.join(this.layaDir, 'models', 'laya.onnx');
    if (!this.config?.mocked && !process.env.TK_MOCK_LAYA_DOWNLOAD) {
      if (!verifyModelFileHash(modelPath, EXPECTED_MODEL_HASHES['laya.onnx'])) {
        throw new Error(`System-1 model integrity check failed: SHA-256 hash mismatch for ${modelPath}`);
      }
      const dataPath = path.join(this.layaDir, 'models', 'laya.onnx.data');
      if (fs.existsSync(dataPath) && !verifyModelFileHash(dataPath, EXPECTED_MODEL_HASHES['laya.onnx.data'])) {
        throw new Error(`System-1 model data integrity check failed: SHA-256 hash mismatch for ${dataPath}`);
      }
    }

    try {
      const laya = await this.Laya.load({
        repo: 'receptron/laya-onnx',
        revision: '68f27dfe5a27a54fb2b1fefc432f43f972e90868',
        cacheDir: path.join(this.layaDir, 'models'),
        executionProviders: ['cpu'],
      });

      // Format state appropriately for Laya
      const state = {
        task: task || 'Analyze code change',
        files: files || [],
      };

      const result = await laya.systemOne(state, {
        impact_tier: {
          type: 'choice',
          instructions: 'What is the impact tier of this code change?',
          criteria: {
            0: 'Typo, CSS, markdown, formatting',
            1: 'Single-file component or function logic edit',
            2: 'Multi-file feature edit',
            3: 'Auth, schema, migration, breaking architectural changes',
          },
        },
      });

      await laya.close();

      const tierStr = result.answers.impact_tier.choice;
      const tier = parseInt(tierStr, 10);

      if (isNaN(tier) || tier < 0 || tier > 3) {
        throw new Error(`Laya model produced out-of-bounds impact tier: ${tierStr}`);
      }

      return tier;
    } catch (error) {
      throw new Error(`Laya inference failed: ${error.message}`);
    }
  }
}

module.exports = {
  System1Provider,
  getLayaDir,
  getConfigPath,
  EXPECTED_MODEL_HASHES,
  verifyModelFileHash,
};