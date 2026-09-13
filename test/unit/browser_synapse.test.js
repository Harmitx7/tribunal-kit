'use strict';

const {
  mapStylesToTailwind,
  synthesizeReactComponent,
  sanitizeComponentName,
} = require('../../dist/browser/synapse');

describe('browser/synapse.js — Component Synapse Engine', () => {
  describe('sanitizeComponentName', () => {
    test('converts CSS selectors to clean PascalCase names', () => {
      expect(sanitizeComponentName('button.primary')).toBe('ButtonPrimaryComponent');
      expect(sanitizeComponentName('#hero-cta')).toBe('HeroCtaComponent');
      expect(sanitizeComponentName('.card__header')).toBe('CardHeaderComponent');
    });

    test('falls back to CustomComponent if selector has no alphanumeric characters', () => {
      expect(sanitizeComponentName('>>>')).toBe('CustomComponent');
    });
  });

  describe('mapStylesToTailwind', () => {
    test('maps flexbox layouts properly', () => {
      const tw = mapStylesToTailwind({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      });
      expect(tw).toContain('flex');
      expect(tw).toContain('flex-col');
      expect(tw).toContain('items-center');
      expect(tw).toContain('justify-center');
    });

    test('maps border radius to appropriate Tailwind scale', () => {
      expect(mapStylesToTailwind({ borderRadius: '16px' })).toContain('rounded-2xl');
      expect(mapStylesToTailwind({ borderRadius: '12px' })).toContain('rounded-xl');
      expect(mapStylesToTailwind({ borderRadius: '8px' })).toContain('rounded-lg');
      expect(mapStylesToTailwind({ borderRadius: '9999px' })).toContain('rounded-full');
    });

    test('maps font weights and cursor transitions', () => {
      const tw = mapStylesToTailwind({
        fontWeight: '700',
        cursor: 'pointer',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      });
      expect(tw).toContain('font-bold');
      expect(tw).toContain('cursor-pointer');
      expect(tw).toContain('active:scale-[0.98]');
      expect(tw).toContain('shadow-sm hover:shadow-md');
    });
  });

  describe('synthesizeReactComponent', () => {
    test('synthesizes a button component with proper TSX props', () => {
      const data = {
        tagName: 'button',
        text: 'Deploy Now',
        styles: {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          fontWeight: '600',
          cursor: 'pointer',
        },
      };

      const code = synthesizeReactComponent('DeployButton', data);
      expect(code).toContain('export interface DeployButtonProps');
      expect(code).toContain('export const DeployButton: React.FC<DeployButtonProps>');
      expect(code).toContain('<button');
      expect(code).toContain('Deploy Now');
      expect(code).toContain('export default DeployButton;');
    });

    test('synthesizes an input component when tagName is input', () => {
      const data = {
        tagName: 'input',
        text: '',
        styles: {
          display: 'block',
          borderRadius: '8px',
        },
      };

      const code = synthesizeReactComponent('SearchInput', data);
      expect(code).toContain('export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement>');
      expect(code).toContain('export const SearchInput: React.FC<SearchInputProps>');
      expect(code).toContain('<input');
      expect(code).toContain('export default SearchInput;');
    });
  });
});
