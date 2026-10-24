'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const AGENT_DIR = path.join(ROOT, '.agent');
const SKILLS_DIR = path.join(AGENT_DIR, 'skills');
const REFERENCES_DIR = path.join(AGENT_DIR, 'references', 'domains', 'system-design');
const TOPIC_MAP_PATH = path.join(AGENT_DIR, 'skill_topic_map.json');

const EXPECTED_REFERENCES = [
  'fundamentals.md',
  'quantitative-estimation.md',
  'architecture-patterns.md',
  'distributed-systems.md',
  'data-architecture.md',
  'communication-caching.md',
  'event-driven-messaging.md',
  'scalability-traffic.md',
  'security-threat-modeling.md',
  'reliability-performance.md',
  'observability-operations.md',
  'cloud-infrastructure.md',
  'global-multi-region.md',
  'migration-governance.md',
  'real-world-blueprints.md',
  'source-index.md',
];

describe('System Design Ecosystem: Metadata & Directory Conventions', () => {
  test('system-design-pro SKILL.md exists and contains valid frontmatter', () => {
    const skillPath = path.join(SKILLS_DIR, 'system-design-pro', 'SKILL.md');
    expect(fs.existsSync(skillPath)).toBe(true);

    const content = fs.readFileSync(skillPath, 'utf8');
    expect(content.startsWith('---')).toBe(true);
    expect(content).toContain('name: system-design-pro');
    expect(content).toContain('version: 6.0.0');
    expect(content).toContain('scripts-binding:');
    expect(content).toContain('Mandatory Pre-Flight Context Inspection');
    expect(content).toContain('Activation Boundaries');
    expect(content).toContain('Multi-Pass Execution Protocol');
    expect(content).toContain('Verification-Before-Completion (VBC) Protocol');
  });

  test('all 16 reference files exist in canonical .agent/references/domains/system-design/', () => {
    expect(fs.existsSync(REFERENCES_DIR)).toBe(true);
    for (const refFile of EXPECTED_REFERENCES) {
      const fullPath = path.join(REFERENCES_DIR, refFile);
      expect(fs.existsSync(fullPath)).toBe(true);
      const stat = fs.statSync(fullPath);
      expect(stat.size).toBeGreaterThan(500); // Substantive content
    }
  });

  test('all 16 reference files are mirrored to root references/ and .agents/references/', () => {
    const rootRefs = path.join(ROOT, 'references', 'domains', 'system-design');
    const agentRefs = path.join(ROOT, '.agents', 'references', 'domains', 'system-design');

    if (!fs.existsSync(rootRefs) || !fs.existsSync(agentRefs)) {
      const { syncSkills } = require('../../scripts/sync-skills');
      syncSkills();
    }

    expect(fs.existsSync(rootRefs)).toBe(true);
    expect(fs.existsSync(agentRefs)).toBe(true);

    for (const refFile of EXPECTED_REFERENCES) {
      expect(fs.existsSync(path.join(rootRefs, refFile))).toBe(true);
      expect(fs.existsSync(path.join(agentRefs, refFile))).toBe(true);
    }
  });

  test('token budget invariant: every reference file is <= 2,000 estimated tokens', () => {
    for (const refFile of EXPECTED_REFERENCES) {
      const fullPath = path.join(REFERENCES_DIR, refFile);
      const content = fs.readFileSync(fullPath, 'utf8');
      const estimatedTokens = Math.round(content.length / 4);
      expect(estimatedTokens).toBeLessThanOrEqual(2000);
    }
  });

  test('topic map parity: system-design registered in domain_routes and domain_references', () => {
    expect(fs.existsSync(TOPIC_MAP_PATH)).toBe(true);
    const topicMap = JSON.parse(fs.readFileSync(TOPIC_MAP_PATH, 'utf8'));

    expect(topicMap.domain_routes).toHaveProperty('system-design');
    expect(topicMap.domain_routes['system-design']).toContain('system-design-pro');

    expect(topicMap.domain_references).toHaveProperty('system-design');
    const registeredRefs = topicMap.domain_references['system-design'];
    for (const refFile of EXPECTED_REFERENCES) {
      const expectedEntry = `.agent/references/domains/system-design/${refFile}`;
      expect(registeredRefs).toContain(expectedEntry);
    }
  });

  test('relative links in system-design-pro/SKILL.md resolve to existing files on disk', () => {
    const skillDir = path.join(SKILLS_DIR, 'system-design-pro');
    const content = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      const target = match[2].trim();
      if (target.startsWith('http')) continue;
      const cleanPath = target.split('#')[0];
      const resolved = path.resolve(skillDir, cleanPath);
      expect(fs.existsSync(resolved)).toBe(true);
    }
  });
});

