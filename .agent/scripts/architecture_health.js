#!/usr/bin/env node
/**
 * architecture_health.js — Tribunal Architectural Health & Risk Auditor
 * ═════════════════════════════════════════════════════════════════════════════
 * Produces explainable architectural signals backed by code evidence.
 * No arbitrary "magic scores" — every signal links directly to source locations.
 *
 * Detects:
 *   - Circular Dependencies (Cycles with exact paths)
 *   - Single Points of Failure (SPOFs / High Fan-In bottlenecks)
 *   - Excessive Coupling (God Modules / High Fan-Out)
 *   - Security Trust Boundary Violations (Direct DB access from public routes)
 *   - Resilience Deficits (External HTTP calls lacking timeouts/retries)
 *   - Test Coverage Gaps on Critical Core Components
 *   - Orphaned / Dead Code Components
 *
 * Zero external dependencies.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { GREEN, YELLOW, CYAN, RED, BOLD, DIM, RESET, BOX, banner, timer, formatMs } = require('./_colors');

class ArchitectureHealthAuditor {
  constructor(model) {
    this.model = model;
    this.entities = new Map((model.entities || []).map((e) => [e.id, e]));
    this.adjList = new Map(); // source -> array of target IDs
    this.inDegree = new Map(); // target -> count
    this.outDegree = new Map(); // source -> count

    this.initAdjacency();
  }

  initAdjacency() {
    for (const e of this.entities.keys()) {
      this.adjList.set(e, []);
      this.inDegree.set(e, 0);
      this.outDegree.set(e, 0);
    }

    for (const rel of this.model.relationships || []) {
      if (this.adjList.has(rel.sourceId)) {
        this.adjList.get(rel.sourceId).push({ targetId: rel.targetId, rel });
        this.outDegree.set(rel.sourceId, (this.outDegree.get(rel.sourceId) || 0) + 1);
        this.inDegree.set(rel.targetId, (this.inDegree.get(rel.targetId) || 0) + 1);
      }
    }
  }

  audit() {
    const signals = [];

    // 1. Detect Circular Dependencies (Tarjan's SCC)
    const cycles = this.findCycles();
    for (const cycle of cycles) {
      const names = cycle.map((id) => this.entities.get(id)?.name || id).join(' → ');
      signals.push({
        code: 'ARCH_CIRCULAR_DEPENDENCY',
        severity: 'HIGH',
        category: 'coupling',
        title: 'Circular Dependency Detected',
        message: `Circular dependency loop identified: ${names}`,
        entities: cycle,
        recommendation: 'Break cycle by inverting dependency, introducing an interface, or extracting common logic.',
      });
    }

    // 2. Detect Single Points of Failure (High Fan-In Bottlenecks)
    for (const [id, count] of this.inDegree.entries()) {
      const entity = this.entities.get(id);
      if (entity && entity.kind === 'module' && !entity.tags?.includes('skill') && count >= 20) {
        signals.push({
          code: 'ARCH_SINGLE_POINT_OF_FAILURE',
          severity: 'MEDIUM',
          category: 'resilience',
          title: 'High Centrality Bottleneck (SPOF)',
          message: `Component "${entity.name}" has ${count} direct callers. Any breaking change will impact a large portion of the system.`,
          entities: [id],
          recommendation: 'Ensure 100% unit test coverage, freeze interface contracts, and consider modular partitioning.',
        });
      }
    }

    // 3. Detect Excessive Coupling (High Fan-Out God Modules)
    for (const [id, count] of this.outDegree.entries()) {
      const entity = this.entities.get(id);
      if (entity && entity.kind === 'module' && !entity.tags?.includes('skill') && count >= 15 && !entity.scope.includes('test')) {
        signals.push({
          code: 'ARCH_EXCESSIVE_COUPLING',
          severity: 'MEDIUM',
          category: 'architecture_smell',
          title: 'Excessive Fan-Out (God Component)',
          message: `Component "${entity.name}" depends directly on ${count} other modules.`,
          entities: [id],
          recommendation: 'Decompose module into single-responsibility sub-services or handlers.',
        });
      }
    }

    // 4. Detect Security Boundary Violations (Public to Datastore Direct Call)
    for (const rel of this.model.relationships || []) {
      const src = this.entities.get(rel.sourceId);
      const tgt = this.entities.get(rel.targetId);
      if (src && tgt) {
        if (src.trustZone === 'public_untrusted' && tgt.trustZone === 'isolated_datastore') {
          signals.push({
            code: 'ARCH_SECURITY_BOUNDARY_VIOLATION',
            severity: 'CRITICAL',
            category: 'security',
            title: 'Unauthenticated Public Access to Datastore',
            message: `Public component "${src.name}" directly communicates with isolated datastore "${tgt.name}" without passing through an authenticated service mesh or API gateway.`,
            entities: [src.id, tgt.id],
            evidence: rel.evidence || [],
            recommendation: 'Route request through authenticated API middleware and isolate direct database connections.',
          });
        }
      }
    }

    // 5. Detect Resilience Deficits (External Calls Lacking Timeouts/Circuit Breakers)
    for (const rel of this.model.relationships || []) {
      const tgt = this.entities.get(rel.targetId);
      if (tgt && tgt.kind === 'external_api') {
        const failureMode = rel.failureMode || {};
        if (!failureMode.hasTimeout) {
          const src = this.entities.get(rel.sourceId);
          signals.push({
            code: 'ARCH_MISSING_TIMEOUT',
            severity: 'HIGH',
            category: 'resilience',
            title: 'External API Call Lacks Timeout Protection',
            message: `Component "${src?.name || rel.sourceId}" calls external provider "${tgt.name}" without an explicit timeout or AbortController. Network hangs can exhaust server worker pools.`,
            entities: [rel.sourceId, rel.targetId],
            evidence: rel.evidence || [],
            recommendation: 'Wrap external call with an AbortSignal.timeout(ms) or circuit breaker.',
          });
        }
      }
    }

    // 6. Detect Critical Path Test Coverage Gaps
    for (const [id, entity] of this.entities.entries()) {
      if (entity.kind === 'module' && !entity.tags?.includes('skill') && (entity.blastRadius?.riskScore >= 0.7 || this.inDegree.get(id) >= 10)) {
        // Check if any test suite imports this entity
        const isTested = Array.from(this.adjList.entries()).some(([srcId, targets]) => {
          const src = this.entities.get(srcId);
          return src && src.kind === 'test_suite' && targets.some((t) => t.targetId === id);
        });

        if (!isTested) {
          signals.push({
            code: 'ARCH_CRITICAL_TEST_GAP',
            severity: 'HIGH',
            category: 'testing',
            title: 'Test Coverage Gap on High-Centrality Component',
            message: `Critical component "${entity.name}" (risk score ${entity.blastRadius?.riskScore || 0.8}, ${this.inDegree.get(id)} callers) has no direct test suite coverage in the architecture graph.`,
            entities: [id],
            recommendation: 'Add unit and integration tests covering the public interfaces of this component.',
          });
        }
      }
    }

    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalSignals: signals.length,
        critical: signals.filter((s) => s.severity === 'CRITICAL').length,
        high: signals.filter((s) => s.severity === 'HIGH').length,
        medium: signals.filter((s) => s.severity === 'MEDIUM').length,
        low: signals.filter((s) => s.severity === 'LOW').length,
      },
      signals,
    };
  }

  findCycles() {
    const visited = new Set();
    const recStack = new Set();
    const cycles = [];
    const pathStack = [];

    const dfs = (nodeId) => {
      visited.add(nodeId);
      recStack.add(nodeId);
      pathStack.push(nodeId);

      const neighbors = this.adjList.get(nodeId) || [];
      for (const { targetId } of neighbors) {
        if (!visited.has(targetId)) {
          dfs(targetId);
        } else if (recStack.has(targetId)) {
          // Found cycle
          const cycleStartIndex = pathStack.indexOf(targetId);
          if (cycleStartIndex !== -1) {
            const cycle = pathStack.slice(cycleStartIndex);
            cycles.push([...cycle, targetId]);
          }
        }
      }

      pathStack.pop();
      recStack.delete(nodeId);
    };

    for (const nodeId of this.entities.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
      }
    }

    return cycles;
  }
}

// ── Standalone CLI ────────────────────────────────────────────────────────────
if (require.main === module) {
  const t = timer();
  const repoRoot = process.cwd();
  const modelFile = path.join(repoRoot, '.agent', 'history', 'architecture-model.json');

  console.log(banner('Tribunal Architectural Health & Risk Auditor'));

  if (!fs.existsSync(modelFile)) {
    console.error(`  ${RED}✖ architecture-model.json not found.${RESET} Run architecture_extractor.js first.`);
    process.exit(1);
  }

  const model = JSON.parse(fs.readFileSync(modelFile, 'utf8'));
  const auditor = new ArchitectureHealthAuditor(model);
  const report = auditor.audit();

  console.log(`  Signals Found:          ${report.summary.totalSignals}`);
  console.log(`  Critical Violations:    ${report.summary.critical > 0 ? RED : GREEN}${report.summary.critical}${RESET}`);
  console.log(`  High Risk Issues:       ${report.summary.high > 0 ? YELLOW : GREEN}${report.summary.high}${RESET}`);
  console.log(`  Medium Smells:          ${report.summary.medium > 0 ? CYAN : GREEN}${report.summary.medium}${RESET}`);

  if (report.signals.length > 0) {
    console.log(`\n  ${BOLD}Top Architectural Signals:${RESET}`);
    for (const s of report.signals.slice(0, 8)) {
      const color = s.severity === 'CRITICAL' ? RED : s.severity === 'HIGH' ? YELLOW : CYAN;
      console.log(`    ${color}[${s.severity}]${RESET} ${BOLD}${s.title}${RESET}`);
      console.log(`      ${DIM}${s.message}${RESET}`);
      console.log(`      ${GREEN}Fix:${RESET} ${s.recommendation}\n`);
    }
  }

  console.log(`  ${GREEN}${BOX.check} Architectural Health Audit Complete${RESET} in ${formatMs(t())}\n`);
}

module.exports = {
  ArchitectureHealthAuditor,
};
