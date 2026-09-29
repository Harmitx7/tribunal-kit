/**
 * TRUST BOUNDARY — Backend Intelligence Trust Hardening Tests
 *
 * Tests every trust boundary in the pipeline:
 *   - Evidence verification against repository
 *   - Fabricated source location rejection
 *   - Stale evidence detection
 *   - LLM self-authorization prevention (output isolation)
 *   - Fake test execution rejection
 *   - Fake static proof rejection
 *   - Secret redaction
 *   - Report markdown safety
 *   - Path boundary enforcement
 *   - Resource limits
 *   - End-to-end fake verification attack
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SCRIPTS = path.join(__dirname, '../../.agent/scripts');
const TMP = path.join(__dirname, 'tmp_trust');
const FIXTURES = path.join(__dirname, '../../test/fixtures/backend');

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

function validFinding(overrides = {}) {
  return {
    id: 'TEST-001',
    category: 'security',
    severity: 'HIGH',
    confidence: 0.9,
    status: 'DETECTED',
    title: 'Test finding',
    evidence: [{ type: 'source', description: 'test evidence' }],
    validation: { required: true },
    ...overrides,
  };
}

describe('TRUST BOUNDARY — Backend Intelligence Pipeline', () => {
  beforeAll(() => {
    if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(TMP, { recursive: true, force: true });
  });

  // ═══════════════════════════════════════════════════════════
  // §5 — SOURCE EVIDENCE VERIFICATION
  // ═══════════════════════════════════════════════════════════

  describe('Evidence Verification (§5)', () => {
    const { verifyEvidence, verifyFindingEvidence } = require(
      path.join(SCRIPTS, 'evidence_verifier'),
    );

    it('verifies existing file and line against repository', () => {
      const result = verifyEvidence(
        { type: 'source', description: 'fastapi import', location: 'app_vulnerable.py:1' },
        FIXTURES,
      );
      expect(result.verified).toBe(true);
      expect(result.content_hash).toBeDefined();
      expect(result.actual_content).toContain('from fastapi');
    });

    it('rejects fabricated file locations', () => {
      const result = verifyEvidence(
        { type: 'source', description: 'fake evidence', location: 'does_not_exist.py:42' },
        FIXTURES,
      );
      expect(result.verified).toBe(false);
      expect(result.reason).toContain('does not exist');
    });

    it('rejects fabricated line numbers', () => {
      const result = verifyEvidence(
        { type: 'source', description: 'fake line', location: 'app_vulnerable.py:9999' },
        FIXTURES,
      );
      expect(result.verified).toBe(false);
      expect(result.reason).toContain('does not exist');
    });

    it('rejects path traversal in evidence locations', () => {
      const result = verifyEvidence(
        { type: 'source', description: 'traversal', location: '../../package.json:1' },
        FIXTURES,
      );
      expect(result.verified).toBe(false);
      expect(result.reason).toContain('Path traversal');
    });

    it('marks finding with ALL_FABRICATED when no evidence locations exist', () => {
      const finding = validFinding({
        evidence: [
          { type: 'source', description: 'fake 1', location: 'ghost.py:1' },
          { type: 'source', description: 'fake 2', location: 'phantom.py:99' },
        ],
      });
      const result = verifyFindingEvidence(finding, FIXTURES);
      expect(result.evidence_verification.status).toBe('ALL_FABRICATED');
    });

    it('marks finding with ALL_VERIFIED when all evidence locations exist', () => {
      const finding = validFinding({
        evidence: [{ type: 'source', description: 'real', location: 'app_vulnerable.py:1' }],
      });
      const result = verifyFindingEvidence(finding, FIXTURES);
      expect(result.evidence_verification.status).toBe('ALL_VERIFIED');
    });

    it('marks finding with PARTIAL when some evidence is fabricated', () => {
      const finding = validFinding({
        evidence: [
          { type: 'source', description: 'real', location: 'app_vulnerable.py:1' },
          { type: 'source', description: 'fake', location: 'ghost.py:99' },
        ],
      });
      const result = verifyFindingEvidence(finding, FIXTURES);
      expect(result.evidence_verification.status).toBe('PARTIAL');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // §6-7 — STALE EVIDENCE DETECTION & CONTENT HASHING
  // ═══════════════════════════════════════════════════════════

  describe('Stale Evidence Detection (§6-7)', () => {
    const { checkStaleEvidence, verifyEvidence } = require(path.join(SCRIPTS, 'evidence_verifier'));

    it('detects stale evidence when content hash mismatches', () => {
      const finding = validFinding({
        evidence: [
          {
            type: 'source',
            description: 'old code',
            location: 'app_vulnerable.py:1',
            content_hash: 'definitely_wrong_hash',
          },
        ],
      });
      const result = checkStaleEvidence(finding, FIXTURES);
      expect(result.stale_evidence).toBeDefined();
      expect(result.stale_evidence.length).toBe(1);
      expect(result.stale_evidence[0].original_hash).toBe('definitely_wrong_hash');
    });

    it('does not flag evidence with matching content hash', () => {
      // First get the real hash
      const real = verifyEvidence(
        { type: 'source', description: 'x', location: 'app_vulnerable.py:1' },
        FIXTURES,
      );
      const finding = validFinding({
        evidence: [
          {
            type: 'source',
            description: 'current code',
            location: 'app_vulnerable.py:1',
            content_hash: real.content_hash,
          },
        ],
      });
      const result = checkStaleEvidence(finding, FIXTURES);
      expect(result.stale_evidence).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // §9 — OUTPUT ISOLATION (LLM cannot self-authorize VERIFIED)
  // ═══════════════════════════════════════════════════════════

  describe('Output Isolation (§9)', () => {
    it('demotes LLM-assigned VERIFIED to DETECTED', () => {
      const inFile = writeJSON('isolation_verified.json', {
        findings: [
          validFinding({
            status: 'VERIFIED', // LLM trying to self-authorize
            evidence: [{ type: 'source', description: 'LLM claims verified' }],
          }),
        ],
      });
      const out = path.join(TMP, 'isolation_verified_out.json');
      run('validation_engine.js', `--in="${inFile}" --out="${out}"`);
      const result = JSON.parse(fs.readFileSync(out, 'utf8'));
      // Must NOT be VERIFIED — LLM cannot self-authorize
      expect(result.findings[0].status).not.toBe('VERIFIED');
      expect(result.findings[0].status).toBe('DETECTED');
    });

    it('demotes LLM-assigned FIXED to DETECTED', () => {
      const inFile = writeJSON('isolation_fixed.json', {
        findings: [
          validFinding({
            status: 'FIXED',
            evidence: [{ type: 'source', description: 'LLM claims fixed' }],
          }),
        ],
      });
      const out = path.join(TMP, 'isolation_fixed_out.json');
      run('validation_engine.js', `--in="${inFile}" --out="${out}"`);
      const result = JSON.parse(fs.readFileSync(out, 'utf8'));
      expect(result.findings[0].status).toBe('DETECTED');
    });

    it('demotes LLM-assigned REGRESSION-PROTECTED to DETECTED', () => {
      const inFile = writeJSON('isolation_regprot.json', {
        findings: [
          validFinding({
            status: 'REGRESSION-PROTECTED',
            evidence: [{ type: 'source', description: 'LLM claims protected' }],
          }),
        ],
      });
      const out = path.join(TMP, 'isolation_regprot_out.json');
      run('validation_engine.js', `--in="${inFile}" --out="${out}"`);
      const result = JSON.parse(fs.readFileSync(out, 'utf8'));
      expect(result.findings[0].status).toBe('DETECTED');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // §11-12 — FAKE STATIC PROOF & FAKE TEST EXECUTION
  // ═══════════════════════════════════════════════════════════

  describe('Fake Verification Rejection (§11-12)', () => {
    it('rejects fake static_proof=true without tool_output', () => {
      const inFile = writeJSON('fake_static.json', {
        findings: [
          validFinding({
            verification: {
              static_proof: true,
              tool: 'AST analyzer',
              // Missing tool_output — LLM claiming proof without evidence
            },
          }),
        ],
      });
      const out = path.join(TMP, 'fake_static_out.json');
      run('validation_engine.js', `--in="${inFile}" --out="${out}"`);
      const result = JSON.parse(fs.readFileSync(out, 'utf8'));
      expect(result.findings[0].status).not.toBe('VERIFIED');
      expect(result.findings[0].status).toBe('DETECTED');
    });

    it('rejects fake test_executed=true without command/exit_code', () => {
      const inFile = writeJSON('fake_test.json', {
        findings: [
          validFinding({
            verification: {
              test_executed: true,
              test_output: 'PASS',
              // Missing command and exit_code
            },
          }),
        ],
      });
      const out = path.join(TMP, 'fake_test_out.json');
      run('validation_engine.js', `--in="${inFile}" --out="${out}"`);
      const result = JSON.parse(fs.readFileSync(out, 'utf8'));
      expect(result.findings[0].status).not.toBe('VERIFIED');
      expect(result.findings[0].status).toBe('DETECTED');
    });

    it('accepts VALID test execution proof with full provenance', () => {
      const inFile = writeJSON('valid_test_proof.json', {
        findings: [
          validFinding({
            verification: {
              test_executed: true,
              command: 'pytest tests/test_bola.py',
              exit_code: 1,
              test_output: 'FAILED: unauthorized access reproduced',
            },
          }),
        ],
      });
      const out = path.join(TMP, 'valid_test_proof_out.json');
      run('validation_engine.js', `--in="${inFile}" --out="${out}"`);
      const result = JSON.parse(fs.readFileSync(out, 'utf8'));
      expect(result.findings[0].status).toBe('VERIFIED');
      // Verify provenance exists
      expect(result.findings[0].validation.provenance).toBeDefined();
      expect(result.findings[0].validation.provenance.method).toBe('test_execution');
      expect(result.findings[0].validation.provenance.command).toBe('pytest tests/test_bola.py');
    });

    it('accepts VALID static proof with full provenance', () => {
      const inFile = writeJSON('valid_static_proof.json', {
        findings: [
          validFinding({
            verification: {
              static_proof: true,
              tool: 'bandit',
              tool_output: 'B608: Possible SQL injection via string-based query construction',
            },
          }),
        ],
      });
      const out = path.join(TMP, 'valid_static_proof_out.json');
      run('validation_engine.js', `--in="${inFile}" --out="${out}"`);
      const result = JSON.parse(fs.readFileSync(out, 'utf8'));
      expect(result.findings[0].status).toBe('VERIFIED');
      expect(result.findings[0].validation.provenance.method).toBe('static_analysis');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // §14 — SECRET REDACTION
  // ═══════════════════════════════════════════════════════════

  describe('Secret Redaction (§14)', () => {
    const { redactSecrets, redactFinding } = require(path.join(SCRIPTS, 'secret_redactor'));

    it('redacts API keys', () => {
      const r = redactSecrets('The key is sk_live_abc123def456ghi789');
      expect(r.text).toContain('[REDACTED_API_KEY]');
      expect(r.text).not.toContain('abc123def456');
      expect(r.redactions).toBeGreaterThan(0);
    });

    it('redacts Bearer tokens', () => {
      const r = redactSecrets(
        'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
      );
      expect(r.text).toContain('[REDACTED');
      expect(r.redactions).toBeGreaterThan(0);
    });

    it('redacts database URLs', () => {
      const r = redactSecrets('DATABASE_URL=postgres://user:password@localhost:5432/mydb');
      expect(r.text).toContain('[REDACTED_DB_URL]');
      expect(r.text).not.toContain('password');
    });

    it('redacts AWS access keys', () => {
      const r = redactSecrets('Access key: AKIAIOSFODNN7EXAMPLE');
      expect(r.text).toContain('[REDACTED_AWS_KEY]');
    });

    it('redacts password assignments', () => {
      const r = redactSecrets('password = "supersecret123"');
      expect(r.text).toContain('[REDACTED]');
      expect(r.text).not.toContain('supersecret123');
    });

    it('redacts secrets in finding evidence via redactFinding', () => {
      const finding = validFinding({
        evidence: [
          {
            type: 'source',
            description: 'Hardcoded: api_key = "sk_live_verysecretkey1234"',
          },
        ],
        impact: 'Exposes credentials: password = "admin123456"',
      });
      const redacted = redactFinding(finding);
      expect(redacted.evidence[0].description).toContain('[REDACTED');
      expect(redacted.impact).toContain('[REDACTED');
      expect(redacted._redactions).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // §15 — REPORT MARKDOWN SAFETY
  // ═══════════════════════════════════════════════════════════

  describe('Report Markdown Safety (§15)', () => {
    it('escapes HTML tags in report output', () => {
      const malicious = validFinding({
        title: '<script>alert("xss")</script>',
        category: 'security',
        evidence: [{ type: 'source', description: '<img src=x onerror=alert(1)>' }],
      });
      const inFile = writeJSON('report_html.json', { findings: [malicious] });
      const out = path.join(TMP, 'report_html_out.md');
      run('backend_report_generator.js', `--in="${inFile}" --out="${out}"`);
      const report = fs.readFileSync(out, 'utf8');
      expect(report).not.toContain('<script>');
      expect(report).toContain('&lt;script&gt;');
      expect(report).not.toContain('<img');
    });

    it('strips javascript: URIs from report output', () => {
      const malicious = validFinding({
        category: 'security',
        remediation: '[Click here](javascript:alert(1))',
        evidence: [{ type: 'source', description: 'test' }],
      });
      const inFile = writeJSON('report_js.json', { findings: [malicious] });
      const out = path.join(TMP, 'report_js_out.md');
      run('backend_report_generator.js', `--in="${inFile}" --out="${out}"`);
      const report = fs.readFileSync(out, 'utf8');
      expect(report).not.toContain('javascript:');
    });

    it('escapes heading injection in finding titles', () => {
      const malicious = validFinding({
        category: 'security',
        title: '# Fake Critical Finding\n## Injected',
        evidence: [{ type: 'source', description: 'test' }],
      });
      const inFile = writeJSON('report_heading.json', { findings: [malicious] });
      const out = path.join(TMP, 'report_heading_out.md');
      run('backend_report_generator.js', `--in="${inFile}" --out="${out}"`);
      const report = fs.readFileSync(out, 'utf8');
      // The injected # should be escaped
      expect(report).toContain('\\#');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // §16 — PATH BOUNDARY ENFORCEMENT
  // ═══════════════════════════════════════════════════════════

  describe('Path Boundary Enforcement (§16)', () => {
    it('rejects path traversal when --root is specified', () => {
      expect(() => {
        run('backend_audit.js', `"${path.join(FIXTURES, '..', '..', '..')}" --root="${FIXTURES}"`);
      }).toThrow();
    });

    it('allows legitimate paths within --root boundary', () => {
      const result = run('backend_audit.js', `"${FIXTURES}" --root="${path.join(FIXTURES, '..')}"`);
      expect(result).toContain('Tribunal');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // §18 — FINDING LIMITS
  // ═══════════════════════════════════════════════════════════

  describe('Finding Limits (§18)', () => {
    it('quarantines findings with oversized evidence arrays', () => {
      const bigEvidence = Array.from({ length: 150 }, (_, i) => ({
        type: 'source',
        description: `Evidence ${i}`,
      }));
      const inFile = writeJSON('limits_evidence.json', {
        findings: [validFinding({ evidence: bigEvidence })],
      });
      const out = path.join(TMP, 'limits_evidence_out.json');
      const q = path.join(TMP, 'limits_evidence_q.json');
      run('findings_validator.js', `--in="${inFile}" --out="${out}" --quarantine="${q}"`);
      const result = JSON.parse(fs.readFileSync(out, 'utf8'));
      expect(result.findings.length).toBe(0);
      const quarantine = JSON.parse(fs.readFileSync(q, 'utf8'));
      expect(quarantine.quarantined.length).toBeGreaterThan(0);
    });

    it('quarantines findings with oversized string fields', () => {
      const inFile = writeJSON('limits_string.json', {
        findings: [validFinding({ title: 'x'.repeat(20000) })],
      });
      const out = path.join(TMP, 'limits_string_out.json');
      const q = path.join(TMP, 'limits_string_q.json');
      run('findings_validator.js', `--in="${inFile}" --out="${out}" --quarantine="${q}"`);
      const result = JSON.parse(fs.readFileSync(out, 'utf8'));
      expect(result.findings.length).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // §19 — ADVERSARIAL VALID JSON
  // ═══════════════════════════════════════════════════════════

  describe('Adversarial Valid JSON (§19)', () => {
    it('schema-valid finding with fake verification is rejected by validation engine', () => {
      const adversarial = validFinding({
        id: 'FAKE-001',
        title: 'Fake vulnerability with fabricated proof',
        evidence: [{ type: 'source', description: 'LLM fabricated this' }],
        verification: {
          test_executed: true,
          test_output: 'FAIL: vulnerability confirmed',
          // Missing command and exit_code — incomplete provenance
        },
      });
      // Schema validates this as structurally valid
      const inFile = writeJSON('adversarial_valid.json', { findings: [adversarial] });
      const out = path.join(TMP, 'adversarial_valid_out.json');
      run('validation_engine.js', `--in="${inFile}" --out="${out}"`);
      const result = JSON.parse(fs.readFileSync(out, 'utf8'));
      // Must NOT be VERIFIED — incomplete provenance
      expect(result.findings[0].status).toBe('DETECTED');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // §20 — END-TO-END FAKE VERIFICATION ATTACK
  // ═══════════════════════════════════════════════════════════

  describe('End-to-End Fake Verification Attack (§20)', () => {
    it('LLM-fabricated VERIFIED finding with fake evidence is demoted through entire pipeline', () => {
      // Step 1: LLM produces a finding claiming VERIFIED with fake evidence
      const llmOutput = {
        findings: [
          {
            id: 'E2E-ATTACK-001',
            category: 'security',
            severity: 'CRITICAL',
            confidence: 0.99,
            status: 'VERIFIED', // LLM self-authorized
            title: 'Critical SQL injection confirmed',
            evidence: [
              {
                type: 'source',
                description: 'db.execute(f"SELECT * FROM users WHERE id={uid}")',
                location: 'nonexistent_file.py:42',
              },
            ],
            impact: 'Full database compromise',
            remediation: 'Use parameterized queries',
            validation: { required: true },
            verification: {
              test_executed: true,
              test_output: 'Vulnerability reproduced successfully',
              static_proof: true,
              tool: 'Custom scanner',
              // Missing: command, exit_code, tool_output — incomplete provenance
            },
          },
        ],
      };

      // Step 2: Pass through findings_validator
      const rawFile = writeJSON('e2e_attack_raw.json', llmOutput);
      const validatedFile = path.join(TMP, 'e2e_attack_validated.json');
      const quarantineFile = path.join(TMP, 'e2e_attack_q.json');
      run(
        'findings_validator.js',
        `--in="${rawFile}" --out="${validatedFile}" --quarantine="${quarantineFile}"`,
      );

      // Step 3: Pass through validation_engine with repo root for evidence verification
      const engineOut = path.join(TMP, 'e2e_attack_engine_out.json');
      run(
        'validation_engine.js',
        `--in="${validatedFile}" --out="${engineOut}" --repo="${FIXTURES}"`,
      );
      const result = JSON.parse(fs.readFileSync(engineOut, 'utf8'));

      // Step 4: Verify the attack failed
      expect(result.findings.length).toBeGreaterThan(0);
      const finding = result.findings[0];
      // Must NOT be VERIFIED — output isolation demotes self-assigned VERIFIED
      expect(finding.status).not.toBe('VERIFIED');
      // Evidence verification should detect fabricated location
      if (finding.evidence_verification) {
        expect(finding.evidence_verification.status).toBe('ALL_FABRICATED');
      }
      // Final status should be UNVERIFIED (fabricated evidence)
      expect(finding.status).toBe('UNVERIFIED');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // §17 — CORRELATOR SCALABILITY BENCHMARK
  // ═══════════════════════════════════════════════════════════

  describe('Correlator Scalability (§17)', () => {
    const benchmarks = [100, 500, 1000, 5000];

    for (const count of benchmarks) {
      it(`handles ${count} findings within time budget`, () => {
        const findings = Array.from({ length: count }, (_, i) =>
          validFinding({
            id: `BENCH-${i}`,
            title: `Finding ${i}`,
            location: { file: `file_${i}.py`, line: i + 1 },
            evidence: [{ type: 'source', description: `Evidence ${i}` }],
          }),
        );
        const f = writeJSON(`bench_${count}.json`, { findings });
        const out = path.join(TMP, `bench_${count}_out.json`);

        const start = Date.now();
        run('cross_agent_correlator.js', `"${f}" --out="${out}"`);
        const elapsed = Date.now() - start;

        const result = JSON.parse(fs.readFileSync(out, 'utf8'));
        // All unique — none should merge
        expect(result.findings.length).toBe(count);

        // Time budget: under 10s for up to 5000
        expect(elapsed).toBeLessThan(10000);

        if (count >= 1000) {
          console.log(`  Correlator ${count} findings: ${elapsed}ms`);
        }
      });
    }
  });
});
