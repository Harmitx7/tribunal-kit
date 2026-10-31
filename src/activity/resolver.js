'use strict';

/**
 * Tribunal-Kit Skill & Agent Resolver (Phase 4)
 *
 * Resolves verified agent and skill metadata from built-in registry or disk
 * to generate context-aware, purposeful activation announcements,
 * eliminating generic noise and instruction conflicts.
 */

const fs = require('fs');
const path = require('path');
const { ACTIVITY_STATES } = require('./types');
const { createEvent } = require('./schema');

/**
 * Authoritative built-in registry of core Tribunal specialist agents.
 * Provides instant zero-I/O resolution with verified domains and mandates.
 */
const CORE_AGENT_REGISTRY = Object.freeze({
  'backend-specialist': {
    displayName: 'Backend Specialist',
    domain: 'Server Architecture & API Engineering',
    mandate: 'Verifies API route contracts, idempotency, data flow, and runtime resilience.',
    category: 'backend',
  },
  'api-architect': {
    displayName: 'API Architect',
    domain: 'API Contract Design & Protocols',
    mandate: 'Enforces RESTful consistency, GraphQL schemas, and interface contracts.',
    category: 'backend',
  },
  'frontend-specialist': {
    displayName: 'Frontend Specialist',
    domain: 'Interface Systems & React Architecture',
    mandate: 'Ensures UI component hierarchy, client-server boundary separation, and accessible state.',
    category: 'frontend',
  },
  'react-specialist': {
    displayName: 'React Specialist',
    domain: 'Advanced React Architecture',
    mandate: 'Audits hook lifecycles, re-render bottlenecks, server components, and concurrent mode.',
    category: 'frontend',
  },
  'vue-expert': {
    displayName: 'Vue Expert',
    domain: 'Vue & Nuxt Architecture',
    mandate: 'Verifies composition APIs, reactivity boundaries, and SSR hydration invariants.',
    category: 'frontend',
  },
  'mobile-developer': {
    displayName: 'Mobile Developer',
    domain: 'Cross-Platform Mobile Engineering',
    mandate: 'Audits mobile navigation, native bridges, touch gestures, and offline persistence.',
    category: 'mobile',
  },
  'security-auditor': {
    displayName: 'Security Auditor',
    domain: 'Application Security & OWASP Defense',
    mandate: 'Audits injection vectors, auth barriers, secrets exposure, and input sanitization.',
    category: 'security',
  },
  'penetration-tester': {
    displayName: 'Penetration Tester',
    domain: 'Attack Surface & Threat Modeling',
    mandate: 'Identifies exploit chains, privilege escalation vectors, and security perimeter gaps.',
    category: 'security',
  },
  'ai-code-reviewer': {
    displayName: 'AI Code Reviewer',
    domain: 'LLM Integration & Prompt Defense',
    mandate: 'Defends against prompt injection, verifies token budgets, and validates model output.',
    category: 'security',
  },
  'resilience-reviewer': {
    displayName: 'Resilience Reviewer',
    domain: 'Fault Tolerance & Error Resilience',
    mandate: 'Audits network boundaries, timeout wraps, error boundaries, and degradation fallbacks.',
    category: 'architecture',
  },
  'database-architect': {
    displayName: 'Database Architect',
    domain: 'Database Schema & Query Integrity',
    mandate: 'Verifies migrations, query optimization, indexing strategy, and transactional consistency.',
    category: 'database',
  },
  'sql-pro': {
    displayName: 'SQL Pro',
    domain: 'Advanced SQL & Analytical Queries',
    mandate: 'Optimizes complex joins, window functions, locking behaviors, and query plans.',
    category: 'database',
  },
  'db-latency-auditor': {
    displayName: 'DB Latency Auditor',
    domain: 'Database Performance & Query Tuning',
    mandate: 'Pinpoints N+1 queries, missing composite indexes, and buffer cache misses.',
    category: 'database',
  },
  'orchestrator': {
    displayName: 'Orchestrator',
    domain: 'Multi-Agent Coordination & Synthesis',
    mandate: 'Decomposes cross-domain tasks, manages parallel worker waves, and synthesizes findings.',
    category: 'coordination',
  },
  'agent-organizer': {
    displayName: 'Agent Organizer',
    domain: 'Agent Swarm Coordination',
    mandate: 'Manages agent capability handoffs, context propagation, and worker dispatch.',
    category: 'coordination',
  },
  'project-planner': {
    displayName: 'Project Planner',
    domain: 'System Architecture & Phased Milestones',
    mandate: 'Structures multi-wave execution plans, dependency order, and evidence checkpoints.',
    category: 'strategy',
  },
  'test-engineer': {
    displayName: 'Test Engineer',
    domain: 'Behavioral Test Coverage & Verification',
    mandate: 'Audits happy-path gaps, boundary edge cases, and deterministic test isolation.',
    category: 'qa',
  },
  'qa-automation-engineer': {
    displayName: 'QA Automation Engineer',
    domain: 'Automated E2E & Integration Testing',
    mandate: 'Builds deterministic integration harnesses, mock servers, and browser tests.',
    category: 'qa',
  },
  'logic-reviewer': {
    displayName: 'Logic Reviewer',
    domain: 'Core Logic & Business Invariants',
    mandate: 'Verifies invariant constraints, edge conditions, state transitions, and off-by-one bugs.',
    category: 'quality',
  },
  'type-safety-reviewer': {
    displayName: 'Type Safety Reviewer',
    domain: 'Type Integrity & Schema Compliance',
    mandate: 'Eliminates unsafe type assertions, validates runtime schemas, and verifies constraints.',
    category: 'quality',
  },
  'performance-optimizer': {
    displayName: 'Performance Optimizer',
    domain: 'Runtime Efficiency & Resource Optimization',
    mandate: 'Identifies latency bottlenecks, unneeded allocations, memory leaks, and blocking code.',
    category: 'performance',
  },
  'throughput-optimizer': {
    displayName: 'Throughput Optimizer',
    domain: 'Throughput & High-Load Architecture',
    mandate: 'Maximizes request concurrency, batching throughput, and IO pipelining.',
    category: 'performance',
  },
  'vitals-reviewer': {
    displayName: 'Vitals Reviewer',
    domain: 'Core Web Vitals Optimization',
    mandate: 'Optimizes Largest Contentful Paint, Cumulative Layout Shift, and Interaction to Next Paint.',
    category: 'performance',
  },
  'anti-pattern-reviewer': {
    displayName: 'Anti-Pattern Reviewer',
    domain: 'Clean Code & Architectural Design',
    mandate: 'Flags coupling smells, leaky abstractions, dead code, and premature complexity.',
    category: 'quality',
  },
  'dependency-reviewer': {
    displayName: 'Dependency Reviewer',
    domain: 'Dependency Supply Chain & Audit',
    mandate: 'Audits package bloat, phantom dependencies, unpinned versions, and deprecated APIs.',
    category: 'security',
  },
  'devops-engineer': {
    displayName: 'DevOps Engineer',
    domain: 'CI/CD Pipelines & Containerization',
    mandate: 'Automates deployment workflows, Docker containerization, and build caching.',
    category: 'devops',
  },
  'devops-incident-responder': {
    displayName: 'Incident Responder',
    domain: 'Production Incident Recovery & SRE',
    mandate: 'Diagnoses runtime outages, rollback triggers, and telemetry alarms.',
    category: 'devops',
  },
  'platform-engineer': {
    displayName: 'Platform Engineer',
    domain: 'Platform Infrastructure & Cloud Engineering',
    mandate: 'Manages Kubernetes, infrastructure-as-code, and developer environment reliability.',
    category: 'devops',
  },
  'system-architect': {
    displayName: 'System Architect',
    domain: 'Distributed Systems & Scale',
    mandate: 'Designs fault-tolerant architectures, distributed consensus, and event streaming.',
    category: 'architecture',
  },
  'code-archaeologist': {
    displayName: 'Code Archaeologist',
    domain: 'Legacy Codebase Archaeology',
    mandate: 'Extracts undocumented constraints, historical intent, and refactoring migration paths.',
    category: 'architecture',
  },
  'debugger': {
    displayName: 'Debugger',
    domain: 'Systematic Bug Diagnosis',
    mandate: 'Traces execution flows, reproduces edge-case failures, and isolates root causes.',
    category: 'quality',
  },
});

