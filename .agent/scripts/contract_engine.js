'use strict';

/**
 * contract_engine.js — Zero-Dependency AI Behavioral Contract Engine
 *
 * Parses, evaluates, and verifies behavioral contracts against project files.
 * Supports glob scoping, per-rule exclusions, literal and regex rules, and severity levels.
 */

const fs = require('fs');
const path = require('path');

// ── Zero-Dependency YAML Parser for Contract Schemas ─────────────────────────

function parseYamlContract(rawContent) {
  const lines = rawContent.split(/\r?\n/);
  const contract = {
    name: '',
    description: '',
    scope: '*',
    exclude: '',
    when: 'file_modified',
    severity: 'warn',
    must: [],
    must_not: [],
    metadata: {},
  };

  let currentSection = null; // 'must' | 'must_not' | 'metadata'
  let currentRule = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Skip empty lines or top-level comments
    if (!line || line.startsWith('#')) continue;

    // Check top-level keys
    if (line.startsWith('name:')) {
      contract.name = unquote(line.slice(5).trim());
      currentSection = null;
      continue;
    }
    if (line.startsWith('description:')) {
      contract.description = unquote(line.slice(12).trim());
      currentSection = null;
      continue;
    }
    if (line.startsWith('scope:')) {
      contract.scope = unquote(line.slice(6).trim());
      currentSection = null;
      continue;
    }
    if (line.startsWith('exclude:')) {
      contract.exclude = unquote(line.slice(8).trim());
      currentSection = null;
      continue;
    }
    if (line.startsWith('when:')) {
      contract.when = unquote(line.slice(5).trim());
      currentSection = null;
      continue;
    }
    if (line.startsWith('severity:')) {
      const val = unquote(line.slice(9).trim()).toLowerCase();
      if (['block', 'warn', 'info'].includes(val)) {
        contract.severity = val;
      }
      currentSection = null;
      continue;
    }

    // Section headers
    if (line === 'must:') {
      currentSection = 'must';
      currentRule = null;
      continue;
    }
    if (line === 'must_not:') {
      currentSection = 'must_not';
      currentRule = null;
      continue;
    }
    if (line === 'metadata:') {
      currentSection = 'metadata';
      currentRule = null;
      continue;
    }

    // Section items
    if (currentSection === 'must' || currentSection === 'must_not') {
      if (line.startsWith('- ')) {
        // New rule entry
        const rest = line.slice(2).trim();
        if (rest.startsWith('pattern:')) {
          currentRule = { pattern: unquote(rest.slice(8).trim()) };
        } else {
          currentRule = { pattern: unquote(rest) };
        }
        contract[currentSection].push(currentRule);
      } else if (currentRule && (rawLine.startsWith('    ') || rawLine.startsWith('\t'))) {
        // Property of current rule
        if (line.startsWith('message:')) {
          currentRule.message = unquote(line.slice(8).trim());
        } else if (line.startsWith('except:')) {
          const val = unquote(line.slice(7).trim());
          if (val.startsWith('[') && val.endsWith(']')) {
            currentRule.except = val
              .slice(1, -1)
              .split(',')
              .map(s => unquote(s.trim()))
              .filter(Boolean);
          } else {
            currentRule.except = [val];
          }
        } else if (line.startsWith('context:')) {
          currentRule.context = unquote(line.slice(8).trim());
        }
      }
    } else if (currentSection === 'metadata') {
      const parts = line.split(':');
      if (parts.length >= 2) {
        const k = parts[0].trim();
        const v = unquote(parts.slice(1).join(':').trim());
        contract.metadata[k] = v;
      }
    }
  }

  return contract;
}

function unquote(str) {
  if (!str) return '';
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    return str.slice(1, -1);
  }
  return str;
}

// ── Glob Matcher ─────────────────────────────────────────────────────────────

