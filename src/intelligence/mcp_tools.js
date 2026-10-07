'use strict';

/**
 * mcp_tools.js — Tribunal Intelligence: MCP Layer
 * ============================================================================
 * Phase 7T implementation.
 */

const { CaseMemory } = require('./case_memory');
const { CaseIndexer } = require('./case_indexer');
const { CaseBasedReasoningEngine } = require('./cbr_engine');

const TOOLS = [
  {
    name: 'tribunal_search_cases',
    description: 'Search historical cases by tier, files, or categories.',
    inputSchema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string' } },
        impactTier: { type: 'number' },
      },
    },
  },
  {
    name: 'tribunal_get_case',
    description: 'Retrieve full case structured data.',
    inputSchema: {
      type: 'object',
      properties: { caseId: { type: 'string' } },
      required: ['caseId'],
    },
  },
  {
    name: 'tribunal_generate_review_plan',
    description: 'Generate an intelligence-driven review plan.',
    inputSchema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string' } },
        impactTier: { type: 'number' },
      },
    },
  },
];

class IntelligenceMCPHandler {
  constructor() {
    this.cbr = new CaseBasedReasoningEngine();
    this.mem = new CaseMemory();
    this.idx = new CaseIndexer();
  }

  getToolDefinitions() {
    return TOOLS;
  }

  async callTool(name, args) {
    switch (name) {
      case 'tribunal_search_cases': {
        return {
          content: [
            { type: 'text', text: JSON.stringify(this.cbr.similarity.findSimilar(args), null, 2) },
          ],
        };
      }
      case 'tribunal_get_case': {
        const caseRecord = this.mem.getCase(args.caseId);
        return {
          content: [
            { type: 'text', text: JSON.stringify(caseRecord || { error: 'Not found' }, null, 2) },
          ],
        };
      }
      case 'tribunal_generate_review_plan': {
        const plan = this.cbr.generateReviewPlan(args);
        return {
          content: [{ type: 'text', text: JSON.stringify(plan, null, 2) }],
        };
      }
      default:
        throw new Error(`Unknown intelligence tool: ${name}`);
    }
  }
}

module.exports = { IntelligenceMCPHandler, TOOLS };
