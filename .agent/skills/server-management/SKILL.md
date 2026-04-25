---
name: server-management
description: Production Linux server administration mastery. Systemd services, Nginx reverse proxy architecture, UFW firewalls, SSH key security, cron scheduling, log rotation, and server hardening. Use when configuring bare-metal, VPS instances, or reviewing deployment architecture.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

## Hallucination Traps (Read First)
- ❌ Running services as root -> ✅ Create a dedicated service user with minimal permissions; never run as root
- ❌ Using password-based SSH -> ✅ Disable password auth; use SSH key pairs only with `PermitRootLogin no`
- ❌ Editing nginx config without testing -> ✅ Always run `nginx -t` before `systemctl reload nginx`; syntax errors take down all sites

---


# Server Management — Production Linux Mastery

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


---



AI coding assistants often fall into specific bad habits when dealing with this domain. These are strictly forbidden:

1. **Over-engineering:** Proposing complex abstractions or distributed systems when a simpler approach suffices.
2. **Hallucinated Libraries/Methods:** Using non-existent methods or packages. Always `// VERIFY` or check `package.json` / `requirements.txt`.
3. **Skipping Edge Cases:** Writing the "happy path" and ignoring error handling, timeouts, or data validation.
4. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.
5. **Silent Degradation:** Catching and suppressing errors without logging or re-raising.

---



**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.



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


## Pre-Flight Checklist
- [ ] Have I reviewed the user's specific constraints and requests?
- [ ] Have I checked the environment for relevant existing implementations?

## VBC Protocol (Verification-Before-Completion)
You MUST verify existing code signatures and variables before attempting to modify or call them. No hallucination is permitted.
