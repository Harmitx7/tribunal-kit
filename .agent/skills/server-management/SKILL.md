---
name: server-management
description: Production Linux server administration mastery. Systemd services, Nginx reverse proxy architecture, UFW firewalls, SSH key security, cron scheduling, log rotation, and server hardening. Use when configuring bare-metal, VPS instances, or reviewing deployment architecture.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Server Management — Production Linux Mastery

> Never run a web server as root. Never expose raw ports securely.
> A naked Node/Python process dies silently. A systemd service acts as its immortal guardian.

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

## 🤖 LLM-Specific Traps (Server Management)

1. **PM2 Fallacy:** AI frequently defaults to `pm2 start app.js` for production deployments. Demand raw `systemd`. It ensures startup order (Wait for network) and unified journalctl logging.
2. **Root Execution:** Suggesting `ExecStart=npm start` under the `User=root` directive. The application process should operate under a restricted `appuser` daemon tier.
3. **Missing Proxy Headers:** AI writing basic Nginx configs but omitting `X-Forwarded-For`. This causes the internal App to log all requests as coming from "127.0.0.1", instantly breaking IP Rate limiters.
4. **WebSocket Blocking:** Forgetting to pass `Upgrade` headers in Nginx proxy setups, breaking realtime web applications silently.
5. **Naked Node Ports:** Instructing users to run `node index.js` on `port 80`. Never natively bind unprivileged web processes to port 80. Bind to 3000 locally and use reverse proxy routing.
6. **Firewall Blindness:** Assuming Docker auto-secures ports. Executing `docker run -p 8080:80` on Ubuntu completely bypasses UFW restrictions through iptables hooks, exposing the database to the internet. Always bind `127.0.0.1:8080:80`.
7. **Password SSH Prompts:** Creating automation scripts utilizing raw passwords (e.g., `sshpass`). Always assume ed25519 identity keyfiles for automated CI deployments.
8. **Log Rotation Void:** Neglecting log rotation in custom bash script loops, guaranteeing a 100% disk usage outage 3 months later.
9. **GZIP Assumption:** Forgetting to enable `gzip on` in Nginx resulting in 10MB JSON payloads saturating the virtual server network adapter.
10. **In-place Nginx Modding:** Editing `/etc/nginx/nginx.conf` directly instead of writing symlinks between the `sites-available` and `sites-enabled` architecture.

---

## 🏛️ Tribunal Integration

### ✅ Pre-Flight Self-Audit
```
✅ Are persistent services orchestrated securely via `systemd` (not PM2)?
✅ Does the systemd service explicitly execute as a non-root `appuser`?
✅ Is the internal application shielded by an Nginx/Caddy reverse proxy?
✅ Does the reverse proxy explicitly forward realtime `Upgrade` (WebSocket) headers?
✅ Does the reverse proxy forward IP integrity headers (`X-Forwarded-For`)?
✅ Has SSH `PasswordAuthentication` been disabled defensively?
✅ Is UFW configured to strictly deny all incoming non-essential ports?
✅ If suggesting Docker, are database/internal ports scoped to `127.0.0.1:X:Y`?
✅ Have manual application log files been mapped in `logrotate.d`?
✅ Has `PermitRootLogin` been set to `no`?
```
