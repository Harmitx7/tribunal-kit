'use strict';

/**
 * synapse.js — Component Synapse Engine for Tribunal-Kit
 *
 * Reverse-engineers live website elements into production-ready, typed React components.
 * Computes exact CSSOM styles (geometry, color tokens, typography, elevation, transitions)
 * and synthesizes clean TSX code adhering to Tribunal Kit's anti-slop design principles.
 */

const { launchBrowser } = require('./launcher');
const { CdpClient, createNewTab, closeTab } = require('./cdp');

/**
 * Extracts computed styles and structure for an element on a live page.
 * @param {string} url
 * @param {string} selector
 * @param {object} options
 * @returns {Promise<object>}
 */
async function deconstructElement(url, selector, options = {}) {
  const browser = await launchBrowser();
  let client = null;
  let tab = null;

  try {
    tab = await createNewTab(browser.port);
    client = new CdpClient();
    await client.connect(tab.webSocketDebuggerUrl);
    await client.initDomains();

    await client.navigate(url);
    await new Promise(r => setTimeout(r, 600)); // Allow hydration and fonts to settle

    const extracted = await client.evaluate(`
      (() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) {
          return { error: 'Element matching selector not found: ' + ${JSON.stringify(selector)} };
        }

        const cs = window.getComputedStyle(el);

        const tagName = el.tagName.toLowerCase();
        const text = el.innerText ? el.innerText.trim() : '';
        const hasSvg = !!el.querySelector('svg');

        // Extract clean computed properties
        const styles = {
          display: cs.display,
          flexDirection: cs.flexDirection,
          alignItems: cs.alignItems,
          justifyContent: cs.justifyContent,
          gap: cs.gap,
          width: cs.width,
          height: cs.height,
          padding: cs.padding,
          margin: cs.margin,
          backgroundColor: cs.backgroundColor,
          color: cs.color,
          borderColor: cs.borderColor,
          borderWidth: cs.borderWidth,
          borderStyle: cs.borderStyle,
          borderRadius: cs.borderRadius,
          fontFamily: cs.fontFamily,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          lineHeight: cs.lineHeight,
          letterSpacing: cs.letterSpacing,
          textAlign: cs.textAlign,
          boxShadow: cs.boxShadow,
          backdropFilter: cs.backdropFilter,
          transition: cs.transition,
          cursor: cs.cursor,
          opacity: cs.opacity,
        };

        return {
          tagName,
          text,
          hasSvg,
          styles,
        };
      })()
    `);

    if (extracted.error) {
      throw new Error(extracted.error);
    }

    const componentName = options.name || sanitizeComponentName(selector);
    const tsxCode = synthesizeReactComponent(componentName, extracted, options);

    return {
      url,
      selector,
      componentName,
      extracted,
      code: tsxCode,
    };
  } finally {
    if (client) client.close();
    if (tab && browser) await closeTab(tab.id, browser.port);
    await browser.close();
  }
}

/**
 * Converts a selector string into a PascalCase component name.
 */
function sanitizeComponentName(selector) {
  const cleaned = selector.replace(/[^a-zA-Z0-9]/g, ' ');
  const words = cleaned.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'CustomComponent';
  return words.map(w => w[0].toUpperCase() + w.slice(1)).join('') + 'Component';
}

/**
 * Maps computed CSS properties into clean Tailwind utility classes.
 */
function mapStylesToTailwind(styles) {
  const classes = [];

  // Display & Layout
  if (styles.display === 'flex') {
    classes.push('flex');
    if (styles.flexDirection === 'column') classes.push('flex-col');
    if (styles.alignItems === 'center') classes.push('items-center');
    if (styles.justifyContent === 'center') classes.push('justify-center');
    if (styles.justifyContent === 'space-between') classes.push('justify-between');
  } else if (styles.display === 'inline-flex') {
    classes.push('inline-flex', 'items-center', 'justify-center');
  } else if (styles.display === 'grid') {
    classes.push('grid');
  }

  // Border radius
  const br = parseInt(styles.borderRadius, 10);
  if (br >= 9999 || styles.borderRadius === '50%') classes.push('rounded-full');
  else if (br >= 16) classes.push('rounded-2xl');
  else if (br >= 12) classes.push('rounded-xl');
  else if (br >= 8) classes.push('rounded-lg');
  else if (br >= 6) classes.push('rounded-md');
  else if (br >= 4) classes.push('rounded');

  // Font weight
  const fw = parseInt(styles.fontWeight, 10);
  if (fw >= 700) classes.push('font-bold');
  else if (fw >= 600) classes.push('font-semibold');
  else if (fw >= 500) classes.push('font-medium');

  // Cursor & Transitions
  if (styles.cursor === 'pointer') {
    classes.push('cursor-pointer', 'transition-all', 'duration-200', 'active:scale-[0.98]');
  }

  // Shadow
  if (styles.boxShadow && styles.boxShadow !== 'none') {
    classes.push('shadow-sm hover:shadow-md');
  }

  return classes.join(' ');
}

/**
 * Synthesizes production-grade React + TypeScript component code.
 */
function synthesizeReactComponent(componentName, data, options = {}) {
  const { tagName, text, styles } = data;
  const twClasses = mapStylesToTailwind(styles);

  const isButton = tagName === 'button' || styles.cursor === 'pointer';
  const isInput = tagName === 'input';

  if (isInput) {
    return `import React from 'react';

export interface ${componentName}Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const ${componentName}: React.FC<${componentName}Props> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {label}
        </label>
      )}
      <input
        className={\`w-full px-3.5 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 transition-all \${className}\`}
        {...props}
      />
      {error && <span className="text-xs text-rose-500">{error}</span>}
    </div>
  );
};

export default ${componentName};
`;
  }

  return `import React from 'react';

export interface ${componentName}Props {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

/**
 * ${componentName}
 * Deconstructed via Tribunal Kit Component Synapse.
 */
export const ${componentName}: React.FC<${componentName}Props> = ({
  children = ${JSON.stringify(text || 'Click me')},
  className = '',
  onClick,
  disabled = false,
}) => {
  return (
    <${isButton ? 'button' : 'div'}
      onClick={onClick}
      disabled={disabled}
      className={\`relative ${twClasses} px-4 py-2 text-sm font-medium border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:opacity-50 disabled:pointer-events-none \${className}\`}
      style={{
        borderRadius: ${JSON.stringify(styles.borderRadius || '8px')},
      }}
    >
      {children}
    </${isButton ? 'button' : 'div'}>
  );
};

export default ${componentName};
`;
}

module.exports = {
  deconstructElement,
  mapStylesToTailwind,
  synthesizeReactComponent,
  sanitizeComponentName,
};
