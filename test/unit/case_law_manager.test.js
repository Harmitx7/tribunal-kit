const {
    semanticDelta,
    extractTags,
    isNoiseRejection,
    isTrivialLine
} = require('../../.agent/scripts/case_law_manager');

describe('case_law_manager.js', () => {
    describe('Noise Filter', () => {
        it('should identify noise rejections', () => {
            expect(isNoiseRejection('Please fix formatting')).toBe(true);
            expect(isNoiseRejection('Trailing whitespace detected')).toBe(true);
            expect(isNoiseRejection('Run prettier')).toBe(true);
        });

        it('should allow valid rejections', () => {
            expect(isNoiseRejection('Missing SQL injection protection')).toBe(false);
            expect(isNoiseRejection('Type error in React component')).toBe(false);
        });
    });

    describe('Semantic Delta', () => {
        it('should identify trivial lines', () => {
            expect(isTrivialLine('// just a comment')).toBe(true);
            expect(isTrivialLine('import { foo } from "bar"')).toBe(true);
            expect(isTrivialLine('const a = 1;')).toBe(false);
        });

        it('should filter trivial changes from diff', () => {
            const diff = `--- file.js\n+++ file.js\n-import a from 'a'\n+// a comment\n+const a = 1;`;
            const delta = semanticDelta(diff);
            expect(delta).toContain('+const a = 1;');
            expect(delta).not.toContain('// a comment');
            expect(delta).not.toContain('import a');
        });
    });

    describe('Extract Tags', () => {
        it('should extract meaningful tags and ignore stop words', () => {
            const tags = extractTags('The React component has a missing key prop');
            expect(tags).toContain('react');
            expect(tags).toContain('component');
            expect(tags).toContain('missing');
            expect(tags).toContain('key');
            expect(tags).toContain('prop');
            expect(tags).not.toContain('the');
            expect(tags).not.toContain('has');
            expect(tags).not.toContain('a');
        });
    });
});
