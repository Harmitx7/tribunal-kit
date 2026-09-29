const fs = require('fs');
const { execSync } = require('child_process');

const FIXTURES = [
  // Tier 0
  {
    name: 'Documentation-only change',
    files: 'README.md',
    lines: 2,
    task: 'Fix typo in documentation',
    expectedTier: 0,
  },
  {
    name: 'Formatting-only change',
    files: 'src/utils.js',
    lines: 1,
    task: 'Run prettier',
    expectedTier: 0,
  },

  // Tier 1
  {
    name: 'Isolated UI text/style change',
    files: 'src/components/Button.css',
    lines: 5,
    task: 'Update button color to red',
    expectedTier: 1,
  },
  {
    name: 'Simple component modification',
    files: 'src/components/Header.jsx',
    lines: 15,
    task: 'Add logo image to header',
    expectedTier: 1,
  },
  {
    name: 'Simple non-security bug fix',
    files: 'src/utils/math.js',
    lines: 3,
    task: 'Fix off-by-one error in loop',
    expectedTier: 1,
  },

  // Tier 2
  {
    name: 'API modification',
    files: 'src/api/users.js',
    lines: 30,
    task: 'Add pagination to users list endpoint',
    expectedTier: 2,
  },
  {
    name: 'Multi-file feature',
    files: 'src/components/List.jsx,src/hooks/useList.js,src/types.ts',
    lines: 150,
    task: 'Implement virtualized list component',
    expectedTier: 2,
  },
  {
    name: 'Database query modification',
    files: 'src/db/queries.sql',
    lines: 25,
    task: 'Optimize join query for performance',
    expectedTier: 2,
  },

  // Tier 3
  {
    name: 'Authentication change',
    files: 'src/auth/login.js',
    lines: 45,
    task: 'Implement MFA login flow',
    expectedTier: 3,
  },
  {
    name: 'Authorization change',
    files: 'src/middleware/rbac.js',
    lines: 60,
    task: 'Add role-based access control checks',
    expectedTier: 3,
  },
  {
    name: 'Database schema change',
    files: 'prisma/schema.prisma',
    lines: 10,
    task: 'Add new users table schema',
    expectedTier: 3,
  },
  {
    name: 'Infrastructure change',
    files: 'docker-compose.yml',
    lines: 50,
    task: 'Update redis container configuration',
    expectedTier: 3,
  },
  {
    name: 'Security-sensitive dependency change',
    files: 'package.json,package-lock.json',
    lines: 10,
    task: 'Update passport auth library to latest version',
    expectedTier: 3,
  },

  // Auth Adversarial
  {
    name: 'Adversarial Auth 1',
    files: 'src/components/Form.js',
    lines: 15,
    task: 'Update identity verification logic',
    expectedTier: 3,
  },
  {
    name: 'Adversarial Auth 2',
    files: 'src/session.js',
    lines: 10,
    task: 'Modify sign-in session handling',
    expectedTier: 3,
  },
  {
    name: 'Adversarial Auth 3',
    files: 'src/api/refresh.js',
    lines: 20,
    task: 'Change token refresh behavior',
    expectedTier: 3,
  },
  {
    name: 'Adversarial Auth 4',
    files: 'src/state.js',
    lines: 5,
    task: 'Alter login state management',
    expectedTier: 3,
  },
  {
    name: 'Adversarial Auth 5',
    files: 'src/oauth.js',
    lines: 15,
    task: 'Change OAuth callback handling',
    expectedTier: 3,
  },
  {
    name: 'Adversarial Auth 6',
    files: 'src/sso.js',
    lines: 25,
    task: 'Modify SSO integration',
    expectedTier: 3,
  },

  // AuthZ Adversarial
  {
    name: 'Adversarial AuthZ 1',
    files: 'src/roles.js',
    lines: 10,
    task: 'Change role permissions',
    expectedTier: 3,
  },
  {
    name: 'Adversarial AuthZ 2',
    files: 'src/access.js',
    lines: 15,
    task: 'Modify access-control behavior',
    expectedTier: 3,
  },
  {
    name: 'Adversarial AuthZ 3',
    files: 'src/permissions.js',
    lines: 20,
    task: 'Update permission inheritance',
    expectedTier: 3,
  },
  {
    name: 'Adversarial AuthZ 4',
    files: 'src/ownership.js',
    lines: 12,
    task: 'Change resource ownership checks',
    expectedTier: 3,
  },
  {
    name: 'Adversarial AuthZ 5',
    files: 'src/admin.js',
    lines: 8,
    task: 'Modify admin capabilities',
    expectedTier: 3,
  },

  // Secrets Adversarial
  {
    name: 'Adversarial Secrets 1',
    files: 'src/config.js',
    lines: 1,
    task: 'Rotate API keys',
    expectedTier: 3,
  },
  {
    name: 'Adversarial Secrets 2',
    files: 'src/services.js',
    lines: 5,
    task: 'Replace service credentials',
    expectedTier: 3,
  },
  {
    name: 'Adversarial Secrets 3',
    files: 'src/loader.js',
    lines: 10,
    task: 'Change secret loading',
    expectedTier: 3,
  },
  {
    name: 'Adversarial Secrets 4',
    files: 'src/credentials.js',
    lines: 15,
    task: 'Update credential management',
    expectedTier: 3,
  },
  {
    name: 'Adversarial Secrets 5',
    files: 'src/signing.js',
    lines: 5,
    task: 'Modify signing-key configuration',
    expectedTier: 3,
  },

  // DB Adversarial
  {
    name: 'Adversarial DB 1',
    files: 'src/db.js',
    lines: 5,
    task: 'Update postgres connection pool size',
    expectedTier: 3,
  },
  {
    name: 'Adversarial DB 2',
    files: 'src/tx.js',
    lines: 15,
    task: 'Change transaction handling',
    expectedTier: 3,
  },
  {
    name: 'Adversarial DB 3',
    files: 'src/migrate.js',
    lines: 25,
    task: 'Modify migration behavior',
    expectedTier: 3,
  },
  {
    name: 'Adversarial DB 4',
    files: 'src/schema.js',
    lines: 30,
    task: 'Alter schema evolution',
    expectedTier: 3,
  },
  {
    name: 'Adversarial DB 5',
    files: 'src/lifecycle.js',
    lines: 10,
    task: 'Change database connection lifecycle',
    expectedTier: 3,
  },

  // Infra Adversarial
  {
    name: 'Adversarial Infra 1',
    files: 'src/containers.yaml',
    lines: 5,
    task: 'Change container privileges',
    expectedTier: 3,
  },
  {
    name: 'Adversarial Infra 2',
    files: 'deploy.yml',
    lines: 15,
    task: 'Modify deployment configuration',
    expectedTier: 3,
  },
  {
    name: 'Adversarial Infra 3',
    files: 'network.json',
    lines: 20,
    task: 'Update network policy',
    expectedTier: 3,
  },
  {
    name: 'Adversarial Infra 4',
    files: 'tls.config',
    lines: 10,
    task: 'Change TLS configuration',
    expectedTier: 3,
  },
  {
    name: 'Adversarial Infra 5',
    files: 'certs.sh',
    lines: 5,
    task: 'Rotate certificates',
    expectedTier: 3,
  },
  {
    name: 'Adversarial Infra 6',
    files: 'ci.yml',
    lines: 12,
    task: 'Modify CI credential handling',
    expectedTier: 3,
  },

  // Diff adversarial
  {
    name: 'Adversarial Diff 1',
    files: 'src/backend.js',
    lines: 10,
    task: 'update backend logic',
    diff: 'jwt.verify(token)',
    expectedTier: 3,
  },
  {
    name: 'Adversarial Diff 2',
    files: 'src/backend.js',
    lines: 10,
    task: 'update backend logic',
    diff: 'ALTER TABLE users',
    expectedTier: 3,
  },
  {
    name: 'Adversarial Diff 3',
    files: 'src/backend.js',
    lines: 10,
    task: 'update backend logic',
    diff: 'process.env.AWS_SECRET',
    expectedTier: 3,
  },

  // Negative Controls
  {
    name: 'Negative 1',
    files: 'docs/jwt.md',
    lines: 5,
    task: 'Update documentation about JWT',
    expectedTier: 1,
  },
  {
    name: 'Negative 2',
    files: 'README.md',
    lines: 2,
    task: 'Rename SQL example in README',
    expectedTier: 1,
  },
  {
    name: 'Negative 3',
    files: 'docs/docker.md',
    lines: 10,
    task: 'Update Docker documentation',
    expectedTier: 1,
  },
  {
    name: 'Negative 4',
    files: 'src/Button.js',
    lines: 2,
    task: 'Change UI text from "Log in" to "Sign in"',
    expectedTier: 1,
  },
  {
    name: 'Negative 5',
    files: 'docs/api.md',
    lines: 20,
    task: 'Document API-key usage',
    expectedTier: 1,
  },
  {
    name: 'Negative 6',
    files: 'docs/auth.md',
    lines: 15,
    task: 'Update authentication documentation',
    expectedTier: 1,
  },
];

