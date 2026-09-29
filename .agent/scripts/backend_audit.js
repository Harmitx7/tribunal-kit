#!/usr/bin/env node
/**
 * backend_audit.js — Backend Intelligence Stack Detection and Skill Activator
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { BOLD, RESET, BLUE, fail, warn, sectionHeader } = require('./_colors');

function fileExists(projectRoot, filename) {
  return fs.existsSync(path.join(projectRoot, filename));
}

function readFileContent(projectRoot, filename) {
  const filepath = path.join(projectRoot, filename);
  if (!fs.existsSync(filepath)) return '';
  return fs.readFileSync(filepath, 'utf8');
}

function deepSearch(dir, pattern, depth = 3) {
  if (depth <= 0) return false;
  let items;
  try {
    items = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return false;
  }
  for (const item of items) {
    if (
      item.isDirectory() &&
      !['node_modules', '.git', 'venv', '__pycache__'].includes(item.name)
    ) {
      if (deepSearch(path.join(dir, item.name), pattern, depth - 1)) return true;
    } else if (
      item.isFile() &&
      (item.name.endsWith('.py') || item.name.endsWith('.js') || item.name.endsWith('.ts'))
    ) {
      try {
        const content = fs.readFileSync(path.join(dir, item.name), 'utf8');
        if (pattern.test(content)) return true;
      } catch {}
    }
  }
  return false;
}

function detectStack(projectRoot) {
  const stack = [];
  const skills = [];

  // Python detection
  let hasPython = false;
  let pyContent = '';
  ['requirements.txt', 'pyproject.toml', 'Pipfile'].forEach(f => {
    if (fileExists(projectRoot, f)) {
      hasPython = true;
      pyContent += readFileContent(projectRoot, f);
    }
  });

  // Node detection
  let hasNode = false;
  let nodeContent = '';
  if (fileExists(projectRoot, 'package.json')) {
    hasNode = true;
    nodeContent += readFileContent(projectRoot, 'package.json');
  }

  if (fileExists(projectRoot, 'Dockerfile') || fileExists(projectRoot, 'docker-compose.yml')) {
    stack.push({ name: 'Docker', status: 'DETECTED' });
  }

  if (hasPython) {
    stack.push({ name: 'Python', status: 'DETECTED' });
    skills.push('python-pro');

    // Deep evidence-based detection for FastAPI
    if (/fastapi/i.test(pyContent) || deepSearch(projectRoot, /FastAPI\(|APIRouter\(|@app\./)) {
      stack.push({ name: 'FastAPI', status: 'DETECTED' });
      skills.push('fastapi-pro');
      skills.push('api-security-auditor');
    }

    if (
      /sqlalchemy/i.test(pyContent) ||
      deepSearch(
        projectRoot,
        /import sqlalchemy|from sqlalchemy|declarative_base|Session|AsyncSession/,
      )
    ) {
      stack.push({ name: 'SQLAlchemy', status: 'DETECTED' });
      skills.push('backend-sqlalchemy');
    }

    if (
      fileExists(projectRoot, 'alembic.ini') ||
      fileExists(projectRoot, 'alembic') ||
      /alembic/i.test(pyContent)
    ) {
      stack.push({ name: 'Alembic', status: 'DETECTED' });
      skills.push('backend-alembic');
    }

    if (/psycopg2|asyncpg/i.test(pyContent)) {
      stack.push({ name: 'PostgreSQL', status: 'DETECTED' });
      skills.push('backend-postgresql');
    }
    if (/redis/i.test(pyContent) || deepSearch(projectRoot, /import redis|redis\.asyncio/)) {
      stack.push({ name: 'Redis', status: 'DETECTED' });
      skills.push('backend-redis');
    }
  }

  if (hasNode) {
    stack.push({ name: 'Node.js', status: 'DETECTED' });
    skills.push('nodejs-best-practices');
    if (/express/i.test(nodeContent)) stack.push({ name: 'Express', status: 'DETECTED' });
    if (/fastify/i.test(nodeContent)) stack.push({ name: 'Fastify', status: 'DETECTED' });
    if (/pg/i.test(nodeContent)) {
      stack.push({ name: 'PostgreSQL', status: 'DETECTED' });
      skills.push('backend-postgresql');
    }
    if (/mysql2?/i.test(nodeContent)) {
      stack.push({ name: 'MySQL', status: 'DETECTED' });
      skills.push('backend-mysql');
    }
    if (/mongodb|mongoose/i.test(nodeContent)) {
      stack.push({ name: 'MongoDB', status: 'DETECTED' });
      skills.push('backend-mongodb');
    }
    if (/redis|ioredis/i.test(nodeContent)) {
      stack.push({ name: 'Redis', status: 'DETECTED' });
      skills.push('backend-redis');
    }
    if (/prisma/i.test(nodeContent)) {
      stack.push({ name: 'Prisma', status: 'DETECTED' });
    }
    if (/sqlite3?/i.test(nodeContent)) {
      stack.push({ name: 'SQLite', status: 'DETECTED' });
      skills.push('backend-sqlite');
    }
  }

  // Architecture detection
  if (fileExists(projectRoot, 'src/domain') && fileExists(projectRoot, 'src/infrastructure')) {
    stack.push({ name: 'Clean Architecture (DDD)', status: 'LIKELY' });
  }
  if (fileExists(projectRoot, 'src/ports') && fileExists(projectRoot, 'src/adapters')) {
    stack.push({ name: 'Hexagonal Architecture', status: 'LIKELY' });
  }
  if (deepSearch(projectRoot, /eventbus|kafka|rabbitmq|publish\(|subscribe\(/i, 2)) {
    stack.push({ name: 'Event-driven architecture', status: 'LIKELY' });
  }

  skills.push('backend-architecture-auditor');
  skills.push('backend-performance-auditor');
  skills.push('backend-testing-auditor');
  skills.push('api-security-auditor');
  skills.push('api-patterns');

  return { stack, skills: [...new Set(skills)] };
}

function main() {
  const args = process.argv.slice(2);
  const targetPath = args[0] || '.';
  const auditRoot = args.find(a => a.startsWith('--root='))?.split('=')[1];
  const projectRoot = path.resolve(targetPath);

  if (!fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) {
    fail(`Directory not found: ${projectRoot}`);
    process.exit(1);
  }

  // Path boundary enforcement (§16): reject paths escaping the audit root
  if (auditRoot) {
    const resolvedRoot = path.resolve(auditRoot);
    if (!projectRoot.startsWith(resolvedRoot)) {
      fail(`Path boundary violation: ${projectRoot} is outside audit root ${resolvedRoot}`);
      process.exit(1);
    }
  }

  console.log(`${BOLD}Tribunal — backend_audit.js${RESET}`);
  console.log(`Project: ${projectRoot}`);

  const { stack, skills } = detectStack(projectRoot);

  console.log(sectionHeader('Detected Backend Stack'));
  if (stack.length > 0) {
    stack.forEach(tech => console.log(`  ${BLUE}✓${RESET} ${tech.name} [${tech.status}]`));
  } else {
    warn('No major backend stack detected automatically.');
  }

  console.log(sectionHeader('Required Tribunal Skills'));
  console.log(`The following skills must be loaded before performing backend analysis:`);
  skills.forEach(skill => console.log(`  - ${skill}`));

  console.log(`\n${BOLD}INSTRUCTIONS FOR AGENT:${RESET}`);
  console.log(`1. Load the required skills above using their exact names.`);
  console.log(`2. Perform the analysis across the domains identified.`);
  console.log(`3. Output all findings strictly using the Machine-Readable Finding Contract:
   [
     {
       "id": "BOLA-001",
       "category": "authorization",
       "type": "BOLA",
       "severity": "HIGH",
       "confidence": 0.94,
       "status": "DETECTED",
       "title": "Missing object-level authorization",
       "location": { "file": "app/routes/users.py", "line": 42 },
       "evidence": [
         { "type": "source", "description": "User record is retrieved using attacker-controlled user_id", "location": "app/routes/users.py:42" }
       ],
       "impact": "Authenticated users may access another user's resource.",
       "remediation": "Validate ownership before returning the resource.",
       "validation": { "required": true }
     }
   ]`);
  console.log(`4. Run '.agent/scripts/findings_validator.js --in=findings.json --out=valid.json'`);
  console.log(
    `5. Run '.agent/scripts/cross_agent_correlator.js --in=valid.json --out=correlated.json'`,
  );
  console.log(
    `6. Run '.agent/scripts/validation_engine.js --in=correlated.json --out=validated.json'`,
  );
  console.log(
    `7. Run '.agent/scripts/backend_report_generator.js --in=validated.json --out=final_report.md'`,
  );
}

if (require.main === module) {
  main();
}
