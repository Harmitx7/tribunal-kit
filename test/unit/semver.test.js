'use strict';

const { compareSemver } = require('../../bin/tribunal-kit');

describe('compareSemver', () => {
    test('returns 1 when a > b (patch)', () => {
        expect(compareSemver('2.4.2', '2.4.1')).toBe(1);
    });

    test('returns 1 when a > b (minor)', () => {
        expect(compareSemver('2.5.0', '2.4.9')).toBe(1);
    });

    test('returns 1 when a > b (major)', () => {
        expect(compareSemver('3.0.0', '2.9.9')).toBe(1);
    });

    test('returns 0 when a === b', () => {
        expect(compareSemver('2.4.2', '2.4.2')).toBe(0);
    });

    test('returns -1 when a < b (patch)', () => {
        expect(compareSemver('2.4.1', '2.4.2')).toBe(-1);
    });

    test('returns -1 when a < b (minor)', () => {
        expect(compareSemver('2.4.9', '2.5.0')).toBe(-1);
    });

    test('strips leading "v" prefix from a', () => {
        expect(compareSemver('v2.4.2', '2.4.2')).toBe(0);
    });

    test('strips leading "v" prefix from b', () => {
        expect(compareSemver('2.4.2', 'v2.4.2')).toBe(0);
    });

    test('strips leading "v" from both', () => {
        expect(compareSemver('v2.4.3', 'v2.4.2')).toBe(1);
    });

    test('handles missing patch segment (treats as 0)', () => {
        expect(compareSemver('2.4', '2.4.0')).toBe(0);
    });
});