function runImpactTier(files, lines, task, diffStr) {
  const start = Date.now();
  try {
    const diffArg = diffStr ? ` --diff "${diffStr}"` : '';
    const output = execSync(
      `node bin/wrapper.js impact-tier --files "${files}" --lines ${lines} --task "${task}"${diffArg}`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    const duration = Date.now() - start;
    const jsonMatch = output.match(/\{.*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      return { ...data, duration_ms: duration };
    }
  } catch (e) {
    console.error('Failed to run impact-tier', e.message);
  }
  return { tier: -1, duration_ms: Date.now() - start };
}

function selectReviewers(task, files, tier) {
  if (tier <= 1) return [];
  const req = (task + ' ' + files).toLowerCase();
  const reviewers = new Set();

  if (tier >= 2) {
    reviewers.add('precedence-reviewer');
    reviewers.add('security-auditor');
  }

  if (req.includes('api') || req.includes('route') || req.includes('endpoint')) {
    reviewers.add('backend-specialist');
    reviewers.add('type-safety-reviewer');
  }
  if (
    req.includes('sql') ||
    req.includes('query') ||
    req.includes('database') ||
    req.includes('schema') ||
    req.includes('prisma')
  ) {
    reviewers.add('sql-reviewer');
  }
  if (req.includes('component') || req.includes('react') || req.includes('jsx')) {
    reviewers.add('frontend-reviewer');
    reviewers.add('type-safety-reviewer');
  }
  if (req.includes('ui') || req.includes('design') || req.includes('css')) {
    reviewers.add('frontend-reviewer');
    reviewers.add('accessibility-reviewer');
  }
  if (req.includes('auth') || req.includes('login') || req.includes('rbac')) {
    reviewers.add('security-auditor');
    reviewers.add('logic-reviewer');
  }
  if (req.includes('infrastructure') || req.includes('docker')) {
    reviewers.add('devops-engineer');
  }
  if (req.includes('dependency') || req.includes('package')) {
    reviewers.add('dependency-reviewer');
  }

  // Tier 2 cap
  const arr = Array.from(reviewers);
  if (tier === 2) {
    return arr.slice(0, 2); // Cap at 2
  }
  return arr;
}

async function runBenchmark() {
  console.log('=== TRIBUNAL KIT EFFICIENCY BENCHMARK ===');
  const results = [];

  let totalSystem1Latency = 0;
  let safetyViolations = 0;

  for (const fix of FIXTURES) {
    const tierResult = runImpactTier(fix.files, fix.lines, fix.task, fix.diff);
    const actualTier = tierResult.tier;
    totalSystem1Latency += tierResult.duration_ms;

    const reviewers = selectReviewers(fix.task, fix.files, actualTier);

    const falseLowTier = fix.expectedTier >= 3 && actualTier < 2; // T3 bypassing to T0/T1 is a safety violation

    if (falseLowTier && !fix.name.startsWith('Negative')) {
      safetyViolations++;
    }

    results.push({
      scenario: fix.name,
      expected_tier: fix.expectedTier,
      actual_tier: actualTier,
      sys1_latency_ms: tierResult.duration_ms,
      reviewers_executed: reviewers.length,
      false_low_tier: falseLowTier,
    });

    console.log(
      `[${fix.expectedTier === actualTier || (fix.expectedTier === 3 && actualTier === 2 && !falseLowTier) ? 'PASS' : 'WARN'}] ${fix.name} -> Expected: T${fix.expectedTier}, Actual: T${actualTier}. Reviewers: ${reviewers.length}`,
    );
    if (falseLowTier && !fix.name.startsWith('Negative')) {
      console.error(`  CRITICAL REGRESSION: High risk task routed to Tier ${actualTier}!`);
    }
  }

  fs.writeFileSync('benchmark_results.json', JSON.stringify(results, null, 2));
  console.log(`\nBenchmark complete. Results saved to benchmark_results.json.`);
  console.log(`Average System-1 Latency: ${Math.round(totalSystem1Latency / FIXTURES.length)}ms`);

  if (safetyViolations > 0) {
    console.error(
      `\n[FATAL] SAFETY INVARIANT FAILED: ${safetyViolations} high-risk fixtures entered Tier 0/1 Fast-Pass.`,
    );
    process.exit(1);
  }
}

runBenchmark();
