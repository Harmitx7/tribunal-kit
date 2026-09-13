---
name: server-management
description: Use when Production Linux server administration mastery. Systemd services, Nginx reverse proxy architecture, UFW firewalls, SSH key security, cron scheduling, log rotation, and server hardening. Use when configuring bare-metal, VPS instances, or reviewing deployment architecture.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - devops-engineer
  - backend-security-expert
  - bash-linux
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Server Management — Production Linux Mastery

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `server-management` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Production Linux server administration mastery. Systemd services, Nginx reverse proxy architecture, UFW firewalls, SSH key security, cron scheduling, log rotation, and server hardening. Use when configuring bare-metal, VPS instances, or reviewing deployment architecture.
- **DO NOT activate when:** The task falls outside the `server-management` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass | Phase | Core Action |
|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. |
| **Pass 2** | **Plan** | Decompose the task into smallest logical steps; map dependencies and required tool calls. |
| **Pass 3** | **Execute** | Implement the solution with production-grade craft, zero placeholders, and strict typing. |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. |
| **Pass 5** | **Attack** | Perform an adversarial review searching for edge-case failures, race conditions, and traps. |
| **Pass 6** | **Improve** | Eliminate discovered friction, optimize performance, and harden error boundaries. |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

---


## Hallucination Traps (Read First)

- ❌ Running services as root -> ✅ Create a dedicated service user with minimal permissions; never run as root
- ❌ Using password-based SSH -> ✅ Disable password auth; use SSH key pairs only with `PermitRootLogin no`
- ❌ Editing nginx config without testing -> ✅ Always run `nginx -t` before `systemctl reload nginx`; syntax errors take down all sites

---

---

## 1. Systemd Service Architecture (Process Guard)

Do not use `pm2`, `forever`, or custom `screen` sessions attached to SSH panels for server orchestration. Linux provides an enterprise-grade init system natively: systemd.

```ini
# /etc/systemd/system/myapp.service

[Unit]
Description=My Application Node.js Server
Documentation=https://example.com/docs
After=network.target postgresql.service # Ensure DB and Network start first

[Service]
Type=simple
User=appuser     # NEVER run as root
Group=appuser
WorkingDirectory=/var/www/myapp

# Explicitly declare environment limits and variables
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=/var/www/myapp/.env

# The execution target
ExecStart=/usr/bin/node /var/www/myapp/build/index.js

# Immortal behavior: Restart strictly on failure
Restart=on-failure
RestartSec=5

# Security Hardening
NoNewPrivileges=yes
PrivateTmp=yes
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX

[Install]
WantedBy=multi-user.target
```

**Commands:**
`sudo systemctl daemon-reload`
`sudo systemctl enable myapp`
`sudo systemctl start myapp`
`journalctl -u myapp -f` (Follow logs seamlessly)

---

## 2. Nginx Reverse Proxy Architecture

You must shield your internal application framework (Node/Python/Ruby) behind Nginx. Nginx handles SSL termination, static file caching, and DDOS mitigation.

```nginx
# /etc/nginx/sites-available/myapp.com

server {
    listen 80;
    server_name api.myapp.com;

    # Force SSL Redirect
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.myapp.com;

    # SSL Certs (Let's Encrypt / Certbot)
    ssl_certificate /etc/letsencrypt/live/api.myapp.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.myapp.com/privkey.pem;

    # Modern Security Headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;

    # GZIP Compression
    gzip on;
    gzip_types text/plain application/json;

    location / {
        # Proxy traffic to internal local process
        proxy_pass http://127.0.0.1:3000;

        # Forward original IP and Protocol for rate limiters
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (Required for GraphQL subscriptions, TRPC, Socket.io)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 3. Server Hardening Fundamentals

### SSH Security (`/etc/ssh/sshd_config`)

```bash
PermitRootLogin no           # Kill direct root login attacks immediately
PasswordAuthentication no    # Enforce SSH key-based login ONLY
Port 2022                    # (Optional) Obscurity defense against automated script-kiddie scanners
```

### Uncomplicated Firewall (UFW)

A naked server with all ports open is a honeypot.

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp      # Allow SSH
sudo ufw allow 80/tcp      # Allow HTTP
sudo ufw allow 443/tcp     # Allow HTTPS
sudo ufw enable
```

### Fail2Ban

Automatically bans IPs attempting brute force credential filling after 5 bad attempts.

---

## 4. Log Rotation (Prevent Disk Full Outages)

A server will inevitably crash when `/var/log` consumes 100% of the disk.

```bash
# /etc/logrotate.d/myapp

/var/www/myapp/logs/*.log {
    daily                # Rotate every day
    missingok            # Ignore if file is missing
    rotate 14            # Keep 14 days of history
    compress             # Gzip old logs
    delaycompress        # Don't compress the one created yesterday
    notifempty           # Do nothing if log is empty
    copytruncate         # Copy then clear (avoids disrupting Node's open file handles)
}
```

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Mitigation Strategy |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Silent Pipeline Failure** | Executing shell steps without set -euo pipefail, ignoring errors | Always initialize shell scripts with set -euo pipefail and trap handlers |
| **Unpinned Dependency Shift** | Installing packages with npm install or using :latest docker tags | Lock dependencies with npm ci / lockfiles and use immutable SHA256 image digests |
| **Leaking Build Secrets** | Passing secrets as Docker build arguments baked into image layers | Use Docker BuildKit secret mounts (--mount=type=secret) or runtime injection |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `pipeline-reviewer` · `devops-engineer` · `resilience-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Are strict execution modes (set -euo pipefail) active on all scripts?
✅ Are container images pinned to digest/immutable tags instead of "latest"?
✅ Are deployment health checks and rollback baselines configured?
✅ Are CI secrets masked and unexposed to untrusted pull requests?
✅ Did I verify environment compatibility across target runtimes?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
