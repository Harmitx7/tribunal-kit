#!/usr/bin/env node
/**
 * sync-version.js — Release metadata consistency check for Tribunal Kit.
 *
 * Verifies the package version, native package metadata, lockfile metadata,
 * and public asset-count claims before a release. It intentionally performs
 * no implicit writes: a failed check makes stale release metadata visible.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PKG_PATH = path.join(ROOT, "package.json");
const PKG = JSON.parse(fs.readFileSync(PKG_PATH, "utf8"));
const VERSION = PKG.version;

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function countDirectory(relativePath, predicate) {
  const directory = path.join(ROOT, relativePath);
  if (!fs.existsSync(directory)) return 0;
  return fs.readdirSync(directory, { withFileTypes: true }).filter(predicate).length;
}

function countReviewers() {
  const agentsDir = path.join(ROOT, ".agent", "agents");
  return countDirectory(".agent/agents", (entry) => {
    if (!entry.isFile() || !entry.name.endsWith(".md")) return false;
    const content = fs.readFileSync(path.join(agentsDir, entry.name), "utf8");
    return /reviewer|auditor|tester|throughput-optimizer/i.test(entry.name) || /^role:\s*reviewer\s*$/im.test(content);
  });
}


const COUNTS = {
  agents: countDirectory(".agent/agents", (entry) => entry.isFile() && entry.name.endsWith(".md")),
  reviewers: countReviewers(),
  skills: countDirectory(".agent/skills", (entry) => entry.isDirectory() && fs.existsSync(path.join(ROOT, ".agent", "skills", entry.name, "SKILL.md"))),
  workflows: countDirectory(".agent/workflows", (entry) => entry.isFile() && entry.name.endsWith(".md")),
  scripts: countDirectory(".agent/scripts", (entry) => entry.isFile() && /\.(?:js|py)$/.test(entry.name)),
};

const failures = [];

function fail(message) {
  failures.push(message);
}

function checkVersionMetadata() {
  const expectedOptionalVersion = `^${VERSION}`;
  for (const [name, declaredVersion] of Object.entries(PKG.optionalDependencies || {})) {
    if (declaredVersion !== expectedOptionalVersion) {
      fail(`package.json optional dependency ${name} is ${declaredVersion}, expected ${expectedOptionalVersion}`);
    }
  }

  const lock = readJson("package-lock.json");
  if (lock.version !== VERSION || lock.packages?.[""]?.version !== VERSION) {
    fail(`package-lock.json root version does not match package.json (${VERSION})`);
  }
  for (const [name, declaredVersion] of Object.entries(lock.packages?.[""]?.optionalDependencies || {})) {
    if (declaredVersion !== expectedOptionalVersion) {
      fail(`package-lock.json optional dependency ${name} is ${declaredVersion}, expected ${expectedOptionalVersion}`);
    }
  }

  const cargoToml = readText("crates/core/Cargo.toml");
  const cargoTomlVersion = cargoToml.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
  if (cargoTomlVersion !== VERSION) {
    fail(`crates/core/Cargo.toml version is ${cargoTomlVersion || "missing"}, expected ${VERSION}`);
  }

  const cargoLock = readText("Cargo.lock");
  const cargoLockVersion = cargoLock.match(/name\s*=\s*"tribunal-core"[\s\S]*?version\s*=\s*"([^"]+)"/)?.[1];
  if (cargoLockVersion !== VERSION) {
    fail(`Cargo.lock tribunal-core version is ${cargoLockVersion || "missing"}, expected ${VERSION}`);
  }

  const readmeRelease = readText("README.md").match(/Release-v([0-9]+\.[0-9]+\.[0-9]+)/)?.[1];
  if (readmeRelease !== VERSION) {
    fail(`README release badge is ${readmeRelease || "missing"}, expected ${VERSION}`);
  }
}

const DOCUMENTS = [
  "README.md",
  ".agent/ARCHITECTURE.md",
  ".agent/rules/GEMINI.md",
  "CONTRIBUTING.md",
];

const CLAIM_PATTERNS = [
  { entity: "agents", regex: /(\d+)\s*(?:specialist\s+)?agents?\b/gi },
  {
    entity: "reviewers",
    regex: /(\d+)\s*(?:-\s*)?(?:(?:parallel|domain(?:-specific)?|tribunal|code)\s+)*reviewers?\b/gi,
  },
  { entity: "skills", regex: /(\d+)\s*(?:valid\s+|modular\s+)?skills?(?:\s+(?:packages?|modules?))?\b/gi },
  { entity: "workflows", regex: /(\d+)\s*(?:slash\s+)?workflows?\b/gi },
  { entity: "scripts", regex: /(\d+)\s*(?:JS\s+)?(?:automation\s+)?scripts?\b/gi },
];

function checkDocumentCounts() {
  for (const relativePath of DOCUMENTS) {
    const content = readText(relativePath);
    for (const { entity, regex } of CLAIM_PATTERNS) {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(content)) !== null) {
        const claimed = Number.parseInt(match[1], 10);
        if (claimed < 5 || claimed > 500) continue;
        if (claimed !== COUNTS[entity]) {
          const line = content.slice(0, match.index).split(/\r?\n/).length;
          fail(`${relativePath}:${line} says ${claimed} ${entity}, actual is ${COUNTS[entity]}`);
        }
      }
    }
  }
}

console.log(`\n  Tribunal Kit v${VERSION} — Release Metadata Check`);
console.log("  ────────────────────────────────────────────────");
console.log(`  Agents:    ${COUNTS.agents} (${COUNTS.reviewers} reviewers)`);
console.log(`  Skills:    ${COUNTS.skills}`);
console.log(`  Workflows: ${COUNTS.workflows}`);
console.log(`  Scripts:   ${COUNTS.scripts}`);

checkVersionMetadata();
checkDocumentCounts();

if (failures.length > 0) {
  console.log();
  for (const message of failures) console.log(`  ✗ ${message}`);
  console.log(`\n  Found ${failures.length} release metadata inconsistency${failures.length === 1 ? "" : "ies"}.`);
  process.exitCode = 1;
} else {
  console.log(`\n  ✓ Version metadata and public count claims are in sync across ${DOCUMENTS.length} documents.\n`);
}
