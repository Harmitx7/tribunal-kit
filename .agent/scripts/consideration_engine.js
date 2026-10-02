'use strict';

const path = require('path');
const { extractConcepts } = require('./concept_extractor');

function generateConsiderations(conceptResultOrQuery, agentDir) {
  let conceptData;
  if (typeof conceptResultOrQuery === 'string') {
    conceptData = extractConcepts(conceptResultOrQuery, agentDir);
  } else {
    conceptData = conceptResultOrQuery;
  }

  const considerations = [];
  const risks = [...(conceptData.risk_signals || [])];
  const failureModes = new Set();
  const qualityAttributes = new Set();
  const constraints = [];

  const seenConsiderations = new Set();

  function addConsideration(severity, category, title, rationale) {
    const key = `${category}:${title}`;
    if (!seenConsiderations.has(key)) {
      seenConsiderations.add(key);
      considerations.push({ severity, category, title, rationale });
    }
  }

  for (const c of conceptData.all_concepts || []) {
    if (c.failure_modes) c.failure_modes.forEach(fm => failureModes.add(fm));
    if (c.quality_attributes) c.quality_attributes.forEach(qa => qualityAttributes.add(qa));

    switch (c.id) {
      case 'idempotency':
        addConsideration(
          'CRITICAL',
          'Data Integrity',
          'Duplicate Execution Protection',
          'Client retries or network replays must produce exactly one business effect.',
        );
        addConsideration(
          'CRITICAL',
          'API Design',
          'Idempotency Key Protocol',
          'Enforce unique client idempotency keys stored in an atomic lock/cache.',
        );
        break;
      case 'transaction-integrity':
        addConsideration(
          'CRITICAL',
          'Consistency',
          'Atomic Database Boundaries',
          'Multi-step state mutations must rollback atomically upon external or internal failure.',
        );
        addConsideration(
          'HIGH',
          'Data Integrity',
          'Isolation & Deadlock Prevention',
          'Ensure appropriate transaction isolation levels to prevent phantom/dirty reads.',
        );
        break;
      case 'concurrency-control':
        addConsideration(
          'HIGH',
          'Concurrency',
          'Race Condition Defense',
          'Concurrent duplicate requests for the same entity must be serialized or rejected with conflict.',
        );
        break;
      case 'retry-and-backoff':
        addConsideration(
          'HIGH',
          'Reliability',
          'Exponential Backoff & Jitter',
          'Downstream calls must use backoff with jitter to prevent thundering herd / retry storms.',
        );
        addConsideration(
          'HIGH',
          'Fault Tolerance',
          'Timeout & Circuit Breaking',
          'Bound all external RPCs with explicit deadlines and circuit breakers.',
        );
        break;
      case 'query-optimization':
        addConsideration(
          'HIGH',
          'Performance',
          'Query Planning & Index Coverage',
          'Ensure queries use covering/composite indexes and avoid table scans or N+1 queries.',
        );
        addConsideration(
          'MEDIUM',
          'Scalability',
          'Connection Pool Sizing',
          'Prevent connection starvation under load with connection pooling.',
        );
        break;
      case 'authentication-and-authorization':
        addConsideration(
          'CRITICAL',
          'Security',
          'Authentication & Token Verification',
          'Enforce strict cryptographic signature and expiration validation on credentials.',
        );
        addConsideration(
          'HIGH',
          'Security',
          'Least-Privilege Authorization',
          'Verify permissions prior to executing any mutation or accessing private entities.',
        );
        break;
      case 'input-validation-and-sanitization':
        addConsideration(
          'HIGH',
          'Security',
          'Strict Schema Boundary Validation',
          'Validate incoming payloads against schemas before passing to domain logic.',
        );
        break;
      case 'structured-observability':
        addConsideration(
          'MEDIUM',
          'Observability',
          'Correlation IDs & Structured Logs',
          'Propagate trace IDs across async operations and log structured JSON context.',
        );
        break;
      case 'file-upload-and-storage':
        addConsideration(
          'HIGH',
          'Security',
          'MIME Validation & Storage Quotas',
          'Verify magic bytes/MIME type and enforce strict byte limits on uploads.',
        );
        break;
      case 'ai-agent-security-and-sandboxing':
        addConsideration(
          'CRITICAL',
          'Security',
          'Tool Execution Sandboxing',
          'Disallow unrestricted subprocess execution and strip prompt injection vectors.',
        );
        break;
      case 'realtime-collaboration-and-sync':
        addConsideration(
          'HIGH',
          'Consistency',
          'Conflict Resolution & State Synchronization',
          'Employ deterministic CRDT/OT merging to avoid state divergence.',
        );
        break;
      case 'cicd-and-deployment-safety':
        addConsideration(
          'HIGH',
          'Reliability',
          'Zero-Downtime Deployment & Rollback Safety',
          'Enforce automated health checks, blue-green/canary rollout, and instant rollback capability.',
        );
        addConsideration(
          'HIGH',
          'Operability',
          'Configuration & Secret Isolation',
          'Isolate environment secrets and validate container resource limits.',
        );
        break;
      case 'distributed-job-processing':
        addConsideration(
          'HIGH',
          'Reliability',
          'Dead-Letter Queue & Poison Pill Isolation',
          'Isolate failing jobs to dead-letter queue after bounded retries.',
        );
        addConsideration(
          'HIGH',
          'Concurrency',
          'Worker Concurrency & Backpressure',
          'Throttle concurrent worker pool execution to prevent resource starvation.',
        );
        break;
      case 'rag-and-vector-retrieval':
        addConsideration(
          'HIGH',
          'Accuracy',
          'Retrieval Grounding & Hallucination Defense',
          'Ensure prompt context is strictly bounded by retrieved semantic chunks.',
        );
        addConsideration(
          'MEDIUM',
          'Performance',
          'Vector Indexing & Embedding Latency',
          'Utilize HNSW or IVFFlat vector indexing to accelerate similarity search.',
        );
        break;
      case 'event-driven-data-pipelines':
        addConsideration(
          'HIGH',
          'Reliability',
          'Stream Backpressure & Partition Offset Management',
          'Control consumer ingest rates and commit offsets only after processing.',
        );
        break;
      case 'notification-delivery-and-dispatch':
        addConsideration(
          'HIGH',
          'Reliability',
          'Provider Rate-Limiting & Failover',
          'Buffer notifications and respect downstream SMS/email provider throttle limits.',
        );
        break;
      case 'search-indexing-and-ranking':
        addConsideration(
          'HIGH',
          'Performance',
          'Inverted Index & Tokenization Efficiency',
          'Optimize inverted index updates and relevance scoring pipelines.',
        );
        break;
      case 'multi-region-consistency-and-replication':
        addConsideration(
          'CRITICAL',
          'Consistency',
          'Replication Lag & Conflict Resolution',
          'Define deterministic conflict resolution for cross-region state divergence.',
        );
        break;
      case 'responsive-ui-and-accessibility':
        addConsideration(
          'HIGH',
          'Usability',
          'Responsive Layout & Mobile Viewport Adaptation',
          'Ensure fluid layout without horizontal clipping and touch targets >= 44px.',
        );
        addConsideration(
          'HIGH',
          'Accessibility',
          'Keyboard Navigation & ARIA Semantics',
          'Ensure complete WCAG 2.1 compliance with accessible color contrast and screen reader labels.',
        );
        break;
    }
  }

  const domainSet = new Set(conceptData.domains || []);
  if (domainSet.has('backend') && domainSet.has('database')) {
    addConsideration(
      'HIGH',
      'Architecture',
      'Database Connection & Transaction Boundary',
      'Ensure HTTP handler lifecycle correctly scopes database transactions and releases pool connections.',
    );
  }
  if (domainSet.has('backend') && domainSet.has('security')) {
    addConsideration(
      'HIGH',
      'Security',
      'Rate Limiting & Abuse Defense',
      'Apply IP/token bucket throttling to defend against automated abuse.',
    );
  }

  const critical = considerations.filter(c => c.severity === 'CRITICAL');
  const high = considerations.filter(c => c.severity === 'HIGH');
  const medium = considerations.filter(c => c.severity === 'MEDIUM');
  const low = considerations.filter(c => c.severity === 'LOW');

  return {
    query: conceptData.query,
    total_considerations: considerations.length,
    critical,
    high,
    medium,
    low,
    all_considerations: considerations,
    risks,
    failure_modes: Array.from(failureModes),
    quality_attributes: Array.from(qualityAttributes),
    constraints,
  };
}

module.exports = {
  generateConsiderations,
};
