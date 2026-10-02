'use strict';

const fs = require('fs');
const path = require('path');

const _taxonomyCache = new Map();

function clearTaxonomyCache() {
  _taxonomyCache.clear();
}

function loadTaxonomy(agentDir) {
  const cacheKey = path.resolve(agentDir || process.cwd());
  if (_taxonomyCache.has(cacheKey)) {
    return _taxonomyCache.get(cacheKey);
  }

  const possiblePaths = [
    path.join(agentDir, 'skill-intelligence', 'taxonomy', 'engineering-concepts.json'),
    path.join(
      agentDir,
      '..',
      '.agent',
      'skill-intelligence',
      'taxonomy',
      'engineering-concepts.json',
    ),
    path.join(__dirname, '..', 'skill-intelligence', 'taxonomy', 'engineering-concepts.json'),
    path.join(
      __dirname,
      '..',
      '.agent',
      'skill-intelligence',
      'taxonomy',
      'engineering-concepts.json',
    ),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const concepts = JSON.parse(fs.readFileSync(p, 'utf8')).concepts || [];
        _taxonomyCache.set(cacheKey, concepts);
        return concepts;
      } catch (_) {}
    }
  }
  return [];
}

const ACTION_VERBS = [
  'build',
  'create',
  'implement',
  'optimize',
  'tune',
  'refactor',
  'secure',
  'audit',
  'deploy',
  'migrate',
  'test',
  'sync',
  'fix',
];
const HIGH_RISK_TRIGGERS = [
  {
    match: /(?:payment|charge|checkout|money|billing|wallet|order)/i,
    risk: 'Financial Transactions & Double Charge Risk',
  },
  {
    match: /(?:auth|jwt|password|credential|secret|token|rbac|permission)/i,
    risk: 'Authentication & Privilege Escalation Risk',
  },
  {
    match: /(?:shell|exec|command|sandbox|subprocess|eval)/i,
    risk: 'Arbitrary Code Execution & Tool Injection Risk',
  },
  {
    match: /(?:concurrency|concurrent|race condition|lock|thread|parallel)/i,
    risk: 'Race Condition & State Corruption Risk',
  },
  {
    match: /(?:file|upload|multipart|attachment)/i,
    risk: 'Unrestricted File Upload & Storage Exhaustion Risk',
  },
  {
    match: /(?:realtime|real-time|websocket|collaborative|socket)/i,
    risk: 'State Desynchronization & Concurrency Conflict Risk',
  },
];

const DOMAIN_TRIGGERS = [
  {
    match: /(?:ui|frontend|css|responsive|html|page|landing|component|a11y|accessibility)/i,
    domain: 'frontend',
  },
  { match: /(?:backend|api|server|endpoint|route|service)/i, domain: 'backend' },
  { match: /(?:database|sql|postgres|mysql|query|index|table)/i, domain: 'database' },
  {
    match: /(?:distributed|worker|queue|cluster|multi-region|consensus|socket|realtime)/i,
    domain: 'distributed-systems',
  },
  { match: /(?:security|auth|jwt|password|token|permission|sandbox)/i, domain: 'security' },
  { match: /(?:kubernetes|k8s|docker|deploy|ci\/cd|pipeline|devops)/i, domain: 'devops' },
  { match: /(?:ai|llm|rag|vector|prompt|agent)/i, domain: 'ai' },
  { match: /(?:data|etl|pipeline|stream|batch)/i, domain: 'data-engineering' },
  { match: /(?:search|index|ranking|relevance)/i, domain: 'search' },
];

function extractConcepts(taskQuery, agentDir) {
  const q = (taskQuery || '').toLowerCase();
  const taxonomy = loadTaxonomy(agentDir || process.cwd());

  const explicit = [];
  const implicitMap = new Map();
  const domains = new Set();
  const riskSignals = [];

  // Detect domain triggers
  for (const dt of DOMAIN_TRIGGERS) {
    if (dt.match.test(q)) {
      domains.add(dt.domain);
    }
  }

  // Detect action verbs
  const actions = ACTION_VERBS.filter(v => new RegExp(`\\b${v}\\b`, 'i').test(q));

  // Detect risk signals
  for (const r of HIGH_RISK_TRIGGERS) {
    if (r.match.test(q)) {
      riskSignals.push(r.risk);
    }
  }

  // 1. Explicit matching against taxonomy
  for (const item of taxonomy) {
    let isExplicit = false;
    const targets = [
      item.id,
      item.id.replace(/-/g, ' '),
      item.name.toLowerCase(),
      ...(item.aliases || []).map(a => a.toLowerCase()),
    ];

    for (const target of targets) {
      if (target.length < 3) continue; // Skip very short abbreviations unless explicitly bounded
      const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`\\b${escaped}\\b`, 'i');
      if (re.test(q)) {
        isExplicit = true;
        break;
      }
    }

    if (isExplicit) {
      explicit.push(item);
      domains.add(item.domain);
    }
  }

  // 2. Implicit matching (domain inference, related concepts, failure modes)
  for (const item of taxonomy) {
    if (explicit.some(e => e.id === item.id)) continue;

    let impliedReason = null;

    if (item.failure_modes && item.failure_modes.some(fm => q.includes(fm.replace(/-/g, ' ')))) {
      impliedReason = 'Matched failure mode';
    }

    if (!impliedReason) {
      if (
        /(?:payment|checkout|order|charge)/i.test(q) &&
        ['idempotency', 'transaction-integrity', 'concurrency-control'].includes(item.id)
      ) {
        impliedReason = 'Required for financial mutation consistency';
      } else if (
        /(?:postgres|sql|database|query)/i.test(q) &&
        ['query-optimization', 'transaction-integrity'].includes(item.id)
      ) {
        impliedReason = 'Required for database reliability and performance';
      } else if (
        /(?:upload|file|attachment)/i.test(q) &&
        ['file-upload-and-storage', 'input-validation-and-sanitization'].includes(item.id)
      ) {
        impliedReason = 'Required for storage security and MIME integrity';
      } else if (
        /(?:agent|shell|tool|prompt)/i.test(q) &&
        ['ai-agent-security-and-sandboxing', 'input-validation-and-sanitization'].includes(item.id)
      ) {
        impliedReason = 'Required for agent runtime safety and boundary defense';
      } else if (
        /(?:collaborative|realtime|real-time|editor)/i.test(q) &&
        ['realtime-collaboration-and-sync', 'concurrency-control'].includes(item.id)
      ) {
        impliedReason = 'Required for conflict-free state synchronization';
      }
    }

    if (!impliedReason) {
      for (const exp of explicit) {
        if (exp.related && exp.related.includes(item.id)) {
          impliedReason = `Related to explicit concept '${exp.name}'`;
          break;
        }
      }
    }

    if (impliedReason) {
      implicitMap.set(item.id, { ...item, implied_reason: impliedReason });
      domains.add(item.domain);
    }
  }

  const implicit = Array.from(implicitMap.values());
  const all = [...explicit, ...implicit];

  return {
    query: taskQuery,
    explicit_concepts: explicit.map(c => ({ id: c.id, name: c.name, domain: c.domain })),
    implicit_concepts: implicit.map(c => ({
      id: c.id,
      name: c.name,
      domain: c.domain,
      reason: c.implied_reason,
    })),
    all_concepts: all,
    domains: Array.from(domains),
    actions,
    risk_signals: riskSignals,
  };
}

module.exports = {
  extractConcepts,
  loadTaxonomy,
  clearTaxonomyCache,
};
