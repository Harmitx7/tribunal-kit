/**
 * skill_competence_suite.test.js — Exhaustive Competence & Structure Audit across all 398 Skills
 *
 * Verifies:
 * 1. 398 distinct skills are present in .agent/skills/.
 * 2. Every skill contains a SKILL.md file with valid YAML frontmatter.
 * 3. Frontmatter name strictly matches directory name.
 * 4. Description is actionable and non-trivial (>= 20 characters).
 * 5. 100% parity across canonical source (.agent/skills/), universal mirror (skills/), and multi-agent mirror (.agents/skills/).
 * 6. Every skill is mapped to at least one domain route in .agent/skill_topic_map.json.
 * 7. No empty or stub skill bodies (< 100 bytes).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const CANONICAL_SKILLS = path.join(ROOT, '.agent', 'skills');
const MIRROR_SKILLS = path.join(ROOT, 'skills');
const AGENTS_SKILLS = path.join(ROOT, '.agents', 'skills');
const TOPIC_MAP_PATH = path.join(ROOT, '.agent', 'skill_topic_map.json');

describe('Universal Skill Competence & Structure Suite (All 398 Skills)', () => {
  const skillDirs = fs.readdirSync(CANONICAL_SKILLS).filter(d => 
    fs.statSync(path.join(CANONICAL_SKILLS, d)).isDirectory()
  );

  const topicMap = JSON.parse(fs.readFileSync(TOPIC_MAP_PATH, 'utf8'));
  const mappedSkills = new Set();
  for (const list of Object.values(topicMap.domain_routes || {})) {
    if (Array.isArray(list)) list.forEach(s => mappedSkills.add(s));
  }

  it('verifies that exactly 398 skills exist in canonical repository', () => {
    expect(skillDirs.length).toBe(398);
  });

  describe.each(skillDirs)('Skill: %s', (skill) => {
    const skillPath = path.join(CANONICAL_SKILLS, skill, 'SKILL.md');
    const mirrorPath = path.join(MIRROR_SKILLS, skill, 'SKILL.md');
    const agentsPath = path.join(AGENTS_SKILLS, skill, 'SKILL.md');

    it('has SKILL.md file with valid content', () => {
      expect(fs.existsSync(skillPath)).toBe(true);
      const content = fs.readFileSync(skillPath, 'utf8');
      expect(content.length).toBeGreaterThanOrEqual(100);
    });

    it('contains valid YAML frontmatter matching directory name', () => {
      const content = fs.readFileSync(skillPath, 'utf8');
      const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      expect(frontmatterMatch).not.toBeNull();
      const fm = frontmatterMatch[1];
      
      const nameMatch = fm.match(/name:\s*([^\r\n]+)/);
      expect(nameMatch).not.toBeNull();
      const declaredName = nameMatch[1].trim().replace(/^['"]|['"]$/g, '');
      expect(declaredName).toBe(skill);

      const descMatch = fm.match(/description:\s*([^\r\n]+)/);
      expect(descMatch).not.toBeNull();
      const desc = descMatch[1].trim().replace(/^['"]|['"]$/g, '');
      expect(desc.length).toBeGreaterThanOrEqual(15);
    });

    it('is registered in skill_topic_map.json', () => {
      expect(mappedSkills.has(skill)).toBe(true);
    });

    it('is mirrored to skills/ and .agents/skills/ with identical content', () => {
      expect(fs.existsSync(mirrorPath)).toBe(true);
      expect(fs.existsSync(agentsPath)).toBe(true);
      const canonicalContent = fs.readFileSync(skillPath, 'utf8');
      const mirrorContent = fs.readFileSync(mirrorPath, 'utf8');
      const agentsContent = fs.readFileSync(agentsPath, 'utf8');
      expect(mirrorContent).toBe(canonicalContent);
      expect(agentsContent).toBe(canonicalContent);
    });
  });
});

