'use strict';

/**
 * trust_timeline.js — System-1 Phase 8 Trust Timeline Engine & Storage
 * ====================================================================
 * Local-first, process-safe, path-contained audit timeline store.
 * Strictly observational and diagnostic with zero governance authority.
 */

const fs = require('fs');
const path = require('path');
const { writeFileSyncAtomic } = require('./evolution_pipeline');
const { PathSecurityError, assertContainedPath } = require('../utils/path_containment');
const {
  TIMELINE_SCHEMA_VERSION,
  MAX_EVENTS_PER_RUN,
  createTimelineEvent,
  validateTimeline,
} = require('./trust_timeline_contract');

const MAX_TIMELINE_RUNS = 200;
const MAX_TIMELINE_STORAGE_BYTES = 10 * 1024 * 1024; // 10 MB total ceiling

const WINDOWS_RESERVED_NAMES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i;

// ============================================================================
// Process Concurrency Locking
// ============================================================================

function acquireTimelineLock(timelineDir) {
  const lockPath = path.join(timelineDir, 'timeline.lock');
  if (!fs.existsSync(timelineDir)) fs.mkdirSync(timelineDir, { recursive: true });
  const maxRetries = 40;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const fd = fs.openSync(lockPath, 'wx');
      fs.closeSync(fd);
      return lockPath;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      try {
        const waitBuf = new Int32Array(new SharedArrayBuffer(4));
        Atomics.wait(waitBuf, 0, 0, 25);
      } catch (_) {
        const start = Date.now();
        while (Date.now() - start < 25) {}
      }
    }
  }
  // Check for stale lock (> 15000ms old)
  try {
    const stats = fs.statSync(lockPath);
    if (Date.now() - stats.mtimeMs > 15000) {
      fs.unlinkSync(lockPath);
      const fd = fs.openSync(lockPath, 'wx');
      fs.closeSync(fd);
      return lockPath;
    }
  } catch (_) {}
  throw new Error('Could not acquire concurrency lock for timeline store');
}

function releaseTimelineLock(lockPath) {
  try {
    if (lockPath && fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
    }
  } catch (_) {}
}

// ============================================================================
// Timeline Store Class
// ============================================================================

class TimelineStore {
  constructor(options = {}) {
    this.workspace = options.workspace || process.cwd();
    this.agentDir = options.agentDir || path.join(this.workspace, '.agent');
    this.timelineDir = path.join(this.agentDir, 'intelligence', 'timeline');
    this.runsDir = path.join(this.timelineDir, 'runs');
    this.indexPath = path.join(this.timelineDir, 'index.json');
    this.maxRuns = options.maxRuns || MAX_TIMELINE_RUNS;
    this.maxStorageBytes = options.maxStorageBytes || MAX_TIMELINE_STORAGE_BYTES;

    // Security check: Containment verification
    assertContainedPath(this.timelineDir, this.workspace);
    assertContainedPath(this.runsDir, this.workspace);

    this._ensureDirs();
  }

  _ensureDirs() {
    if (!fs.existsSync(this.timelineDir)) {
      fs.mkdirSync(this.timelineDir, { recursive: true });
    }
    if (!fs.existsSync(this.runsDir)) {
      fs.mkdirSync(this.runsDir, { recursive: true });
    }
  }

  _getRunFilePath(runId) {
    if (typeof runId !== 'string' || !runId.trim()) {
      throw new Error('Invalid runId');
    }
    // Reject lexical path traversal attempts
    if (runId.includes('..') || runId.includes('/') || runId.includes('\\')) {
      throw new PathSecurityError(`Path security violation: Illegal directory traversal in runId "${runId}"`, 'ERR_PATH_TRAVERSAL');
    }
    // Reject Windows reserved device names
    const baseName = runId.split('.')[0];
    if (WINDOWS_RESERVED_NAMES.test(baseName)) {
      throw new PathSecurityError(`Path security violation: Illegal Windows reserved device name in runId "${runId}"`, 'ERR_PATH_RESERVED_NAME');
    }
    const sanitized = runId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const target = path.join(this.runsDir, `${sanitized}.json`);
    assertContainedPath(target, this.workspace);
    return target;
  }

