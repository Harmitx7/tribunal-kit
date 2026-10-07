'use strict';

/**
 * Lightweight deterministic intent and responsibility extractor.
 * Avoids heavy NLP models by using structural preposition patterns.
 */

const PREPOSITIONS = [
  'using',
  'with',
  'backed by',
  'powered by',
  'for',
  'inside',
  'via',
  'through',
  'on top of',
];

// Common action verbs mapped to domains/intents
const ACTIONS = {
  build: 'implement',
  create: 'implement',
  implement: 'implement',
  design: 'design',
  architect: 'design',
  optimize: 'optimize',
  improve: 'optimize',
  audit: 'audit',
  review: 'audit',
  test: 'test',
  deploy: 'deploy',
  fix: 'fix',
  debug: 'fix',
};

// Common artifacts
const ARTIFACTS = [
  'component',
  'api',
  'database schema',
  'sql query',
  'dockerfile',
  'ci pipeline',
  'test suite',
  'architecture diagram',
  'authentication flow',
  'animation',
  'mobile screen',
  'dashboard',
  'frontend',
  'backend',
  'service',
  'app',
  'application',
  'ui',
  'caching',
  'pipeline',
  'script',
];

/**
 * Extracts intent, action, and artifact from a raw query.
 * @param {string} task
 */
function extractIntent(task) {
  const taskLower = String(task).toLowerCase();

  // 1. Extract Primary Action
  let primaryAction = 'unknown';
  for (const [verb, intent] of Object.entries(ACTIONS)) {
    // If the verb is one of the first few words, it's likely the primary action
    const regex = new RegExp(`\\b${verb}\\b`, 'i');
    if (regex.test(taskLower)) {
      primaryAction = intent;
      break;
    }
  }

  // 2. Extract Artifact
  let extractedArtifact = null;
  for (const artifact of ARTIFACTS) {
    if (taskLower.includes(artifact)) {
      extractedArtifact = artifact;
      break; // naive first match
    }
  }

  // 3. Segment by prepositions to find contextual/incidental tools
  let primaryClause = taskLower;
  let contextualClause = '';

  for (const prep of PREPOSITIONS) {
    if (taskLower.startsWith(`${prep} `)) {
      // e.g. "using Redis, design X"
      const commaIdx = taskLower.indexOf(',');
      if (commaIdx !== -1) {
        contextualClause = taskLower.substring(prep.length + 1, commaIdx).trim();
        primaryClause = taskLower.substring(commaIdx + 1).trim();
      } else {
        contextualClause = taskLower.substring(prep.length + 1).trim();
        primaryClause = '';
      }
      break;
    }
    const prepIdx = taskLower.indexOf(` ${prep} `);
    if (prepIdx !== -1) {
      primaryClause = taskLower.substring(0, prepIdx).trim();
      contextualClause = taskLower.substring(prepIdx + prep.length + 2).trim();
      break;
    }
  }

  return {
    action: {
      primary: primaryAction,
    },
    artifact: extractedArtifact
      ? {
          [extractedArtifact]: { confidence: 'high' },
        }
      : {},
    clauses: {
      primary: primaryClause,
      contextual: contextualClause,
    },
  };
}

module.exports = { extractIntent };
