'use strict';

/**
 * component_state_engine.js — 5-State Interactive Target Contract Validator.
 */

const { InteractiveStateContractSchema } = require('./design_token_schemas');

/**
 * Inspects a CSS rule set or Tailwind class string to verify complete interactive state coverage.
 * Mandates: default, hover, focus-visible, active/pressed, and disabled.
 */
function auditInteractiveStates(elementId, classStringOrCss = '') {
  const text = String(classStringOrCss);

  const hasHover = /:hover\b|hover:/i.test(text);
  const hasFocusVisible = /:focus-visible\b|focus-visible:|focus:/i.test(text);
  const hasActivePress = /:active\b|active:|active:scale/i.test(text);
  const hasDisabled = /:disabled\b|disabled:|aria-disabled/i.test(text);

  let pressScaleFactor = 1.0;
  const scaleMatch = text.match(/active:scale-\[(\d*\.?\d+)\]|transform:\s*scale\((\d*\.?\d+)\)/i);
  if (scaleMatch) {
    pressScaleFactor = parseFloat(scaleMatch[1] || scaleMatch[2]);
  } else if (hasActivePress) {
    pressScaleFactor = 0.98;
  }

  const isCompliant = hasHover && hasFocusVisible && hasActivePress && hasDisabled;

  return InteractiveStateContractSchema.parse({
    elementId,
    hasHover,
    hasFocusVisible,
    hasActivePress,
    hasDisabled,
    pressScaleFactor,
    isCompliant,
  });
}

module.exports = {
  auditInteractiveStates,
};

