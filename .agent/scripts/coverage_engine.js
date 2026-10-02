'use strict';

const path = require('path');
const { extractConcepts } = require('./concept_extractor');
const { generateConsiderations } = require('./consideration_engine');

function evaluateCoverage(conceptData, discoveredSkills, allSkillsList) {
  const activeSkillNames = new Set(
    (discoveredSkills.mandatory || [])
      .concat(discoveredSkills.recommended || [])
      .map(s => s.skill || s),
  );
  const optionalSkillNames = new Set((discoveredSkills.optional || []).map(s => s.skill || s));

  const coverageMatrix = [];
  const full = [];
  const partial = [];
  const uncovered = [];
  const candidateAdditions = new Set();
  const trueGaps = [];

  for (const c of conceptData.all_concepts || []) {
    const commonSkills = c.common_skills || [];
    let matchedSkill = null;
    let coverage = 'NONE';
    let confidence = 0.0;

    for (const cs of commonSkills) {
      if (activeSkillNames.has(cs)) {
        matchedSkill = cs;
        coverage = 'FULL';
        confidence = 0.95;
        break;
      }
    }

    if (coverage !== 'FULL') {
      for (const cs of commonSkills) {
        if (optionalSkillNames.has(cs)) {
          matchedSkill = cs;
          coverage = 'PARTIAL';
          confidence = 0.7;
          break;
        }
      }
    }

    if (coverage === 'NONE') {
      for (const skill of (discoveredSkills.mandatory || []).concat(
        discoveredSkills.recommended || [],
      )) {
        const desc = (skill.description || '').toLowerCase();
        if (desc.includes(c.id.replace(/-/g, ' ')) || desc.includes(c.name.toLowerCase())) {
          matchedSkill = skill.skill;
          coverage = 'PARTIAL';
          confidence = 0.6;
          break;
        }
      }
    }

    const row = {
      concept_id: c.id,
      concept_name: c.name,
      domain: c.domain,
      required_capability: c.aliases ? c.aliases[0] : c.name,
      matched_skill: matchedSkill,
      coverage,
      confidence,
    };

    coverageMatrix.push(row);

    if (coverage === 'FULL') {
      full.push(row);
    } else if (coverage === 'PARTIAL') {
      partial.push(row);
      commonSkills.forEach(cs => candidateAdditions.add(cs));
    } else {
      uncovered.push(row);
      if (commonSkills.length > 0) {
        commonSkills.forEach(cs => candidateAdditions.add(cs));
      } else {
        trueGaps.push(c.id);
      }
    }
  }

  return {
    total_concepts: (conceptData.all_concepts || []).length,
    coverage_matrix: coverageMatrix,
    full,
    partial,
    uncovered,
    candidate_additions: Array.from(candidateAdditions).filter(s => !activeSkillNames.has(s)),
    true_gaps: trueGaps,
  };
}

module.exports = {
  evaluateCoverage,
};
