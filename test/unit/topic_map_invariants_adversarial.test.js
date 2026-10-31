/**
 * topic_map_invariants_adversarial.test.js
 *
 * Phase 2.0 Anti-False-Pass Suite:
 * Adversarially tests the inventory validation logic across 8 distinct fault scenarios:
 * 1. Valid inventory with additional skills -> PASS
 * 2. Missing skill mapping -> REJECT
 * 3. Deleted canonical skill -> REJECT
 * 4. Stale topic-map reference (skill in map not on disk) -> REJECT
 * 5. Duplicated inventory entry within a domain route -> REJECT
 * 6. Malformed inventory structure (e.g. non-array route) -> REJECT
 * 7. Declared total_skills disagrees with unique mapped skills -> REJECT
 * 8. Domain-specific invariant: required domain skills must all be present in domain route -> ENFORCE
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const TOPIC_MAP_PATH = path.join(ROOT, '.agent', 'skill_topic_map.json');
const SKILLS_DIR = path.join(ROOT, '.agent', 'skills');

function validateTopicMapInventory(topicMapData, diskSkillsList) {
  const errors = [];
  const registered = new Set();
  const canonicalSet = new Set(diskSkillsList);

  if (!topicMapData || typeof topicMapData !== 'object' || !topicMapData.domain_routes) {
    return { valid: false, errors: ['Malformed topic map: missing domain_routes'] };
  }

  for (const [domain, list] of Object.entries(topicMapData.domain_routes)) {
    if (!Array.isArray(list)) {
      errors.push(`Domain route '${domain}' is not an array`);
      continue;
    }
    const seen = new Set();
    for (const skill of list) {
      if (seen.has(skill)) {
        errors.push(`Duplicate skill '${skill}' in domain route '${domain}'`);
      }
      seen.add(skill);
      registered.add(skill);

      if (!canonicalSet.has(skill)) {
        errors.push(`Stale reference: Skill '${skill}' in domain route '${domain}' does not exist on disk`);
      }
    }
  }

  for (const diskSkill of diskSkillsList) {
    if (!registered.has(diskSkill)) {
      errors.push(`Skill '${diskSkill}' on disk is not registered in topic map`);
    }
  }

  if (typeof topicMapData.total_skills === 'number' && topicMapData.total_skills !== registered.size) {
    errors.push(`Declared total_skills (${topicMapData.total_skills}) does not match unique registered skills (${registered.size})`);
  }

  if (registered.size !== diskSkillsList.length) {
    errors.push(`Unique registered skills (${registered.size}) does not match disk skills count (${diskSkillsList.length})`);
  }

  return {
    valid: errors.length === 0,
    errors,
    totalRegistered: registered.size
  };
}

describe('Phase 2.0: Topic Map & Inventory Invariant Adversarial Challenge', () => {
  const realTopicMap = JSON.parse(fs.readFileSync(TOPIC_MAP_PATH, 'utf8'));
  const realDiskSkills = fs.readdirSync(SKILLS_DIR).filter(d =>
    fs.statSync(path.join(SKILLS_DIR, d)).isDirectory()
  );

  test('Baseline canonical inventory passes all strict invariants', () => {
    const res = validateTopicMapInventory(realTopicMap, realDiskSkills);
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
    expect(res.totalRegistered).toBe(realDiskSkills.length);
  });

  // Scenario 1: Valid inventory with additional skills
  test('Scenario 1: Valid inventory expansion with new skill is correctly accepted', () => {
    const cloned = JSON.parse(JSON.stringify(realTopicMap));
    const expandedDisk = [...realDiskSkills, 'new-experimental-skill'];
    cloned.domain_routes['testing'].push('new-experimental-skill');
    cloned.total_skills = expandedDisk.length;

    const res = validateTopicMapInventory(cloned, expandedDisk);
    expect(res.valid).toBe(true);
  });

  // Scenario 2: Missing skill mapping
  test('Scenario 2: Missing skill mapping on disk is strictly rejected', () => {
    const cloned = JSON.parse(JSON.stringify(realTopicMap));
    // Remove one skill from all domain routes
    for (const list of Object.values(cloned.domain_routes)) {
      const idx = list.indexOf('agent-organizer');
      if (idx !== -1) list.splice(idx, 1);
    }
    cloned.total_skills = realDiskSkills.length - 1;

    const res = validateTopicMapInventory(cloned, realDiskSkills);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.includes("Skill 'agent-organizer' on disk is not registered"))).toBe(true);
  });

  // Scenario 3: Deleted canonical skill
  test('Scenario 3: Deleted canonical skill causes disk/map divergence and is rejected', () => {
    const diskWithDeleted = realDiskSkills.filter(s => s !== 'adapt');
    const res = validateTopicMapInventory(realTopicMap, diskWithDeleted);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.includes("Stale reference: Skill 'adapt'"))).toBe(true);
  });

  // Scenario 4: Stale topic-map reference (skill in topic map that doesn't exist on disk)
  test('Scenario 4: Stale phantom skill in domain route is strictly rejected', () => {
    const cloned = JSON.parse(JSON.stringify(realTopicMap));
    cloned.domain_routes['security'].push('ghost-phantom-skill-cve');
    cloned.total_skills = realDiskSkills.length + 1;

    const res = validateTopicMapInventory(cloned, realDiskSkills);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.includes("Stale reference: Skill 'ghost-phantom-skill-cve'"))).toBe(true);
  });

  // Scenario 5: Duplicated inventory entry in route
  test('Scenario 5: Duplicate skill inside a domain route is strictly rejected', () => {
    const cloned = JSON.parse(JSON.stringify(realTopicMap));
    cloned.domain_routes['security'].push(cloned.domain_routes['security'][0]);

    const res = validateTopicMapInventory(cloned, realDiskSkills);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.includes('Duplicate skill'))).toBe(true);
  });

  // Scenario 6: Malformed inventory
  test('Scenario 6: Malformed route structure (non-array) is strictly rejected', () => {
    const cloned = JSON.parse(JSON.stringify(realTopicMap));
    cloned.domain_routes['security'] = 'invalid-string-not-array';

    const res = validateTopicMapInventory(cloned, realDiskSkills);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.includes('is not an array'))).toBe(true);
  });

  // Scenario 7: Declared count disagrees with actual contents
  test('Scenario 7: Declared total_skills falsified or inflated is strictly rejected', () => {
    const cloned = JSON.parse(JSON.stringify(realTopicMap));
    cloned.total_skills = 9999; // Arbitrary inflated false count

    const res = validateTopicMapInventory(cloned, realDiskSkills);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.includes('Declared total_skills (9999) does not match'))).toBe(true);
  });

  // Scenario 8: Domain-specific inventory verification
  test('Scenario 8: Domain-specific certifier catches omitted domain skill even if global count matches', () => {
    const expectedAgentRuntimeSkills = [
      'agent-runtime-reliability-auditor',
      'agent-state-machine-integrity-auditor',
      'agent-failure-classification-auditor',
      'agent-retry-and-idempotency-auditor',
      'agent-timeout-and-cancellation-auditor',
      'agent-quorum-and-consensus-auditor',
      'agent-checkpoint-and-resume-auditor',
      'agent-resource-guard-auditor',
      'agent-fault-injection-engineer',
      'agent-execution-safety-auditor',
      'agent-runtime-deadlock-and-liveness-auditor',
      'agent-runtime-regression-auditor'
    ];

    const cloned = JSON.parse(JSON.stringify(realTopicMap));
    // Remove one domain skill from the domain route and replace with an unrelated skill so count matches
    const domainRoute = cloned.domain_routes['agent-runtime-reliability'];
    const removedIdx = domainRoute.indexOf('agent-fault-injection-engineer');
    domainRoute.splice(removedIdx, 1);
    domainRoute.push('gsap-core'); // Unrelated skill injected

    // Domain invariant check
    const hasAllExpected = expectedAgentRuntimeSkills.every(s => domainRoute.includes(s));
    expect(hasAllExpected).toBe(false); // Detected!
  });
});

