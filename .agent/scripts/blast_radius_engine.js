#!/usr/bin/env node
/**
 * blast_radius_engine.js — Tribunal Architectural Blast Radius Engine
 * ═════════════════════════════════════════════════════════════════════════════
 * Answers: "If I modify or break this component, what is affected?"
 *
 * Computes:
 *   - Direct Dependents (Immediate Callers/Importers)
 *   - Transitive Closure (Full Downstream Blast Radius)
 *   - Affected API Routes & Endpoints
 *   - Affected Data Stores & Queries
 *   - Affected Trust Boundaries & Security Zones
 *   - Required Test Suites to Re-verify
 *   - Architectural Centrality & Risk Score (0.0 to 1.0)
 *
 * Zero external dependencies.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { GREEN, YELLOW, CYAN, RED, BOLD, RESET, BOX, banner, timer, formatMs } = require('./_colors');

class BlastRadiusEngine {
  constructor(model) {
    this.model = model;
    this.entityMap = new Map();
    this.dependentsMap = new Map(); // target -> Set of sources that depend on target
    this.dependenciesMap = new Map(); // source -> Set of targets that source depends on

    this.initGraph();
  }

  initGraph() {
    for (const e of this.model.entities || []) {
      this.entityMap.set(e.id, e);
      this.dependentsMap.set(e.id, new Set());
      this.dependenciesMap.set(e.id, new Set());
    }

    for (const rel of this.model.relationships || []) {
      if (this.dependentsMap.has(rel.targetId)) {
        this.dependentsMap.get(rel.targetId).add(rel.sourceId);
      }
      if (this.dependenciesMap.has(rel.sourceId)) {
        this.dependenciesMap.get(rel.sourceId).add(rel.targetId);
      }
    }
  }

  findEntity(query) {
    if (!query) return null;
    const clean = query.trim();

    // Direct ID match
    if (this.entityMap.has(clean)) return this.entityMap.get(clean);

    // Path or partial match
    for (const [id, e] of this.entityMap.entries()) {
      if (e.name === clean || e.scope === clean) return e;
      if (e.sources && e.sources.some((s) => s.file === clean || s.file.endsWith(clean))) return e;
      if (id.toLowerCase().includes(clean.toLowerCase())) return e;
    }
    return null;
  }

  computeBlastRadius(targetQuery, maxDepth = 15) {
    const rootEntity = this.findEntity(targetQuery);
    if (!rootEntity) {
      return {
        found: false,
        query: targetQuery,
        error: `Component or file "${targetQuery}" not found in architectural model.`,
      };
    }

    const visited = new Set([rootEntity.id]);
    const directDependents = new Set();
    const transitiveRings = []; // Array of Sets per depth level

    let currentLevel = new Set(this.dependentsMap.get(rootEntity.id) || []);
    for (const d of currentLevel) directDependents.add(d);

    let depth = 1;
    while (currentLevel.size > 0 && depth <= maxDepth) {
      const ringEntities = [];
      const nextLevel = new Set();

      for (const id of currentLevel) {
        if (!visited.has(id)) {
          visited.add(id);
          const entity = this.entityMap.get(id);
          if (entity) ringEntities.push(entity);

          const upstreams = this.dependentsMap.get(id) || [];
          for (const up of upstreams) {
            if (!visited.has(up)) {
              nextLevel.add(up);
            }
          }
        }
      }

      if (ringEntities.length > 0) {
        transitiveRings.push({ depth, count: ringEntities.length, entities: ringEntities });
      }
      currentLevel = nextLevel;
      depth++;
    }

    // Collect all affected entities (excluding root)
    const affectedEntities = Array.from(visited)
      .filter((id) => id !== rootEntity.id)
      .map((id) => this.entityMap.get(id))
      .filter(Boolean);

    // Categorize Impact
    const affectedEndpoints = affectedEntities.filter((e) => e.kind === 'endpoint');
    const affectedDatastores = affectedEntities.filter((e) => e.kind === 'datastore' || e.kind === 'cache');
    const affectedQueues = affectedEntities.filter((e) => e.kind === 'queue' || e.kind === 'event_bus');
    const affectedTests = affectedEntities.filter((e) => e.kind === 'test_suite' || e.scope?.includes('test'));

    // Check Trust Zone Crossings
    const rootZone = rootEntity.trustZone || 'unknown';
    const crossedZones = new Set();
    for (const e of affectedEntities) {
      if (e.trustZone && e.trustZone !== rootZone) {
        crossedZones.add(e.trustZone);
      }
    }

    // Risk Calculation (0.0 to 1.0)
    // Centrality + Blast scope + Security Crossing
    const totalEntities = this.entityMap.size || 1;
    const impactRatio = affectedEntities.length / totalEntities;
    const directCoupling = directDependents.size;
    const securityPenalty = crossedZones.has('public_untrusted') || crossedZones.has('dmz_gateway') ? 0.3 : 0.1;

    let riskScore = Math.min(1.0, impactRatio * 2.5 + directCoupling * 0.05 + securityPenalty);
    riskScore = Math.round(riskScore * 100) / 100;

    let riskTier = 'LOW';
    if (riskScore >= 0.7) riskTier = 'CRITICAL';
    else if (riskScore >= 0.4) riskTier = 'HIGH';
    else if (riskScore >= 0.2) riskTier = 'MEDIUM';

    return {
      found: true,
      target: {
        id: rootEntity.id,
        name: rootEntity.name,
        kind: rootEntity.kind,
        scope: rootEntity.scope,
        trustZone: rootEntity.trustZone,
      },
      metrics: {
        directDependentsCount: directDependents.size,
        transitiveDependentsCount: affectedEntities.length,
        maxDepthReached: transitiveRings.length,
        riskScore,
        riskTier,
      },
      impactBreakdown: {
        endpoints: affectedEndpoints.map((e) => ({ id: e.id, name: e.name, scope: e.scope })),
        datastores: affectedDatastores.map((e) => ({ id: e.id, name: e.name })),
        queues: affectedQueues.map((e) => ({ id: e.id, name: e.name })),
        testSuites: affectedTests.map((e) => ({ id: e.id, name: e.name, scope: e.scope })),
        securityZonesCrossed: Array.from(crossedZones),
      },
      transitiveRings,
    };
  }
}

// ── Standalone CLI ────────────────────────────────────────────────────────────
if (require.main === module) {
  const t = timer();
  const repoRoot = process.cwd();
  const modelFile = path.join(repoRoot, '.agent', 'history', 'architecture-model.json');

  const query = process.argv[2];
  if (!query) {
    console.log(banner('Tribunal Architectural Blast Radius Engine'));
    console.error(`  ${YELLOW}Usage:${RESET} node blast_radius_engine.js <component-id-or-filepath>\n`);
    process.exit(1);
  }

  if (!fs.existsSync(modelFile)) {
    console.error(`  ${RED}✖ architecture-model.json not found.${RESET} Run architecture_extractor.js first.`);
    process.exit(1);
  }

  const model = JSON.parse(fs.readFileSync(modelFile, 'utf8'));
  const engine = new BlastRadiusEngine(model);
  const result = engine.computeBlastRadius(query);

  console.log(banner('Tribunal Architectural Blast Radius Engine'));

  if (!result.found) {
    console.error(`  ${RED}✖ ${result.error}${RESET}`);
    process.exit(1);
  }

  const tierColors = {
    CRITICAL: RED,
    HIGH: YELLOW,
    MEDIUM: CYAN,
    LOW: GREEN,
  };
  const color = tierColors[result.metrics.riskTier] || GREEN;

  console.log(`  Target:                 ${BOLD}${result.target.name}${RESET} (${result.target.id})`);
  console.log(`  Kind:                   ${CYAN}${result.target.kind}${RESET} | Trust Zone: ${YELLOW}${result.target.trustZone}${RESET}`);
  console.log(`  Blast Radius Risk:      ${color}${BOLD}${result.metrics.riskTier} (${result.metrics.riskScore})${RESET}`);
  console.log(`  Direct Callers:         ${BOLD}${result.metrics.directDependentsCount}${RESET}`);
  console.log(`  Transitive Dependents:  ${BOLD}${result.metrics.transitiveDependentsCount}${RESET} across ${result.metrics.maxDepthReached} depth rings`);
  console.log(`  Impacted Endpoints:     ${result.impactBreakdown.endpoints.length > 0 ? YELLOW : GREEN}${result.impactBreakdown.endpoints.length}${RESET}`);
  console.log(`  Impacted Test Suites:   ${CYAN}${result.impactBreakdown.testSuites.length}${RESET}`);
  console.log(`  Zones Crossed:          ${result.impactBreakdown.securityZonesCrossed.join(', ') || 'None'}`);

  if (result.transitiveRings.length > 0) {
    console.log(`\n  ${BOLD}Concentric Blast Rings:${RESET}`);
    for (const ring of result.transitiveRings) {
      console.log(`    Ring ${ring.depth} (depth ${ring.depth}): ${BOLD}${ring.count}${RESET} downstream components`);
    }
  }

  console.log(`\n  ${GREEN}${BOX.check} Blast Radius Analysis Complete${RESET} in ${formatMs(t())}\n`);
}

module.exports = {
  BlastRadiusEngine,
};
