'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const WRAPPER = path.resolve(__dirname, '../../bin/wrapper.js');

function runWrapper(args = [], extraEnv = {}) {
  return spawnSync(process.execPath, [WRAPPER, ...args], {
    encoding: 'utf8',
    timeout: 5000,
    env: { ...process.env, TK_SKIP_UPDATE_CHECK: '1', ...extraEnv },
  });
}

function getLayaDir() {
  return path.join(os.homedir(), '.tribunal-kit', 'laya');
}

function getConfigPath() {
  return path.join(getLayaDir(), 'config.json');
}

describe('System-1 CLI & Fallback routing', () => {
  let originalConfigState = null;
  const configPath = getConfigPath();

  beforeAll(() => {
    // Save original state to restore later
    if (fs.existsSync(configPath)) {
      originalConfigState = fs.readFileSync(configPath, 'utf8');
    }
  });

  afterAll(() => {
    // Restore original config if it existed
    if (originalConfigState !== null) {
      if (!fs.existsSync(getLayaDir())) fs.mkdirSync(getLayaDir(), { recursive: true });
      fs.writeFileSync(configPath, originalConfigState, 'utf8');
    } else if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
  });

  beforeEach(() => {
    // Clear config before each test
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
  });

  test('system1 status reports cleanly when not installed', () => {
    const result = runWrapper(['system1', 'status']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('System-1 Status');
    expect(result.stdout).toContain('Enabled:');
    expect(result.stdout).toContain('No');
  });

  test('system1 disable writes config if directory exists, otherwise ignores', () => {
    const layaDir = getLayaDir();
    if (!fs.existsSync(layaDir)) fs.mkdirSync(layaDir, { recursive: true });
    
    // Create a dummy config
    fs.writeFileSync(configPath, JSON.stringify({ enabled: true }));
    
    const result = runWrapper(['system1', 'disable']);
    expect(result.status).toBe(0);
    
    const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    expect(updatedConfig.enabled).toBe(false);
  });

  test('system1 enable installs via mock to prevent downloading 1.7GB model during tests', () => {
    const result = runWrapper(['system1', 'enable'], { TK_MOCK_LAYA_DOWNLOAD: '1' });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('System-1 successfully mocked!');
  });

  test('impact-tier securely falls back to JS deterministic heuristic when Laya is enabled but inference fails', () => {
    const layaDir = getLayaDir();
    if (!fs.existsSync(layaDir)) fs.mkdirSync(layaDir, { recursive: true });
    
    // Explicitly enable Laya globally to trigger interception in wrapper.js
    fs.writeFileSync(configPath, JSON.stringify({ enabled: true }));
    
    // Create a dummy model so isAvailable() returns true and classification is attempted
    const modelsDir = path.join(layaDir, 'models');
    if (!fs.existsSync(modelsDir)) fs.mkdirSync(modelsDir, { recursive: true });
    fs.writeFileSync(path.join(modelsDir, 'laya.onnx'), 'mock');
    
    // Provide some dummy options to test routing
    const result = runWrapper(['impact-tier', '--files', 'test.js', '--lines', '10'], {
      TK_VERBOSE: '1',
      TRIBUNAL_FORCE_JS: '1'
    });
    
    // The wrapper will intercept and route to JS
    // The JS `native.js` will attempt Laya, but since model is missing (throws boundary error)
    // it will log the fallback warning and return the deterministic JSON.
    expect(result.stderr).toContain('System-1 Laya active');
    expect(result.stderr).toContain('Laya System-1 failure');
    expect(result.stderr).toContain('Falling back to deterministic heuristic');
    
    // Expect correct JSON output from fallback
    const outputJson = result.stdout.trim().split('\n').pop();
    const parsed = JSON.parse(outputJson);
    expect(parsed.tier).toBe(1); // 1 file, 10 lines -> tier 1
    expect(parsed.tier_name).toBe('Express Pass');
    expect(parsed._provider).toBeUndefined(); // Fallback doesn't use Laya
  });
});