  /**
   * Appends an event to a run's timeline with monotonic sequence assignment and locking.
   */
  appendEvent(runId, eventData = {}) {
    const filePath = this._getRunFilePath(runId);
    const lock = acquireTimelineLock(this.timelineDir);

    try {
      let events = [];
      if (fs.existsSync(filePath)) {
        try {
          const raw = fs.readFileSync(filePath, 'utf8');
          events = JSON.parse(raw);
          if (!Array.isArray(events)) events = [];
        } catch (_) {
          events = [];
        }
      }

      if (events.length >= MAX_EVENTS_PER_RUN) {
        throw new Error(`Run "${runId}" has reached the maximum event capacity (${MAX_EVENTS_PER_RUN})`);
      }

      const prevEvent = events.length > 0 ? events[events.length - 1] : null;
      const prevHash = prevEvent ? prevEvent.integrity_hash : '0'.repeat(64);
      const nextSequence = events.length + 1;

      const eventToSeal = {
        ...eventData,
        review_run_id: runId,
        sequence: nextSequence,
        prev_hash: prevHash,
      };

      const sealedEvent = createTimelineEvent(eventToSeal);
      events.push(sealedEvent);

      writeFileSyncAtomic(filePath, JSON.stringify(events, null, 2), 'utf8');
      this._updateIndex(runId, events.length);
      if (nextSequence === 1) {
        this._pruneRunsIfExceeded();
      }

      return sealedEvent;
    } finally {
      releaseTimelineLock(lock);
    }
  }

