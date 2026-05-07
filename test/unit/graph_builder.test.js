/**
 * graph_builder.test.js — Unit tests for the Architecture Graph Mapper
 * Tests: parseFile, generateYAML, isExcluded, walkDir
 *
 * Replaces the old existence-check-only test with real function-level tests
 * now that graph_builder exports its internals.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

const { parseFile, generateYAML, isExcluded, getFileHash } = require('../../.agent/scripts/graph_builder');

describe('graph_builder.js', () => {

    // ── parseFile ─────────────────────────────────────────────────────────

    describe('parseFile()', () => {
        it('should extract CommonJS require imports', () => {
            const content = `const fs = require('fs');\nconst path = require('path');`;
            const result = parseFile(content);
            expect(result.imports).toContain('fs');
            expect(result.imports).toContain('path');
        });

        it('should extract ES module imports', () => {
            const content = `import React from 'react';\nimport { useState } from 'react';`;
            const result = parseFile(content);
            expect(result.imports).toContain('react');
        });

        it('should extract dynamic imports', () => {
            const content = `const mod = import('lodash');`;
            const result = parseFile(content);
            expect(result.imports).toContain('lodash');
        });

        it('should extract named exports', () => {
            const content = `export const foo = 1;\nexport function bar() {}\nexport class Baz {}`;
            const result = parseFile(content);
            expect(result.exports).toContain('foo');
            expect(result.exports).toContain('bar');
            expect(result.exports).toContain('Baz');
        });

        it('should extract module.exports', () => {
            const content = `module.exports = { parseFile, generateYAML, walkDir };`;
            const result = parseFile(content);
            expect(result.exports).toContain('parseFile');
            expect(result.exports).toContain('generateYAML');
            expect(result.exports).toContain('walkDir');
        });

        it('should extract default exports', () => {
            const content = `export default MyComponent`;
            const result = parseFile(content);
            expect(result.exports).toContain('MyComponent');
        });

        it('should return empty arrays for code without imports/exports', () => {
            const content = `const x = 1;\nfunction doStuff() { return x; }`;
            const result = parseFile(content);
            expect(result.imports).toEqual([]);
            expect(result.exports).toEqual([]);
        });

        it('should ignore commented-out imports', () => {
            const content = `// import bad from 'bad';\nconst x = 1;`;
            const result = parseFile(content);
            expect(result.imports).not.toContain('bad');
        });

        it('should handle relative path imports', () => {
            const content = `const utils = require('./utils');\nimport helpers from '../helpers';`;
            const result = parseFile(content);
            expect(result.imports).toContain('./utils');
            expect(result.imports).toContain('../helpers');
        });
    });

    // ── generateYAML ──────────────────────────────────────────────────────

    describe('generateYAML()', () => {
        it('should generate valid YAML header', () => {
            const yaml = generateYAML({});
            expect(yaml).toContain('# Auto-generated Architecture Graph');
            expect(yaml).toContain('DO NOT EDIT MANUALLY');
        });

        it('should render file entries with imports and exports', () => {
            const data = {
                'src/index.js': {
                    imports: ['./utils', 'express'],
                    exports: ['app'],
                    dependents: [],
                    riskScore: 'Medium',
                    blastRadius: 3
                }
            };
            const yaml = generateYAML(data);
            expect(yaml).toContain('"src/index.js"');
            expect(yaml).toContain('riskScore: "Medium"');
            expect(yaml).toContain('blastRadius: 3');
            expect(yaml).toContain('"./utils"');
            expect(yaml).toContain('"express"');
            expect(yaml).toContain('"app"');
        });

        it('should skip entries with no imports, exports, or dependents', () => {
            const data = {
                'empty.js': { imports: [], exports: [], dependents: [] },
                'useful.js': { imports: ['fs'], exports: ['run'], dependents: [] }
            };
            const yaml = generateYAML(data);
            expect(yaml).not.toContain('"empty.js"');
            expect(yaml).toContain('"useful.js"');
        });

        it('should render dependents when present', () => {
            const data = {
                'lib/core.js': {
                    imports: [],
                    exports: ['core'],
                    dependents: ['src/app.js', 'src/cli.js'],
                    riskScore: 'High',
                    blastRadius: 5
                }
            };
            const yaml = generateYAML(data);
            expect(yaml).toContain('dependents:');
            expect(yaml).toContain('"src/app.js"');
            expect(yaml).toContain('"src/cli.js"');
        });
    });

    // ── isExcluded ────────────────────────────────────────────────────────

    describe('isExcluded()', () => {
        it('should exclude node_modules', () => {
            const testPath = path.join(process.cwd(), 'node_modules', 'express', 'index.js');
            expect(isExcluded(testPath)).toBe(true);
        });

        it('should exclude .git', () => {
            const testPath = path.join(process.cwd(), '.git', 'config');
            expect(isExcluded(testPath)).toBe(true);
        });

        it('should exclude .next build directory', () => {
            const testPath = path.join(process.cwd(), '.next', 'server', 'app.js');
            expect(isExcluded(testPath)).toBe(true);
        });

        it('should exclude coverage directory', () => {
            const testPath = path.join(process.cwd(), 'coverage', 'lcov-report', 'index.html');
            expect(isExcluded(testPath)).toBe(true);
        });

        it('should NOT exclude regular source files', () => {
            const testPath = path.join(process.cwd(), 'src', 'index.js');
            expect(isExcluded(testPath)).toBe(false);
        });
    });

    // ── getFileHash ───────────────────────────────────────────────────────

    describe('getFileHash()', () => {
        const tmpDir = path.join(os.tmpdir(), 'graph-hash-test-' + Date.now());
        const tmpFile = path.join(tmpDir, 'test.js');

        beforeAll(() => {
            fs.mkdirSync(tmpDir, { recursive: true });
            fs.writeFileSync(tmpFile, 'const x = 1;');
        });
        afterAll(() => {
            try { fs.unlinkSync(tmpFile); fs.rmdirSync(tmpDir); } catch { /* ignore */ }
        });

        it('should return a 40-char hex SHA-1 hash', () => {
            const hash = getFileHash(tmpFile);
            expect(hash).toMatch(/^[a-f0-9]{40}$/);
        });

        it('should return the same hash for unchanged content', () => {
            const hash1 = getFileHash(tmpFile);
            const hash2 = getFileHash(tmpFile);
            expect(hash1).toBe(hash2);
        });

        it('should return a different hash when content changes', () => {
            const hash1 = getFileHash(tmpFile);
            fs.writeFileSync(tmpFile, 'const x = 2;');
            const hash2 = getFileHash(tmpFile);
            expect(hash1).not.toBe(hash2);
            fs.writeFileSync(tmpFile, 'const x = 1;'); // restore
        });

        it('should throw on non-existent file', () => {
            expect(() => getFileHash('/non/existent/file.js')).toThrow();
        });
    });

    // ── graph_zoom.js existence (preserved from original test) ───────────

    describe('graph_zoom.js', () => {
        it('should exist and be executable', () => {
            const zoomPath = path.join(__dirname, '../../.agent/scripts/graph_zoom.js');
            expect(fs.existsSync(zoomPath)).toBe(true);
            const content = fs.readFileSync(zoomPath, 'utf8');
            expect(content).toContain('function extractSkeleton');
            expect(content).toContain('RAW FILE FALLBACK');
        });
    });
});
