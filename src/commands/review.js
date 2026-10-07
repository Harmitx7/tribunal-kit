'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.cmdReview = cmdReview;
exports.FIXTURES = null;
exports.REVIEWER_CONFIGS = null;

/**
 * tk review — EXPERIMENTAL Reviewer Execution Harness
 *
 * Composes reviewer prompts from persona files and produces structured
 * review request documents that can be executed against an LLM.
 *
 * This command does NOT call an external LLM API.
 * It produces the exact prompt that would be fed to the LLM,
 * enabling controlled A/B/C comparison of reviewer architectures.
 *
 * Usage:
 *   tk review --config A --fixture mfa-implementation
 *   tk review --config B --fixture mfa-implementation
 *   tk review --config C --fixture mfa-implementation
 *   tk review --config A --diff path/to/diff.patch --task "Add MFA endpoint"
 *   tk review --analyze run_001.json run_002.json
 *
 * EXPERIMENTAL — Do not expose as documented product feature.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { log, err, ok, c, bold } = require('../utils/logger');
const { ReviewExecutor } = require('../execution/review_executor');
const { VerdictAggregator } = require('../execution/verdict_aggregator');
const { ProviderAdapter } = require('../execution/provider_adapter');
const { evaluateDecision } = require('../system1/decision_engine');

// ─── LLM CLIENT (EXPERIMENTAL ONLY) ─────────────────────────────────────────

function httpsPost(hostname, apiPath, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      {
        method: 'POST',
        hostname,
        path: apiPath,
        headers: { ...headers, 'Content-Length': Buffer.byteLength(data) },
      },
      res => {
        let raw = '';
        res.on('data', chunk => {
          raw += chunk;
        });
        res.on('end', () => resolve(raw));
        res.on('error', reject);
      },
    );
    req.on('error', reject);
    req.setTimeout(60000, () => {
      req.destroy(new Error('LLM API timeout'));
    });
    req.write(data);
    req.end();
  });
}

async function runPrompt({ prompt, model, temperature, maxTokens }) {
  const start = Date.now();
  let provider = null;
  let responseText = null;
  let inputTokens = null;
  let outputTokens = null;

  try {
    if (process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY) {
      provider = 'Anthropic';
      model = model || process.env.ANTHROPIC_DEFAULT_SONNET_MODEL || 'claude-3-5-sonnet-latest';
      const raw = await httpsPost(
        'api.anthropic.com',
        '/v1/messages',
        {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        {
          model,
          max_tokens: maxTokens,
          temperature,
          messages: [{ role: 'user', content: prompt }],
        },
      );
      const json = JSON.parse(raw);
      if (json.error) console.error('API Error:', json.error);
      responseText = json?.content?.[0]?.text || null;
      inputTokens = json?.usage?.input_tokens || null;
      outputTokens = json?.usage?.output_tokens || null;
    } else if (process.env.OPENROUTER_API_KEY) {
    } else {
      throw new Error('No OPENROUTER_API_KEY or ANTHROPIC_AUTH_TOKEN found in environment.');
    }

    return {
      response: responseText,
      provider,
      model,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens && outputTokens ? inputTokens + outputTokens : null,
      latencyMs: Date.now() - start,
    };
  } catch (e) {
    return {
      error: e.message,
      provider,
      model,
      latencyMs: Date.now() - start,
    };
  }
}

// ─── CONFIGURATION DEFINITIONS ──────────────────────────────────────────────

const REVIEWER_CONFIGS = {
  A: {
    name: 'Current Tribunal (/tribunal-backend)',
    personas: [
      'precedence-reviewer',
      'logic-reviewer',
      'security-auditor',
      'schema-reviewer',
      'resilience-reviewer',
      'dependency-reviewer',
      'type-safety-reviewer',
    ],
  },
  B: {
    name: 'Consolidated Reviewer',
    personas: ['backend-security-architect'],
  },
  C: {
    name: 'Hybrid (Consolidated + dependency-reviewer)',
    personas: ['backend-security-architect', 'dependency-reviewer'],
  },
};

// ─── BUILT-IN FIXTURES ──────────────────────────────────────────────────────

const FIXTURES = {
  'mfa-implementation': {
    task: 'Add TOTP-based MFA verification endpoint with rate limiting',
    files: ['src/api/auth/mfa.js', 'src/middleware/rateLimit.js'],
    diff: `--- a/src/api/auth/mfa.js
+++ b/src/api/auth/mfa.js
@@ -0,0 +1,42 @@
+const express = require('express');
+const speakeasy = require('speakeasy');
+const router = express.Router();
+
+// POST /api/auth/mfa/verify
+router.post('/mfa-verify', async (req, res) => {
+  const { userId, token } = req.body;
+  
+  const user = await db.query(\`SELECT * FROM users WHERE id = '\${userId}'\`);
+  
+  if (!user) return res.status(404).json({ error: 'User not found' });
+  
+  const verified = speakeasy.totp.verify({
+    secret: user.mfa_secret,
+    encoding: 'base32',
+    token: token,
+  });
+  
+  if (verified) {
+    req.session.mfaVerified = true;
+    res.json({ success: true });
+  } else {
+    res.status(401).json({ error: 'Invalid MFA token' });
+  }
+});
+
+module.exports = router;`,
    referenceFindings: [
      {
        id: 'R1',
        severity: 'Critical',
        category: 'security',
        desc: 'SQL injection: userId interpolated into query string',
      },
      {
        id: 'R2',
        severity: 'Critical',
        category: 'security',
        desc: 'Missing rate limiting on MFA verification endpoint',
      },
      {
        id: 'R3',
        severity: 'Important',
        category: 'security',
        desc: 'MFA token not invalidated after successful use (replay attack)',
      },
      {
        id: 'R4',
        severity: 'Important',
        category: 'authz',
        desc: 'No authentication middleware — anyone can call /mfa-verify',
      },
      {
        id: 'R5',
        severity: 'Important',
        category: 'resilience',
        desc: 'No error handling around db.query or speakeasy.totp.verify',
      },
      {
        id: 'R6',
        severity: 'Minor',
        category: 'api',
        desc: 'Inconsistent REST path: /mfa-verify should be /mfa/verify',
      },
      {
        id: 'R7',
        severity: 'Minor',
        category: 'database',
        desc: 'Missing index on mfa_secret column',
      },
    ],
  },
  'rbac-modification': {
    task: 'Add role-update endpoint allowing admins to change user roles',
    files: ['src/api/users/roles.js'],
    diff: `--- a/src/api/users/roles.js
+++ b/src/api/users/roles.js
@@ -0,0 +1,28 @@
+const express = require('express');
+const router = express.Router();
+
+// PATCH /api/users/:id/role
+router.patch('/:id/role', async (req, res) => {
+  const { role } = req.body;
+  const userId = req.params.id;
+  
+  // Update the user role
+  await db.query(\`UPDATE users SET role = '\${role}' WHERE id = '\${userId}'\`);
+  
+  res.status(200).json({ message: 'Role updated' });
+});
+
+module.exports = router;`,
    referenceFindings: [
      {
        id: 'R8',
        severity: 'Critical',
        category: 'security',
        desc: 'SQL injection: role and userId interpolated into query',
      },
      {
        id: 'R9',
        severity: 'Critical',
        category: 'authz',
        desc: 'No authorization check — any user can change any role',
      },
      {
        id: 'R10',
        severity: 'Important',
        category: 'authz',
        desc: 'No validation that target role is valid enum value',
      },
      {
        id: 'R11',
        severity: 'Important',
        category: 'database',
        desc: 'Role change not wrapped in transaction with audit log',
      },
      {
        id: 'R12',
        severity: 'Minor',
        category: 'api',
        desc: 'Returns 200 with body instead of 204 No Content',
      },
    ],
  },
  'schema-migration': {
    task: 'Add user_preferences table with required columns',
    files: ['prisma/migrations/20260928_add_prefs.sql'],
    diff: `--- /dev/null
+++ b/prisma/migrations/20260928_add_prefs.sql
@@ -0,0 +1,12 @@
+-- CreateTable
+ALTER TABLE users ADD COLUMN preferences JSONB NOT NULL;
+
+CREATE TABLE user_preferences (
+  id SERIAL PRIMARY KEY,
+  user_id INTEGER REFERENCES users(id),
+  theme VARCHAR(20) NOT NULL,
+  language VARCHAR(10) NOT NULL,
+  notifications BOOLEAN NOT NULL DEFAULT true,
+  created_at TIMESTAMP DEFAULT NOW()
+);`,
    referenceFindings: [
      {
        id: 'R13',
        severity: 'Critical',
        category: 'database',
        desc: 'ALTER TABLE ADD COLUMN NOT NULL without DEFAULT on existing table fails',
      },
      {
        id: 'R14',
        severity: 'Important',
        category: 'database',
        desc: 'No rollback/down migration script provided',
      },
      {
        id: 'R15',
        severity: 'Important',
        category: 'database',
        desc: 'Missing index on user_id foreign key column',
      },
      {
        id: 'R16',
        severity: 'Minor',
        category: 'database',
        desc: 'No ON DELETE CASCADE on user_id FK — orphaned rows possible',
      },
    ],
  },
  'authenticated-endpoint': {
    task: 'Create paginated order-history endpoint for authenticated users',
    files: ['src/api/orders/history.js'],
    diff: `--- /dev/null
+++ b/src/api/orders/history.js
@@ -0,0 +1,32 @@
+const express = require('express');
+const jwt = require('jsonwebtoken');
+const router = express.Router();
+
+// GET /api/orders/history
+router.get('/history', async (req, res) => {
+  const token = req.headers.authorization?.split(' ')[1];
+  const decoded = jwt.verify(token, process.env.JWT_SECRET);
+  
+  const page = parseInt(req.query.page) || 1;
+  const limit = parseInt(req.query.limit) || 50;
+  const offset = (page - 1) * limit;
+  
+  const orders = await db.query(
+    \`SELECT * FROM orders WHERE user_id = \${decoded.userId} ORDER BY created_at DESC LIMIT \${limit} OFFSET \${offset}\`
+  );
+  
+  res.json({ data: orders, page, limit });
+});
+
+module.exports = router;`,
    referenceFindings: [
      {
        id: 'R17',
        severity: 'Critical',
        category: 'security',
        desc: 'JWT algorithm not enforced (algorithms option missing in verify)',
      },
      {
        id: 'R18',
        severity: 'Important',
        category: 'security',
        desc: 'SQL injection: decoded.userId, limit, offset interpolated',
      },
      {
        id: 'R19',
        severity: 'Important',
        category: 'resilience',
        desc: 'jwt.verify will throw on invalid token — no try/catch',
      },
      {
        id: 'R20',
        severity: 'Minor',
        category: 'api',
        desc: 'No total count returned for pagination metadata',
      },
      {
        id: 'R21',
        severity: 'Minor',
        category: 'resilience',
        desc: 'No upper bound on limit parameter — user can request limit=999999',
      },
    ],
  },
  'secret-rotation': {
    task: 'Implement JWT signing-key rotation with dual-key validation window',
    files: ['src/config/keys.js', 'src/auth/jwt.js'],
    diff: `--- a/src/auth/jwt.js
+++ b/src/auth/jwt.js
@@ -1,8 +1,22 @@
-const JWT_SECRET = process.env.JWT_SECRET;
+const crypto = require('crypto');
+
+let currentKey = process.env.JWT_SECRET;
+let previousKey = null;
+
+function rotateKey() {
+  previousKey = currentKey;
+  currentKey = crypto.randomBytes(32).toString('hex');
+  console.log('Key rotated at', new Date().toISOString());
+}
 
 function signToken(payload) {
-  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
+  return jwt.sign(payload, currentKey, { expiresIn: '1h' });
+}
+
+function verifyToken(token) {
+  try {
+    return jwt.verify(token, currentKey);
+  } catch {
+    return jwt.verify(token, previousKey);
+  }
 }`,
    referenceFindings: [
      {
        id: 'R22',
        severity: 'Critical',
        category: 'security',
        desc: 'previousKey starts as null — verifyToken will crash on first rotation attempt',
      },
      {
        id: 'R23',
        severity: 'Important',
        category: 'security',
        desc: 'jwt.verify missing algorithms option in both verify calls',
      },
      {
        id: 'R24',
        severity: 'Important',
        category: 'resilience',
        desc: 'Second verify swallows ALL errors, not just InvalidTokenError',
      },
      {
        id: 'R25',
        severity: 'Minor',
        category: 'security',
        desc: 'Key rotation not logged to audit trail (only console.log)',
      },
    ],
  },
};

// ─── PROMPT COMPOSITION ─────────────────────────────────────────────────────

function composeReviewPrompt(configKey, fixtureId, customDiff, customTask) {
  const config = REVIEWER_CONFIGS[configKey];
  if (!config) throw new Error(`Unknown config: ${configKey}. Use A, B, or C.`);

  const fixture = FIXTURES[fixtureId];
  const task = customTask || (fixture && fixture.task) || 'Review this code change';
  const diff = customDiff || (fixture && fixture.diff) || '';

  const cwd = process.cwd();
  const agentDir = path.join(cwd, '.agent');

  // Load persona instructions
  const personaInstructions = [];
  let totalInstructionChars = 0;

  for (const persona of config.personas) {
    const personaPath = path.join(agentDir, 'agents', `${persona}.md`);
    if (fs.existsSync(personaPath)) {
      const content = fs.readFileSync(personaPath, 'utf8');
      personaInstructions.push({ name: persona, content, chars: content.length });
      totalInstructionChars += content.length;
    } else {
      personaInstructions.push({
        name: persona,
        content: `[MISSING: ${personaPath}]`,
        chars: 0,
        missing: true,
      });
    }
  }

  // Compose the single prompt (mirrors how the AI agent receives reviewer instructions)
  let prompt = '';

  prompt += `# Tribunal Review Request\n\n`;
  prompt += `## Task\n${task}\n\n`;
  prompt += `## Files\n${fixture ? fixture.files.join(', ') : 'See diff'}\n\n`;
  prompt += `## Diff Under Review\n\`\`\`diff\n${diff}\n\`\`\`\n\n`;

  prompt += `## Reviewer Instructions\n\n`;
  prompt += `You are performing a Tribunal code review. Execute each reviewer's checklist against the diff above.\n`;
  prompt += `For each reviewer, produce a verdict using this format:\n\n`;
  prompt += `\`\`\`\n━━━ Verdicts ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  prompt += `[reviewer-name]:      [✅ APPROVED | ⚠️ WARNING | ❌ REJECTED]\n\n`;
  prompt += `━━━ Findings ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  prompt += `[severity] — [file:line]: [issue]\n  Fix: [recommendation]\n\`\`\`\n\n`;

  for (const pi of personaInstructions) {
    prompt += `### ${pi.name}\n\n`;
    prompt += pi.content + '\n\n';
  }

  return {
    config: configKey,
    configName: config.name,
    fixture: fixtureId,
    task,
    personas: config.personas,
    personaCount: config.personas.length,
    promptChars: prompt.length,
    promptEstimatedTokens: Math.ceil(prompt.length / 4),
    instructionChars: totalInstructionChars,
    instructionEstimatedTokens: Math.ceil(totalInstructionChars / 4),
    diffChars: diff.length,
    prompt,
    referenceFindings: fixture ? fixture.referenceFindings : null,
  };
}

// ─── FINDING EXTRACTION ─────────────────────────────────────────────────────

function extractFindings(rawOutput) {
  const findings = [];
  // Match patterns like: Critical — file.js:12: description
  const findingRegex = /^(Critical|Important|Minor|Warning)\s*[—\-–]\s*([^:]+:\d+)?:?\s*(.+)/gim;

  let match;
  while ((match = findingRegex.exec(rawOutput)) !== null) {
    findings.push({
      severity: match[1].trim(),
      location: (match[2] || '').trim(),
      issue: match[3].trim(),
      normalized: match[3]
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .replace(/\s+/g, ' '),
    });
  }

  return findings;
}

function deduplicateFindings(findings) {
  const seen = new Map();
  const unique = [];
  const duplicates = [];

  for (const f of findings) {
    // Deterministic dedup by normalized issue text
    if (seen.has(f.normalized)) {
      duplicates.push(f);
    } else {
      seen.set(f.normalized, f);
      unique.push(f);
    }
  }

  return {
    unique,
    duplicates,
    total: findings.length,
    duplicateRate:
      findings.length > 0 ? ((duplicates.length / findings.length) * 100).toFixed(1) : '0.0',
  };
}

function compareToReference(findings, referenceFindings) {
  if (!referenceFindings) return { detected: 0, missed: 0, criticalMissed: 0, recall: 'N/A' };

  const detected = [];
  const missed = [];

  for (const ref of referenceFindings) {
    const refNorm = ref.desc
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, ' ');
    // Check if any finding fuzzy-matches the reference
    const found = findings.some(f => {
      // Simple word-overlap heuristic (NOT LLM-based)
      const refWords = new Set(refNorm.split(' ').filter(w => w.length > 3));
      const fWords = new Set(f.normalized.split(' ').filter(w => w.length > 3));
      let overlap = 0;
      for (const w of refWords) {
        if (fWords.has(w)) overlap++;
      }
      return overlap >= Math.min(3, refWords.size * 0.5);
    });

    if (found) {
      detected.push(ref);
    } else {
      missed.push(ref);
    }
  }

  const criticalMissed = missed.filter(r => r.severity === 'Critical');

  return {
    detected: detected.length,
    missed: missed.length,
    criticalMissed: criticalMissed.length,
    missedDetails: missed.map(m => `${m.severity}: ${m.desc}`),
    recall: `${((detected.length / referenceFindings.length) * 100).toFixed(1)}%`,
    label: 'REFERENCE-BASED ESTIMATE',
  };
}

// ─── ANALYZE STORED RUNS ────────────────────────────────────────────────────

function analyzeRuns(runFiles) {
  const results = [];

  for (const file of runFiles) {
    if (!fs.existsSync(file)) {
      err(`Run file not found: ${file}`);
      continue;
    }
    const run = JSON.parse(fs.readFileSync(file, 'utf8'));
    const findings = extractFindings(run.raw_output || '');
    const deduped = deduplicateFindings(findings);
    const recall = compareToReference(deduped.unique, run.referenceFindings);

    results.push({
      run_id: run.run_id,
      config: run.config,
      fixture: run.fixture,
      total_findings: deduped.total,
      unique_findings: deduped.unique.length,
      duplicate_findings: deduped.duplicates.length,
      duplicate_rate: deduped.duplicateRate + '%',
      reference_detected: recall.detected,
      reference_missed: recall.missed,
      critical_missed: recall.criticalMissed,
      finding_recall: recall.recall,
      recall_label: recall.label,
      missed_details: recall.missedDetails,
    });
  }

  return results;
}

// ─── CLI COMMAND ─────────────────────────────────────────────────────────────

async function cmdReview(flags, argv, quiet) {
  const rawArgv = Array.isArray(argv) ? argv : process.argv;
  const args = rawArgv.slice(2);

  // Parse review-specific args
  let configKey = null;
  let fixtureId = null;
  let diffPath = null;
  let taskDesc = null;
  let analyzeFiles = [];
  let listFixtures = false;
  let outputDir = '.tk-review-runs';
  let modePlan = false;
  let modeExecute = false;
  let outputJson = false;
  let isMock = false;
  let reviewersArg = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === 'review') continue;
    if (arg === '--plan') {
      modePlan = true;
      continue;
    }
    if (arg === '--execute') {
      modeExecute = true;
      continue;
    }
    if (arg === '--json') {
      outputJson = true;
      continue;
    }
    if (arg === '--mock') {
      isMock = true;
      continue;
    }
    if (arg === '--reviewers' && args[i + 1]) {
      reviewersArg = args[++i];
      continue;
    }
    if (arg.startsWith('--reviewers=')) {
      reviewersArg = arg.split('=')[1];
      continue;
    }
    if (arg === '--config' && args[i + 1]) {
      configKey = args[++i].toUpperCase();
      continue;
    }
    if (arg.startsWith('--config=')) {
      configKey = arg.split('=')[1].toUpperCase();
      continue;
    }
    if (arg === '--fixture' && args[i + 1]) {
      fixtureId = args[++i];
      continue;
    }
    if (arg.startsWith('--fixture=')) {
      fixtureId = arg.split('=')[1];
      continue;
    }
    if (arg === '--diff' && args[i + 1]) {
      diffPath = args[++i];
      continue;
    }
    if (arg.startsWith('--diff=')) {
      diffPath = arg.split('=')[1];
      continue;
    }
    if (arg === '--task' && args[i + 1]) {
      taskDesc = args[++i];
      continue;
    }
    if (arg.startsWith('--task=')) {
      taskDesc = arg.split('=')[1];
      continue;
    }
    if (arg === '--analyze') {
      analyzeFiles = args.slice(i + 1);
      break;
    }
    if (arg === '--list') {
      listFixtures = true;
      continue;
    }
    if (arg === '--output' && args[i + 1]) {
      outputDir = args[++i];
      continue;
    }
    if (arg === '--run-live') {
      argv.runLive = true;
      continue;
    }
    if (arg === '--run-all-live') {
      argv.runAllLive = true;
      continue;
    }
  }

  // Handle Phase 1 Governance: --plan or --execute
  if (modePlan || modeExecute) {
    let customDiff = '';
    let files = [];
    let task = taskDesc || '';

    if (fixtureId) {
      const fixture = FIXTURES[fixtureId];
      if (!fixture) {
        err(`Unknown fixture: ${fixtureId}. Use tk review --list to see available fixtures.`);
        process.exit(1);
      }
      task = taskDesc || fixture.task;
      customDiff = fixture.diff;
      files = fixture.files || [];
    } else if (diffPath) {
      if (!fs.existsSync(diffPath)) {
        err(`Diff file not found: ${diffPath}`);
        process.exit(1);
      }
      customDiff = fs.readFileSync(diffPath, 'utf8');
      task = taskDesc || 'Review proposed code change';
      const extracted = [];
      for (const line of customDiff.split('\n')) {
        if (line.startsWith('+++ b/')) {
          extracted.push(line.slice(6).trim());
        } else if (line.startsWith('+++ ') && !line.startsWith('+++ /dev/null')) {
          extracted.push(line.slice(4).trim());
        }
      }
      files = extracted.length > 0 ? extracted : ['src/unknown'];
    } else {
      err('Missing required change input. Provide --fixture <name> or --diff <path>');
      log(`  ${c('gray', 'Example: tk review --plan --fixture mfa-implementation')}`);
      log(`  ${c('gray', 'Example: tk review --execute --fixture mfa-implementation --mock')}`);
      process.exit(1);
    }

    // 1. Run deterministic decision engine
    const decision = evaluateDecision({
      task,
      diff: customDiff,
      files,
    });

    const forcedReviewers = reviewersArg
      ? reviewersArg
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      : null;

    const selectedReviewers = forcedReviewers ||
      decision.reviewers?.selected?.map(r =>
        typeof r === 'string' ? r : r.reviewer || r.name,
      ) || ['security-auditor', 'logic-reviewer'];

    // 2. Mode: PLAN
    if (modePlan) {
      if (outputJson) {
        console.log(
          JSON.stringify(
            {
              mode: 'plan',
              decision_id: decision.decision_id,
              tier: decision.tier,
              tier_name: decision.tier_name,
              routing: decision.routing,
              socratic_gate: decision.socratic_gate,
              selected_reviewers: selectedReviewers,
              signals: decision.signals,
              evidence_summary: decision.evidence_summary,
              explanation: decision.explanation,
              timestamp: new Date().toISOString(),
            },
            null,
            2,
          ),
        );
      } else {
        log('');
        log(bold('  ⚖️  Tribunal Review Plan'));
        log(`  ${c('gray', '─'.repeat(50))}`);
        log(`  Decision Tier:   ${c('cyan', `Tier ${decision.tier} (${decision.tier_name})`)}`);
        log(`  Routing:         ${c('cyan', decision.routing)}`);
        log(`  Socratic Gate:   ${c('cyan', decision.socratic_gate)}`);
        log(`  Selected Reviewers:`);
        for (const r of selectedReviewers) {
          log(`    ${c('green', '✓')} ${r}`);
        }
        log(`  ${c('gray', '─'.repeat(50))}`);
        log(
          `  Signals:         ${decision.signals?.change_files_count || files.length} file(s), ${decision.signals?.change_lines || 0} line(s)`,
        );
        log(
          `  Evidence:        ${decision.evidence_summary?.total_selected || 0} fact(s) selected`,
        );
        log(
          `  Reason:          ${decision.explanation?.why_tier_selected || 'Classified by volume and risk patterns.'}`,
        );
        log('');
      }
      return;
    }

    // 3. Mode: EXECUTE
    if (modeExecute) {
      const provider = new ProviderAdapter({ provider: isMock ? 'mock' : undefined });
      const executor = new ReviewExecutor({
        provider,
        maxConcurrency: 3,
        timeoutMs: 30000,
      });

      const execRes = await executor.executeReview({
        decision,
        code: customDiff,
        task,
        reviewers: selectedReviewers,
      });

      const aggregated = VerdictAggregator.aggregate({
        results: execRes.results,
        decision,
        tier: decision.tier,
        reviewRunId: execRes.reviewRunId,
      });

      if (outputJson) {
        console.log(
          JSON.stringify(
            {
              mode: 'execute',
              reviewRunId: execRes.reviewRunId,
              decision_id: decision.decision_id,
              tier: decision.tier,
              tier_name: decision.tier_name,
              reviewers: selectedReviewers,
              execution: {
                duration_ms: execRes.durationMs,
                telemetry: execRes.telemetry,
                results: execRes.results,
              },
              aggregated,
            },
            null,
            2,
          ),
        );
      } else {
        log('');
        log(bold('  Tribunal Review'));
        log('');
        log(bold('  Decision:'));
        log(`  Tier: Tier ${decision.tier} (${decision.tier_name})`);
        log('');
        log(bold('  Reviewers:'));
        for (const r of aggregated.reviewersExecuted) {
          log(`  ${c('green', '✓')} ${r}`);
        }
        log('');
        log(bold('  Execution:'));
        log(`  ${execRes.results.length} reviewer(s)`);
        log(`  ${(execRes.durationMs / 1000).toFixed(2)}s`);
        log(
          `  ${execRes.telemetry.totalTokens !== 'UNAVAILABLE' ? execRes.telemetry.totalTokens.toLocaleString() + ' tokens' : 'Tokens: UNAVAILABLE'}`,
        );
        log('');
        log(bold('  Findings:'));
        log(`  ${aggregated.findingsCount.critical} Critical`);
        log(`  ${aggregated.findingsCount.high} High`);
        log(`  ${aggregated.findingsCount.medium} Medium`);
        log(`  ${aggregated.findingsCount.low} Low`);
        log('');
        log(bold('  Final Verdict:'));
        const verdictColor =
          aggregated.verdict === 'APPROVED'
            ? 'green'
            : aggregated.verdict === 'WARNING'
              ? 'yellow'
              : 'red';
        log(`  ${c(verdictColor, bold(aggregated.verdict))}`);
        log('');
        log(bold('  Reason:'));
        log(`  ${aggregated.reason}`);
        log('');
      }

      if (aggregated.verdict === 'REJECTED') {
        process.exitCode = 1;
      }
      return;
    }
  }

  // Run all live mode
  if (argv.runAllLive) {
    log(bold('Running ALL fixtures live (A, B, C)...'));
    const configs = ['A', 'B', 'C'];
    const fixtures = Object.keys(FIXTURES);

    // Smoke test first
    log(bold('--- Executing Smoke Test (Config A, first fixture) ---'));
    const smokeRunId = await runLiveExecution('A', fixtures[0], outputDir);
    if (!smokeRunId) {
      err('Smoke test failed. Aborting full run.');
      process.exit(1);
    }
    ok('Smoke test succeeded. Proceeding with remaining 14 runs...');

    let aCount = 1,
      bCount = 0,
      cCount = 0;

    // Run the rest
    for (const cKey of configs) {
      for (const fix of fixtures) {
        if (cKey === 'A' && fix === fixtures[0]) continue; // Already ran
        log(bold(`\n--- Executing ${cKey} × ${fix} ---`));
        const success = await runLiveExecution(cKey, fix, outputDir);
        if (success) {
          if (cKey === 'A') aCount++;
          if (cKey === 'B') bCount++;
          if (cKey === 'C') cCount++;
        }
        // Small delay to prevent rate limits
        await new Promise(res => setTimeout(res, 2000));
      }
    }

    log('');
    ok('All live runs complete!');
    log(`  A: ${aCount}/5`);
    log(`  B: ${bCount}/5`);
    log(`  C: ${cCount}/5`);
    log('');
    log(`Run analysis with: ${c('cyan', `tk review --analyze ${outputDir}/*_meta.json`)}`);
    return;
  }

  // Single run live mode
  if (argv.runLive) {
    if (!configKey || !fixtureId) {
      err('Missing --config or --fixture for --run-live mode.');
      process.exit(1);
    }
    await runLiveExecution(configKey, fixtureId, outputDir);
    return;
  }

  // List fixtures
  if (listFixtures) {
    log(bold('Available fixtures:'));
    for (const [id, fix] of Object.entries(FIXTURES)) {
      log(`  ${c('cyan', id.padEnd(25))} ${c('gray', fix.task)}`);
      log(
        `  ${' '.repeat(25)} ${c('yellow', `${fix.referenceFindings.length} reference findings (${fix.referenceFindings.filter(f => f.severity === 'Critical').length} critical)`)}`,
      );
    }
    return;
  }

  // Analyze mode
  if (analyzeFiles.length > 0) {
    log(bold('Analyzing reviewer runs...'));
    const results = analyzeRuns(analyzeFiles);
    for (const r of results) {
      log(`\n  ${bold(r.run_id)} [${c('cyan', r.config)}] fixture=${r.fixture}`);
      log(`    Total findings:     ${r.total_findings}`);
      log(`    Unique findings:    ${r.unique_findings}`);
      log(`    Duplicates:         ${r.duplicate_findings} (${r.duplicate_rate})`);
      log(`    Reference detected: ${r.reference_detected}`);
      log(`    Reference missed:   ${r.reference_missed}`);
      log(`    Critical missed:    ${r.critical_missed}`);
      log(`    Finding recall:     ${r.finding_recall} (${r.recall_label})`);
      if (r.missed_details && r.missed_details.length > 0) {
        log(`    Missed:`);
        for (const m of r.missed_details) log(`      - ${m}`);
      }
    }
    return;
  }

  // Require config
  if (!configKey) {
    err('Missing --config. Use: tk review --config A|B|C --fixture <name>');
    log(`  ${c('gray', 'Run tk review --list to see available fixtures')}`);
    process.exit(1);
  }

  if (!REVIEWER_CONFIGS[configKey]) {
    err(`Unknown config: ${configKey}. Use A, B, or C.`);
    process.exit(1);
  }

  // Load custom diff if provided
  let customDiff = null;
  if (diffPath) {
    if (!fs.existsSync(diffPath)) {
      err(`Diff file not found: ${diffPath}`);
      process.exit(1);
    }
    customDiff = fs.readFileSync(diffPath, 'utf8');
  }

  if (!fixtureId && !customDiff) {
    err('Missing --fixture or --diff. Use: tk review --config A --fixture mfa-implementation');
    process.exit(1);
  }

  if (fixtureId && !FIXTURES[fixtureId]) {
    err(`Unknown fixture: ${fixtureId}`);
    log(`  ${c('gray', 'Run tk review --list to see available fixtures')}`);
    process.exit(1);
  }

  // Compose the prompt
  const start = Date.now();
  const result = composeReviewPrompt(configKey, fixtureId, customDiff, taskDesc);
  const compositionMs = Date.now() - start;

  // Generate run ID
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const runId = `${configKey}_${fixtureId || 'custom'}_${timestamp}`;

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save the composed prompt
  const promptPath = path.join(outputDir, `${runId}_prompt.md`);
  fs.writeFileSync(promptPath, result.prompt, 'utf8');

  // Save run metadata (without raw output — that comes from manual execution)
  const runMeta = {
    run_id: runId,
    config: configKey,
    configName: result.configName,
    fixture: fixtureId,
    task: result.task,
    personas: result.personas,
    persona_count: result.personaCount,
    timestamp: new Date().toISOString(),
    composition_ms: compositionMs,
    prompt_chars: result.promptChars,
    prompt_estimated_tokens: result.promptEstimatedTokens,
    instruction_chars: result.instructionChars,
    instruction_estimated_tokens: result.instructionEstimatedTokens,
    diff_chars: result.diffChars,
    actual_provider_tokens: 'UNAVAILABLE',
    actual_latency_ms: 'UNAVAILABLE',
    raw_output: null, // To be filled after manual execution
    referenceFindings: result.referenceFindings,
  };

  const metaPath = path.join(outputDir, `${runId}_meta.json`);
  fs.writeFileSync(metaPath, JSON.stringify(runMeta, null, 2), 'utf8');

  // Display results
  if (!quiet) {
    log('');
    log(bold(`  ⚗️  Tribunal Review Harness — Config ${configKey}`));
    log(`  ${c('gray', '─'.repeat(50))}`);
    log(`  Configuration:    ${c('cyan', result.configName)}`);
    log(`  Fixture:          ${c('cyan', fixtureId || 'custom')}`);
    log(`  Task:             ${result.task}`);
    log(`  Personas:         ${result.personas.join(', ')}`);
    log(`  Persona count:    ${result.personaCount}`);
    log(`  ${c('gray', '─'.repeat(50))}`);
    log(`  Prompt chars:     ${c('yellow', String(result.promptChars))} (MEASURED)`);
    log(`  Prompt tokens:    ~${c('yellow', String(result.promptEstimatedTokens))} (ESTIMATED)`);
    log(`  Instruction chars:${c('yellow', String(result.instructionChars))} (MEASURED)`);
    log(
      `  Instruction tokens:~${c('yellow', String(result.instructionEstimatedTokens))} (MEASURED)`,
    );
    log(`  Diff chars:       ${c('yellow', String(result.diffChars))} (MEASURED)`);
    log(`  Composition time: ${compositionMs}ms (MEASURED)`);
    log(`  ${c('gray', '─'.repeat(50))}`);
    log(`  Prompt saved:     ${c('cyan', promptPath)}`);
    log(`  Metadata saved:   ${c('cyan', metaPath)}`);
    log('');
    log(bold('  Manual Execution Protocol:'));
    log(`  1. Open ${c('cyan', promptPath)}`);
    log(`  2. Paste the entire contents into an LLM chat (same model/temp for all configs)`);
    log(`  3. Copy the full LLM response`);
    log(`  4. Save it as: ${c('cyan', path.join(outputDir, runId + '_response.md'))}`);
    log(`  5. Update ${c('cyan', metaPath)} with actual_provider_tokens and actual_latency_ms`);
    log(`  6. Run: ${c('cyan', `tk review --analyze ${metaPath}`)}`);
    log('');
  }
}

async function runLiveExecution(configKey, fixtureId, outputDir) {
  // Check if we already generated a prompt for this
  const files = fs
    .readdirSync(outputDir)
    .filter(f => f.startsWith(`${configKey}_${fixtureId}_`) && f.endsWith('_prompt.md'));

  let promptPath = null;
  let promptContent = null;
  let metaPath = null;
  let metaContent = null;

  if (files.length > 0) {
    promptPath = path.join(outputDir, files[0]);
    promptContent = fs.readFileSync(promptPath, 'utf8');
    metaPath = promptPath.replace('_prompt.md', '_meta.json');
    metaContent = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    log(`  Using existing prompt: ${files[0]}`);
  } else {
    log(
      `  No existing prompt found. You must generate it first using 'tk review --config ${configKey} --fixture ${fixtureId}'.`,
    );
    return false;
  }

  if (metaContent.raw_output) {
    log(`  Run already executed (raw_output exists). Skipping.`);
    return true;
  }

  log(`  Calling LLM API...`);
  const result = await runPrompt({
    prompt: promptContent,
    temperature: 0.1,
    maxTokens: 4096,
  });

  if (result.error) {
    err(`  LLM API failed: ${result.error}`);
    return false;
  }

  if (!result.response) {
    err(`  LLM API returned empty response.`);
    return false;
  }

  ok(`  LLM response received. Latency: ${result.latencyMs}ms. Provider: ${result.provider}`);

  // Save response
  const responsePath = promptPath.replace('_prompt.md', '_response.md');
  fs.writeFileSync(responsePath, result.response, 'utf8');

  // Update meta
  metaContent.status = 'success';
  metaContent.provider = result.provider;
  metaContent.model = result.model;
  metaContent.input_tokens = result.inputTokens;
  metaContent.output_tokens = result.outputTokens;
  metaContent.total_tokens = result.totalTokens;
  metaContent.actual_provider_tokens = result.totalTokens; // For legacy analyze script compatibility
  metaContent.actual_latency_ms = result.latencyMs;
  metaContent.latency_ms = result.latencyMs;
  metaContent.response_path = responsePath;
  metaContent.raw_output = result.response;

  fs.writeFileSync(metaPath, JSON.stringify(metaContent, null, 2), 'utf8');

  return true;
}

exports.FIXTURES = FIXTURES;
exports.REVIEWER_CONFIGS = REVIEWER_CONFIGS;
