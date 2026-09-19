#!/usr/bin/env node
/**
 * Telemetry Garbage Collection Script — Tribunal Kit v10 Drop 1
 *
 * Compacts old telemetry data in .tribunal/telemetry/dispatch.jsonl:
 * - Retains last N days of raw events (default: 90)
 * - Aggregates older events into monthly summary buckets
 * - Writes compacted data back
 *
 * Usage:
 *   node scripts/telemetry_gc.js [--days 90] [--dry-run] [--path .]
 */

const fs = require('fs');
const path = require('path');

// Parse CLI args
const args = process.argv.slice(2);
function getArg(name, defaultValue) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return defaultValue;
  return args[idx + 1] || defaultValue;
}
const dryRun = args.includes('--dry-run');
const retentionDays = parseInt(getArg('days', '90'), 10);
const targetPath = getArg('path', '.');

const logFile = path.join(targetPath, '.tribunal', 'telemetry', 'dispatch.jsonl');
const archiveDir = path.join(targetPath, '.tribunal', 'telemetry', 'archive');

function run() {
  console.log(`\n⚡ Telemetry GC — Retention: ${retentionDays} days | Dry Run: ${dryRun}`);
  console.log('━'.repeat(50));

  if (!fs.existsSync(logFile)) {
    console.log('  ℹ No telemetry log found. Nothing to compact.');
    return;
  }

  const raw = fs.readFileSync(logFile, 'utf-8');
  const lines = raw.split('\n').filter(l => l.trim().length > 0);
  console.log(`  Total events in log: ${lines.length}`);

  const now = new Date();
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);

  const retained = [];
  const archived = [];

  for (const line of lines) {
    try {
      const event = JSON.parse(line);
      const eventDate = new Date(event.timestamp || '1970-01-01');
      if (eventDate >= cutoff) {
        retained.push(line);
      } else {
        archived.push(event);
      }
    } catch {
      // Malformed line — discard
      continue;
    }
  }

  console.log(`  Events to retain:  ${retained.length}`);
  console.log(`  Events to archive: ${archived.length}`);

  if (archived.length === 0) {
    if (lines.length !== retained.length) {
      if (!dryRun) fs.writeFileSync(logFile, retained.join('\n') + '\n');
      console.log(`  ✓ Cleaned malformed lines. ${retained.length} events retained.\n`);
    } else {
      console.log('  ✓ Nothing to compact. All events within retention window.\n');
    }
    return;
  }

  // Aggregate archived events into monthly buckets
  const monthlyBuckets = {};
  for (const event of archived) {
    const date = new Date(event.timestamp || '1970-01-01');
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyBuckets[key]) {
      monthlyBuckets[key] = {
        month: key,
        total_dispatches: 0,
        agents: {},
        outcomes: {},
        total_tokens: 0,
        total_duration_ms: 0,
      };
    }
    const bucket = monthlyBuckets[key];
    bucket.total_dispatches++;
    bucket.agents[event.agent_name] = (bucket.agents[event.agent_name] || 0) + 1;
    bucket.outcomes[event.outcome] = (bucket.outcomes[event.outcome] || 0) + 1;
    bucket.total_tokens += event.token_budget_used || 0;
    bucket.total_duration_ms += event.duration_ms || 0;
  }

  if (dryRun) {
    console.log('\n  [DRY RUN] Would archive these monthly summaries:');
    for (const [month, bucket] of Object.entries(monthlyBuckets)) {
      console.info(
        `    ${month}: ${bucket.total_dispatches} events, ${bucket.total_tokens} tokens`,
      );
    }
    console.log(`  [DRY RUN] Would retain ${retained.length} recent events.\n`);
    return;
  }

  // Write monthly archive files
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }

  for (const [month, bucket] of Object.entries(monthlyBuckets)) {
    const archiveFile = path.join(archiveDir, `${month}.json`);
    // Merge with existing archive if present
    let existing = {};
    if (fs.existsSync(archiveFile)) {
      try {
        existing = JSON.parse(fs.readFileSync(archiveFile, 'utf-8'));
      } catch {
        /* overwrite */
      }
    }

    const merged = {
      month: bucket.month,
      total_dispatches: (existing.total_dispatches || 0) + bucket.total_dispatches,
      agents: mergeCountMaps(existing.agents || {}, bucket.agents),
      outcomes: mergeCountMaps(existing.outcomes || {}, bucket.outcomes),
      total_tokens: (existing.total_tokens || 0) + bucket.total_tokens,
      total_duration_ms: (existing.total_duration_ms || 0) + bucket.total_duration_ms,
    };

    fs.writeFileSync(archiveFile, JSON.stringify(merged, null, 2));
    console.log(`  ✓ Archived: ${archiveFile} (${bucket.total_dispatches} events)`);
  }

  // Rewrite the dispatch log with only retained events
  fs.writeFileSync(logFile, retained.join('\n') + '\n');
  console.log(`  ✓ Compacted dispatch.jsonl: ${retained.length} events retained.`);
  console.log(`  ✓ ${archived.length} events moved to monthly archives.\n`);
}

function mergeCountMaps(a, b) {
  const result = { ...a };
  for (const [key, count] of Object.entries(b)) {
    result[key] = (result[key] || 0) + count;
  }
  return result;
}

run();
