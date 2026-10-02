'use strict';
const __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.copyDir = copyDir;
exports.countDir = countDir;
exports.isSelfInstall = isSelfInstall;
exports.writeFileSyncAtomic = writeFileSyncAtomic;
const fs_1 = __importDefault(require('fs'));
const path_1 = __importDefault(require('path'));
const logger_1 = require('./logger');
// Concurrency limit for parallel file operations to avoid fd exhaustion
const COPY_CONCURRENCY = 32;

async function copyDir(src, dest, dryRun = false, filter = null, currentDepth = 0) {
  if (currentDepth > 20) {
    throw new Error(`Maximum directory copy depth (20) exceeded at: ${src}`);
  }
  if (!dryRun) {
    await fs_1.default.promises.mkdir(dest, { recursive: true });
  }
  const entries = await fs_1.default.promises.readdir(src, { withFileTypes: true });
  let count = 0;
  const dirs = [];
  const files = [];

  for (const entry of entries) {
    // Apply filter if provided (for --minimal mode or incremental copy)
    if (filter && !filter(entry.name, src, entry.isDirectory())) {
      (0, logger_1.dbg)(`  skip: ${entry.name}`);
      continue;
    }
    const srcPath = path_1.default.join(src, entry.name);
    const destPath = path_1.default.join(dest, entry.name);
    if (entry.isDirectory()) {
      dirs.push({ srcPath, destPath });
    } else {
      files.push({ srcPath, destPath, name: entry.name });
    }
  }

  // Copy files in parallel batches
  for (let i = 0; i < files.length; i += COPY_CONCURRENCY) {
    const batch = files.slice(i, i + COPY_CONCURRENCY);
    await Promise.all(
      batch.map(async ({ srcPath, destPath, name }) => {
        if (!dryRun) {
          await fs_1.default.promises.copyFile(srcPath, destPath);
        }
        (0, logger_1.dbg)(`  copy: ${name}`);
      }),
    );
    count += batch.length;
  }

  // Recurse into directories in parallel (dirs are I/O-independent)
  const dirResults = await Promise.all(
    dirs.map(({ srcPath, destPath }) =>
      copyDir(srcPath, destPath, dryRun, filter, currentDepth + 1),
    ),
  );
  for (const dirCount of dirResults) {
    count += dirCount;
  }

  return count;
}
async function countDir(dir, currentDepth = 0) {
  if (currentDepth > 20) {
    throw new Error(`Maximum directory count depth (20) exceeded at: ${dir}`);
  }
  let count = 0;
  const entries = await fs_1.default.promises.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory())
      count += await countDir(path_1.default.join(dir, e.name), currentDepth + 1);
    else count++;
  }
  return count;
}
/**
 * Returns true if the target directory IS the tribunal-kit package itself.
 * This prevents `init --force` / `update` from deleting the package's own files
 * when run from inside the project directory.
 */
function isSelfInstall(targetDir, pkgName, kitRoot) {
  const resolvedTarget = path_1.default.resolve(targetDir);
  // Direct path match
  if (resolvedTarget === kitRoot) return true;
  // Check if the target's package.json is this package
  const targetPkg = path_1.default.join(resolvedTarget, 'package.json');
  if (fs_1.default.existsSync(targetPkg)) {
    try {
      const targetName = JSON.parse(fs_1.default.readFileSync(targetPkg, 'utf8')).name;
      if (targetName === pkgName) return true;
    } catch {
      // Unreadable package.json — not a match
    }
  }
  return false;
}

/**
 * Atomically writes data to a file by writing to a temporary file in the same directory
 * and renaming it into place. Handles cross-platform and Windows locking cleanly.
 */
function writeFileSyncAtomic(filePath, data, encoding = 'utf8') {
  const dir = path_1.default.dirname(filePath);
  if (!fs_1.default.existsSync(dir)) fs_1.default.mkdirSync(dir, { recursive: true });
  const tmpPath = path_1.default.join(
    dir,
    `.${path_1.default.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`,
  );
  fs_1.default.writeFileSync(tmpPath, data, encoding);
  try {
    fs_1.default.renameSync(tmpPath, filePath);
  } catch (err) {
    if (process.platform === 'win32' && (err.code === 'EEXIST' || err.code === 'EPERM')) {
      try {
        fs_1.default.unlinkSync(filePath);
      } catch (_) {}
      fs_1.default.renameSync(tmpPath, filePath);
    } else {
      throw err;
    }
  }
}