function globToRegex(glob) {
  const pattern = glob
    .replace(/\\/g, '/')
    .replace(/\./g, '\\.')
    .replace(/\/\*\*\//g, '{{SLASH_GLOBSTAR_SLASH}}')
    .replace(/\/\*\*/g, '{{SLASH_GLOBSTAR}}')
    .replace(/\*\*\//g, '{{GLOBSTAR_SLASH}}')
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '.')
    .replace(/\{\{SLASH_GLOBSTAR_SLASH\}\}/g, '(?:/|/.+/)')
    .replace(/\{\{SLASH_GLOBSTAR\}\}/g, '(?:/.*)?')
    .replace(/\{\{GLOBSTAR_SLASH\}\}/g, '(?:.*/)?')
    .replace(/\{\{GLOBSTAR\}\}/g, '.*');
  return new RegExp(`^${pattern}$`, 'i');
}

function matchGlob(filePath, globPattern) {
  if (!globPattern || globPattern === '*') return true;
  const normalizedPath = filePath.replace(/\\/g, '/');
  const patterns = globPattern
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  for (const pat of patterns) {
    const rx = globToRegex(pat);
    if (rx.test(normalizedPath) || rx.test(path.basename(normalizedPath))) {
      return true;
    }
  }
  return false;
}

// ── Contract Evaluation Logic ────────────────────────────────────────────────

function evaluateContract(contract, relativePath, fileContent) {
  const violations = [];
  const lines = fileContent.split(/\r?\n/);

  // 1. Check scope
  if (contract.scope && !matchGlob(relativePath, contract.scope)) {
    return violations;
  }

  // 2. Check exclusion
  if (contract.exclude && matchGlob(relativePath, contract.exclude)) {
    return violations;
  }

  // 3. Evaluate `must` rules
  if (contract.must && Array.isArray(contract.must)) {
    for (const rule of contract.must) {
      if (rule.except && rule.except.some(ex => matchGlob(relativePath, ex))) {
        continue;
      }

      let found = false;
      const isRegex = rule.pattern.startsWith('regex:');
      const searchTarget = isRegex ? rule.pattern.slice(6) : rule.pattern;

      if (isRegex) {
        try {
          const rx = new RegExp(searchTarget, 'm');
          found = rx.test(fileContent);
        } catch {
          // Invalid regex fallback
          found = fileContent.includes(searchTarget);
        }
      } else {
        found = fileContent.includes(searchTarget);
      }

      if (!found) {
        violations.push({
          contract: contract.name,
          rule: rule.pattern,
          file: relativePath,
          message: rule.message || `Required pattern '${rule.pattern}' was missing.`,
          severity: contract.severity || 'warn',
        });
      }
    }
  }

  // 4. Evaluate `must_not` rules
  if (contract.must_not && Array.isArray(contract.must_not)) {
    for (const rule of contract.must_not) {
      if (rule.except && rule.except.some(ex => matchGlob(relativePath, ex))) {
        continue;
      }

      const isRegex = rule.pattern.startsWith('regex:');
      const searchTarget = isRegex ? rule.pattern.slice(6) : rule.pattern;
      let compiledRx = null;

      if (isRegex) {
        try {
          compiledRx = new RegExp(searchTarget);
        } catch {
          compiledRx = null;
        }
      }

      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const lineText = lines[lineIdx];
        let matched = false;

        if (isRegex) {
          matched = compiledRx ? compiledRx.test(lineText) : lineText.includes(searchTarget);
        } else {
          matched = lineText.includes(searchTarget);
        }

        if (matched) {
          violations.push({
            contract: contract.name,
            rule: rule.pattern,
            file: relativePath,
            line: lineIdx + 1,
            snippet: lineText.trim(),
            message: rule.message || `Forbidden pattern '${rule.pattern}' was found.`,
            severity: contract.severity || 'warn',
          });
        }
      }
    }
  }

  return violations;
}

// ── Workspace Contract Runner ────────────────────────────────────────────────

function loadContracts(projectRoot) {
  const contractsDir = path.join(projectRoot, '.tribunal', 'contracts');
  const contracts = [];

  if (!fs.existsSync(contractsDir)) {
    return contracts;
  }

  try {
    const entries = fs.readdirSync(contractsDir);
    for (const entry of entries) {
      if (entry.endsWith('.yaml') || entry.endsWith('.yml')) {
        const fullPath = path.join(contractsDir, entry);
        const raw = fs.readFileSync(fullPath, 'utf8');
        const parsed = parseYamlContract(raw);
        if (parsed.name) {
          contracts.push({ ...parsed, file: entry });
        }
      }
    }
  } catch {
    // Ignore read errors
  }

  return contracts;
}

function verifyWorkspace(projectRoot, targetFiles = null) {
  const contracts = loadContracts(projectRoot);
  const results = {
    contracts_loaded: contracts.length,
    files_checked: 0,
    violations: [],
    blocked: false,
  };

  if (contracts.length === 0) {
    return results;
  }

  let filesToScan = targetFiles;
  if (!filesToScan) {
    filesToScan = walkProjectFiles(projectRoot);
  }

  results.files_checked = filesToScan.length;

  for (const absPath of filesToScan) {
    if (!fs.existsSync(absPath)) continue;
    const relPath = path.relative(projectRoot, absPath).replace(/\\/g, '/');

    let content = '';
    try {
      content = fs.readFileSync(absPath, 'utf8');
    } catch {
      continue;
    }

    for (const contract of contracts) {
      const vList = evaluateContract(contract, relPath, content);
      if (vList.length > 0) {
        results.violations.push(...vList);
      }
    }
  }

  results.blocked = results.violations.some(v => v.severity === 'block');
  return results;
}

function walkProjectFiles(dir, fileList = [], depth = 0) {
  if (depth > 6) return fileList;
  try {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      if (
        [
          'node_modules',
          '.git',
          '.agent',
          '.tribunal',
          'dist',
          'build',
          'coverage',
          'target',
        ].includes(entry)
      ) {
        continue;
      }
      const full = path.join(dir, entry);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        walkProjectFiles(full, fileList, depth + 1);
      } else if (/\.(js|ts|jsx|tsx|py|rs|go|cs|java|md|json|html|css|yaml|yml)$/i.test(entry)) {
        fileList.push(full);
      }
    }
  } catch {
    // Skip
  }
  return fileList;
}

function evaluateCode(code, filename = 'file.js', contracts = null) {
  const projectRoot = process.cwd();
  const activeContracts = contracts || loadContracts(projectRoot);
  const allViolations = [];
  for (const contract of activeContracts) {
    const violations = evaluateContract(contract, filename, code);
    allViolations.push(...violations);
  }
  return {
    passed: allViolations.filter(v => v.severity === 'block').length === 0,
    violations: allViolations,
  };
}

module.exports = {
  parseYamlContract,
  matchGlob,
  evaluateContract,
  evaluateCode,
  loadContracts,
  verifyWorkspace,
};
