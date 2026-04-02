---
name: realtime-patterns
description: Real-time application mastery. WebSockets, Server-Sent Events (SSE), CRDTs for conflict-free collaboration, presence systems, optimistic updates, live cursors, multiplayer state sync, reconnection strategies, and real-time database patterns (Supabase Realtime, Firebase). Use when building chat, live collaboration, dashboards, or multiplayer features.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-01
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Real-Time Patterns — Live Application Mastery

> Real-time is a feature, not a technology. Choose the simplest protocol that solves the problem.
> WebSocket is overused. SSE handles 80% of real-time needs with 20% of the complexity.

---

## Protocol Selection

```
┌─────────────────────────────────────────────────────────────┐
│              When to Use What                                │
├─────────────────────────────────────────────────────────────┤
│ SSE (Server-Sent Events)                                    │
│   ✅ Server → Client only (one-way)                        │
│   ✅ AI token streaming                                    │
│   ✅ Live feeds, notifications, dashboards                  │
│   ✅ Auto-reconnection built in                             │
│   ✅ Works through HTTP proxies and CDNs                    │
│                                                              │
│ WebSocket                                                    │
│   ✅ Bidirectional (client ↔ server)                        │
│   ✅ Chat, gaming, collaborative editing                    │
│   ✅ High-frequency updates (< 100ms intervals)            │
│   ❌ Doesn't work through some proxies/CDNs                │
│   ❌ No auto-reconnection (must implement)                  │
│                                                              │
│ HTTP Polling                                                 │
│   ✅ Simplest implementation                                │
│   ✅ Works everywhere                                       │
│   ❌ Latency (poll interval)                                │
│   ❌ Wasted requests when nothing changed                   │
│                                                              │
│ WebTransport (emerging)                                      │
│   ✅ UDP-based, lowest latency                              │
│   ✅ Multiplayer gaming, video streaming                    │
│   ❌ Limited browser support (2024+)                        │
└─────────────────────────────────────────────────────────────┘

❌ HALLUCINATION TRAP: Don't default to WebSocket for everything
   AI streaming → SSE (one-way, auto-reconnect)
   Notifications → SSE (one-way)
   Chat → WebSocket (bidirectional)
   Live dashboard → SSE (one-way)
   Collaborative editing → WebSocket + CRDT
```

---

## Server-Sent Events (SSE)

```typescript
// Server (Node.js/Express)
app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n"); // comment line, ignored by client
  }, 15000);

  // Subscribe to events
  const handler = (event: AppEvent) => {
    res.write(`event: ${event.type}\n`);
    res.write(`data: ${JSON.stringify(event.data)}\n`);
    res.write(`id: ${event.id}\n\n`);  // enables auto-resume
  };
  eventBus.subscribe(handler);

  // Cleanup on disconnect
  req.on("close", () => {
    clearInterval(heartbeat);
    eventBus.unsubscribe(handler);
  });
});

// Client
const eventSource = new EventSource("/api/events");

eventSource.addEventListener("notification", (e) => {
  const data = JSON.parse(e.data);
  showNotification(data);
});

// Auto-reconnection is built-in!
// The browser automatically reconnects with Last-Event-ID header
eventSource.onerror = () => {
  console.log("Connection lost — auto-reconnecting...");
};
```

---

## WebSocket

```typescript
// Server (ws library)
import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

// Connection management
const clients = new Map<string, WebSocket>();

wss.on("connection", (ws, req) => {
  const userId = authenticateFromHeaders(req);
  clients.set(userId, ws);

  ws.on("message", (raw) => {
    try {
      const message = JSON.parse(raw.toString());
      handleMessage(userId, message);
    } catch (e) {
      ws.send(JSON.stringify({ error: "Invalid message format" }));
    }
  });

  ws.on("close", () => {
    clients.delete(userId);
    broadcastPresence();
  });

  ws.on("pong", () => {
    // Client is alive
  });
});

// Heartbeat — detect dead connections
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  });
}, 30000);

// Broadcast to room
function broadcastToRoom(roomId: string, message: unknown, excludeUser?: string) {
  const roomMembers = getRoomMembers(roomId);
  for (const memberId of roomMembers) {
    if (memberId === excludeUser) continue;
    const ws = clients.get(memberId);
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
}

// Client with reconnection
class ReconnectingWebSocket {
  private ws: WebSocket | null = null;
  private retryCount = 0;
  private maxRetries = 10;

  connect(url: string) {
    this.ws = new WebSocket(url);
    this.ws.onopen = () => { this.retryCount = 0; };
    this.ws.onclose = () => { this.reconnect(url); };
    this.ws.onerror = () => { this.ws?.close(); };
  }

  private reconnect(url: string) {
    if (this.retryCount >= this.maxRetries) return;
    const delay = Math.min(1000 * 2 ** this.retryCount, 30000);
    this.retryCount++;
    setTimeout(() => this.connect(url), delay);
  }
}
```

