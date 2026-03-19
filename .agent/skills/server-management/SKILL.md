---
name: server-management
description: Server management principles and decision-making. Process management, monitoring strategy, and scaling decisions. Teaches thinking, not commands.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-03-12
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Server Management Principles

> A server you can't observe is a server you can't operate.
> Monitoring is not optional — it is how you find out about problems before your users do.

---

## Process Management

Never run Node.js or Python processes directly in production with `node app.js`. Use a process manager.

| Tool | Best For | Why |
|---|---|---|
| PM2 | Single-server Node.js | Auto-restart, log rotation, cluster mode |
| systemd | Linux servers, any language | Native to most Linux distros, reliable |
| Supervisor | Python, Ruby, any language | Simple config, battle-tested |
| Docker (+restart policy) | Containerized apps | Portable, consistent across environments |

**Core requirement:** If the process crashes, it restarts automatically. If it can't restart, you are alerted.

```bash
# PM2 example — stays running, auto-restarts, survives reboots
pm2 start app.js --name "api" --instances max
pm2 save
pm2 startup  # generates the command to run at boot
```

---

## What to Monitor

The minimum viable monitoring stack:

| Signal | What To Alert On |
|---|---|
| Process health | Process is not running |
| Response time | P95 latency > SLA threshold |
| Error rate | Error rate > 2x baseline |
| Disk usage | > 80% full |
| Memory | Growing without bound (memory leak) |
| CPU | Sustained > 80% for more than 5 minutes |

**Alert on symptoms, not just causes.** "Error rate spiked" is a better alert than "CPU is high" — users don't feel CPU, they feel slow responses and errors.

---

## Log Management

Logs are useless without structure. Structured logs can be queried and aggregated.

```ts
// ❌ Unstructured — hard to query
console.log(`User ${userId} failed to login at ${new Date()}`);

// ✅ Structured — can be filtered, aggregated, alerted on
logger.warn('login_failed', {
  userId,
  ip: req.ip,
  reason: 'invalid_password',
  timestamp: new Date().toISOString(),
});
```

**Log levels, used correctly:**
- `ERROR` — something failed that requires attention
- `WARN` — something unexpected but non-fatal happened
- `INFO` — key business events (user registered, payment processed)
- `DEBUG` — useful for troubleshooting, never on in production by default

**Never log:**
- Passwords, tokens, or full credit card numbers
- PII without a documented retention policy
- Full request bodies on auth endpoints

---

## Scaling Decision Framework

Before scaling, answer:

**Is the bottleneck identified?**
- Profile first. Is it CPU, memory, database, or network?
- Scaling horizontally when the bottleneck is a single database query helps nothing.

| Bottleneck | Scaling Approach |
|---|---|
| CPU-bound app logic | Horizontal scale (more instances) |
| Memory limit | Vertical scale (more RAM per instance) |
| I/O-bound (DB, external calls) | Connection pooling, caching, async patterns |
| Database reads | Read replicas, query optimization, caching |
| Database writes | Sharding, write queuing, schema redesign |

**Cached responses don't need scaling.** Add caching before adding instances.

---

## Nginx Configuration Essentials

```nginx
server {
  listen 80;
  server_name example.com;
  
  # Redirect HTTP → HTTPS
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl;
  server_name example.com;

  # Security headers
  add_header X-Frame-Options DENY;
  add_header X-Content-Type-Options nosniff;
  add_header Strict-Transport-Security "max-age=31536000" always;

  # Proxy to Node.js app
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto https;
  }

  # Serve static files directly (don't proxy to Node)
  location /static/ {
    root /var/www/myapp;
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

---

## Backup Strategy

The 3-2-1 rule:
- **3** copies of data
- **2** on different storage media
- **1** offsite (different data center, cloud region)

Test restores on a schedule — a backup you've never restored is a backup you don't know works.

---

## Output Format

When this skill produces a recommendation or design decision, structure your output as:

```
━━━ Server Management Recommendation ━━━━━━━━━━━━━━━━
Decision:    [what was chosen / proposed]
Rationale:   [why — one concise line]
Trade-offs:  [what is consciously accepted]
Next action: [concrete next step for the user]
─────────────────────────────────────────────────
Pre-Flight:  ✅ All checks passed
             or ❌ [blocking item that must be resolved first]
```



---

## 🤖 LLM-Specific Traps

AI coding assistants often fall into specific bad habits when dealing with this domain. These are strictly forbidden:

1. **Over-engineering:** Proposing complex abstractions or distributed systems when a simpler approach suffices.
2. **Hallucinated Libraries/Methods:** Using non-existent methods or packages. Always `// VERIFY` or check `package.json` / `requirements.txt`.
3. **Skipping Edge Cases:** Writing the "happy path" and ignoring error handling, timeouts, or data validation.
4. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.
5. **Silent Degradation:** Catching and suppressing errors without logging or re-raising.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit

Review these questions before confirming output:
```
✅ Did I rely ONLY on real, verified tools and methods?
✅ Is this solution appropriately scoped to the user's constraints?
✅ Did I handle potential failure modes and edge cases?
✅ Have I avoided generic boilerplate that doesn't add value?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
