#!/usr/bin/env node
/**
 * architecture_mapper.js — Tribunal Kit System Architecture Model Generator
 * ═════════════════════════════════════════════════════════════════════════════
 * Deterministic static analysis script that builds a machine-readable
 * System Model (architecture.idx.json) from repository source code.
 *
 * Extracts:
 *   - API routes / HTTP endpoints
 *   - Database queries and ORM usage
 *   - External service calls (fetch, axios, SDK)
 *   - Message queues and event emitters
 *   - Authentication and authorization boundaries
 *   - Configuration and environment variable usage
 *   - Data stores (Redis, S3, filesystem)
 *
 * Complements graph_builder.js (import/export/blast radius) by adding
 * the *architectural* layer on top of the *module dependency* layer.
 *
 * Zero external dependencies. Reuses _colors.js and graph_builder.js utilities.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { RED, GREEN, BOLD, DIM, CYAN, RESET, banner, timer, formatMs } = require('./_colors');
const { walkDir } = require('./graph_builder');

// ── Output Paths ──────────────────────────────────────────────────────────────
const AGENT_DIR = path.join(process.cwd(), '.agent');
const HISTORY_DIR = path.join(AGENT_DIR, 'history');
const IDX_FILE = path.join(HISTORY_DIR, 'architecture.idx.json');
const CACHE_FILE = path.join(HISTORY_DIR, 'arch-mapper-cache.json');

// ── Detection Patterns ───────────────────────────────────────────────────────
// Each pattern returns an object { type, subtype, detail } or null.

const ROUTE_PATTERNS = [
  // Express / Fastify / Koa style
  {
    regex: /(?:app|router|server)\.(get|post|put|patch|delete|all)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
    type: 'api_route',
  },
  // Next.js App Router (file-based — detected by path)
  {
    regex: /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(/g,
    type: 'api_route',
  },
  // Hono / ElysiaJS
  { regex: /\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi, type: 'api_route' },
];

const DB_PATTERNS = [
  // Prisma
  {
    regex:
      /prisma\.\w+\.(findMany|findUnique|findFirst|create|update|delete|upsert|aggregate|groupBy|count)\s*\(/g,
    type: 'database',
    subtype: 'prisma',
  },
  // Drizzle
  {
    regex: /(?:db|drizzle)\.(select|insert|update|delete)\s*\(/g,
    type: 'database',
    subtype: 'drizzle',
  },
  // Raw SQL
  {
    regex:
      /\.(query|execute|raw|sql)\s*\(\s*['"`]?\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE)/gi,
    type: 'database',
    subtype: 'raw_sql',
  },
  // Mongoose
  {
    regex: /\.(find|findOne|findById|save|create|updateOne|deleteOne|aggregate)\s*\(/g,
    type: 'database',
    subtype: 'mongoose',
  },
  // Sequelize
  {
    regex: /\.(findAll|findByPk|bulkCreate|destroy)\s*\(/g,
    type: 'database',
    subtype: 'sequelize',
  },
];

const EXTERNAL_SERVICE_PATTERNS = [
  // fetch / axios / got
  {
    regex: /(?:fetch|axios|got|ky|ofetch)\s*\(\s*['"`]?(https?:\/\/[^'"`\s,)]+)/gi,
    type: 'external_service',
    subtype: 'http_client',
  },
  {
    regex: /(?:fetch|axios|got|ky|ofetch)\s*[.(]/g,
    type: 'external_service',
    subtype: 'http_client',
  },
  // AWS SDK
  {
    regex: /new\s+(?:AWS\.)?(?:S3|DynamoDB|SQS|SNS|Lambda|SES|CloudWatch)\s*\(/g,
    type: 'external_service',
    subtype: 'aws_sdk',
  },
  { regex: /@aws-sdk\/client-(\w+)/g, type: 'external_service', subtype: 'aws_sdk' },
  // Firebase
  {
    regex: /(?:firebase|firestore|getFirestore|initializeApp)\s*\(/g,
    type: 'external_service',
    subtype: 'firebase',
  },
  // Stripe
  { regex: /(?:stripe|Stripe)\s*\(/g, type: 'external_service', subtype: 'stripe' },
  // SendGrid / Twilio / Resend
  { regex: /(?:sendgrid|twilio|resend)\s*/gi, type: 'external_service', subtype: 'messaging' },
];