  /**
   * Loads and cryptographically validates the timeline for a given run ID.
   */
  loadTimeline(runId) {
    const filePath = this._getRunFilePath(runId);
    if (!fs.existsSync(filePath)) {
      return {
        run_id: runId,
        exists: false,
        events: [],
        completeness: 'MISSING',
        error: `Timeline for run "${runId}" not found`,
      };
    }

    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const events = JSON.parse(raw);
      const validation = validateTimeline(events);

      if (!validation.ok) {
        return {
          run_id: runId,
          exists: true,
          schema_version: TIMELINE_SCHEMA_VERSION,
          events: validation.events || [],
          event_count: (validation.events || []).length,
          completeness: validation.completeness || 'CORRUPTED',
          has_sequence_gap: Boolean(validation.has_sequence_gap),
          has_integrity_failure: true,
          error: validation.error,
          is_advisory_only: true,
        };
      }

      return {
        run_id: runId,
        exists: true,
        schema_version: TIMELINE_SCHEMA_VERSION,
        events: validation.events,
        event_count: validation.events.length,
        completeness: validation.completeness,
        has_sequence_gap: validation.has_sequence_gap,
        has_integrity_failure: false,
        is_advisory_only: true,
      };
    } catch (err) {
      return {
        run_id: runId,
        exists: true,
        events: [],
        completeness: 'CORRUPTED',
        has_integrity_failure: true,
        error: `Failed to load or parse timeline: ${err.message}`,
      };
    }
  }

  /**
   * Dedicated cryptographic verification method for a run timeline.
   */
  verifyTimeline(runId) {
    const report = this.loadTimeline(runId);
    if (!report.exists) {
      return {
        run_id: runId,
        verified: false,
        error: `Run "${runId}" not found in timeline store`,
      };
    }
    if (report.has_integrity_failure || report.completeness === 'CORRUPTED') {
      return {
        run_id: runId,
        verified: false,
        completeness: report.completeness,
        has_integrity_failure: true,
        error: report.error || 'Integrity check failed',
      };
    }
    return {
      run_id: runId,
      verified: true,
      schema_version: report.schema_version,
      events_verified: report.event_count,
      completeness: report.completeness,
      has_sequence_gap: report.has_sequence_gap,
      has_integrity_failure: false,
      seal: 'CRYPTOGRAPHICALLY_VERIFIED',
    };
  }

  /**
   * Safely loads the index manifest or reconstructs it if missing/corrupted.
   */
  _loadIndex() {
    this._ensureDirs();
    if (!fs.existsSync(this.indexPath)) {
      return this.reconstructIndex();
    }
    try {
      const raw = fs.readFileSync(this.indexPath, 'utf8');
      const idx = JSON.parse(raw);
      if (idx && typeof idx === 'object' && idx.runs && typeof idx.runs === 'object') {
        return idx;
      }
      return this.reconstructIndex();
    } catch (_) {
      return this.reconstructIndex();
    }
  }

  /**
   * Reconstructs the index manifest by scanning runs directory.
   */
  reconstructIndex() {
    this._ensureDirs();
    const files = fs.readdirSync(this.runsDir).filter(f => f.endsWith('.json'));
    const indexData = {
      version: 1,
      reconstructed_at: new Date().toISOString(),
      runs: {},
    };

    for (const f of files) {
      const runId = f.replace(/\.json$/, '');
      const filePath = path.join(this.runsDir, f);
      try {
        const stat = fs.statSync(filePath);
        const raw = fs.readFileSync(filePath, 'utf8');
        const events = JSON.parse(raw);
        indexData.runs[runId] = {
          run_id: runId,
          event_count: Array.isArray(events) ? events.length : 0,
          updated_at: stat.mtime.toISOString(),
          size_bytes: stat.size,
        };
      } catch (_) {}
    }

    try {
      writeFileSyncAtomic(this.indexPath, JSON.stringify(indexData, null, 2), 'utf8');
    } catch (_) {}

    return indexData;
  }

  /**
   * Updates a single run in the index.
   */
  _updateIndex(runId, eventCount) {
    try {
      const indexData = this._loadIndex();
      const filePath = this._getRunFilePath(runId);
      const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : { size: 0, mtime: new Date() };

      indexData.runs[runId] = {
        run_id: runId,
        event_count: eventCount,
        updated_at: (stat.mtime || new Date()).toISOString(),
        size_bytes: stat.size || 0,
      };

      writeFileSyncAtomic(this.indexPath, JSON.stringify(indexData, null, 2), 'utf8');
    } catch (_) {}
  }

  /**
   * Lists all available run IDs with basic timeline statistics.
   */
  listRuns() {
    this._ensureDirs();
    const indexData = this._loadIndex();
    const runs = Object.values(indexData.runs || {});

    // Sort newest first
    return runs.sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
  }

  /**
   * Enforces retention policy by count and byte size.
   */
  _pruneRunsIfExceeded() {
    const runs = this.listRuns();
    const indexData = this._loadIndex();
    let indexModified = false;

    // Prune excess runs beyond maxRuns
    if (runs.length > this.maxRuns) {
      const toRemove = runs.slice(this.maxRuns);
      for (const r of toRemove) {
        try {
          fs.unlinkSync(this._getRunFilePath(r.run_id));
        } catch (_) {}
        if (indexData.runs && indexData.runs[r.run_id]) {
          delete indexData.runs[r.run_id];
          indexModified = true;
        }
      }
    }

    // Check byte ceiling
    let totalBytes = runs.reduce((acc, r) => acc + (r.size_bytes || 0), 0);
    let idx = runs.length - 1;
    while (totalBytes > this.maxStorageBytes && idx >= 0) {
      const runId = runs[idx].run_id;
      try {
        const target = this._getRunFilePath(runId);
        if (fs.existsSync(target)) {
          const sz = fs.statSync(target).size;
          fs.unlinkSync(target);
          totalBytes -= sz;
        }
      } catch (_) {}
      if (indexData.runs && indexData.runs[runId]) {
        delete indexData.runs[runId];
        indexModified = true;
      }
      idx--;
    }

    if (indexModified) {
      try {
        writeFileSyncAtomic(this.indexPath, JSON.stringify(indexData, null, 2), 'utf8');
      } catch (_) {}
    }
  }
}

// ============================================================================
// Formatting & Presentation Helpers
// ============================================================================

