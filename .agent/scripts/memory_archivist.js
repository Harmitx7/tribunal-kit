#!/usr/bin/env node
/**
 * memory_archivist.js
 * Scans the durable session.jsonl log for errors and resolutions,
 * generating evidence-backed Tribunal Instincts.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { readEvents } = require('./session_logger');

const INSTINCTS_DIR = path.resolve(process.cwd(), '.agent', 'memory');
const INSTINCTS_FILE = path.join(INSTINCTS_DIR, 'instincts.json');

// Ensure directory exists
if (!fs.existsSync(INSTINCTS_DIR)) {
  fs.mkdirSync(INSTINCTS_DIR, { recursive: true });
}

/**
 * Load existing instincts
 */
function loadInstincts() {
  if (!fs.existsSync(INSTINCTS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(INSTINCTS_FILE, 'utf8'));
  } catch (_e) {
    return [];
  }
}

/**
 * Save instincts back to disk
 */
function saveInstincts(instincts) {
  fs.writeFileSync(INSTINCTS_FILE, JSON.stringify(instincts, null, 2), 'utf8');
}

/**
 * Mine the JSONL log for failures and successes
 */
function archiveSession() {
  const events = readEvents();
  const instincts = loadInstincts();
  
  let currentError = null;
  let newInstinctsCount = 0;

  for (const evt of events) {
    if (evt.type === 'ErrorEncountered') {
      currentError = evt;
    } else if (evt.type === 'ToolCompleted' && currentError && evt.sessionId === currentError.sessionId) {
      // If we see a successful tool completion shortly after an error in the same session, 
      // we assume it's a resolution. In a real LLM setup, we'd use an AI pass here to summarize the fix.
      // For now, we stub the instinct generation based on the error.
      
      const errorMsg = currentError.payload.message || 'Unknown error';
      
      // Avoid duplicates
      const exists = instincts.find(i => i.evidence.failedEventId === currentError.eventId);
      
      if (!exists && errorMsg !== 'Unknown error') {
        const newInstinct = {
          id: `instinct_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          domain: "auto-archived",
          rule: `Avoid pattern that caused: ${errorMsg}`,
          evidence: {
            failedEventId: currentError.eventId,
            resolutionEventId: evt.eventId
          },
          confidence: "L3" // L3 because it's auto-generated without human verification
        };
        
        instincts.push(newInstinct);
        newInstinctsCount++;
      }
      
      // Reset error tracker
      currentError = null;
    }
  }

  if (newInstinctsCount > 0) {
    saveInstincts(instincts);
    console.log(`✅ Memory Archivist mined ${newInstinctsCount} new instincts from the session log.`);
  } else {
    console.log(`ℹ️ Memory Archivist found no new verifiable patterns in the session log.`);
  }
}

if (require.main === module) {
  archiveSession();
}

module.exports = { archiveSession };
