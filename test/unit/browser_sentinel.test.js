'use strict';

const path = require('path');
const { extractSourceLocations } = require('../../dist/browser/sentinel');

describe('browser/sentinel.js — Runtime Sentinel', () => {
  describe('extractSourceLocations', () => {
    test('extracts file paths, lines, and columns from stack traces', () => {
      const stack = `
Error: Hydration failed because the initial UI does not match what was rendered on the server.
    at Component (http://localhost:3000/src/App.tsx:42:15)
    at http://localhost:3000/_next/static/chunks/app/page.js:12:34
      `;

      const locations = extractSourceLocations(stack, path.resolve(__dirname, '../..'));
      expect(locations.length).toBeGreaterThanOrEqual(2);
      expect(locations[0].line).toBe(42);
      expect(locations[0].column).toBe(15);
      expect(locations[0].rawUrl).toContain('src/App.tsx:42:15');
      expect(locations[1].line).toBe(12);
      expect(locations[1].column).toBe(34);
    });

    test('returns empty array when stack is empty or undefined', () => {
      expect(extractSourceLocations('')).toEqual([]);
      expect(extractSourceLocations(null)).toEqual([]);
    });
  });
});
