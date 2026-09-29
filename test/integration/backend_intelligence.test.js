const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('Backend Intelligence Expansion', () => {
  const scriptsDir = path.join(__dirname, '../../.agent/scripts');
  const tmpDir = path.join(__dirname, 'tmp_backend_test');

  beforeAll(() => {
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
  });

  afterAll(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('findings_validator.js should quarantine invalid JSON', () => {
    const validatorPath = path.join(scriptsDir, 'findings_validator.js');
    const inFile = path.join(tmpDir, 'invalid.json');
    const outFile = path.join(tmpDir, 'valid.json');
    const quarantineFile = path.join(tmpDir, 'quarantine.json');

    fs.writeFileSync(inFile, 'invalid json content');

    // Should not throw, should exit 0 and emit empty array
    execSync(
      `node "${validatorPath}" --in="${inFile}" --out="${outFile}" --quarantine="${quarantineFile}"`,
    );

    const outData = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    expect(outData.findings).toEqual([]);

    const qData = JSON.parse(fs.readFileSync(quarantineFile, 'utf8'));
    expect(qData.error).toBeDefined();
  });

  it('findings_validator.js should filter invalid findings', () => {
    const validatorPath = path.join(scriptsDir, 'findings_validator.js');
    const inFile = path.join(tmpDir, 'mixed.json');
    const outFile = path.join(tmpDir, 'valid.json');
    const quarantineFile = path.join(tmpDir, 'quarantine.json');

    const mixed = {
      findings: [
        {
          id: '1',
          category: 'security',
          severity: 'HIGH',
          confidence: 0.9,
          status: 'DETECTED',
          title: 'Valid finding',
          evidence: [{ type: 'source', description: 'x' }],
        }, // valid
        { id: '2', category: 'security' }, // invalid
      ],
    };
    fs.writeFileSync(inFile, JSON.stringify(mixed));

    execSync(
      `node "${validatorPath}" --in="${inFile}" --out="${outFile}" --quarantine="${quarantineFile}"`,
    );

    const outData = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    expect(outData.findings.length).toBe(1);
    expect(outData.findings[0].id).toBe('1');

    const qData = JSON.parse(fs.readFileSync(quarantineFile, 'utf8'));
    expect(qData.quarantined.length).toBe(1);
    expect(qData.quarantined[0].finding.id).toBe('2');
  });

  it('Correlator merges overlapping findings correctly', () => {
    const correlatorPath = path.join(scriptsDir, 'cross_agent_correlator.js');

    const mockFindings1 = {
      findings: [
        {
          id: 'F1',
          category: 'security',
          type: 'sql-injection',
          severity: 'HIGH',
          status: 'DETECTED',
          title: 'SQL injection in search',
          location: { file: 'app.py', line: 10 },
          evidence: [{ type: 'code', description: 'SELECT', location: 'app.py:10' }],
        },
      ],
    };
    const mockFindings2 = {
      findings: [
        {
          id: 'F2',
          category: 'security',
          type: 'sql-injection',
          severity: 'HIGH',
          status: 'DETECTED',
          title: 'SQL injection via interpolation',
          location: { file: 'app.py', line: 12 },
          evidence: [{ type: 'code', description: 'cursor.execute', location: 'app.py:12' }],
        },
      ],
    };

    const f1 = path.join(tmpDir, 'f1.json');
    const f2 = path.join(tmpDir, 'f2.json');
    const merged = path.join(tmpDir, 'merged.json');

    fs.writeFileSync(f1, JSON.stringify(mockFindings1));
    fs.writeFileSync(f2, JSON.stringify(mockFindings2));

    execSync(`node "${correlatorPath}" "${f1}" "${f2}" --out="${merged}"`);

    const result = JSON.parse(fs.readFileSync(merged, 'utf8'));
    expect(result.findings.length).toBe(1); // Same file, nearby lines, same category, same type
    expect(result.findings[0].title).toContain('[CORRELATED]');
  });

  it('backend_report_generator.js generates proper output', () => {
    const reportGenPath = path.join(scriptsDir, 'backend_report_generator.js');
    const inFile = path.join(tmpDir, 'merged.json');
    const outFile = path.join(tmpDir, 'report.md');

    execSync(`node "${reportGenPath}" --in="${inFile}" --out="${outFile}"`);

    const content = fs.readFileSync(outFile, 'utf8');
    expect(content).toContain('TRIBUNAL BACKEND AUDIT');
    expect(content).toContain('Security Findings');
    expect(content).toContain('Validation Results');
  });

  it('backend_audit.js deep detection correctly identifies FastAPI and SQLAlchemy from source code', () => {
    const auditPath = path.join(scriptsDir, 'backend_audit.js');
    const fixtureDir = path.join(__dirname, '../../test/fixtures/backend');
    const result = execSync(`node "${auditPath}" "${fixtureDir}"`).toString();
    expect(result).toContain('FastAPI');
    expect(result).toContain('SQLAlchemy');
    expect(result).toContain('fastapi-pro');
    expect(result).toContain('backend-sqlalchemy');
  });
});