function formatTimelineTerminal(timelineReport, options = {}) {
  if (!timelineReport || !timelineReport.exists) {
    return `\x1b[31m✖ Timeline not found for run:\x1b[0m ${timelineReport?.run_id || 'unknown'}`;
  }

  const events = timelineReport.events || [];
  let out = `\n\x1b[1m\x1b[36m=== TRIBUNAL TRUST TIMELINE: ${timelineReport.run_id} ===\x1b[0m\n`;
  out += `\x1b[90mCompleteness: ${timelineReport.completeness} | Events: ${events.length} | Status: ADVISORY ONLY\x1b[0m\n\n`;

  if (events.length === 0) {
    if (timelineReport.has_integrity_failure) {
      out += `  \x1b[31m✖ Cryptographic integrity failure: ${timelineReport.error || 'corrupted timeline'}\x1b[0m\n`;
    } else {
      out += `  (No events recorded for this run)\n`;
    }
    return out;
  }

  const limit = options.limit || events.length;
  const filtered = events.slice(-limit);

  for (let i = 0; i < filtered.length; i++) {
    const ev = filtered[i];
    const isLast = i === filtered.length - 1;
    const prefix = isLast ? '└──' : '├──';

    let statusColor = '\x1b[32m'; // green
    if (ev.status === 'WARNING') statusColor = '\x1b[33m';
    if (ev.status === 'ERROR' || ev.status === 'BLOCKED') statusColor = '\x1b[31m';
    if (ev.severity === 'CRITICAL') statusColor = '\x1b[41m\x1b[37m';

    const timeStr = ev.timestamp ? ev.timestamp.slice(11, 19) : '00:00:00';
    out += `  \x1b[90m${prefix} [${timeStr}]\x1b[0m ${statusColor}[${ev.event_type}]\x1b[0m \x1b[1m${ev.summary}\x1b[0m\n`;
    out += `  \x1b[90m│   Stage: ${ev.stage} | Source: ${ev.source_component} | Seq: ${ev.sequence}\x1b[0m\n`;

    if (ev.reason_codes && ev.reason_codes.length > 0) {
      out += `  \x1b[90m│   Reason Codes: ${ev.reason_codes.join(', ')}\x1b[0m\n`;
    }
    if (ev.evidence_refs && ev.evidence_refs.length > 0) {
      out += `  \x1b[90m│   Evidence Refs: ${ev.evidence_refs.join(', ')}\x1b[0m\n`;
    }
  }

  if (timelineReport.has_integrity_failure) {
    out += `\n  \x1b[31m✖ Cryptographic integrity failure: ${timelineReport.error || 'tampered event or broken hash chain'}\x1b[0m\n`;
  } else if (timelineReport.has_sequence_gap) {
    out += `\n  \x1b[33m⚠ Warning: Sequence gap detected (partial history)\x1b[0m\n`;
  } else {
    out += `\n  \x1b[32m✔ Cryptographic sequence verified across ${events.length} events\x1b[0m\n`;
  }

  return out;
}

function formatTimelineJSON(timelineReport) {
  return JSON.stringify(timelineReport, null, 2);
}

/**
 * Observational helper to record lifecycle events from a completed or in-progress review run.
 * Guarantees failure isolation: persistence errors do not crash or alter governance outcomes.
 */