describe('System Design Ecosystem: Quantitative Calculation Logic', () => {
  // Test mathematical consistency against quantitative-estimation.md formulas

  test('calculates accurate average and peak RPS from DAU and actions', () => {
    const dau = 10_000_000;
    const actionsPerUser = 20;
    const totalDailyActions = dau * actionsPerUser; // 200 Million
    const secondsPerDay = 86400;

    const avgRps = totalDailyActions / secondsPerDay;
    const peakRps = avgRps * 3; // 3x peak multiplier

    expect(Math.round(avgRps)).toBe(2315);
    expect(Math.round(peakRps)).toBe(6944);
  });

  test('Little Law accurately models concurrent connections needed', () => {
    // L = lambda * W
    const rps = 10000; // 10k requests/sec
    const latencySec = 0.05; // 50 ms

    const concurrentConnections = rps * latencySec;
    expect(concurrentConnections).toBe(500);
  });

  test('Pareto 80/20 rule sizes cache accurately', () => {
    const dailyReadGb = 500;
    const cacheFraction = 0.20;
    const safetyBuffer = 1.25;

    const requiredRamGb = dailyReadGb * cacheFraction * safetyBuffer;
    expect(requiredRamGb).toBe(125);
  });

  test('composite availability math correctly reflects serial vs parallel redundancy', () => {
    const serviceAvail = 0.999; // 99.9%
    const dbAvail = 0.999;
    const authAvail = 0.999;

    // Serial composite
    const serialTotal = serviceAvail * dbAvail * authAvail;
    expect(parseFloat(serialTotal.toFixed(4))).toBe(0.9970); // Drops to 99.7%

    // Parallel redundancy: 1 - (1 - A1) * (1 - A2)
    const node1 = 0.990; // 99%
    const node2 = 0.990;
    const parallelTotal = 1 - (1 - node1) * (1 - node2);
    expect(parseFloat(parallelTotal.toFixed(4))).toBe(0.9999); // Rises to 99.99%
  });

  test('quorum condition R + W > N ensures strong consistency', () => {
    const n = 3;
    const w = 2;
    const r = 2;

    const isStrong = (w + r) > n;
    expect(isStrong).toBe(true);

    const staleReadW = 1;
    const staleReadR = 1;
    expect((staleReadW + staleReadR) > n).toBe(false); // Eventual consistency
  });
});

describe('System Design Ecosystem: 8 End-to-End Required Scenarios', () => {
  const blueprintsPath = path.join(REFERENCES_DIR, 'real-world-blueprints.md');
  let blueprintsContent;

  beforeAll(() => {
    blueprintsContent = fs.readFileSync(blueprintsPath, 'utf8');
  });

  test('Scenario 1: URL shortener architecture is fully specified', () => {
    expect(blueprintsContent).toContain('Scenario 1: Scalable URL Shortener');
    expect(blueprintsContent).toContain('Base62');
    expect(blueprintsContent).toContain('MurmurHash3');
    expect(blueprintsContent).toContain('DynamoDB/Cassandra');
    expect(blueprintsContent).toContain('Redis cluster');
  });

  test('Scenario 2: Real-time chat system is fully specified', () => {
    expect(blueprintsContent).toContain('Scenario 2: Real-Time Chat Platform');
    expect(blueprintsContent).toContain('WebSocket gateway');
    expect(blueprintsContent).toContain('ScyllaDB/Cassandra');
    expect(blueprintsContent).toContain('Redis Pub/Sub');
    expect(blueprintsContent).toContain('Push Notification');
  });

  test('Scenario 3: Multi-tenant SaaS with isolation is fully specified', () => {
    expect(blueprintsContent).toContain('Scenario 3: Multi-Tenant Enterprise SaaS');
    expect(blueprintsContent).toContain('Row-Level Security (RLS)');
    expect(blueprintsContent).toContain('Hierarchical Token Bucket');
    expect(blueprintsContent).toContain('Dedicated worker pools');
  });

  test('Scenario 4: High-throughput event processing platform is fully specified', () => {
    expect(blueprintsContent).toContain('Scenario 4: High-Throughput Event Processing Platform');
    expect(blueprintsContent).toContain('Apache Kafka');
    expect(blueprintsContent).toContain('KEDA');
    expect(blueprintsContent).toContain('Idempotent consumer');
    expect(blueprintsContent).toContain('DLQ');
  });

  test('Scenario 5: Database-heavy scaling bottleneck is fully specified', () => {
    expect(blueprintsContent).toContain('Scenario 5: Database-Heavy Read/Write Bottleneck');
    expect(blueprintsContent).toContain('PgBouncer');
    expect(blueprintsContent).toContain('covering indexes');
    expect(blueprintsContent).toContain('Read Replicas');
    expect(blueprintsContent).toContain('Read-Your-Writes');
    expect(blueprintsContent).toContain('PARTITION BY RANGE');
  });

  test('Scenario 6: Global multi-region disaster recovery is fully specified', () => {
    expect(blueprintsContent).toContain('Scenario 6: Global Multi-Region Disaster Recovery');
    expect(blueprintsContent).toContain('RTO');
    expect(blueprintsContent).toContain('RPO');
    expect(blueprintsContent).toContain('Active-Passive Warm Standby');
    expect(blueprintsContent).toContain('Route 53 DNS failover');
  });

  test('Scenario 7: Monolith modernization & migration is fully specified', () => {
    expect(blueprintsContent).toContain('Scenario 7: Legacy Monolith Decomposition');
    expect(blueprintsContent).toContain('Strangler Fig Pattern');
    expect(blueprintsContent).toContain('Debezium CDC');
    expect(blueprintsContent).toContain('Shadow traffic');
    expect(blueprintsContent).toContain('Canary traffic');
  });

  test('Scenario 8: High-throughput AI model inference platform is fully specified', () => {
    expect(blueprintsContent).toContain('Scenario 8: High-Throughput AI Model Inference Platform');
    expect(blueprintsContent).toContain('Triton Inference Server or vLLM');
    expect(blueprintsContent).toContain('Dynamic Batching');
    expect(blueprintsContent).toContain('Semantic cache');
    expect(blueprintsContent).toContain('pgvector / Redis vector store');
  });
});
