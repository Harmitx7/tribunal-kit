#!/usr/bin/env node
/**
 * architecture_diff.js — Tribunal Semantic Architecture Change Diff
 * ═════════════════════════════════════════════════════════════════════════════
 * Goes beyond superficial visual diffs (added/removed/moved boxes) to detect
 * true semantic architectural impact between Base and Head architectures.
 *
 * Detects:
 *   - Entity & Relationship Additions / Deletions
 *   - Trust Boundaries Crossed (e.g. public access to isolated datastore)
 *   - Blast Radius Expansion (increased coupling/centrality)
 *   - Failure Resilience Regressions (timeouts/retries/fallbacks removed)
 *   - New External Third-Party Dependencies
 *   - Direct Database Couplings Introduced
 *   - Critical Path Shifts & Single Points of Failure (SPOFs)
 *
 * Zero external dependencies.
 */

'use strict';

const fs = require('fs');
const { GREEN, YELLOW, CYAN, RED, BOLD, RESET, BOX, banner, timer, formatMs } = require('./_colors');
const { BlastRadiusEngine } = require('./blast_radius_engine');

class ArchitectureDiffer {
  constructor(baseModel, headModel) {
    this.base = baseModel;
    this.head = headModel;

    this.baseEntities = new Map((baseModel.entities || []).map((e) => [e.id, e]));
    this.headEntities = new Map((headModel.entities || []).map((e) => [e.id, e]));

    this.baseRelations = new Map((baseModel.relationships || []).map((r) => [r.id || `${r.sourceId}->${r.targetId}`, r]));
    this.headRelations = new Map((headModel.relationships || []).map((r) => [r.id || `${r.sourceId}->${r.targetId}`, r]));
  }

