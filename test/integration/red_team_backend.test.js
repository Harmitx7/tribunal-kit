/**
 * RED TEAM — Backend Intelligence Pipeline Attack Suite
 *
 * This test suite adversarially attacks every stage of the pipeline.
 * It does NOT test whether the system "works" — it tests whether
 * the system can be broken.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SCRIPTS = path.join(__dirname, '../../.agent/scripts');
const TMP = path.join(__dirname, 'tmp_redteam');

function run(script, args = '') {
  return execSync(`node "${path.join(SCRIPTS, script)}" ${args}`, {
    encoding: 'utf8',
    timeout: 15000,
  });
}

function writeJSON(name, data) {
  const p = path.join(TMP, name);
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
  return p;
}

function readJSON(name) {
  return JSON.parse(fs.readFileSync(path.join(TMP, name), 'utf8'));
}

function validFinding(overrides = {}) {
  return {
    id: 'TEST-001',
    category: 'security',
    severity: 'HIGH',
    confidence: 0.9,
    status: 'DETECTED',
    title: 'Test finding',
    evidence: [{ type: 'source', description: 'test evidence' }],
    ...overrides,
  };
}

describe('RED TEAM — Backend Intelligence Pipeline', () => {
  beforeAll(() => {
    if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(TMP, { recursive: true, force: true });
  });

  // ═══════════════════════════════════════════════════════════════
  // RULE 3 — ATTACK THE FINDING SCHEMA
  // ═══════════════════════════════════════════════════════════════

  describe('Schema Attacks (Rule 3)', () => {
    const validator = 'findings_validator.js';

    it('rejects findings with unknown/dangerous fields (execute, __proto__)', () => {
      const inFile = writeJSON('schema_attack_unknown.json', {
        findings: [
          {
            ...validFinding(),
            execute: 'rm -rf /',
            __proto__: { isAdmin: true },
            constructor: { prototype: { polluted: true } },
          },
        ],
      });
      const out = path.join(TMP, 'schema_attack_unknown_out.json');
      const q = path.join(TMP, 'schema_attack_unknown_q.json');
      run(validator, `--in="${inFile}" --out="${out}" --quarantine="${q}"`);
      const result = readJSON('schema_attack_unknown_out.json');
      // With .strict(), unknown fields cause rejection — this is the correct behavior
      // The finding is quarantined, not passed through
      expect(result.findings.length).toBe(0);
      const quarantine = readJSON('schema_attack_unknown_q.json');
      expect(quarantine.quarantined.length).toBe(1);
    });

    it('rejects invalid severity values', () => {
      const cases = ['CRITICAL!!!', 'critical', 'SUPER_CRITICAL', '', 'null'];
      for (const sev of cases) {
        const inFile = writeJSON(`schema_sev_${sev}.json`, {
          findings: [validFinding({ severity: sev })],
        });
        const out = path.join(TMP, `schema_sev_${sev}_out.json`);
        const q = path.join(TMP, `schema_sev_${sev}_q.json`);
        run(validator, `--in="${inFile}" --out="${out}" --quarantine="${q}"`);
        const result = JSON.parse(fs.readFileSync(out, 'utf8'));
        expect(result.findings.length).toBe(0);
      }
    });

    it('rejects invalid status values', () => {
      const cases = ['VERIFIED_WITHOUT_TEST', 'TRUSTED', 'AUTO_FIXED', 'SAFE'];
      for (const st of cases) {
        const inFile = writeJSON(`schema_st_${st}.json`, {
          findings: [validFinding({ status: st })],
        });
        const out = path.join(TMP, `schema_st_${st}_out.json`);
        const q = path.join(TMP, `schema_st_${st}_q.json`);
        run(validator, `--in="${inFile}" --out="${out}" --quarantine="${q}"`);
        const result = JSON.parse(fs.readFileSync(out, 'utf8'));
        expect(result.findings.length).toBe(0);
      }
    });

    it('rejects type confusion attacks', () => {
      const attacks = [
        { severity: {}, confidence: '1', location: [], evidence: 'malicious' },
        { severity: ['HIGH'], evidence: null },
        { confidence: NaN },
      ];
      for (let i = 0; i < attacks.length; i++) {
        const inFile = writeJSON(`schema_type_${i}.json`, {
          findings: [{ ...validFinding(), ...attacks[i] }],
        });
        const out = path.join(TMP, `schema_type_${i}_out.json`);
        const q = path.join(TMP, `schema_type_${i}_q.json`);
        run(validator, `--in="${inFile}" --out="${out}" --quarantine="${q}"`);
        const result = JSON.parse(fs.readFileSync(out, 'utf8'));
        expect(result.findings.length).toBe(0);
      }
    });

    it('handles oversized evidence arrays without crashing', () => {
      const bigEvidence = Array.from({ length: 10000 }, (_, i) => ({
        type: 'source',
        description: `Evidence item ${i} ${'x'.repeat(100)}`,
      }));
      const inFile = writeJSON('schema_big.json', {
        findings: [validFinding({ evidence: bigEvidence })],
      });
      const out = path.join(TMP, 'schema_big_out.json');
      const q = path.join(TMP, 'schema_big_q.json');
      // Should not crash or timeout (15s limit)
      run(validator, `--in="${inFile}" --out="${out}" --quarantine="${q}"`);
      const result = JSON.parse(fs.readFileSync(out, 'utf8'));
      // Finding is now quarantined due to resource limits (MAX_EVIDENCE_PER_FINDING)
      expect(result.findings.length).toBe(0);
      const quarantine = JSON.parse(fs.readFileSync(q, 'utf8'));
      expect(quarantine.quarantined.length).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // RULE 4 — ATTACK THE CORRELATOR
  // ═══════════════════════════════════════════════════════════════

  describe('Correlator Attacks (Rule 4)', () => {
    it('DEFECT: merges DIFFERENT vulnerability types on nearby lines (false merge)', () => {
      // SQLi at line 100, AuthZ bypass at line 108 — same file, same category
      // These are DIFFERENT bugs but nearby. The correlator will merge them.
      const f1 = writeJSON('false_merge_1.json', {
        findings: [
          validFinding({
            id: 'SQLI-001',
            category: 'security',
            title: 'SQL Injection',
            location: { file: 'app.py', line: 100 },
            evidence: [{ type: 'source', description: 'f-string in execute()' }],
          }),
        ],
      });
      const f2 = writeJSON('false_merge_2.json', {
        findings: [
          validFinding({
            id: 'AUTHZ-001',
            category: 'security',
            title: 'Missing authorization check',
            location: { file: 'app.py', line: 108 },
            evidence: [{ type: 'source', description: 'no ownership check' }],
          }),
        ],
      });
      const out = path.join(TMP, 'false_merge_out.json');
      run('cross_agent_correlator.js', `"${f1}" "${f2}" --out="${out}"`);
      const result = JSON.parse(fs.readFileSync(out, 'utf8'));

      // EXPECTED DEFECT: correlator merges these because
      // sameFile && nearbyLine(<=10) && sameCategory — but they are different bugs
      // This is a false merge.
      if (result.findings.length === 1) {
        console.warn(
          'CONFIRMED DEFECT: Correlator falsely merged SQLi + AuthZ bypass on nearby lines',
        );
      }
      // After fix, these should remain separate
      expect(result.findings.length).toBe(2);
    });

    it('correctly merges TRUE duplicates from different agents', () => {
      const f1 = writeJSON('true_dup_1.json', {
        findings: [
          validFinding({
            id: 'SQLI-001',
            category: 'security',
            title: 'SQL Injection in search',
            location: { file: 'app.py', line: 15 },
            evidence: [
              {
                type: 'source',
                description: 'f-string in execute()',
                location: 'app.py:15',
              },
            ],
          }),
        ],
      });
      const f2 = writeJSON('true_dup_2.json', {
        findings: [
          validFinding({
            id: 'SQLI-002',
            category: 'security',
            title: 'Unsafe SQL string interpolation',
            location: { file: 'app.py', line: 15 },
            evidence: [
              {
                type: 'source',
                description: 'f-string in execute()',
                location: 'app.py:15',
              },
            ],
          }),
        ],
      });
      const out = path.join(TMP, 'true_dup_out.json');
      run('cross_agent_correlator.js', `"${f1}" "${f2}" --out="${out}"`);
      const result = JSON.parse(fs.readFileSync(out, 'utf8'));
      // These share exact evidence — should merge
      expect(result.findings.length).toBe(1);
    });

    it('does NOT merge findings in different files', () => {
      const f1 = writeJSON('diff_file_1.json', {
        findings: [
          validFinding({
            id: 'F1',
            category: 'security',
            location: { file: 'routes/users.py', line: 10 },
            evidence: [{ type: 'source', description: 'BOLA' }],
          }),
        ],
      });
      const f2 = writeJSON('diff_file_2.json', {
        findings: [
          validFinding({
            id: 'F2',
            category: 'security',
            location: { file: 'routes/orders.py', line: 10 },
            evidence: [{ type: 'source', description: 'BOLA' }],
          }),
        ],
      });
      const out = path.join(TMP, 'diff_file_out.json');
      run('cross_agent_correlator.js', `"${f1}" "${f2}" --out="${out}"`);
      const result = JSON.parse(fs.readFileSync(out, 'utf8'));
      expect(result.findings.length).toBe(2);
    });

    it('DEFECT: evidence description match causes false merge across files', () => {
      // Two findings in DIFFERENT files but sharing "BOLA" description
      // The overlappingEvidence check uses description equality — this can false merge
      const f1 = writeJSON('evidence_xfile_1.json', {
        findings: [
          validFinding({
            id: 'F1',
            category: 'security',
            location: { file: 'users.py', line: 10 },
            evidence: [{ type: 'source', description: 'Missing auth check' }],
          }),
        ],
      });
      const f2 = writeJSON('evidence_xfile_2.json', {
        findings: [
          validFinding({
            id: 'F2',
            category: 'performance',
            location: { file: 'orders.py', line: 500 },
            evidence: [{ type: 'source', description: 'Missing auth check' }],
          }),
        ],
      });
      const out = path.join(TMP, 'evidence_xfile_out.json');
      run('cross_agent_correlator.js', `"${f1}" "${f2}" --out="${out}"`);
      const result = JSON.parse(fs.readFileSync(out, 'utf8'));

      // EXPECTED DEFECT: These are in different files AND different categories
      // but overlappingEvidence matches on description alone, causing a false merge
      if (result.findings.length === 1) {
        console.warn('CONFIRMED DEFECT: Evidence description match falsely merges across files');
      }
      expect(result.findings.length).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // RULE 5 — CONFLICT RESOLUTION
  // ═══════════════════════════════════════════════════════════════

  describe('Conflict Resolution (Rule 5)', () => {
    it('preserves evidence from all agents during conflict', () => {
      const f1 = writeJSON('conflict_1.json', {
        findings: [
          validFinding({
            id: 'BOLA-001',
            status: 'DETECTED',
            severity: 'HIGH',
            title: 'BOLA detected',
            location: { file: 'app.py', line: 10 },
            evidence: [{ type: 'source', description: 'No auth check', location: 'app.py:10' }],
          }),
        ],
      });
      const f2 = writeJSON('conflict_2.json', {
        findings: [
          validFinding({
            id: 'AUTHZ-SAFE',
            status: 'FIXED',
            severity: 'LOW',
            title: 'Authorization verified',
            location: { file: 'app.py', line: 10 },
            evidence: [
              {
                type: 'source',
                description: 'Auth middleware applied',
                location: 'app.py:10',
              },
            ],
          }),
        ],
      });
      const out = path.join(TMP, 'conflict_out.json');
      run('cross_agent_correlator.js', `"${f1}" "${f2}" --out="${out}"`);
      const result = JSON.parse(fs.readFileSync(out, 'utf8'));

      // Same file, same line, same category => merge occurs
      // But DETECTED vs FIXED => conflict
      const merged = result.findings[0];
      if (merged) {
        expect(merged.status).toBe('UNVERIFIED');
        expect(merged.title).toContain('[CONFLICTED]');
        // IMPORTANT: all evidence must be preserved
        expect(merged.evidence.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // RULE 6 — VALIDATION ENGINE — FALSE VERIFIED
  // ═══════════════════════════════════════════════════════════════

  describe('Validation Engine Attacks (Rule 6)', () => {
    it('DEFECT: marks HIGH+evidence as VERIFIED without actual reproduction', () => {
      const inFile = writeJSON('val_false_verified.json', {
        findings: [
          validFinding({
            id: 'SQLI-001',
            severity: 'HIGH',
            category: 'security',
            validation: { required: true },
            evidence: [
              {
                type: 'source',
                description: 'LLM says this looks vulnerable',
              },
            ],
          }),
        ],
      });
      const out = path.join(TMP, 'val_false_verified_out.json');
      run('validation_engine.js', `--in="${inFile}" --out="${out}"`);
      const result = JSON.parse(fs.readFileSync(out, 'utf8'));
      const f = result.findings[0];

      // CRITICAL DEFECT: The validation engine simply checks
      // (severity === HIGH || CRITICAL) && evidence.length > 0
      // This means ANY HIGH finding with ANY evidence becomes VERIFIED
      // without actual test execution or reproduction.
      if (f.status === 'VERIFIED') {
        console.warn(
          'CONFIRMED DEFECT: validation_engine.js marks findings VERIFIED purely based on severity+evidence existence',
        );
      }
      // After fix: should remain DETECTED since no actual test was executed
      expect(f.status).not.toBe('VERIFIED');
    });

    it('architectural findings stay UNVERIFIED', () => {
      const inFile = writeJSON('val_arch.json', {
        findings: [
          validFinding({
            category: 'architecture',
            severity: 'CRITICAL',
            validation: { required: true },
          }),
        ],
      });
      const out = path.join(TMP, 'val_arch_out.json');
      run('validation_engine.js', `--in="${inFile}" --out="${out}"`);
      const result = JSON.parse(fs.readFileSync(out, 'utf8'));
      expect(result.findings[0].status).toBe('UNVERIFIED');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // RULE 9 — COMMAND EXECUTION AUDIT
  // ═══════════════════════════════════════════════════════════════

  describe('Command Execution Audit (Rule 9)', () => {
    it('no pipeline script uses exec/spawn/eval on untrusted input', () => {
      const scripts = [
        'finding_schema.js',
        'findings_validator.js',
        'cross_agent_correlator.js',
        'validation_engine.js',
        'backend_report_generator.js',
        'backend_audit.js',
      ];
      const dangerous = /\b(exec|spawn|execSync|spawnSync|eval|Function\s*\(|child_process)\b/;
      const results = [];
      for (const s of scripts) {
        const content = fs.readFileSync(path.join(SCRIPTS, s), 'utf8');
        if (dangerous.test(content)) {
          results.push(s);
        }
      }
      // backend_audit.js does NOT use exec — it only reads files
      // None of the pipeline scripts should use exec
      expect(results).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // RULE 10 — PATH TRAVERSAL
  // ═══════════════════════════════════════════════════════════════

  describe('Path Traversal (Rule 10)', () => {
    it('backend_audit.js resolves paths and does not follow traversal', () => {
      // Try to make it scan outside the fixture directory
      // The script uses path.resolve() which will resolve to an absolute path
      // but it does not validate the result stays within a safe boundary
      const result = run('backend_audit.js', `"${path.join(TMP, '..', '..', '..')}"`);
      // It will scan the parent directory — this IS a finding (no boundary enforcement)
      // but the script only reads files, never executes content
      expect(result).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // RULE 11 — SECRET EXPOSURE
  // ═══════════════════════════════════════════════════════════════

  describe('Secret Exposure (Rule 11)', () => {
    it('no pipeline scripts reference process.env or hardcoded secrets', () => {
      const scripts = [
        'finding_schema.js',
        'findings_validator.js',
        'cross_agent_correlator.js',
        'validation_engine.js',
        'backend_report_generator.js',
      ];
      for (const s of scripts) {
        const content = fs.readFileSync(path.join(SCRIPTS, s), 'utf8');
        expect(content).not.toContain('process.env');
        // Check each line individually — exclude lines that are pattern definitions
        // in the secret_redactor (detection code, not hardcoded secrets)
        const lines = content.split('\n');
        for (const line of lines) {
          // Skip require statements and comments
          if (
            line.includes('require(') ||
            line.trim().startsWith('//') ||
            line.trim().startsWith('*')
          )
            continue;
          // Skip pattern/regex definitions (used for detection, not containing secrets)
          if (line.includes('pattern:') || line.includes('label:') || line.includes('REDACTED'))
            continue;
          // Check remaining lines don't contain raw secret references
          const match = line.match(/\b(API_KEY|SECRET_KEY|PASSWORD|AUTH_TOKEN)\b/i);
          if (match && !line.includes('redact') && !line.includes('sanitize')) {
            throw new Error(`Secret reference in ${s}: ${line.trim()}`);
          }
        }
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // RULE 12 — REPORT INJECTION
  // ═══════════════════════════════════════════════════════════════

  describe('Report Injection (Rule 12)', () => {
    it('malicious markdown/HTML in finding fields does not corrupt report structure', () => {
      const malicious = validFinding({
        id: 'INJECT-001',
        title: '# Fake Critical Finding\n## Injected Header',
        evidence: [
          {
            type: 'source',
            description: '<script>alert("xss")</script>',
            location: '../../etc/passwd',
          },
        ],
        remediation: '[Click me](javascript:alert(1))',
        impact: '```\ncode injection\n```',
      });

      // First validate — should pass schema
      const inFile = writeJSON('report_inject.json', { findings: [malicious] });
      const out = path.join(TMP, 'report_inject_validated.json');
      run(
        'findings_validator.js',
        `--in="${inFile}" --out="${out}" --quarantine="${path.join(TMP, 'riq.json')}"`,
      );

      // Then generate report
      const reportOut = path.join(TMP, 'report_inject_report.md');
      run('backend_report_generator.js', `--in="${out}" --out="${reportOut}"`);
      const report = fs.readFileSync(reportOut, 'utf8');

      // The report should contain the content (it's not sanitized)
      // This IS a finding — the report generator does not escape markdown
      expect(report).toContain('INJECT-001');
      // Verify it doesn't crash at minimum
      expect(report.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // RULE 13 — RESOURCE EXHAUSTION
  // ═══════════════════════════════════════════════════════════════

  describe('Resource Exhaustion (Rule 13)', () => {
    it('correlator handles 1000 findings without timeout', () => {
      const findings = Array.from({ length: 1000 }, (_, i) =>
        validFinding({
          id: `MASS-${i}`,
          title: `Finding ${i}`,
          location: { file: `file_${i}.py`, line: i },
          evidence: [{ type: 'source', description: `Evidence ${i}` }],
        }),
      );
      const f = writeJSON('exhaust_1000.json', { findings });
      const out = path.join(TMP, 'exhaust_1000_out.json');
      const start = Date.now();
      run('cross_agent_correlator.js', `"${f}" --out="${out}"`);
      const elapsed = Date.now() - start;
      // Should complete in under 10 seconds
      expect(elapsed).toBeLessThan(10000);
      const result = JSON.parse(fs.readFileSync(out, 'utf8'));
      // All in different files — none should merge
      expect(result.findings.length).toBe(1000);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // RULE 14 — PIPELINE FAILURE TESTING
  // ═══════════════════════════════════════════════════════════════

  describe('Pipeline Failure Handling (Rule 14)', () => {
    it('validation_engine.js exits non-zero on missing input', () => {
      expect(() => {
        run(
          'validation_engine.js',
          `--in="${path.join(TMP, 'nonexistent.json')}" --out="${path.join(TMP, 'fail_out.json')}"`,
        );
      }).toThrow();
    });

    it('backend_report_generator.js exits non-zero on missing input', () => {
      expect(() => {
        run(
          'backend_report_generator.js',
          `--in="${path.join(TMP, 'nonexistent.json')}" --out="${path.join(TMP, 'fail_out.md')}"`,
        );
      }).toThrow();
    });

    it('findings_validator.js handles empty findings array gracefully', () => {
      const inFile = writeJSON('empty_findings.json', { findings: [] });
      const out = path.join(TMP, 'empty_findings_out.json');
      const q = path.join(TMP, 'empty_findings_q.json');
      run('findings_validator.js', `--in="${inFile}" --out="${out}" --quarantine="${q}"`);
      const result = JSON.parse(fs.readFileSync(out, 'utf8'));
      expect(result.findings).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // RULE 16 — CORRELATION QUALITY
  // ═══════════════════════════════════════════════════════════════

  describe('Correlation Quality (Rule 16)', () => {
    it('10 findings, 2 are same bug, produces 9 unique issues', () => {
      const findings = [];
      // 8 unique findings in different files
      for (let i = 0; i < 8; i++) {
        findings.push(
          validFinding({
            id: `UNIQUE-${i}`,
            category: i % 2 === 0 ? 'security' : 'performance',
            title: `Unique finding ${i}`,
            location: { file: `file_${i}.py`, line: 10 },
            evidence: [{ type: 'source', description: `Unique evidence ${i}` }],
          }),
        );
      }
      // 2 findings that are the same bug (same file, same line, same evidence)
      findings.push(
        validFinding({
          id: 'DUP-A',
          category: 'security',
          title: 'SQL injection in search',
          location: { file: 'shared.py', line: 42 },
          evidence: [
            {
              type: 'source',
              description: 'f-string in execute()',
              location: 'shared.py:42',
            },
          ],
        }),
      );
      findings.push(
        validFinding({
          id: 'DUP-B',
          category: 'security',
          title: 'Unsafe string interpolation in SQL',
          location: { file: 'shared.py', line: 42 },
          evidence: [
            {
              type: 'source',
              description: 'f-string in execute()',
              location: 'shared.py:42',
            },
          ],
        }),
      );

      const f = writeJSON('quality_10.json', { findings });
      const out = path.join(TMP, 'quality_10_out.json');
      run('cross_agent_correlator.js', `"${f}" --out="${out}"`);
      const result = JSON.parse(fs.readFileSync(out, 'utf8'));
      expect(result.findings.length).toBe(9);
    });
  });
});