---

## Optimistic Updates

```typescript
// React pattern: update UI immediately, reconcile on server response
async function toggleLike(postId: string) {
  // 1. Optimistic update (instant UI feedback)
  setLiked((prev) => !prev);
  setLikeCount((prev) => liked ? prev - 1 : prev + 1);

  try {
    // 2. Server request
    await api.post(`/posts/${postId}/like`);
  } catch (error) {
    // 3. Rollback on failure
    setLiked((prev) => !prev);
    setLikeCount((prev) => liked ? prev + 1 : prev - 1);
    toast.error("Failed to update. Please try again.");
  }
}

// With React Query / TanStack Query:
const likeMutation = useMutation({
  mutationFn: (postId: string) => api.post(`/posts/${postId}/like`),
  onMutate: async (postId) => {
    await queryClient.cancelQueries({ queryKey: ["post", postId] });
    const previous = queryClient.getQueryData(["post", postId]);
    queryClient.setQueryData(["post", postId], (old: Post) => ({
      ...old,
      liked: !old.liked,
      likeCount: old.liked ? old.likeCount - 1 : old.likeCount + 1,
    }));
    return { previous };
  },
  onError: (err, postId, context) => {
    queryClient.setQueryData(["post", postId], context?.previous);
  },
  onSettled: (data, err, postId) => {
    queryClient.invalidateQueries({ queryKey: ["post", postId] });
  },
});
```

---

## Presence System

```typescript
// Track who's online, typing, viewing

interface PresenceState {
  userId: string;
  status: "online" | "away" | "offline";
  cursor?: { x: number; y: number };
  lastSeen: number;
}

// Server-side presence manager
class PresenceManager {
  private presence = new Map<string, PresenceState>();
  private readonly TIMEOUT_MS = 30_000;

  update(userId: string, state: Partial<PresenceState>) {
    this.presence.set(userId, {
      ...this.presence.get(userId),
      userId,
      status: "online",
      lastSeen: Date.now(),
      ...state,
    } as PresenceState);
  }

  getActive(): PresenceState[] {
    const now = Date.now();
    return [...this.presence.values()].filter(
      (p) => now - p.lastSeen < this.TIMEOUT_MS,
    );
  }

  remove(userId: string) {
    this.presence.delete(userId);
  }
}
```

---

## 🤖 LLM-Specific Traps

1. **WebSocket for Everything:** SSE handles 80% of real-time needs. Only use WebSocket for bidirectional communication.
2. **No Reconnection Logic:** WebSocket has NO built-in reconnection. Always implement exponential backoff reconnection.
3. **Missing Heartbeat:** Without ping/pong, dead connections stay open forever. Implement heartbeat on both sides.
4. **Unbounded Message Queues:** Queue messages for offline clients, but set a MAX queue size. Memory will explode otherwise.
5. **No Authentication on WebSocket:** Authenticate during the HTTP upgrade handshake, not after connection.
6. **Broadcasting to All Clients:** Use rooms/channels. Broadcasting to every connected client doesn't scale.
7. **Optimistic Updates Without Rollback:** If you update the UI optimistically, you MUST handle rollback on failure.
8. **SSE Without `X-Accel-Buffering: no`:** Nginx buffers SSE responses by default. Disable buffering.
9. **No Event ID for Resume:** SSE clients use `Last-Event-ID` to resume after disconnect. Always send event IDs.
10. **Presence Without Timeout:** Don't rely on `close` events alone. Users can lose connection without triggering close.

---

## 🏛️ Tribunal Integration

### ✅ Pre-Flight Self-Audit

```
✅ Am I using the simplest protocol for my use case (SSE vs WS)?
✅ Does the WebSocket implementation have reconnection logic?
✅ Is there heartbeat/ping-pong for connection health?
✅ Is authentication done during the HTTP upgrade?
✅ Do SSE events include IDs for auto-resume?
✅ Is nginx buffering disabled for SSE?
✅ Do optimistic updates have rollback on failure?
✅ Are message queues bounded (max size)?
✅ Does presence have timeout cleanup (not just close events)?
✅ Are broadcasts scoped to rooms (not all clients)?
```
