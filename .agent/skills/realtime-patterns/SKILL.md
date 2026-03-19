---
name: realtime-patterns
description: Real-time and collaborative application patterns. WebSockets, Server-Sent Events for AI streaming, CRDTs for conflict-free collaboration, presence, and sync engines. Use when building live collaboration, AI streaming UIs, live dashboards, or multiplayer features.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-03-12
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Real-Time Patterns

> The hardest part of real-time systems is not the latency — it's the concurrent state.
> Two users editing the same document at the same millisecond must both win.

---

## Transport Selection

Choose the transport based on what the data flow looks like:

| Transport | Direction | Best For | Avoid When |
|---|---|---|---|
| **WebSocket** | Bidirectional | Chat, multiplayer, collaboration | Simple server push |
| **SSE (Server-Sent Events)** | Server → client only | AI streaming, dashboards, notifications | Client needs to send data |
| **WebRTC** | Peer-to-peer | Video/audio, P2P file transfer | Server coordination needed |
| **HTTP Polling** | Client pull | Low-frequency updates, fallback | > 1 update per second |
| **HTTP Streaming** | Server → client | Large response streaming, AI output | Need bidirectionality |

---

## WebSocket Patterns

### Connection Lifecycle

```ts
class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;

  connect(url: string) {
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectDelay = 1000;  // Reset on successful connect
      this.authenticate();
    };

    this.ws.onclose = (event) => {
      if (!event.wasClean) {
        // Exponential backoff reconnect — never hammer the server
        setTimeout(() => this.connect(url), this.reconnectDelay);
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      }
    };

    this.ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      // onclose fires after onerror — let it handle reconnect
    };
  }

  private authenticate() {
    // ✅ Always authenticate AFTER connection — never trust URL params for auth
    this.ws!.send(JSON.stringify({
      type: 'auth',
      token: getAccessToken(),
    }));
  }
}
```

### Backpressure

```ts
// ❌ Unbounded send — crashes if network is slow
for (const item of hugeArray) {
  ws.send(JSON.stringify(item));  // Buffers infinitely if slow
}

// ✅ Check bufferedAmount before sending
function sendWhenReady(ws: WebSocket, data: string) {
  if (ws.bufferedAmount > 65536) {  // 64KB threshold
    setTimeout(() => sendWhenReady(ws, data), 50);
    return;
  }
  ws.send(data);
}
```

---

## SSE for AI Streaming

The right transport for one-directional AI text streaming:

### Server (Node.js / Hono)

```ts
app.get('/api/chat/stream', async (c) => {
  const { message } = c.req.query();

  // Set SSE headers
  c.res.headers.set('Content-Type', 'text/event-stream');
  c.res.headers.set('Cache-Control', 'no-cache');
  c.res.headers.set('Connection', 'keep-alive');

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: message }],
    stream: true,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? '';
        if (text) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
        }
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(readable);
});
```

### Client (React)

```tsx
function useAIStream(prompt: string) {
  const [text, setText] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const source = new EventSource(`/api/chat/stream?message=${encodeURIComponent(prompt)}`);

    source.onmessage = (e) => {
      if (e.data === '[DONE]') {
        setDone(true);
        source.close();
        return;
      }
      const { text: chunk } = JSON.parse(e.data);
      setText(prev => prev + chunk);
    };

    source.onerror = () => source.close();

    return () => source.close();  // Cleanup on unmount
  }, [prompt]);

  return { text, done };
}
```

---

## CRDTs: Conflict-Free Collaboration

CRDTs (Conflict-free Replicated Data Types) guarantee that concurrent edits from multiple users always merge to the same result, regardless of order or network conditions.

### When to Use CRDTs vs Last-Write-Wins