class SkillAgentResolver {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.cache = new Map();
  }

  /**
   * Parse YAML-like frontmatter from markdown text without external heavy parser.
   */
  _parseFrontmatter(content) {
    if (!content.startsWith('---')) return {};
    const endIndex = content.indexOf('\n---', 3);
    if (endIndex === -1) return {};

    const raw = content.slice(3, endIndex).trim();
    const result = {};
    for (const line of raw.split('\n')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0 && !line.startsWith(' ') && !line.startsWith('-')) {
        const key = line.slice(0, colonIdx).trim();
        let val = line.slice(colonIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        result[key] = val;
      }
    }
    return result;
  }

  /**
   * Resolves metadata for an agent name.
   */
  resolveAgent(agentName) {
    if (!agentName || typeof agentName !== 'string') {
      return {
        name: 'unknown-agent',
        displayName: 'Specialist Agent',
        domain: 'Engineering Review',
        mandate: 'Verifies software engineering invariants.',
        category: 'quality',
        source: 'fallback',
      };
    }

    const cleanName = agentName.replace(/^@/, '').trim();
    if (this.cache.has(`agent:${cleanName}`)) {
      return this.cache.get(`agent:${cleanName}`);
    }

    // 1. Check built-in registry
    if (CORE_AGENT_REGISTRY[cleanName]) {
      const reg = CORE_AGENT_REGISTRY[cleanName];
      const entry = {
        name: cleanName,
        displayName: reg.displayName || cleanName,
        domain: reg.domain,
        mandate: reg.mandate,
        category: reg.category || 'quality',
        source: 'builtin',
      };
      this.cache.set(`agent:${cleanName}`, entry);
      return entry;
    }

    // 2. Check filesystem (.agent/agents/)
    const candidatePaths = [
      path.join(this.projectRoot, '.agent', 'agents', `${cleanName}.md`),
      path.join(this.projectRoot, 'tribunal-kit', '.agent', 'agents', `${cleanName}.md`),
      path.join(__dirname, '..', '..', '.agent', 'agents', `${cleanName}.md`),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        try {
          const content = fs.readFileSync(p, 'utf8');
          const meta = this._parseFrontmatter(content);
          const domain = meta.name
            ? `${cleanName.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}`
            : cleanName;
          const desc = meta.description || 'Specialized engineering auditor.';
          const firstSentence = desc.split(/\.\s+/)[0].replace(/^The Tribunal's\s+/i, '').trim();
          const mandate = firstSentence.endsWith('.') ? firstSentence : `${firstSentence}.`;

          const entry = {
            name: cleanName,
            displayName: cleanName.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
            domain: domain.replace(/Reviewer$/i, 'Review'),
            mandate,
            category: 'custom',
            source: 'filesystem',
          };
          this.cache.set(`agent:${cleanName}`, entry);
          return entry;
        } catch {
          // ignore read error
        }
      }
    }

    // 3. Fallback heuristic for unknown agent
    const humanized = cleanName
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    const entry = {
      name: cleanName,
      displayName: humanized,
      domain: `${humanized} Specialist`,
      mandate: `Enforcing ${humanized.toLowerCase()} invariants and engineering standards.`,
      category: 'custom',
      source: 'fallback',
    };
    this.cache.set(`agent:${cleanName}`, entry);
    return entry;
  }

  /**
   * Resolves metadata for a skill name.
   */
  resolveSkill(skillName) {
    if (!skillName || typeof skillName !== 'string') {
      return {
        name: 'unknown-skill',
        displayName: 'Specialist Skill',
        domain: 'Engineering Practice',
        mandate: 'Applies targeted engineering standards.',
        category: 'quality',
        source: 'fallback',
      };
    }

    const cleanName = skillName.replace(/^skill:/, '').trim();
    if (this.cache.has(`skill:${cleanName}`)) {
      return this.cache.get(`skill:${cleanName}`);
    }

    const candidatePaths = [
      path.join(this.projectRoot, '.agent', 'skills', cleanName, 'SKILL.md'),
      path.join(this.projectRoot, 'tribunal-kit', '.agent', 'skills', cleanName, 'SKILL.md'),
      path.join(__dirname, '..', '..', '.agent', 'skills', cleanName, 'SKILL.md'),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        try {
          const content = fs.readFileSync(p, 'utf8');
          const meta = this._parseFrontmatter(content);
          const desc = meta.description || '';
          const cleanedDesc = desc.replace(/^Use when\s+/i, 'Applies when ');

          const entry = {
            name: cleanName,
            displayName: cleanName.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
            domain: cleanName.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
            mandate: cleanedDesc || 'Applies targeted engineering patterns.',
            category: 'skill',
            source: 'filesystem',
          };
          this.cache.set(`skill:${cleanName}`, entry);
          return entry;
        } catch {
          // ignore
        }
      }
    }

    const humanized = cleanName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const entry = {
      name: cleanName,
      displayName: humanized,
      domain: `${humanized} Skill`,
      mandate: `Applying targeted ${humanized.toLowerCase()} rules.`,
      category: 'skill',
      source: 'fallback',
    };
    this.cache.set(`skill:${cleanName}`, entry);
    return entry;
  }

  /**
   * Creates an ActivityEvent for agent activation with context-aware mandate description.
   */
  createAgentActivationEvent(agentName, taskContext = '') {
    const meta = this.resolveAgent(agentName);
    const summary = taskContext
      ? `${taskContext.endsWith('.') ? taskContext : taskContext + '.'} Focus: ${meta.mandate}`
      : meta.mandate;

    return createEvent({
      eventType: ACTIVITY_STATES.AGENT_ACTIVATED,
      agent: meta.name,
      domain: meta.domain,
      title: meta.domain,
      summary,
    });
  }

  /**
   * Creates an ActivityEvent for skill application with context-aware mandate description.
   */
  createSkillActivationEvent(skillName, taskContext = '') {
    const meta = this.resolveSkill(skillName);
    const summary = taskContext
      ? `${taskContext.endsWith('.') ? taskContext : taskContext + '.'} Focus: ${meta.mandate}`
      : meta.mandate;

    return createEvent({
      eventType: ACTIVITY_STATES.SKILL_ACTIVATED,
      skill: meta.name,
      domain: meta.domain,
      title: meta.domain,
      summary,
    });
  }
}

module.exports = {
  SkillAgentResolver,
  CORE_AGENT_REGISTRY,
};
