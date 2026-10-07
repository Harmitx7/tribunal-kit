'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Very lightweight recursive YAML parser for the Canonical Skill Contract.
 * It handles strings, booleans, arrays (- item), and nested objects.
 */
function parseBasicYaml(yamlStr) {
  const lines = yamlStr.split('\n');
  const result = {};
  const pathStack = [{ indent: -1, obj: result }];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const indent = line.search(/\S/);
    const trimmed = line.trim();

    while (pathStack.length > 1 && pathStack[pathStack.length - 1].indent > indent) {
      pathStack.pop();
    }
    const current = pathStack[pathStack.length - 1].obj;

    // Array item
    if (trimmed.startsWith('- ')) {
      const valStr = trimmed.substring(2).trim();
      let val = parseValue(valStr);

      if (!Array.isArray(current)) {
        // Adapt if not an array (fallback for simple parser)
      } else {
        if (!valStr && i + 1 < lines.length && lines[i + 1].search(/\S/) > indent) {
          // nested object inside array
          val = {};
          pathStack.push({ indent: indent + 2, obj: val });
        }
        current.push(val);
      }
      continue;
    }

    // Key-value pair
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx !== -1) {
      const key = trimmed.substring(0, colonIdx).trim();
      const valStr = trimmed.substring(colonIdx + 1).trim();

      // Check if it's a multi-line list next or nested object
      if (!valStr) {
        if (i + 1 < lines.length) {
          const nextIndent = lines[i + 1].search(/\S/);
          if (nextIndent > indent) {
            const isNextArray = lines[i + 1].trim().startsWith('-');
            const val = isNextArray ? [] : {};
            if (Array.isArray(current)) {
              const newObj = { [key]: val };
              current.push(newObj);
              pathStack.push({ indent: nextIndent, obj: val });
            } else {
              current[key] = val;
              pathStack.push({ indent: nextIndent, obj: val });
            }
          } else {
            current[key] = null;
          }
        } else {
          current[key] = null;
        }
      } else {
        // Inline value
        const val = parseValue(valStr);
        if (Array.isArray(current)) {
          // inside array of objects
          if (
            current.length === 0 ||
            typeof current[current.length - 1] !== 'object' ||
            Array.isArray(current[current.length - 1])
          ) {
            current.push({ [key]: val });
          } else {
            current[current.length - 1][key] = val;
          }
        } else {
          current[key] = val;
        }
      }
    }
  }
  return result;
}

function parseValue(valStr) {
  if (valStr === 'true') return true;
  if (valStr === 'false') return false;
  if (valStr === 'null') return null;
  if (!isNaN(valStr) && valStr !== '') return Number(valStr);
  if (
    (valStr.startsWith('"') && valStr.endsWith('"')) ||
    (valStr.startsWith("'") && valStr.endsWith("'"))
  ) {
    return valStr.slice(1, -1);
  }
  return valStr;
}

/**
 * Extracts frontmatter from a SKILL.md file.
 */
function parseContract(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { contract: null, error: 'No frontmatter found' };

  try {
    const parsed = parseBasicYaml(match[1]);
    return { contract: parsed, error: null };
  } catch (e) {
    return { contract: null, error: `YAML parse error: ${e.message}` };
  }
}

/**
 * Validates a contract against the canonical schema.
 * Returns { valid: boolean, errors: array }
 */
