const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('backend_audit.js', () => {
  const scratchDir = path.join(__dirname, '../../scratch/test-repos');
  const auditScript = path.join(__dirname, '../../.agent/scripts/backend_audit.js');

  beforeAll(() => {
    if (!fs.existsSync(scratchDir)) {
      fs.mkdirSync(scratchDir, { recursive: true });
    }
  });

  afterAll(() => {
    fs.rmSync(scratchDir, { recursive: true, force: true });
  });

  function setupRepo(name, files) {
    const repoPath = path.join(scratchDir, name);
    fs.mkdirSync(repoPath, { recursive: true });
    for (const [filename, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(repoPath, filename), content);
    }
    return repoPath;
  }

  function runAudit(repoPath) {
    return execSync(`node "${auditScript}" "${repoPath}"`, { encoding: 'utf8' });
  }

  it('detects Python-only repository', () => {
    const repo = setupRepo('python-only', {
      'requirements.txt': 'requests==2.26.0\n',
    });
    const output = runAudit(repo);
    expect(output).toContain('Python');
    expect(output).toContain('python-pro');
    expect(output).not.toContain('FastAPI');
  });

  it('detects FastAPI repository', () => {
    const repo = setupRepo('fastapi-only', {
      'requirements.txt': 'fastapi==0.103.0\nuvicorn==0.23.2\n',
    });
    const output = runAudit(repo);
    expect(output).toContain('FastAPI');
    expect(output).toContain('fastapi-pro');
  });

  it('detects FastAPI + PostgreSQL + SQLAlchemy + Alembic', () => {
    const repo = setupRepo('fastapi-pg', {
      'pyproject.toml':
        '[tool.poetry.dependencies]\nfastapi = "^0.103.0"\nsqlalchemy = "^2.0.20"\nalembic = "^1.12.0"\npsycopg2 = "^2.9.7"\n',
    });
    const output = runAudit(repo);
    expect(output).toContain('FastAPI');
    expect(output).toContain('SQLAlchemy');
    expect(output).toContain('Alembic');
    expect(output).toContain('PostgreSQL');
    expect(output).toContain('fastapi-pro');
    expect(output).toContain('backend-sqlalchemy');
    expect(output).toContain('backend-postgresql');
  });

  it('detects FastAPI + Redis + Docker', () => {
    const repo = setupRepo('fastapi-redis', {
      'requirements.txt': 'fastapi\nredis\n',
      Dockerfile: 'FROM python:3.9\n',
    });
    const output = runAudit(repo);
    expect(output).toContain('Docker');
    expect(output).toContain('Redis');
    expect(output).toContain('backend-redis');
  });

  it('detects Node + MongoDB', () => {
    const repo = setupRepo('node-mongo', {
      'package.json': '{"dependencies": {"express": "4.17.1", "mongoose": "5.10.9"}}',
    });
    const output = runAudit(repo);
    expect(output).toContain('Node.js');
    expect(output).toContain('Express');
    expect(output).toContain('MongoDB');
    expect(output).toContain('backend-mongodb');
  });

  it('detects generic skills on mixed or unknown repos', () => {
    const repo = setupRepo('mixed', {
      'package.json': '{"dependencies": {}}',
      'requirements.txt': 'django\n',
    });
    const output = runAudit(repo);
    expect(output).toContain('backend-architecture-auditor');
    expect(output).toContain('backend-performance-auditor');
    expect(output).toContain('api-security-auditor');
  });
});