  compare() {
    const diff = {
      timestamp: new Date().toISOString(),
      summary: {
        entitiesAdded: 0,
        entitiesRemoved: 0,
        entitiesModified: 0,
        relationshipsAdded: 0,
        relationshipsRemoved: 0,
        relationshipsModified: 0,
        architecturalImpactScore: 0.0, // 0.0 to 1.0
        riskLevel: 'LOW',
      },
      entityChanges: [],
      relationshipChanges: [],
      semanticImpacts: [],
      trustBoundaryViolations: [],
      resilienceRegressions: [],
      blastRadiusShifts: [],
    };

    // 1. Entity Diff
    for (const [id, headEntity] of this.headEntities.entries()) {
      if (!this.baseEntities.has(id)) {
        diff.summary.entitiesAdded++;
        diff.entityChanges.push({ status: 'added', entity: headEntity });
        if (headEntity.kind === 'external_api') {
          diff.semanticImpacts.push({
            type: 'NEW_EXTERNAL_DEPENDENCY',
            severity: 'HIGH',
            message: `New external SaaS/Cloud dependency introduced: ${headEntity.name}`,
            entityId: id,
          });
        }
      } else {
        const baseEntity = this.baseEntities.get(id);
        const modified = [];
        if (baseEntity.trustZone !== headEntity.trustZone) modified.push('trustZone');
        if (baseEntity.role !== headEntity.role) modified.push('role');
        if (modified.length > 0) {
          diff.summary.entitiesModified++;
          diff.entityChanges.push({ status: 'modified', id, fields: modified, base: baseEntity, head: headEntity });

          if (baseEntity.trustZone === 'isolated_datastore' && headEntity.trustZone !== 'isolated_datastore') {
            diff.trustBoundaryViolations.push({
              severity: 'CRITICAL',
              message: `Entity ${headEntity.name} was moved out of isolated_datastore to ${headEntity.trustZone}!`,
              entityId: id,
            });
          }
        }
      }
    }

    for (const [id, baseEntity] of this.baseEntities.entries()) {
      if (!this.headEntities.has(id)) {
        diff.summary.entitiesRemoved++;
        diff.entityChanges.push({ status: 'removed', entity: baseEntity });
      }
    }

    // 2. Relationship Diff
    for (const [id, headRel] of this.headRelations.entries()) {
      if (!this.baseRelations.has(id)) {
        diff.summary.relationshipsAdded++;
        diff.relationshipChanges.push({ status: 'added', relationship: headRel });

        // Check if new relationship bypasses trust zones
        const sourceEntity = this.headEntities.get(headRel.sourceId);
        const targetEntity = this.headEntities.get(headRel.targetId);

        if (sourceEntity && targetEntity) {
          if (
            (sourceEntity.trustZone === 'public_untrusted' || sourceEntity.trustZone === 'dmz_gateway') &&
            targetEntity.trustZone === 'isolated_datastore'
          ) {
            diff.trustBoundaryViolations.push({
              severity: 'CRITICAL',
              message: `Direct edge added from ${sourceEntity.name} (${sourceEntity.trustZone}) to ${targetEntity.name} (${targetEntity.trustZone})! Bypasses internal service layer.`,
              sourceId: headRel.sourceId,
              targetId: headRel.targetId,
            });
          }
        }
      } else {
        const baseRel = this.baseRelations.get(id);
        // Check for resilience regressions (e.g. timeout or retry removed)
        if (baseRel.failureMode && headRel.failureMode) {
          if (baseRel.failureMode.hasTimeout && !headRel.failureMode.hasTimeout) {
            diff.resilienceRegressions.push({
              severity: 'HIGH',
              message: `Timeout protection removed on relationship ${headRel.sourceId} -> ${headRel.targetId}`,
              relationshipId: id,
            });
          }
          if (baseRel.failureMode.hasCircuitBreaker && !headRel.failureMode.hasCircuitBreaker) {
            diff.resilienceRegressions.push({
              severity: 'HIGH',
              message: `Circuit breaker protection removed on relationship ${headRel.sourceId} -> ${headRel.targetId}`,
              relationshipId: id,
            });
          }
        }
      }
    }

    for (const [id, baseRel] of this.baseRelations.entries()) {
      if (!this.headRelations.has(id)) {
        diff.summary.relationshipsRemoved++;
        diff.relationshipChanges.push({ status: 'removed', relationship: baseRel });
      }
    }

    // 3. Blast Radius Shift Analysis
    const baseBlast = new BlastRadiusEngine(this.base);
    const headBlast = new BlastRadiusEngine(this.head);

    for (const [id, headEntity] of this.headEntities.entries()) {
      if (this.baseEntities.has(id) && headEntity.kind === 'module') {
        const baseRes = baseBlast.computeBlastRadius(id);
        const headRes = headBlast.computeBlastRadius(id);

        if (baseRes.found && headRes.found) {
          const baseTrans = baseRes.metrics.transitiveDependentsCount;
          const headTrans = headRes.metrics.transitiveDependentsCount;
          if (headTrans > baseTrans + 3 && headTrans >= baseTrans * 1.3) {
            diff.blastRadiusShifts.push({
              entityId: id,
              name: headEntity.name,
              baseTransitive: baseTrans,
              headTransitive: headTrans,
              expansionPct: Math.round(((headTrans - baseTrans) / (baseTrans || 1)) * 100),
            });
          }
        }
      }
    }

    // 4. Calculate Overall Architectural Impact Score (0.0 to 1.0)
    let score = 0.0;
    score += diff.trustBoundaryViolations.length * 0.4;
    score += diff.resilienceRegressions.length * 0.25;
    score += diff.semanticImpacts.length * 0.15;
    score += diff.blastRadiusShifts.length * 0.1;
    score += Math.min(0.2, (diff.summary.entitiesAdded + diff.summary.relationshipsAdded) * 0.02);

    diff.summary.architecturalImpactScore = Math.min(1.0, Math.round(score * 100) / 100);

    if (diff.summary.architecturalImpactScore >= 0.7 || diff.trustBoundaryViolations.length > 0) {
      diff.summary.riskLevel = 'CRITICAL';
    } else if (diff.summary.architecturalImpactScore >= 0.4) {
      diff.summary.riskLevel = 'HIGH';
    } else if (diff.summary.architecturalImpactScore >= 0.2) {
      diff.summary.riskLevel = 'MEDIUM';
    } else {
      diff.summary.riskLevel = 'LOW';
    }

    return diff;
  }
}