function validateContract(contract) {
  const errors = [];
  const warnings = [];

  if (!contract) {
    return { valid: false, errors: ['Contract is null'], warnings: [] };
  }

  // 1. Identity
  if (!contract.skill) errors.push('Missing "skill" object');
  else {
    if (!contract.skill.id && !contract.name) errors.push('Missing skill.id or name');
    if (!contract.skill.version && !contract.version) errors.push('Missing skill.version');
  }

  // 2. Types validation for inputs
  const validTypes = [
    'string',
    'number',
    'boolean',
    'object',
    'array',
    'file',
    'directory',
    'repository',
    'enum',
    'skill',
    'skill-result',
  ];
  if (contract.contract && Array.isArray(contract.contract.inputs)) {
    contract.contract.inputs.forEach((inp, idx) => {
      if (inp.type && !validTypes.includes(inp.type)) {
        errors.push(
          `contract.inputs[${idx}].type expected one of [${validTypes.join(', ')}], received "${inp.type}"`,
        );
      }
    });
  }

  // 3. Types validation for outputs
  if (contract.contract && Array.isArray(contract.contract.outputs)) {
    contract.contract.outputs.forEach((out, idx) => {
      if (out.type && !validTypes.includes(out.type)) {
        errors.push(
          `contract.outputs[${idx}].type expected one of [${validTypes.join(', ')}], received "${out.type}"`,
        );
      }
    });
  }

  // Warn on unknown top-level fields (Legacy mode)
  const allowedTopLevel = [
    'skill',
    'trigger',
    'contract',
    'procedure',
    'context',
    'state',
    'verification',
    'composition',
    'lifecycle',
    'name',
    'description',
    'version',
    'last-updated',
    'skills',
    'tools',
    'scripts-binding',
    'responsibility',
  ];
  Object.keys(contract).forEach(key => {
    if (!allowedTopLevel.includes(key)) {
      warnings.push(`Unknown top-level field: "${key}"`);
    }
  });

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Normalizes a raw/parsed frontmatter into a strict Canonical Contract object.
 */
function normalizeContract(parsed, legacyMode = true) {
  if (!parsed) return null;

  let compRequires = parsed.composition?.requires || [];
  if (parsed.skills) {
    if (typeof parsed.skills === 'string') {
      compRequires = parsed.skills.split(',').map(s => s.trim());
    } else if (Array.isArray(parsed.skills)) {
      compRequires = parsed.skills;
    }
  }

  let executionTools = parsed.execution?.tools || [];
  if (parsed.tools) {
    if (typeof parsed.tools === 'string') {
      executionTools = parsed.tools.split(',').map(s => s.trim());
    } else if (Array.isArray(parsed.tools)) {
      executionTools = parsed.tools;
    }
  }

  const normalized = {
    skill: {
      id: parsed.skill?.id || parsed.name || 'UNKNOWN',
      name: parsed.skill?.name || parsed.name || 'UNKNOWN',
      description: parsed.skill?.description || parsed.description || '',
      version: parsed.skill?.version || parsed.version || '1.0.0',
      status: parsed.skill?.status || 'experimental',
    },
    trigger: {
      mode: parsed.trigger?.mode || 'programmatic',
      priority: parsed.trigger?.priority || 50,
      conditions: parsed.trigger?.conditions || [],
      exclusions: parsed.trigger?.exclusions || [],
    },
    contract: {
      inputs: parsed.contract?.inputs || [],
      outputs: parsed.contract?.outputs || [],
      preconditions: parsed.contract?.preconditions || [],
      postconditions: parsed.contract?.postconditions || [],
      invariants: parsed.contract?.invariants || [],
    },
    context: {
      strategy: parsed.context?.strategy || 'bulk',
      budget: parsed.context?.budget || { max_tokens: 4000 },
      references: parsed.context?.references || [],
    },
    state: {
      resumable: parsed.state?.resumable || false,
      idempotent: parsed.state?.idempotent || false,
      checkpoints: parsed.state?.checkpoints || [],
      retry_policy: parsed.state?.retry_policy || 'none',
    },
    verification: {
      required: parsed.verification?.required || false,
      assertions: parsed.verification?.assertions || [],
      evidence: parsed.verification?.evidence || { required: false },
      tests: parsed.verification?.tests || [],
      completion_policy: parsed.verification?.completion_policy || { require_all: true },
    },
    composition: {
      requires: compRequires,
      produces: parsed.composition?.produces || [],
      conflicts: parsed.composition?.conflicts || [],
      compatible_with: parsed.composition?.compatible_with || [],
    },
    execution: {
      tools: executionTools,
    },
    lifecycle: {
      owner: parsed.lifecycle?.owner || 'tribunal',
      created: parsed.lifecycle?.created || new Date().toISOString().split('T')[0],
      updated:
        parsed.lifecycle?.updated ||
        parsed['last-updated'] ||
        new Date().toISOString().split('T')[0],
      deprecated: parsed.lifecycle?.deprecated || false,
      replacement: parsed.lifecycle?.replacement || null,
    },
    responsibility: {
      primary: parsed.responsibility?.primary || [],
      actions: parsed.responsibility?.actions || [],
      subjects: parsed.responsibility?.subjects || [],
      outputs: parsed.responsibility?.outputs || [],
    },
  };

  if (legacyMode && parsed.description) {
    // Legacy description is already mapped to skill.description
  }

  return normalized;
}

/**
 * Scores completeness based on 12 key areas.
 */
function scoreCompleteness(contract) {
  if (!contract) return 0;

  let score = 0;
  const max = 12;

  if (contract.skill?.id !== 'UNKNOWN') score++;
  if (contract.trigger?.mode) score++;
  if (contract.contract?.inputs?.length > 0) score++;
  if (contract.contract?.outputs?.length > 0) score++;
  if (contract.contract?.preconditions?.length > 0) score++;
  if (contract.contract?.postconditions?.length > 0) score++;
  if (contract.contract?.invariants?.length > 0) score++;
  if (contract.state?.resumable !== undefined) score++;
  if (contract.verification?.required !== undefined) score++;
  if (
    contract.composition?.requires?.length > 0 ||
    contract.composition?.compatible_with?.length > 0
  )
    score++;
  if (contract.context?.budget?.max_tokens) score++;
  if (contract.lifecycle?.status) score++;
  if (contract.responsibility?.primary?.length > 0) score++;

  return Math.round((score / max) * 100);
}

/**
 * Computes a simple diff between two normalized contracts.
 */
function diffContracts(oldC, newC) {
  const diffs = [];
  let isBreaking = false;

  if (!oldC || !newC) return { diffs: ['Complete replacement'], isBreaking: true };

  if (JSON.stringify(oldC.contract.inputs) !== JSON.stringify(newC.contract.inputs)) {
    diffs.push('INPUTS CHANGED');
    isBreaking = true;
  }

  if (JSON.stringify(oldC.contract.outputs) !== JSON.stringify(newC.contract.outputs)) {
    diffs.push('OUTPUTS CHANGED');
  }

  if (oldC.verification.required !== newC.verification.required) {
    diffs.push(
      `VERIFICATION: required: ${oldC.verification.required} -> ${newC.verification.required}`,
    );
  }

  return { diffs, isBreaking };
}

/**
 * Reconciles a skill contract with skills_inventory.json.
 */
function reconcileWithRegistry(skillId, contract, inventoryPath) {
  if (!fs.existsSync(inventoryPath)) return { success: false, error: 'Inventory not found' };

  try {
    const inv = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
    let conflictsResolved = false;

    if (!inv.skillMap[skillId]) {
      // Add missing skill
      inv.skillMap[skillId] = {
        name: contract.skill.name,
        domain: 'meta', // Default if unknown
        lineCount: 0,
        purpose: 'Discovered via reconciliation',
        triggers: contract.trigger.mode,
        inputs: contract.contract.inputs.map(i => i.name || i),
        tools: contract.composition.compatible_with,
        workflow: 'Ad-hoc execution',
        output: 'Unstructured text',
        dependencies: contract.composition.requires,
        relatedSkills: [],
        hasVbc: contract.verification.required,
        hasEv: contract.verification.evidence.required,
        hasEdges: false,
        hasChecklist: contract.verification.assertions.length > 0,
        hasRev: false,
      };
      inv.stats.total = Object.keys(inv.skillMap).length;
      conflictsResolved = true;
    } else {
      // Reconcile
      const entry = inv.skillMap[skillId];
      if (entry.hasVbc !== contract.verification.required) {
        // Registry mismatch
        entry.hasVbc = contract.verification.required;
        conflictsResolved = true;
      }
      const newScore = scoreCompleteness(contract);
      if (entry.contract_completeness !== newScore) {
        entry.contract_completeness = newScore;
        conflictsResolved = true;
      }
    }

    if (conflictsResolved) {
      fs.writeFileSync(inventoryPath, JSON.stringify(inv, null, 2), 'utf8');
    }
    return { success: true, conflictsResolved };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = {
  parseContract,
  validateContract,
  normalizeContract,
  scoreCompleteness,
  diffContracts,
  reconcileWithRegistry,
};