const CACHE_PATTERNS = [
  // Redis
  { regex: /(?:redis|ioredis|createClient)\s*\(/gi, type: 'data_store', subtype: 'redis' },
  {
    regex: /\.(?:get|set|del|hget|hset|expire|incr|lpush|rpush|publish|subscribe)\s*\(/g,
    type: 'data_store',
    subtype: 'redis_ops',
  },
  // In-memory cache
  { regex: /(?:lru-cache|node-cache|Map)\s*\(/g, type: 'data_store', subtype: 'in_memory_cache' },
];

const QUEUE_PATTERNS = [
  // BullMQ
  { regex: /new\s+(?:Queue|Worker|QueueScheduler)\s*\(/g, type: 'queue', subtype: 'bullmq' },
  // AMQP / RabbitMQ
  { regex: /(?:amqplib|amqp\.connect)\s*\(/g, type: 'queue', subtype: 'rabbitmq' },
  // Kafka
  { regex: /new\s+Kafka\s*\(/g, type: 'queue', subtype: 'kafka' },
  // Event emitters
  {
    regex: /\.(?:emit|on|once|addListener)\s*\(\s*['"`](\w+)['"`]/g,
    type: 'event',
    subtype: 'event_emitter',
  },
];

const AUTH_PATTERNS = [
  // JWT
  { regex: /(?:jwt|jsonwebtoken)\.(?:sign|verify|decode)\s*\(/g, type: 'auth', subtype: 'jwt' },
  // next-auth / auth.js
  {
    regex: /(?:NextAuth|getServerSession|auth\(\)|getSession)\s*\(/g,
    type: 'auth',
    subtype: 'next_auth',
  },
  // Passport
  { regex: /passport\.(?:authenticate|use|initialize)\s*\(/g, type: 'auth', subtype: 'passport' },
  // bcrypt / argon2
  {
    regex: /(?:bcrypt|argon2)\.(?:hash|compare|verify)\s*\(/g,
    type: 'auth',
    subtype: 'password_hashing',
  },
  // Clerk
  { regex: /(?:clerkMiddleware|currentUser|ClerkProvider)\s*/g, type: 'auth', subtype: 'clerk' },
];

const ENV_PATTERN = /process\.env\.([A-Z_][A-Z0-9_]*)/g;

// ── Content Hashing ──────────────────────────────────────────────────────────
function getFileHash(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha1').update(content).digest('hex');
}

// ── File Analysis ────────────────────────────────────────────────────────────
function analyzeFile(filePath, relativePath, content) {
  const findings = [];
  const envVars = new Set();

  // Strip comments for cleaner matching
  const cleaned = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  // Detect API routes
  for (const pattern of ROUTE_PATTERNS) {
    pattern.regex.lastIndex = 0;
    let match;
    while ((match = pattern.regex.exec(cleaned)) !== null) {
      const method = match[1] ? match[1].toUpperCase() : 'HANDLER';
      const route = match[2] || relativePath;
      findings.push({
        type: 'api_route',
        method,
        route,
        line: content.slice(0, match.index).split('\n').length,
      });
    }
  }

  // Detect Next.js App Router routes by file path
  if (/\/route\.(ts|js|tsx|jsx)$/.test(relativePath) || /\/api\//.test(relativePath)) {
    const methods = [];
    const methodRegex =
      /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(/g;
    let m;
    while ((m = methodRegex.exec(cleaned)) !== null) {
      methods.push(m[1]);
    }
    if (methods.length > 0) {
      const routePath = relativePath
        .replace(/\/route\.(ts|js|tsx|jsx)$/, '')
        .replace(/^src\/app/, '')
        .replace(/^app/, '');
      for (const method of methods) {
        findings.push({
          type: 'api_route',
          method,
          route: routePath || '/',
          line: 0,
          framework: 'nextjs_app_router',
        });
      }
    }
  }

  // Detect database usage
  for (const pattern of DB_PATTERNS) {
    pattern.regex.lastIndex = 0;
    let match;
    while ((match = pattern.regex.exec(cleaned)) !== null) {
      findings.push({
        type: 'database',
        subtype: pattern.subtype,
        operation: match[1] || match[0].trim(),
        line: content.slice(0, match.index).split('\n').length,
      });
    }
  }

  // Detect external services
  for (const pattern of EXTERNAL_SERVICE_PATTERNS) {
    pattern.regex.lastIndex = 0;
    let match;
    while ((match = pattern.regex.exec(cleaned)) !== null) {
      findings.push({
        type: 'external_service',
        subtype: pattern.subtype,
        detail: match[1] || match[0].trim().slice(0, 60),
        line: content.slice(0, match.index).split('\n').length,
      });
    }
  }

  // Detect cache / data stores
  for (const pattern of CACHE_PATTERNS) {
    pattern.regex.lastIndex = 0;
    let match;
    while ((match = pattern.regex.exec(cleaned)) !== null) {
      findings.push({
        type: 'data_store',
        subtype: pattern.subtype,
        line: content.slice(0, match.index).split('\n').length,
      });
    }
  }

  // Detect queues / events
  for (const pattern of QUEUE_PATTERNS) {
    pattern.regex.lastIndex = 0;
    let match;
    while ((match = pattern.regex.exec(cleaned)) !== null) {
      findings.push({
        type: pattern.type,
        subtype: pattern.subtype,
        event_name: match[1] || null,
        line: content.slice(0, match.index).split('\n').length,
      });
    }
  }

  // Detect auth boundaries
  for (const pattern of AUTH_PATTERNS) {
    pattern.regex.lastIndex = 0;
    let match;
    while ((match = pattern.regex.exec(cleaned)) !== null) {
      findings.push({
        type: 'auth',
        subtype: pattern.subtype,
        line: content.slice(0, match.index).split('\n').length,
      });
    }
  }

  // Detect environment variables
  ENV_PATTERN.lastIndex = 0;
  let envMatch;
  while ((envMatch = ENV_PATTERN.exec(cleaned)) !== null) {
    envVars.add(envMatch[1]);
  }

  return { findings, envVars: Array.from(envVars) };
}

// ── System Model Assembly ────────────────────────────────────────────────────
function buildSystemModel(analysisResults) {
  const model = {
    _meta: {
      generator: 'architecture_mapper.js',
      version: '1.0.0',
      generated_at: new Date().toISOString(),
      tribunal_kit_version: '9.2.5',
    },
    components: {},
    api_routes: [],
    data_stores: [],
    external_services: [],
    queues_and_events: [],
    auth_boundaries: [],
    environment_variables: [],
    trust_boundaries: [],
    summary: {},
  };

  const allEnvVars = new Set();
  const componentMap = {};

  for (const [file, result] of Object.entries(analysisResults)) {
    if (result.findings.length === 0 && result.envVars.length === 0) continue;

    // Classify the file into a component based on its path
    const componentName = classifyComponent(file);
    if (!componentMap[componentName]) {
      componentMap[componentName] = {
        name: componentName,
        type: inferComponentType(file),
        files: [],
        capabilities: new Set(),
      };
    }
    componentMap[componentName].files.push(file);

    for (const finding of result.findings) {
      switch (finding.type) {
        case 'api_route':
          model.api_routes.push({
            method: finding.method,
            route: finding.route,
            file,
            line: finding.line,
            framework: finding.framework || 'express_like',
          });
          componentMap[componentName].capabilities.add('api');
          break;

        case 'database':
          model.data_stores.push({
            technology: finding.subtype,
            operation: finding.operation,
            file,
            line: finding.line,
          });
          componentMap[componentName].capabilities.add('database');
          break;

        case 'external_service':
          model.external_services.push({
            technology: finding.subtype,
            detail: finding.detail,
            file,
            line: finding.line,
          });
          componentMap[componentName].capabilities.add('external_service');
          break;

        case 'data_store':
          model.data_stores.push({
            technology: finding.subtype,
            file,
            line: finding.line,
          });
          componentMap[componentName].capabilities.add('cache');
          break;

        case 'queue':
        case 'event':
          model.queues_and_events.push({
            technology: finding.subtype,
            event_name: finding.event_name,
            file,
            line: finding.line,
          });
          componentMap[componentName].capabilities.add('async');
          break;

        case 'auth':
          model.auth_boundaries.push({
            technology: finding.subtype,
            file,
            line: finding.line,
          });
          componentMap[componentName].capabilities.add('auth');
          break;
      }
    }

    for (const envVar of result.envVars) {
      allEnvVars.add(envVar);
    }
  }

  // Serialize components (convert Sets to Arrays)
  for (const [name, comp] of Object.entries(componentMap)) {
    model.components[name] = {
      name: comp.name,
      type: comp.type,
      files: comp.files,
      capabilities: Array.from(comp.capabilities),
    };
  }

  model.environment_variables = Array.from(allEnvVars).sort();

  // Infer trust boundaries
  model.trust_boundaries = inferTrustBoundaries(model);

  // Summary
  model.summary = {
    total_components: Object.keys(model.components).length,
    total_api_routes: model.api_routes.length,
    total_data_stores: model.data_stores.length,
    total_external_services: model.external_services.length,
    total_queues_events: model.queues_and_events.length,
    total_auth_boundaries: model.auth_boundaries.length,
    total_env_variables: model.environment_variables.length,
    detected_technologies: detectTechnologies(model),
  };

  return model;
}

// ── Component Classification ─────────────────────────────────────────────────
function classifyComponent(filePath) {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();

  // API layer
  if (/\/api\//.test(normalized) || /\/routes?\//.test(normalized)) {
    const segments = normalized.split('/');
    const apiIdx = segments.findIndex(s => s === 'api' || s === 'routes' || s === 'route');
    if (apiIdx !== -1 && segments[apiIdx + 1]) {
      return `api:${segments[apiIdx + 1]}`;
    }
    return 'api:root';
  }

  // Middleware
  if (/middleware/i.test(normalized)) return 'middleware';

  // Auth
  if (/auth/i.test(normalized)) return 'auth';

  // Database layer
  if (/(?:prisma|drizzle|db|database|models?|schema)/i.test(normalized)) return 'data_layer';

  // Workers / Jobs
  if (/(?:worker|job|queue|cron|task)/i.test(normalized)) return 'worker';

  // Services / Business logic
  if (/(?:services?|use-?cases?|domain)/i.test(normalized)) return 'service_layer';

  // Lib / Utils
  if (/(?:lib|utils?|helpers?|shared)/i.test(normalized)) return 'shared_lib';

  // Config
  if (/(?:config|settings|env)/i.test(normalized)) return 'config';

  // UI
  if (/(?:components?|pages?|views?|screens?|app\/)/i.test(normalized)) return 'ui';

  // Scripts
  if (/(?:scripts?|bin|cli)/i.test(normalized)) return 'tooling';

  // Tests
  if (/(?:test|spec|__tests__)/i.test(normalized)) return 'test';

  return 'other';
}

function inferComponentType(filePath) {
  const comp = classifyComponent(filePath);
  if (comp.startsWith('api:')) return 'entrypoint';
  if (comp === 'middleware') return 'middleware';
  if (comp === 'data_layer') return 'data_access';
  if (comp === 'worker') return 'background_job';
  if (comp === 'service_layer') return 'business_logic';
  if (comp === 'auth') return 'security_boundary';
  if (comp === 'config') return 'configuration';
  if (comp === 'ui') return 'presentation';
  if (comp === 'tooling') return 'tooling';
  if (comp === 'test') return 'test';
  return 'module';
}

// ── Trust Boundary Inference ─────────────────────────────────────────────────
function inferTrustBoundaries(model) {
  const boundaries = [];

  if (model.api_routes.length > 0) {
    boundaries.push({
      name: 'public_api',
      description: 'HTTP API endpoints exposed to clients',
      files: [...new Set(model.api_routes.map(r => r.file))],
    });
  }

  if (model.auth_boundaries.length > 0) {
    boundaries.push({
      name: 'auth_boundary',
      description: 'Authentication and authorization enforcement points',
      files: [...new Set(model.auth_boundaries.map(a => a.file))],
    });
  }

  if (model.external_services.length > 0) {
    boundaries.push({
      name: 'external_integration',
      description: 'Outbound connections to third-party services',
      files: [...new Set(model.external_services.map(e => e.file))],
    });
  }

  const dbFiles = model.data_stores.map(d => d.file);
  if (dbFiles.length > 0) {
    boundaries.push({
      name: 'data_persistence',
      description: 'Database and persistent storage access points',
      files: [...new Set(dbFiles)],
    });
  }

  return boundaries;
}

// ── Technology Detection ─────────────────────────────────────────────────────
function detectTechnologies(model) {
  const techs = new Set();

  for (const store of model.data_stores) {
    techs.add(store.technology);
  }
  for (const ext of model.external_services) {
    techs.add(ext.technology);
  }
  for (const q of model.queues_and_events) {
    techs.add(q.technology);
  }
  for (const a of model.auth_boundaries) {
    techs.add(a.technology);
  }
  for (const route of model.api_routes) {
    techs.add(route.framework);
  }

  return Array.from(techs).filter(Boolean).sort();
}

// ── Main Execution ───────────────────────────────────────────────────────────
function main() {
  console.log(banner('architecture_mapper.js', { Mode: 'System Model Generation' }));

  if (!fs.existsSync(AGENT_DIR)) {
    console.error(`${RED}✖ Error: .agent directory not found.${RESET}`);
    process.exit(1);
  }

  if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true });

  // Load incremental cache
  let cache = {};
  if (fs.existsSync(CACHE_FILE)) {
    try {
      cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    } catch {
      /* ignore */
    }
  }

  const totalTimer = timer();
  console.log(`\n  ${CYAN}✦ Scanning repository for architectural signals...${RESET}`);

  const files = walkDir(process.cwd());
  // Also scan Python, Go, and other file types
  const additionalFiles = [];
  function walkExtra(dir) {
    if (!fs.existsSync(dir)) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const base = entry.name;
          if (
            ['node_modules', '.git', '.next', 'dist', 'build', 'coverage', '.agent'].includes(base)
          )
            continue;
          walkExtra(full);
        } else if (/\.(py|go|rb|rs)$/.test(entry.name)) {
          additionalFiles.push(full);
        }
      }
    } catch {
      /* ignore */
    }
  }
  walkExtra(process.cwd());

  const allFiles = [...files, ...additionalFiles];
  const analysisResults = {};
  let analyzed = 0;
  let cached = 0;

  for (const filePath of allFiles) {
    const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');

    let fileHash;
    try {
      fileHash = getFileHash(filePath);
    } catch {
      continue;
    }

    // Use cache if file hasn't changed
    if (cache[relativePath] && cache[relativePath].hash === fileHash) {
      analysisResults[relativePath] = cache[relativePath].result;
      cached++;
      continue;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const result = analyzeFile(filePath, relativePath, content);

      analysisResults[relativePath] = result;
      cache[relativePath] = { hash: fileHash, result };
      analyzed++;
    } catch {
      continue;
    }
  }

  console.log(`  ${DIM}Files: ${analyzed} analyzed | ${cached} cached${RESET}`);

  // Build the System Model
  const model = buildSystemModel(analysisResults);

  // Write outputs
  fs.writeFileSync(IDX_FILE, JSON.stringify(model, null, 2));
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));

  const totalMs = totalTimer();

  // Print summary
  console.log(`\n  ${BOLD}${GREEN}✔ System Model built successfully.${RESET}`);
  console.log(`  ${DIM}${formatMs(totalMs)}${RESET}\n`);
  console.log(`  ${CYAN}Components:${RESET}       ${model.summary.total_components}`);
  console.log(`  ${CYAN}API Routes:${RESET}       ${model.summary.total_api_routes}`);
  console.log(`  ${CYAN}Data Stores:${RESET}      ${model.summary.total_data_stores}`);
  console.log(`  ${CYAN}External Svc:${RESET}     ${model.summary.total_external_services}`);
  console.log(`  ${CYAN}Queues/Events:${RESET}    ${model.summary.total_queues_events}`);
  console.log(`  ${CYAN}Auth Boundaries:${RESET}  ${model.summary.total_auth_boundaries}`);
  console.log(`  ${CYAN}Env Variables:${RESET}    ${model.summary.total_env_variables}`);
  console.log(
    `  ${CYAN}Technologies:${RESET}     ${model.summary.detected_technologies.join(', ') || 'none detected'}`,
  );
  console.log(`\n  ${DIM}Saved to: ${IDX_FILE}${RESET}\n`);
}

// ── Exports (for testing & programmatic use) ─────────────────────────────────
module.exports = {
  analyzeFile,
  buildSystemModel,
  classifyComponent,
  inferComponentType,
  inferTrustBoundaries,
  detectTechnologies,
  main,
};

if (require.main === module) {
  main();
}