function recordReviewTimeline(params = {}) {
  const store = params.store || new TimelineStore({ workspace: params.workspace || process.cwd() });
  const runId = params.runId || params.reviewRunId || `run_${Date.now()}`;
  const recordedEvents = [];

  try {
    // 1. REVIEW_STARTED
    recordedEvents.push(store.appendEvent(runId, {
      event_type: 'REVIEW_STARTED',
      stage: 'INITIALIZATION',
      source_component: 'review_executor',
      summary: `Review run initiated: ${runId}`,
      metadata: {
        task: params.task || 'Review proposed change',
        repo_root: store.workspace,
      },
    }));

    // 2. DECISION_PLAN_CREATED
    if (params.decisionPlan) {
      recordedEvents.push(store.appendEvent(runId, {
        event_type: 'DECISION_PLAN_CREATED',
        stage: 'PLANNING',
        source_component: 'decision_plan',
        decision_refs: [params.decisionPlan.plan_id].filter(Boolean),
        summary: `Decision Plan created: Tier ${params.decisionPlan.tier}`,
        metadata: {
          risk_tier: params.decisionPlan.tier,
          risk_level: params.decisionPlan.risk || 'MEDIUM',
          security_sensitive: Boolean(params.decisionPlan.security_sensitive),
        },
      }));
    }

    // 3. REVIEWER_SELECTED
    if (params.selection) {
      recordedEvents.push(store.appendEvent(runId, {
        event_type: 'REVIEWER_SELECTED',
        stage: 'PLANNING',
        source_component: 'reviewer_selection',
        summary: `Selected ${(params.selection.selected_reviewers || []).length} reviewer(s)`,
        metadata: {
          selected: params.selection.selected_reviewers || [],
          mandatory: params.selection.mandatory_reviewers || [],
          pruned: params.selection.pruned_reviewers || [],
        },
      }));
    }

    // 4. EVIDENCE_ADDED
    if (params.evidencePack) {
      recordedEvents.push(store.appendEvent(runId, {
        event_type: 'EVIDENCE_ADDED',
        stage: 'CONTEXT_GATHERING',
        source_component: 'evidence_pack',
        evidence_refs: (params.evidencePack.records || []).map(r => r.id || r.evidence_id).slice(0, 50),
        summary: `Evidence pack created: ${params.evidencePack.pack_id}`,
        metadata: {
          total_records: params.evidencePack.summary?.total_records || 0,
          observed_count: params.evidencePack.summary?.observed_count || 0,
          validated_count: params.evidencePack.summary?.validated_count || 0,
        },
      }));
    }

    // 5. Reviewer Executions
    if (Array.isArray(params.reviewResults)) {
      for (const res of params.reviewResults) {
        const isTimeout = res.error && (res.error.includes('TIMEOUT') || res.error.includes('timed out'));
        const isError = res.verdict === 'ERROR' || res.error;
        const eventType = isTimeout ? 'REVIEWER_TIMED_OUT' : (isError ? 'REVIEWER_FAILED' : 'REVIEWER_COMPLETED');
        const status = isError ? 'ERROR' : 'SUCCESS';
        const severity = isTimeout ? 'HIGH' : (isError ? 'HIGH' : 'LOW');

        recordedEvents.push(store.appendEvent(runId, {
          event_type: eventType,
          stage: 'REVIEW_EXECUTION',
          status,
          severity,
          source_component: res.reviewerId || 'reviewer',
          summary: `Reviewer ${res.reviewerId || 'unknown'}: verdict ${res.verdict || status}`,
          metadata: {
            duration_ms: res.durationMs || 0,
            findings_count: (res.findings || []).length,
          },
        }));
      }
    }

    // 6. CONFIDENCE_ASSESSED
    if (params.confidenceAssessment) {
      recordedEvents.push(store.appendEvent(runId, {
        event_type: 'CONFIDENCE_ASSESSED',
        stage: 'EVALUATION',
        source_component: 'confidence_evaluator',
        summary: `Confidence score: ${params.confidenceAssessment.score} (${params.confidenceAssessment.level})`,
        metadata: {
          score: params.confidenceAssessment.score,
          level: params.confidenceAssessment.level,
          review_depth: params.confidenceAssessment.review_depth,
          uncalibrated_heuristic: true,
        },
      }));

      if (params.confidenceAssessment.escalated) {
        recordedEvents.push(store.appendEvent(runId, {
          event_type: 'REVIEW_DEPTH_ESCALATED',
          stage: 'EVALUATION',
          status: 'WARNING',
          severity: 'MEDIUM',
          source_component: 'confidence_evaluator',
          summary: `Review depth escalated to ${params.confidenceAssessment.review_depth}`,
          reason_codes: params.confidenceAssessment.reason_codes || [],
        }));
      }
    }

    // 7. VERIFICATION_COMPLETED
    if (params.verificationResults) {
      recordedEvents.push(store.appendEvent(runId, {
        event_type: 'VERIFICATION_COMPLETED',
        stage: 'VERIFICATION',
        status: params.verificationResults.passed ? 'SUCCESS' : 'ERROR',
        severity: params.verificationResults.passed ? 'LOW' : 'HIGH',
        source_component: 'verification_runner',
        summary: `Deterministic verifiers: ${params.verificationResults.passed ? 'PASSED' : 'FAILED'}`,
      }));
    }

    // 8. ANOMALY_DETECTED
    if (Array.isArray(params.anomalies)) {
      for (const anom of params.anomalies) {
        recordedEvents.push(store.appendEvent(runId, {
          event_type: 'ANOMALY_DETECTED',
          stage: 'ANOMALY_AUDIT',
          status: 'WARNING',
          severity: anom.severity || 'MEDIUM',
          source_component: 'anomaly_detector',
          reason_codes: [anom.drift_category || 'DRIFT'].filter(Boolean),
          summary: `Anomaly detected: ${anom.signal_name || anom.drift_category}`,
          metadata: {
            drift_category: anom.drift_category,
            is_advisory_only: true,
          },
        }));
      }
    }

    // 9. GOVERNANCE_VERDICT_ISSUED
    if (params.aggregated) {
      recordedEvents.push(store.appendEvent(runId, {
        event_type: 'GOVERNANCE_VERDICT_ISSUED',
        stage: 'GOVERNANCE',
        status: params.aggregated.verdict === 'APPROVED' ? 'SUCCESS' : (params.aggregated.verdict === 'WARNING' ? 'WARNING' : 'ERROR'),
        severity: params.aggregated.verdict === 'APPROVED' ? 'LOW' : 'HIGH',
        source_component: 'verdict_aggregator',
        summary: `Governance verdict issued: ${params.aggregated.verdict}`,
        metadata: {
          final_verdict: params.aggregated.verdict,
          reason: params.aggregated.reason || '',
        },
      }));
    }

    // 10. Human Gate Events (if authoritative)
    if (params.humanApproval) {
      if (params.humanApproval.required) {
        recordedEvents.push(store.appendEvent(runId, {
          event_type: 'HUMAN_APPROVAL_REQUIRED',
          stage: 'HUMAN_GATE',
          status: 'BLOCKED',
          severity: 'HIGH',
          source_component: 'human_gate',
          summary: 'Human approval required before merge or deployment',
        }));
      }
      if (params.humanApproval.approved && params.humanApproval.approved_by) {
        recordedEvents.push(store.appendEvent(runId, {
          event_type: 'HUMAN_APPROVAL_RECORDED',
          stage: 'HUMAN_GATE',
          status: 'SUCCESS',
          severity: 'LOW',
          source_component: 'human_gate',
          summary: `Human approval recorded by ${params.humanApproval.approved_by}`,
          metadata: {
            approved_by: params.humanApproval.approved_by,
            confirmation_channel: params.humanApproval.confirmation_channel || 'cli_prompt',
          },
        }));
      }
    }

    // 11. REVIEW_COMPLETED
    recordedEvents.push(store.appendEvent(runId, {
      event_type: 'REVIEW_COMPLETED',
      stage: 'COMPLETION',
      source_component: 'review_executor',
      summary: `Review completed for run: ${runId}`,
    }));

    return {
      success: true,
      run_id: runId,
      events_recorded: recordedEvents.length,
      completeness: 'COMPLETE',
    };
  } catch (err) {
    // Failure isolation: timeline recording errors never crash review or mutate policy
    return {
      success: false,
      run_id: runId,
      events_recorded: recordedEvents.length,
      completeness: 'FAILED_PERSISTENCE',
      error: err.message,
    };
  }
}

module.exports = {
  MAX_TIMELINE_RUNS,
  MAX_TIMELINE_STORAGE_BYTES,
  acquireTimelineLock,
  releaseTimelineLock,
  TimelineStore,
  recordReviewTimeline,
  formatTimelineTerminal,
  formatTimelineJSON,
};
