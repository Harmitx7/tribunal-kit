'use strict';

function estimateTokens(input) {
  let text = '';
  if (typeof input === 'string') {
    text = input;
  } else if (input !== null && input !== undefined) {
    try {
      text = JSON.stringify(input);
    } catch {
      text = String(input);
    }
  }
  return {
    characterCount: text.length,
    byteLength: Buffer.byteLength(text, 'utf8'),
    estimatedTokens: Math.ceil(text.length / 4),
    estimationMethod: 'heuristic (1 token ≈ 4 characters)',
  };
}

module.exports = { estimateTokens };
