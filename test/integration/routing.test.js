'use strict';

const path = require('path');
const fs   = require('fs');

const AGENT_DIR      = path.resolve(__dirname, '../../.agent');
const WORKFLOWS_DIR  = path.join(AGENT_DIR, 'workflows');
const AGENTS_DIR     = path.join(AGENT_DIR, 'agents');
const SKILLS_DIR     = path.join(AGENT_DIR, 'skills');

// Expected slash commands per plan (30 workflows)
const EXPECTED_WORKFLOWS = [
    'api-tester', 'audit', 'brainstorm', 'changelog', 'create',
    'debug', 'deploy', 'enhance', 'fix', 'generate', 'migrate',
    'orchestrate', 'performance-benchmarker', 'plan', 'preview',
    'refactor', 'review', 'review-ai', 'session', 'status',
    'strengthen-skills', 'swarm', 'test', 'tribunal-backend',
    'tribunal-database', 'tribunal-frontend', 'tribunal-full',
    'tribunal-mobile', 'tribunal-performance', 'ui-ux-pro-max',
];

describe('Workflow file integrity', () => {
    test('.agent/workflows/ directory exists', () => {
        expect(fs.existsSync(WORKFLOWS_DIR)).toBe(true);
    });

    test('all 30 expected workflow files are present and non-empty', () => {
        const missing = [];
        const empty   = [];

        for (const name of EXPECTED_WORKFLOWS) {
            const filePath = path.join(WORKFLOWS_DIR, `${name}.md`);
            if (!fs.existsSync(filePath)) {
                missing.push(name);
            } else {
                const size = fs.statSync(filePath).size;
                if (size === 0) empty.push(name);
            }
        }

        expect(missing).toEqual([]);
        expect(empty).toEqual([]);
    });

    test('no workflow file is a duplicate of another', () => {
        const files = fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.md'));
        const contents = files.map(f =>
            fs.readFileSync(path.join(WORKFLOWS_DIR, f), 'utf8').trim()
        );
        const unique = new Set(contents);
        expect(unique.size).toBe(contents.length);
    });
});

describe('Agent file integrity', () => {
    test('.agent/agents/ directory exists', () => {
        expect(fs.existsSync(AGENTS_DIR)).toBe(true);
    });

    test('at least 30 agent files are present', () => {
        const files = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));
        expect(files.length).toBeGreaterThanOrEqual(30);
    });

    test('all agent files are non-empty', () => {
        const files = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));
        const empty = files.filter(f => fs.statSync(path.join(AGENTS_DIR, f)).size === 0);
        expect(empty).toEqual([]);
    });
});

describe('Skills directory integrity', () => {
    test('.agent/skills/ directory exists', () => {
        expect(fs.existsSync(SKILLS_DIR)).toBe(true);
    });

    test('at least 50 skill entries are present', () => {
        const entries = fs.readdirSync(SKILLS_DIR);
        // Each skill is a directory containing a SKILL.md
        const skillDirs = entries.filter(e =>
            fs.statSync(path.join(SKILLS_DIR, e)).isDirectory()
        );
        expect(skillDirs.length).toBeGreaterThanOrEqual(50);
    });

    test('every skill directory contains a SKILL.md', () => {
        const entries = fs.readdirSync(SKILLS_DIR);
        const skillDirs = entries.filter(e =>
            fs.statSync(path.join(SKILLS_DIR, e)).isDirectory()
        );
        const missing = skillDirs.filter(dir =>
            !fs.existsSync(path.join(SKILLS_DIR, dir, 'SKILL.md'))
        );
        expect(missing).toEqual([]);
    });
});
