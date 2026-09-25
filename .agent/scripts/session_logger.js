const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Event-Sourced Durable Session Logger
 * Replaces static JSON session state with an append-only JSONL event stream.
 */

const SESSION_DIR = path.resolve(process.cwd(), '.agent', '.tribunal');
const SESSION_FILE = path.join(SESSION_DIR, 'session.jsonl');

// Ensure directory exists
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

/**
 * Generate a unique event ID
 */
function generateEventId() {
  return 'evt_' + crypto.randomBytes(8).toString('hex');
}

/**
 * Append an event to the JSONL log
 * @param {string} type - The event type (e.g., 'ToolRequested', 'AgentDispatched')
 * @param {object} payload - The event payload
 * @param {string} source - The source of the event ('harness-manager', 'worker', etc.)
 * @param {string} [sessionId] - Optional session ID to tie events together
 */
function appendEvent(type, payload = {}, source = 'system', sessionId = 'default') {
  const event = {
    timestamp: new Date().toISOString(),
    eventId: generateEventId(),
    sessionId,
    type,
    source,
    payload
  };

  const line = JSON.stringify(event) + '\n';
  fs.appendFileSync(SESSION_FILE, line, 'utf8');
  return event.eventId;
}

/**
 * Read all events from the log
 * @returns {Array<object>} Array of parsed events
 */
function readEvents() {
  if (!fs.existsSync(SESSION_FILE)) return [];
  const content = fs.readFileSync(SESSION_FILE, 'utf8');
  return content
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map(line => {
      try {
        return JSON.parse(line);
      } catch (_e) {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * Rehydrate session state by folding over the event stream
 * @returns {object} Rehydrated state
 */
function rehydrateState() {
  const events = readEvents();
  const state = {
    currentSessionId: 'default',
    sessions: {},
    toolsExecuted: 0,
    errorsEncountered: 0,
  };

  for (const evt of events) {
    if (!state.sessions[evt.sessionId]) {
      state.sessions[evt.sessionId] = {
        startedAt: null,
        endedAt: null,
        events: [],
        status: 'active'
      };
    }
    
    const sess = state.sessions[evt.sessionId];
    sess.events.push(evt);

    if (evt.type === 'SessionStarted') {
      sess.startedAt = evt.timestamp;
      state.currentSessionId = evt.sessionId;
    } else if (evt.type === 'SessionEnded') {
      sess.endedAt = evt.timestamp;
      sess.status = 'completed';
    } else if (evt.type === 'ToolCompleted') {
      state.toolsExecuted++;
    } else if (evt.type === 'ErrorEncountered') {
      state.errorsEncountered++;
      sess.status = 'error';
    }
  }

  return state;
}

module.exports = {
  appendEvent,
  readEvents,
  rehydrateState,
  SESSION_FILE
};
