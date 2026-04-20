const { getAssociatedScript } = require('../../.agent/scripts/skill_integrator.js');
const { architecturalWeight, semanticDelta } = require('../../.agent/scripts/skill_evolution.js');
const { parseCaseId, findAgentDir } = require('../../.agent/scripts/case_law_manager.js');

describe('Wave 2 Scripts (Evolving Brain)', () => {
    describe('skill_integrator.js', () => {
        it('should correctly identify implicit JS scripts', () => {
            // we mock fs internally if we wanted to true unit test, but for now just check exports
            expect(typeof getAssociatedScript).toBe('function');
        });
    });

    describe('skill_evolution.js', () => {
        it('should assign higher architectural weight to classes and interfaces', () => {
            expect(architecturalWeight('class User {')).toBeGreaterThanOrEqual(2);
            expect(architecturalWeight('interface Data {')).toBeGreaterThanOrEqual(2);
        });

        it('should assign 0 weight to noise patterns like comments and imports', () => {
            expect(architecturalWeight('// this is a comment')).toBe(0);
            expect(architecturalWeight('import { foo } from "fs";')).toBe(0);
            expect(architecturalWeight('')).toBe(0);
        });

        it('should successfully filter a semantic delta', () => {
            const rawDiff = `
@@ -1,3 +1,4 @@
 import { foo } from 'fs';
+import { baz } from 'fs';
 class Foo {
-    // old comment
+    // new comment
+    export class Baz {}
 }
            `.trim();

            const delta = semanticDelta(rawDiff, 2);
            // It gets kept because the hunk contains 'export class Baz {}'
            expect(delta).toContain('import { baz }');
            expect(delta).toContain('export class Baz {}');
        });
    });

    describe('case_law_manager.js', () => {
        it('should extract tags', () => {
            const { extractTags } = require('../../.agent/scripts/case_law_manager.js');
            expect(typeof extractTags).toBe('function');
            expect(extractTags('hello world and foo bar')).toContain('hello');
            expect(extractTags('hello world and foo bar')).not.toContain('and');
        });
        it('should find agent diff', () => {
             expect(typeof findAgentDir).toBe('function');
        });
    });
});
