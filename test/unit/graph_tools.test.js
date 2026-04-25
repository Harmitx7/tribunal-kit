const fs = require('fs');
const path = require('path');

describe('Knowledge Graph Tools', () => {
    describe('graph_builder.js', () => {
        it('should exist and be executable', () => {
            const builderPath = path.join(__dirname, '../../.agent/scripts/graph_builder.js');
            expect(fs.existsSync(builderPath)).toBe(true);
            const content = fs.readFileSync(builderPath, 'utf8');
            expect(content).toContain('function main()');
            expect(content).toContain('function walkDir');
            expect(content).toContain('isExcluded');
        });
    });

    describe('graph_zoom.js', () => {
        it('should exist and be executable', () => {
            const zoomPath = path.join(__dirname, '../../.agent/scripts/graph_zoom.js');
            expect(fs.existsSync(zoomPath)).toBe(true);
            const content = fs.readFileSync(zoomPath, 'utf8');
            expect(content).toContain('function extractSkeleton');
            // Ensure fallback logic is present
            expect(content).toContain('RAW FILE FALLBACK');
        });
    });
});