```
Last-Write-Wins (LWW):
  ✅ Settings, preferences, single-value fields
  ❌ Text editing — loses concurrent edits

Operational Transform (OT):
  ✅ Google Docs-style (centralized server required)
  ❌ Peer-to-peer, offline-first (server is the truth arbiter)

CRDTs:
  ✅ Collaborative text (Yjs), presence, shared lists
  ✅ Offline-first, peer-to-peer
  ✅ No central server required for convergence
```

### Yjs — The Standard CRDT Library

```ts
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

// Create a shared document
const doc = new Y.Doc();

// Connect to sync server — providers handle conflict resolution
const provider = new WebsocketProvider('wss://your-server.com', 'room-id', doc);

// Y.Text — CRDT for collaborative text editing
const yText = doc.getText('document');

// Bind to a rich text editor (Tiptap, ProseMirror, CodeMirror)
const editor = new Editor({
  extensions: [Collaboration.configure({ document: doc })],
});

// Y.Map — CRDT for key-value shared state
const awareness = new Y.Map();
awareness.set('cursor', { userId, position });
```

---

## Presence Patterns

Presence = "who is online and what are they doing":

```ts
// Server: track presence via WebSocket lifecycle
const presence = new Map<string, { userId: string; cursor: Position }>();

wss.on('connection', (ws, req) => {
  const userId = authenticate(req);

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'cursor') {
      presence.set(userId, { userId, cursor: msg.position });
      broadcast({ type: 'presence', users: [...presence.values()] });
    }
  });

  ws.on('close', () => {
    presence.delete(userId);
    broadcast({ type: 'presence', users: [...presence.values()] });
  });
});
```

---

## Sync Engine Selection

| Engine | Model | Best For |
|---|---|---|
| **PartyKit** | WebSocket-native, Durable Objects | Multiplayer apps, AI + realtime |
| **Liveblocks** | Managed CRDT + presence | Collaborative SaaS (Figma-style) |
| **Supabase Realtime** | PostgreSQL change streams | Postgres-centric apps |
| **ElectricSQL** | Local-first sync from Postgres | Offline-first apps |
| **Replicache** | Client-side mutations + sync | Highly interactive, offline-capable |

---

## Output Format

When this skill produces or reviews code, structure your output as follows:

```
━━━ Realtime Patterns Report ━━━━━━━━━━━━━━━━━━━━━━━━
Skill:       Realtime Patterns
Language:    [detected language / framework]
Scope:       [N files · N functions]
─────────────────────────────────────────────────
✅ Passed:   [checks that passed, or "All clean"]
⚠️  Warnings: [non-blocking issues, or "None"]
❌ Blocked:  [blocking issues requiring fix, or "None"]
─────────────────────────────────────────────────
VBC status:  PENDING → VERIFIED
Evidence:    [test output / lint pass / compile success]
```

**VBC (Verification-Before-Completion) is mandatory.**
Do not mark status as VERIFIED until concrete terminal evidence is provided.


---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/tribunal-backend`**
**Active reviewers: `logic` · `security` · `performance`**

### ❌ Forbidden AI Tropes in Real-Time Engineering

1. **Auth in URL params** — `ws://server.com?token=abc123` — tokens in URLs appear in logs and browser history. Authenticate via first message after handshake.
2. **No reconnect logic** — all WebSocket connections will drop. No reconnect = broken app on any network hiccup.
3. **Unbounded broadcast** — `wss.clients.forEach(ws => ws.send(data))` with no grouping = O(n) for every event.
4. **Polling instead of streaming** — `setInterval(() => fetch('/api/ai-status'), 500)` for AI responses = wasteful; use SSE.
5. **No backpressure handling** — sending data faster than the client can process = WebSocket buffer OOM.

### ✅ Pre-Flight Self-Audit

```
✅ Are WebSocket connections authenticated via first message, not URL params?
✅ Is there exponential backoff reconnect logic on unexpected disconnect?
✅ Are broadcasts scoped to rooms/channels — not sent to all connected clients?
✅ Is backpressure handled (bufferedAmount check before send)?
✅ Is SSE used for one-directional AI streaming instead of WebSocket?
```
