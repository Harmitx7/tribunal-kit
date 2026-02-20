---
name: server-management
description: Server management principles and decision-making. Process management, monitoring strategy, and scaling decisions. Teaches thinking, not commands.
allowed-tools: Read, Write, Edit, Glob, Grep
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
