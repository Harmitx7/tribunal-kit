'use strict';

/**
 * launcher.js — Chrome Process Lifecycle & Profile Manager for Tribunal-Kit
 *
 * Spawns isolated, sandboxed headless Chrome instances with automated port allocation,
 * clean temporary profiles, and failsafe orphan process reaping.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');
const { findBrowser, isPortOpen } = require('./discovery');

const activeInstances = new Set();

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
}

// Ensure all spawned Chrome instances are cleanly terminated on exit
function cleanupAll() {
  for (const inst of activeInstances) {
    try {
      inst.kill();
    } catch {
      // Ignore
    }
  }
  activeInstances.clear();
}

process.on('exit', cleanupAll);
process.on('SIGINT', () => {
  cleanupAll();
  process.exit(130);
});
process.on('SIGTERM', () => {
  cleanupAll();
  process.exit(143);
});

/**
 * Launches an isolated headless Chrome instance.
 * @param {object} options
 * @param {number} options.port
 * @param {boolean} options.headless
 * @returns {Promise<{ port: number, process: any, close: Function }>}
 */
async function launchBrowser(options = {}) {
  const browserInfo = findBrowser();
  if (!browserInfo) {
    throw new Error('No supported browser (Google Chrome or Microsoft Edge) found on this machine');
  }

  let port = options.port;
  if (!port) {
    const defaultOpen = await isPortOpen(9222);
    if (defaultOpen) {
      return {
        port: 9222,
        process: null,
        close: async () => {},
      };
    }
    port = await getFreePort();
  } else {
    const alreadyOpen = await isPortOpen(port);
    if (alreadyOpen) {
      return {
        port,
        process: null,
        close: async () => {},
      };
    }
  }

  // Create isolated temp user data directory
  const tempProfileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-browser-profile-'));

  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${tempProfileDir}`,
    options.headless !== false ? '--headless=new' : '',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-sync',
    '--disable-translate',
    '--disable-gpu',
    '--metrics-recording-only',
    '--mute-audio',
    'about:blank',
  ].filter(Boolean);

  const proc = spawn(browserInfo.path, args, {
    detached: false,
    stdio: 'ignore',
  });

  activeInstances.add(proc);

  proc.on('exit', () => {
    activeInstances.delete(proc);
    try {
      fs.rmSync(tempProfileDir, { recursive: true, force: true });
    } catch {
      // Best effort cleanup
    }
  });

  // Wait for CDP port to accept connections (up to 20 seconds)
  const maxAttempts = options.startupTimeoutMs ? Math.ceil(options.startupTimeoutMs / 150) : 140;
  let ready = false;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 150));
    if (await isPortOpen(port)) {
      ready = true;
      break;
    }
  }

  if (!ready) {
    proc.kill();
    throw new Error(`Chrome spawned on port ${port} but failed to respond within 20 seconds`);
  }

  const close = async () => {
    activeInstances.delete(proc);
    terminateProcessTree(proc);
    try {
      fs.rmSync(tempProfileDir, { recursive: true, force: true });
    } catch {
      // Best effort cleanup
    }
  };

  return {
    port,
    process: proc,
    close,
  };
}

/**
 * Cleanly terminates a process and its child process tree cross-platform.
 * Handles null, dead, or invalid processes gracefully without throwing.
 * @param {any} proc - ChildProcess instance or object with pid
 */
function terminateProcessTree(proc) {
  if (!proc || typeof proc !== 'object' || !proc.pid) return;
  const pid = proc.pid;
  try {
    if (process.platform === 'win32') {
      try {
        const { execSync } = require('child_process');
        execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
      } catch (_) {}
      try {
        if (typeof proc.kill === 'function') {
          proc.kill('SIGKILL');
        } else {
          process.kill(pid, 'SIGKILL');
        }
      } catch (_) {}
    } else {
      try {
        process.kill(-pid, 'SIGKILL');
      } catch (_) {
        try {
          if (typeof proc.kill === 'function') {
            proc.kill('SIGKILL');
          } else {
            process.kill(pid, 'SIGKILL');
          }
        } catch (_) {}
      }
    }
  } catch (_) {
    // Graceful error handling for missing, invalid, or already-dead process
  }
}

module.exports = {
  launchBrowser,
  cleanupAll,
  terminateProcessTree,
};
