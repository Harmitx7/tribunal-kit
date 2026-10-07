const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { broker } = require('./context_broker');

const CRITICAL_DOMAINS = [
  'security',
  'database',
  'authentication',
  'infrastructure',
  'code modification',
  'deployment',
];

function verifyChecksum(dataset) {
  const casesCopy = JSON.stringify(dataset.cases);
  const computed = crypto.createHash('sha256').update(casesCopy).digest('hex');
  if (computed !== dataset.checksum) {
    throw new Error('Dataset checksum verification failed. The ground truth has been modified.');
  }
}

function evaluateDataset(filePath, mode = 'phase15') {
  const raw = fs.readFileSync(filePath, 'utf8');
  const dataset = JSON.parse(raw);
  verifyChecksum(dataset);

  const results = {
    exactHits: 0,
    specificChildHits: 0,
    parentFallbackHits: 0,
    equivalentHits: 0,
    wrongHits: 0,
    top3Hits: 0,
    forbiddenTop1: 0,
    forbiddenTop3: 0,
    abstentions: 0,
    criticalErrors: 0,
    total: dataset.cases.length,
    criticalTotal: 0,
    latencies: [],
    traces: [],
  };

  dataset.cases.forEach(tc => {
    const isCritical = CRITICAL_DOMAINS.includes(tc.domain);
    if (isCritical) results.criticalTotal++;

    const start = performance.now();
    // Simulate routing (Phase 13 vs 14 broker behavior can be toggled if needed, but we use the current context_broker)
    const routingResult = broker(tc.request, [], 'large');
    const end = performance.now();
    results.latencies.push(end - start);

    const trace = routingResult.trace || [];
    const top1 = trace[0] ? trace[0].candidate : null;
    const top3 = trace.slice(0, 3).map(t => t.candidate);

    // Calculate Margin and Confidence
    const s1 = trace[0] ? trace[0].score : 0;
    const s2 = trace[1] ? trace[1].score : 0;
    const margin = s1 - s2;

    let decisionSkill = top1;
    let abstained = false;

    // Apply native confidence threshold
    const confidence = trace[0] ? trace[0].confidence : 'LOW';
    if (confidence === 'LOW' || margin < 2) {
      decisionSkill = 'NO_CONFIDENT_MATCH';
      abstained = true;
      results.abstentions++;
    }

    const expectedPrimary = tc.expected.primary_skill;
    const acceptable = tc.equivalence.acceptable_primary || [];
    const forbidden = tc.expected.forbidden_skills || [];

    let isExact = false;
    let isSpecificChild = false;
    let isParentFallback = false;
    let isEquivalent = false;
    let isWrong = false;

    if (!abstained) {
      if (decisionSkill === expectedPrimary) {
        isExact = true;
        results.exactHits++;
      } else {
        let hierarchy;
        try {
          const { getHierarchyCompatibility } = require('./skill_ontology_engine');
          hierarchy = getHierarchyCompatibility(decisionSkill, expectedPrimary);
        } catch (e) {
          hierarchy = 'WRONG';
        }

        if (hierarchy === 'SPECIFIC_CHILD') {
          isSpecificChild = true;
          results.specificChildHits++;
        } else if (hierarchy === 'PARENT_FALLBACK') {
          isParentFallback = true;
          results.parentFallbackHits++;
        } else if (acceptable.includes(decisionSkill)) {
          isEquivalent = true;
          results.equivalentHits++;
        } else {
          isWrong = true;
          results.wrongHits++;
        }
      }
    }

    // Top-3 Recall
    if (top3.includes(expectedPrimary) || acceptable.some(a => top3.includes(a))) {
      results.top3Hits++;
    }

    // Forbidden Rate
    if (forbidden.includes(decisionSkill)) results.forbiddenTop1++;
    if (forbidden.some(f => top3.includes(f))) results.forbiddenTop3++;

    // Critical Domain Errors
    if (isCritical && isWrong && !abstained) {
      results.criticalErrors++;
    }

    results.traces.push({
      id: tc.id,
      request: tc.request,
      candidates: trace.slice(0, 3),
      selected: decisionSkill,
      margin: margin,
      exact_match: isExact,
      specific_child: isSpecificChild,
      parent_fallback: isParentFallback,
      equivalent_match: isEquivalent,
      abstained: abstained,
      hierarchy: {
        candidate_relation: {
          type: isSpecificChild
            ? 'specific_child'
            : isParentFallback
              ? 'parent_fallback'
              : isExact
                ? 'exact'
                : 'none',
          parent: expectedPrimary,
          child: decisionSkill,
        },
        resolution: {
          reason: isSpecificChild
            ? 'specific child selected'
            : isParentFallback
              ? 'parent fallback selected'
              : 'no hierarchy resolution',
        },
      },
    });
  });

  results.latencies.sort((a, b) => a - b);
  const metrics = {
    exact_top1: (results.exactHits / results.total) * 100,
    specific_child_top1: (results.specificChildHits / results.total) * 100,
    parent_fallback_top1: (results.parentFallbackHits / results.total) * 100,
    equivalent_top1: (results.equivalentHits / results.total) * 100,
    wrong_top1: (results.wrongHits / results.total) * 100,
    top3_recall: (results.top3Hits / results.total) * 100,
    forbidden_top1_rate: (results.forbiddenTop1 / results.total) * 100,
    forbidden_top3_rate: (results.forbiddenTop3 / results.total) * 100,
    abstention_rate: (results.abstentions / results.total) * 100,
    critical_domain_error_rate:
      results.criticalTotal > 0 ? (results.criticalErrors / results.criticalTotal) * 100 : 0,
    mean_latency: results.latencies.reduce((a, b) => a + b, 0) / results.total,
    p50_latency: results.latencies[Math.floor(results.total * 0.5)],
    p95_latency: results.latencies[Math.floor(results.total * 0.95)],
    p99_latency: results.latencies[Math.floor(results.total * 0.99)],
  };

  return { metrics, traces: results.traces };
}

module.exports = { evaluateDataset, verifyChecksum };
