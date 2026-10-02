'use strict';

/**
 * long_run_lifecycle_continuity.test.js
 * =====================================
 * Proves Tribunal Kit's state continuity, lifecycle integrity, and crash recovery
 * across repeated runs, interruptions, multi-generational evolutions, and session boundaries.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  createCandidateFromOutcome,
  validateCandidateAgainstCorpus,
  approveCandidate,
  promoteCandidate,
  rollbackCandidate,
  loadCandidate,
  getActiveEvolutionsPath,
  acquireEvolutionLock,
  releaseEvolutionLock,
} = require('../../src/system1/evolution_pipeline');
const {
  _memoryStore,
  _memoryRecall,
  _memoryGc,
  _memoryStats,
} = require('../../src/commands/memory');
const { evaluateDecision } = require('../../src/system1/decision_engine');
const { collectAndRankEvidence } = require('../../src/system1/evidence_engine');
const { writeFileSyncAtomic } = require('../../src/utils/fs');

describe('Tribunal Kit: Long-Run Lifecycle, State Continuity & Recovery Protocol', () => {
  let tmpRoot;
  let tmpAgentDir;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-longrun-'));
    tmpAgentDir = path.join(tmpRoot, '.agent');
    fs.mkdirSync(tmpAgentDir, { recursive: true });
    // Initialize empty memory directory
    const memDir = path.join(tmpAgentDir, 'history', 'memory');
    fs.mkdirSync(memDir, { recursive: true });
    fs.writeFileSync(
      path.join(memDir, '.memory.idx'),
      JSON.stringify({ version: 1, entries: [], next_id: 1 }, null, 2),
      'utf8',
    );
  });

  afterEach(() => {
    if (fs.existsSync(tmpRoot)) {
      try {
        fs.rmSync(tmpRoot, { recursive: true, force: true });
      } catch (_) {}
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Fresh Run vs Repeated Run (Determinism & Idempotency)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Fresh Run vs Repeated Run', () => {
    test('Identical input produces identical decision, classification, and reviewer set across 20 repeated runs', async () => {
      const task = {
        title: 'Update payment service token validation',
        files: ['src/services/payment.js'],
        diff: 'diff --git a/src/services/payment.js b/src/services/payment.js\n+ const token = req.headers["authorization"];\n+ if (jwt.verify(token, secret)) { grant(); }',
      };

      const baseline = await evaluateDecision(task);
      expect(baseline.tier).toBeGreaterThanOrEqual(2); // High-risk JWT pattern forces >= Tier 2

      for (let i = 0; i < 20; i++) {
        const next = await evaluateDecision(task);
        expect(next.tier).toBe(baseline.tier);
        expect(next.tier_name).toBe(baseline.tier_name);
        expect(next.socratic_gate).toBe(baseline.socratic_gate);
        expect(next.reviewer_set).toEqual(baseline.reviewer_set);
      }
    });

    test('Repeated memory retrieval does not alter relevance order or leak memory', () => {
      _memoryStore(
        tmpAgentDir,
        'semantic',
        'Production database is Aurora PostgreSQL 15',
        ['db', 'aurora'],
        null,
      );
      _memoryStore(
        tmpAgentDir,
        'procedural',
        'Migrate schema using prisma migrate deploy',
        ['db', 'prisma'],
        null,
      );

      const r1 = _memoryRecall(tmpAgentDir, 'PostgreSQL', 2000);
      const r2 = _memoryRecall(tmpAgentDir, 'PostgreSQL', 2000);
      const r3 = _memoryRecall(tmpAgentDir, 'PostgreSQL', 2000);

      expect(r1.results[0].content).toBe(r2.results[0].content);
      expect(r2.results[0].content).toBe(r3.results[0].content);
      expect(r3.results[0].access_count).toBe(3); // Access count tracks repeated access
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Memory Continuity & Session Isolation Attack
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Memory Continuity & Context Isolation', () => {
    test('Session A working memory does NOT leak into Session B recall', () => {
      // Session A stores a temporary working memory
      _memoryStore(
        tmpAgentDir,
        'working',
        'Session A: debugging JWT token expiry issue',
        ['jwt', 'debug'],
        'session_A',
      );

      // Session B stores another working memory
      _memoryStore(
        tmpAgentDir,
        'working',
        'Session B: optimizing database query performance',
        ['db', 'perf'],
        'session_B',
      );

      // Recall for Session A should find Session A's working memory
      const recallA = _memoryRecall(tmpAgentDir, 'JWT', 2000, { sessionId: 'session_A' });
      expect(recallA.results.some(r => r.content.includes('Session A'))).toBe(true);
      expect(recallA.results.some(r => r.content.includes('Session B'))).toBe(false);

      // Recall for Session B querying "JWT" should NOT see Session A's working memory
      const recallB = _memoryRecall(tmpAgentDir, 'JWT', 2000, { sessionId: 'session_B' });
      expect(recallB.results.some(r => r.content.includes('Session A'))).toBe(false);

      // Unscoped recall should NOT receive session-scoped working memory
      const unscoped = _memoryRecall(tmpAgentDir, 'JWT', 2000);
      expect(unscoped.results.some(r => r.content.includes('Session A'))).toBe(false);
    });

    test('Semantic and procedural memories remain accessible cross-session as intended', () => {
      _memoryStore(
        tmpAgentDir,
        'semantic',
        'Immutable rule: All SQL queries must be parameterized',
        ['sql', 'security'],
        null,
      );

      const recallA = _memoryRecall(tmpAgentDir, 'SQL', 2000, { sessionId: 'session_A' });
      const recallB = _memoryRecall(tmpAgentDir, 'SQL', 2000, { sessionId: 'session_B' });

      expect(recallA.results[0].content).toContain('parameterized');
      expect(recallB.results[0].content).toContain('parameterized');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Multi-Generational Evolution Lifecycle
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Multi-Generational Evolution Lifecycle', () => {
    test('Linear evolution chain: Base -> Promote A -> Promote B -> Rollback B -> Rollback A restores Base', async () => {
      const activePath = getActiveEvolutionsPath(tmpAgentDir);

      // 1. Initial State: No active evolutions
      expect(fs.existsSync(activePath)).toBe(false);

      // 2. Candidate A (Gen 1)
      const candA = createCandidateFromOutcome({
        source: 'FP_CORRECTION',
        target: 'reviewer-routing',
        current_behavior: '7 reviewers on markdown',
        proposed_change: { doc_reviewers: 1 },
        evidence: 'Verified test run showed zero false negatives',
        evidence_type: 'VERIFIED_TEST_RESULT',
        previous_state: null,
      });
      await validateCandidateAgainstCorpus(candA, [{ name: 't1', run: async () => true }]);
      approveCandidate(candA, 'Reviewer One', tmpAgentDir);
      promoteCandidate(candA, tmpAgentDir);

      let active = JSON.parse(fs.readFileSync(activePath, 'utf8'));
      expect(active['reviewer-routing'].candidate_id).toBe(candA.candidate_id);
      expect(active['reviewer-routing'].proposed_change).toEqual({ doc_reviewers: 1 });

      // 3. Candidate B (Gen 2 on same target)
      const candB = createCandidateFromOutcome({
        source: 'SYSTEM1_CLASSIFICATION',
        target: 'reviewer-routing',
        current_behavior: 'doc_reviewers: 1',
        proposed_change: { doc_reviewers: 0 },
        evidence: 'Telemetry recorded 0 security issues in markdown docs',
        evidence_type: 'DETERMINISTIC_TELEMETRY',
        previous_state: { doc_reviewers: 1 },
      });
      await validateCandidateAgainstCorpus(candB, [{ name: 't2', run: async () => true }]);
      approveCandidate(candB, 'Reviewer Two', tmpAgentDir);
      promoteCandidate(candB, tmpAgentDir);

      active = JSON.parse(fs.readFileSync(activePath, 'utf8'));
      expect(active['reviewer-routing'].candidate_id).toBe(candB.candidate_id);
      expect(active['reviewer-routing'].proposed_change).toEqual({ doc_reviewers: 0 });

      // 4. Out-of-order rollback protection:
      // Attempting to rollback Cand A while Cand B is active MUST throw!
      expect(() => {
        rollbackCandidate(candA.candidate_id, tmpAgentDir);
      }).toThrow(/candidate is not currently active/);

      // 5. Rollback B -> Restores Cand A
      const rollB = rollbackCandidate(candB.candidate_id, tmpAgentDir);
      expect(rollB.rolled_back).toBe(true);
      active = JSON.parse(fs.readFileSync(activePath, 'utf8'));
      expect(active['reviewer-routing'].proposed_change).toEqual({ doc_reviewers: 1 });

      // 6. Rollback A -> Restores Base (null / deleted from active)
      const rollA = rollbackCandidate(candA.candidate_id, tmpAgentDir);
      expect(rollA.rolled_back).toBe(true);
      active = JSON.parse(fs.readFileSync(activePath, 'utf8'));
      expect(active['reviewer-routing']).toBeUndefined();

      const reloadedCandA = loadCandidate(candA.candidate_id, tmpAgentDir);
      expect(reloadedCandA.status).toBe('ROLLED_BACK');
    });

    test('Branching candidates derived from same base: candidate collisions and lineage integrity', async () => {
      // Create Candidate Branch 1
      const cand1 = createCandidateFromOutcome({
        source: 'FP_CORRECTION',
        target: 'context-weights',
        current_behavior: 'weight 0.25',
        proposed_change: { weight: 0.2 },
        evidence: 'Telemetry proof 1',
        evidence_type: 'DETERMINISTIC_TELEMETRY',
      });
      await validateCandidateAgainstCorpus(cand1, [{ name: 'test1', run: async () => true }]);
      approveCandidate(cand1, 'Lead 1', tmpAgentDir);

      // Create Candidate Branch 2 (same parent, alternative change)
      const cand2 = createCandidateFromOutcome({
        source: 'FP_CORRECTION',
        target: 'context-weights',
        current_behavior: 'weight 0.25',
        proposed_change: { weight: 0.15 },
        evidence: 'Telemetry proof 2',
        evidence_type: 'DETERMINISTIC_TELEMETRY',
      });
      await validateCandidateAgainstCorpus(cand2, [{ name: 'test2', run: async () => true }]);
      approveCandidate(cand2, 'Lead 2', tmpAgentDir);

      // Promote Branch 1
      promoteCandidate(cand1, tmpAgentDir);
      let active = JSON.parse(fs.readFileSync(getActiveEvolutionsPath(tmpAgentDir), 'utf8'));
      expect(active['context-weights'].candidate_id).toBe(cand1.candidate_id);

      // Rollback Branch 1
      rollbackCandidate(cand1.candidate_id, tmpAgentDir);

      // Promote Branch 2
      promoteCandidate(cand2, tmpAgentDir);
      active = JSON.parse(fs.readFileSync(getActiveEvolutionsPath(tmpAgentDir), 'utf8'));
      expect(active['context-weights'].candidate_id).toBe(cand2.candidate_id);
      expect(active['context-weights'].proposed_change).toEqual({ weight: 0.15 });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Replay Safety & State Invariants
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Replay Safety & Guard Invariants', () => {
    test('Re-promoting an already PROMOTED candidate is rejected', async () => {
      const cand = createCandidateFromOutcome({
        source: 'FP_CORRECTION',
        target: 'reviewer-routing',
        current_behavior: 'standard',
        proposed_change: 'new-route',
        evidence: 'Verified outcome telemetry',
        evidence_type: 'VERIFIED_TEST_RESULT',
      });
      await validateCandidateAgainstCorpus(cand, [{ name: 't', run: async () => true }]);
      approveCandidate(cand, 'Admin', tmpAgentDir);
      promoteCandidate(cand, tmpAgentDir);

      // Replay promotion
      expect(() => {
        promoteCandidate(cand, tmpAgentDir);
      }).toThrow(/Cannot promote candidate.*with status "PROMOTED"/);
    });

    test('Re-rolling back an already ROLLED_BACK candidate is rejected', async () => {
      const cand = createCandidateFromOutcome({
        source: 'FP_CORRECTION',
        target: 'reviewer-routing',
        current_behavior: 'standard',
        proposed_change: 'new-route',
        evidence: 'Verified outcome telemetry',
        evidence_type: 'VERIFIED_TEST_RESULT',
      });
      await validateCandidateAgainstCorpus(cand, [{ name: 't', run: async () => true }]);
      approveCandidate(cand, 'Admin', tmpAgentDir);
      promoteCandidate(cand, tmpAgentDir);
      rollbackCandidate(cand.candidate_id, tmpAgentDir);

      // Replay rollback
      expect(() => {
        rollbackCandidate(cand.candidate_id, tmpAgentDir);
      }).toThrow(/No rollback snapshot found/);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Crash Consistency & Atomic Writes
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Crash Consistency & Atomic Writes', () => {
    test('writeFileSyncAtomic produces clean target file and leaves no orphaned .tmp files', () => {
      const targetFile = path.join(tmpRoot, 'atomic_test', 'target.json');
      const payload = JSON.stringify({ status: 'committed', timestamp: Date.now() });

      writeFileSyncAtomic(targetFile, payload, 'utf8');

      expect(fs.existsSync(targetFile)).toBe(true);
      expect(fs.readFileSync(targetFile, 'utf8')).toBe(payload);

      // Verify no temporary files remain in directory
      const dirFiles = fs.readdirSync(path.dirname(targetFile));
      const tmpFiles = dirFiles.filter(f => f.includes('.tmp'));
      expect(tmpFiles).toHaveLength(0);
    });

    test('Corrupted state recovery: Memory loadIndex safely recovers from corrupt index file', () => {
      const memDir = path.join(tmpAgentDir, 'history', 'memory');
      const indexPath = path.join(memDir, '.memory.idx');

      // Write corrupt partial JSON (simulating mid-write power loss or hard SIGKILL)
      fs.writeFileSync(
        indexPath,
        '{"version": 1, "entries": [{"id": 1, "content": "partially writt...',
        'utf8',
      );

      // stats and recall should recover with clean baseline without crashing
      const stats = _memoryStats(tmpAgentDir);
      expect(stats.total).toBe(0);
      expect(stats.capacity).toBe(500);

      // Storing new memory overwrites corrupt state cleanly
      const res = _memoryStore(
        tmpAgentDir,
        'semantic',
        'Fresh memory post recovery',
        ['recovery'],
        null,
      );
      expect(res.id).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. Lock Lifecycle & Stale Recovery
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Lock Lifecycle & Stale Recovery', () => {
    test('Lock acquire, hold, and release operates cleanly', () => {
      const lockPath = acquireEvolutionLock(tmpAgentDir);
      expect(fs.existsSync(lockPath)).toBe(true);
      releaseEvolutionLock(lockPath);
      expect(fs.existsSync(lockPath)).toBe(false);
    });

    test('Stale locks (> 15000ms old) are safely reaped and acquired by next process', () => {
      const evoDir = path.join(tmpAgentDir, 'evolution');
      fs.mkdirSync(evoDir, { recursive: true });
      const lockPath = path.join(evoDir, 'evolution.lock');

      // Create fake stale lock with ancient timestamp (20 seconds ago)
      fs.writeFileSync(lockPath, 'stale_process_pid_1234');
      const past = (Date.now() - 20000) / 1000;
      fs.utimesSync(lockPath, past, past);

      const acquired = acquireEvolutionLock(tmpAgentDir);
      expect(acquired).toBe(lockPath);
      releaseEvolutionLock(acquired);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. Long-Run Resource & Memory Pressure Simulation
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Long-Run Resource & Memory Pressure Simulation', () => {
    test('50 continuous cycles of decision, evidence, memory, and evolution maintain bounded memory and clean file state', async () => {
      const startMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 50; i++) {
        // 1. Decision Engine Evaluation
        const decision = await evaluateDecision({
          title: `Task iteration ${i}`,
          files: ['src/api/handler.js'],
          diff: `+ console.log("iteration ${i}");`,
        });
        expect(decision.tier).toBeDefined();

        // 2. Evidence Gathering
        const evidence = await collectAndRankEvidence({
          cwd: process.cwd(),
          changedFiles: ['package.json'],
          diff: '+ "test": true',
        });
        expect(evidence.evidence.length).toBeGreaterThanOrEqual(1);

        // 3. Memory Store & Recall
        _memoryStore(
          tmpAgentDir,
          'episodic',
          `Session step ${i} completed cleanly`,
          ['step', `iter-${i}`],
          null,
        );
        const recalled = _memoryRecall(tmpAgentDir, `step ${i}`, 1000);
        expect(recalled.results.length).toBeGreaterThanOrEqual(1);

        // Periodically run GC
        if (i % 10 === 0) {
          _memoryGc(tmpAgentDir);
        }
      }

      const endMemory = process.memoryUsage().heapUsed;
      const heapGrowthMB = (endMemory - startMemory) / (1024 * 1024);

      // Memory growth must remain reasonable (< 50MB across 50 complete workflow cycles)
      expect(heapGrowthMB).toBeLessThan(50);

      // Verify no temporary files leaked in agent directory
      function findTmpFiles(dir) {
        let results = [];
        if (!fs.existsSync(dir)) return results;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            results = results.concat(findTmpFiles(fullPath));
          } else if (entry.name.includes('.tmp')) {
            results.push(fullPath);
          }
        }
        return results;
      }

      const leakedTmp = findTmpFiles(tmpAgentDir);
      expect(leakedTmp).toHaveLength(0);
    });
  });
});