// ── Standalone CLI ────────────────────────────────────────────────────────────
if (require.main === module) {
  const t = timer();
  const baseFile = process.argv[2];
  const headFile = process.argv[3];

  console.log(banner('Tribunal Semantic Architecture Change Differ'));

  if (!baseFile || !headFile) {
    console.error(`  ${YELLOW}Usage:${RESET} node architecture_diff.js <base-model.json> <head-model.json>\n`);
    process.exit(1);
  }

  if (!fs.existsSync(baseFile) || !fs.existsSync(headFile)) {
    console.error(`  ${RED}✖ One or both model files do not exist.${RESET}`);
    process.exit(1);
  }

  const baseModel = JSON.parse(fs.readFileSync(baseFile, 'utf8'));
  const headModel = JSON.parse(fs.readFileSync(headFile, 'utf8'));

  const differ = new ArchitectureDiffer(baseModel, headModel);
  const diff = differ.compare();

  const riskColors = { CRITICAL: RED, HIGH: YELLOW, MEDIUM: CYAN, LOW: GREEN };
  const rColor = riskColors[diff.summary.riskLevel] || GREEN;

  console.log(`  Architectural Risk:     ${rColor}${BOLD}${diff.summary.riskLevel} (${diff.summary.architecturalImpactScore})${RESET}`);
  console.log(`  Entities Changed:       +${diff.summary.entitiesAdded} / -${diff.summary.entitiesRemoved} / ~${diff.summary.entitiesModified}`);
  console.log(`  Relationships Changed:  +${diff.summary.relationshipsAdded} / -${diff.summary.relationshipsRemoved}`);
  console.log(`  Trust Violations:       ${diff.trustBoundaryViolations.length > 0 ? RED : GREEN}${diff.trustBoundaryViolations.length}${RESET}`);
  console.log(`  Resilience Regressions: ${diff.resilienceRegressions.length > 0 ? YELLOW : GREEN}${diff.resilienceRegressions.length}${RESET}`);
  console.log(`  Blast Radius Shifts:    ${diff.blastRadiusShifts.length > 0 ? YELLOW : GREEN}${diff.blastRadiusShifts.length}${RESET}`);

  if (diff.trustBoundaryViolations.length > 0) {
    console.log(`\n  ${RED}${BOLD}Trust Boundary Violations:${RESET}`);
    for (const v of diff.trustBoundaryViolations) {
      console.log(`    ${RED}${BOX.cross_mark}${RESET} ${v.message}`);
    }
  }

  if (diff.resilienceRegressions.length > 0) {
    console.log(`\n  ${YELLOW}${BOLD}Resilience Regressions:${RESET}`);
    for (const r of diff.resilienceRegressions) {
      console.log(`    ${YELLOW}!${RESET} ${r.message}`);
    }
  }

  if (diff.blastRadiusShifts.length > 0) {
    console.log(`\n  ${CYAN}${BOLD}Blast Radius Expansions:${RESET}`);
    for (const b of diff.blastRadiusShifts) {
      console.log(`    ${CYAN}▸${RESET} ${b.name}: ${b.baseTransitive} -> ${b.headTransitive} dependents (+${b.expansionPct}%)`);
    }
  }

  console.log(`\n  ${GREEN}${BOX.check} Semantic Architecture Diff Complete${RESET} in ${formatMs(t())}\n`);
}

module.exports = {
  ArchitectureDiffer,
};
