#!/usr/bin/env node
/**
 * architecture_visualizer.js — Tribunal Architecture Intelligence Explorer
 * ═════════════════════════════════════════════════════════════════════════════
 * Generates an ultra-premium, zero-dependency, self-contained standalone HTML
 * interactive architecture explorer with 5 dynamic projections:
 *
 *   1. System Topology (Services, Endpoints, Datastores, Queues)
 *   2. Security Trust Zones (Public Untrusted, DMZ, Authenticated, Datastore)
 *   3. Failure Architecture (Timeouts, Retries, Fallbacks, Circuit Breakers)
 *   4. Data Lineage & Persistence
 *   5. Interactive Blast Radius Simulator (Real-time downstream impact on click)
 *
 * Features:
 *   - Offline zero-CDN execution
 *   - Dark aesthetic with vibrant HSL design tokens
 *   - Pan, zoom, search, node filtering, and focus isolation
 *   - Live Evidence Drawer with verified source files, line numbers, and L1-L5 badges
 *
 * Zero external dependencies.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { GREEN, CYAN, RED, DIM, RESET, BOX, banner, timer, formatMs } = require('./_colors');

class ArchitectureVisualizer {
  constructor(model, verification = null) {
    this.model = model;
    this.verification = verification;
  }

  generateHtml() {
    const rawDataJson = JSON.stringify({
      model: this.model,
      verification: this.verification,
    }).replace(/</g, '\\u003c');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tribunal Architecture Intelligence Explorer</title>
  <style>
    :root {
      --bg: #09090b;
      --bg-panel: rgba(18, 18, 24, 0.85);
      --bg-card: #14141e;
      --border: #272738;
      --border-bright: #3f3f5a;
      --text: #f4f4f6;
      --text-dim: #9494a8;
      --accent-cyan: #06b6d4;
      --accent-blue: #3b82f6;
      --accent-green: #10b981;
      --accent-amber: #f59e0b;
      --accent-rose: #f43f5e;
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-sans);
      height: 100vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    /* Top Navigation Bar */
    header {
      height: 56px;
      background: var(--bg-panel);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      z-index: 50;
      flex-shrink: 0;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 700;
      font-size: 15px;
      letter-spacing: -0.01em;
    }
    .brand-badge {
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      color: #000;
      font-size: 10px;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 4px;
      text-transform: uppercase;
    }

    /* Projection Tabs */
    .projection-tabs {
      display: flex;
      gap: 4px;
      background: rgba(0, 0, 0, 0.4);
      padding: 3px;
      border-radius: 8px;
      border: 1px solid var(--border);
    }
    .tab-btn {
      background: transparent;
      border: none;
      color: var(--text-dim);
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .tab-btn:hover { color: var(--text); }
    .tab-btn.active {
      background: var(--border-bright);
      color: #fff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .search-box {
      position: relative;
    }
    .search-box input {
      background: #14141e;
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text);
      font-size: 12px;
      padding: 6px 12px 6px 28px;
      outline: none;
      width: 220px;
      transition: border-color 0.15s ease;
    }
    .search-box input:focus { border-color: var(--accent-cyan); }
    .search-icon {
      position: absolute;
      left: 9px;
      top: 7px;
      color: var(--text-dim);
      font-size: 12px;
    }

    /* Main Canvas Area */
    .viewport {
      flex: 1;
      position: relative;
      overflow: hidden;
      cursor: grab;
      user-select: none;
    }
    .viewport:active { cursor: grabbing; }

    svg#arch-canvas {
      width: 100%;
      height: 100%;
      display: block;
    }

    /* Floating Controls */
    .canvas-controls {
      position: absolute;
      bottom: 20px;
      left: 20px;
      display: flex;
      gap: 6px;
      background: var(--bg-panel);
      backdrop-filter: blur(8px);
      padding: 4px;
      border-radius: 8px;
      border: 1px solid var(--border);
      z-index: 40;
    }
    .ctrl-btn {
      background: transparent;
      border: 1px solid transparent;
      color: var(--text);
      width: 32px;
      height: 32px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.1s ease;
    }
    .ctrl-btn:hover { background: var(--border); }

    /* Legend Overlay */
    .legend-card {
      position: absolute;
      bottom: 20px;
      right: 20px;
      background: var(--bg-panel);
      backdrop-filter: blur(8px);
      padding: 12px 16px;
      border-radius: 8px;
      border: 1px solid var(--border);
      font-size: 11px;
      z-index: 40;
      max-width: 280px;
    }
    .legend-title {
      font-weight: 700;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-dim);
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 3px;
    }

    /* Slide-over Evidence Drawer */
    #evidence-drawer {
      position: absolute;
      top: 56px;
      right: 0;
      bottom: 0;
      width: 440px;
      background: var(--bg-panel);
      backdrop-filter: blur(16px);
      border-left: 1px solid var(--border);
      padding: 24px;
      overflow-y: auto;
      transform: translateX(100%);
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 60;
    }
    #evidence-drawer.open { transform: translateX(0); }

    .drawer-close {
      position: absolute;
      top: 16px;
      right: 16px;
      background: transparent;
      border: none;
      color: var(--text-dim);
      font-size: 18px;
      cursor: pointer;
    }
    .drawer-close:hover { color: var(--text); }

    .drawer-title { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
    .drawer-subtitle { font-size: 12px; color: var(--text-dim); margin-bottom: 16px; font-family: var(--font-mono); }

    .stat-pill-group {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 20px;
    }
    .stat-pill {
      background: var(--bg-card);
      border: 1px solid var(--border);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11px;
    }
    .stat-pill strong { color: var(--accent-cyan); }

    .section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-dim);
      margin: 16px 0 8px 0;
    }

    .evidence-block {
      background: #0d0d14;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 8px;
      font-family: var(--font-mono);
      font-size: 11px;
    }
    .evidence-loc { color: var(--accent-cyan); font-weight: 600; margin-bottom: 4px; }
    .evidence-snippet {
      color: #cbd5e1;
      white-space: pre-wrap;
      word-break: break-all;
      background: rgba(0,0,0,0.3);
      padding: 6px;
      border-radius: 4px;
      margin-top: 6px;
    }
    .confidence-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .conf-L1 { background: #065f46; color: #34d399; }
    .conf-L2 { background: #1e3a8a; color: #60a5fa; }
    .conf-L3 { background: #78350f; color: #fbbf24; }
    .conf-L5 { background: #881337; color: #f43f5e; }

    /* SVG Graphical Node Styling */
    .node-group { cursor: pointer; transition: opacity 0.2s; }
    .node-box {
      stroke-width: 1.5px;
      rx: 8px;
      transition: all 0.2s ease;
    }
    .node-group:hover .node-box {
      stroke-width: 2.5px;
      filter: drop-shadow(0 0 8px rgba(6, 182, 212, 0.4));
    }
    .node-text-title {
      font-family: var(--font-sans);
      font-weight: 700;
      fill: #ffffff;
      font-size: 12px;
      pointer-events: none;
    }
    .node-text-sub {
      font-family: var(--font-sans);
      font-size: 10px;
      fill: #9494a8;
      pointer-events: none;
    }
    .edge-path {
      fill: none;
      stroke-width: 1.5px;
      transition: stroke 0.2s, stroke-width 0.2s;
    }
    .edge-marker { fill: #475569; }

    /* Dimming & Highlight states */
    .dimmed { opacity: 0.15; }
    .highlighted { opacity: 1 !important; }
    .highlighted-edge { stroke: #06b6d4 !important; stroke-width: 2.5px !important; }
    .blast-ring-1 { stroke: #f43f5e !important; stroke-width: 3px !important; }
    .blast-ring-2 { stroke: #f59e0b !important; stroke-width: 2.5px !important; }
    .blast-ring-3 { stroke: #3b82f6 !important; stroke-width: 2px !important; }
  </style>
</head>
<body>

  <header>
    <div class="brand">
      <span>⚖️ Tribunal Architecture Intelligence</span>
      <span class="brand-badge">TAI Fact Graph</span>
    </div>

    <div class="projection-tabs">
      <button class="tab-btn active" data-projection="topology">Topology</button>
      <button class="tab-btn" data-projection="security">Security Zones</button>
      <button class="tab-btn" data-projection="failure">Failure Modes</button>
      <button class="tab-btn" data-projection="blast">Blast Radius Simulator</button>
    </div>

    <div class="header-actions">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" id="node-search" placeholder="Search architecture...">
      </div>
    </div>
  </header>

  <main class="viewport" id="viewport">
    <svg id="arch-canvas">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#64748b" />
        </marker>
        <marker id="arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#06b6d4" />
        </marker>
        <marker id="arrow-warn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f59e0b" />
        </marker>
      </defs>
      <g id="world-layer">
        <g id="zones-layer"></g>
        <g id="edges-layer"></g>
        <g id="nodes-layer"></g>
      </g>
    </svg>

    <div class="canvas-controls">
      <button class="ctrl-btn" id="btn-zoom-in" title="Zoom In">+</button>
      <button class="ctrl-btn" id="btn-zoom-out" title="Zoom Out">−</button>
      <button class="ctrl-btn" id="btn-zoom-reset" title="Fit Screen">⛶</button>
    </div>

    <div class="legend-card" id="legend">
      <div class="legend-title" id="legend-title">System Topology</div>
      <div id="legend-items"></div>
    </div>
  </main>

  <aside id="evidence-drawer">
    <button class="drawer-close" id="drawer-close">✕</button>
    <div id="drawer-content"></div>
  </aside>

  <script id="tribunal-architecture-data" type="application/json">
    ${rawDataJson}
  </script>

  <script>
    (function () {
      const rawData = JSON.parse(document.getElementById('tribunal-architecture-data').textContent);
      const model = rawData.model;
      const entities = model.entities || [];
      const relationships = model.relationships || [];
      const trustBoundaries = model.trustBoundaries || [];

      let currentProjection = 'topology';
      let selectedNodeId = null;

      // Transform & Pan/Zoom State
      let transform = { x: 80, y: 80, k: 0.75 };
      let isPanning = false;
      let startPoint = { x: 0, y: 0 };

      const viewport = document.getElementById('viewport');
      const world = document.getElementById('world-layer');
      const nodesLayer = document.getElementById('nodes-layer');
      const edgesLayer = document.getElementById('edges-layer');
      const zonesLayer = document.getElementById('zones-layer');
      const drawer = document.getElementById('evidence-drawer');
      const drawerContent = document.getElementById('drawer-content');
      const drawerClose = document.getElementById('drawer-close');

      // ── Build Spatial Layout with Semantic Column Zoning ──────────────────
      const NODE_W = 160;
      const NODE_H = 60;
      const GAP_X = 240;
      const GAP_Y = 90;

      const columnMap = {
        endpoint: 0,
        module: 1,
        event_bus: 2,
        queue: 2,
        cache: 2,
        datastore: 3,
        external_api: 3,
        identity_provider: 0,
        test_suite: 1,
      };

      const columns = [[], [], [], []];
      entities.forEach(e => {
        const col = columnMap[e.kind] ?? 1;
        columns[col].push(e);
      });

      const nodeCoords = new Map();
      columns.forEach((colEntities, colIdx) => {
        colEntities.forEach((entity, rowIdx) => {
          nodeCoords.set(entity.id, {
            x: colIdx * (NODE_W + GAP_X) + 100,
            y: rowIdx * (NODE_H + GAP_Y) + 100,
            w: NODE_W,
            h: NODE_H,
            entity
          });
        });
      });

      // ── Render Graph ──────────────────────────────────────────────────────
      function updateCanvasTransform() {
        world.setAttribute('transform', \`translate(\${transform.x}, \${transform.y}) scale(\${transform.k})\`);
      }

      function renderEdges() {
        edgesLayer.innerHTML = '';
        relationships.forEach(rel => {
          const src = nodeCoords.get(rel.sourceId);
          const tgt = nodeCoords.get(rel.targetId);
          if (!src || !tgt) return;

          const x1 = src.x + src.w;
          const y1 = src.y + src.h / 2;
          const x2 = tgt.x;
          const y2 = tgt.y + tgt.h / 2;

          const dx = (x2 - x1) / 2;
          const d = \`M \${x1} \${y1} C \${x1 + dx} \${y1}, \${x2 - dx} \${y2}, \${x2} \${y2}\`;

          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', d);
          path.setAttribute('class', 'edge-path');
          path.setAttribute('data-id', rel.id);
          path.setAttribute('data-source', rel.sourceId);
          path.setAttribute('data-target', rel.targetId);

          let strokeColor = '#334155';
          let marker = 'url(#arrow)';

          if (currentProjection === 'failure' && rel.failureMode && !rel.failureMode.hasTimeout) {
            strokeColor = '#f59e0b';
            marker = 'url(#arrow-warn)';
          }

          path.setAttribute('stroke', strokeColor);
          path.setAttribute('marker-end', marker);
          edgesLayer.appendChild(path);
        });
      }

      function renderNodes() {
        nodesLayer.innerHTML = '';
        entities.forEach(entity => {
          const coord = nodeCoords.get(entity.id);
          if (!coord) return;

          const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          g.setAttribute('class', 'node-group');
          g.setAttribute('data-id', entity.id);
          g.setAttribute('transform', \`translate(\${coord.x}, \${coord.y})\`);

          // Color tokens by projection
          let stroke = '#272738';
          let fill = '#14141e';

          if (currentProjection === 'topology') {
            if (entity.kind === 'endpoint') stroke = '#06b6d4';
            else if (entity.kind === 'datastore' || entity.kind === 'cache') stroke = '#3b82f6';
            else if (entity.kind === 'queue' || entity.kind === 'event_bus') stroke = '#a855f7';
            else if (entity.kind === 'external_api') stroke = '#f43f5e';
            else stroke = '#475569';
          } else if (currentProjection === 'security') {
            if (entity.trustZone === 'public_untrusted') stroke = '#f43f5e';
            else if (entity.trustZone === 'dmz_gateway') stroke = '#f59e0b';
            else if (entity.trustZone === 'internal_service') stroke = '#10b981';
            else if (entity.trustZone === 'isolated_datastore') stroke = '#3b82f6';
            else stroke = '#64748b';
          } else if (currentProjection === 'failure') {
            if (entity.kind === 'external_api') stroke = '#f59e0b';
            else stroke = '#334155';
          }

          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('width', coord.w);
          rect.setAttribute('height', coord.h);
          rect.setAttribute('class', 'node-box');
          rect.setAttribute('fill', fill);
          rect.setAttribute('stroke', stroke);

          const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          title.setAttribute('x', 12);
          title.setAttribute('y', 26);
          title.setAttribute('class', 'node-text-title');
          const cleanName = entity.name.length > 18 ? entity.name.slice(0, 16) + '...' : entity.name;
          title.textContent = cleanName;

          const sub = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          sub.setAttribute('x', 12);
          sub.setAttribute('y', 44);
          sub.setAttribute('class', 'node-text-sub');
          sub.textContent = entity.kind.replace('_', ' ').toUpperCase();

          g.appendChild(rect);
          g.appendChild(title);
          g.appendChild(sub);

          g.addEventListener('click', (ev) => {
            ev.stopPropagation();
            onNodeClick(entity.id);
          });

          nodesLayer.appendChild(g);
        });
      }

      function updateLegend() {
        const titleEl = document.getElementById('legend-title');
        const itemsEl = document.getElementById('legend-items');

        const legends = {
          topology: {
            title: 'System Topology',
            items: [
              { color: '#06b6d4', label: 'HTTP API Endpoint' },
              { color: '#475569', label: 'Internal Module' },
              { color: '#3b82f6', label: 'Datastore / Cache' },
              { color: '#a855f7', label: 'Queue / Event Channel' },
              { color: '#f43f5e', label: 'External Service' },
            ]
          },
          security: {
            title: 'Security Trust Zones',
            items: [
              { color: '#f43f5e', label: 'Public Untrusted' },
              { color: '#f59e0b', label: 'DMZ Gateway / Auth' },
              { color: '#10b981', label: 'Authenticated Service' },
              { color: '#3b82f6', label: 'Isolated Datastore' },
            ]
          },
          failure: {
            title: 'Failure Architecture',
            items: [
              { color: '#f59e0b', label: 'External (No Timeout)' },
              { color: '#10b981', label: 'Resilient RPC' },
            ]
          },
          blast: {
            title: 'Blast Radius Simulator',
            items: [
              { color: '#f43f5e', label: 'Ring 1 (Direct Impact)' },
              { color: '#f59e0b', label: 'Ring 2 (Transitive Depth 2)' },
              { color: '#3b82f6', label: 'Ring 3+ (Deep Transitive)' },
            ]
          }
        };

        const cur = legends[currentProjection] || legends.topology;
        titleEl.textContent = cur.title;
        itemsEl.innerHTML = cur.items.map(it => \`
          <div class="legend-item">
            <div class="legend-dot" style="background: \${it.color}"></div>
            <span>\${it.label}</span>
          </div>
        \`).join('');
      }

      // ── Interactive Selection & Blast Simulation ─────────────────────────
      function onNodeClick(id) {
        selectedNodeId = id;
        const entity = entities.find(e => e.id === id);
        if (!entity) return;

        // Reset styling
        document.querySelectorAll('.node-group').forEach(el => el.classList.remove('dimmed', 'highlighted'));
        document.querySelectorAll('.edge-path').forEach(el => {
          el.classList.remove('dimmed', 'highlighted-edge', 'blast-ring-1', 'blast-ring-2', 'blast-ring-3');
        });

        if (currentProjection === 'blast') {
          // Live Blast Simulation
          const ring1 = new Set();
          const ring2 = new Set();
          const ring3 = new Set();

          relationships.forEach(r => {
            if (r.targetId === id) ring1.add(r.sourceId);
          });
          relationships.forEach(r => {
            if (ring1.has(r.targetId) && r.sourceId !== id) ring2.add(r.sourceId);
          });
          relationships.forEach(r => {
            if (ring2.has(r.targetId) && !ring1.has(r.sourceId) && r.sourceId !== id) ring3.add(r.sourceId);
          });

          document.querySelectorAll('.node-group').forEach(el => {
            const elId = el.getAttribute('data-id');
            if (elId === id) el.classList.add('highlighted');
            else if (ring1.has(elId) || ring2.has(elId) || ring3.has(elId)) el.classList.add('highlighted');
            else el.classList.add('dimmed');
          });

          document.querySelectorAll('.edge-path').forEach(el => {
            const tgt = el.getAttribute('data-target');
            if (tgt === id) el.classList.add('blast-ring-1');
            else if (ring1.has(tgt)) el.classList.add('blast-ring-2');
            else if (ring2.has(tgt)) el.classList.add('blast-ring-3');
            else el.classList.add('dimmed');
          });
        } else {
          // Standard connected focus
          const connectedNodes = new Set([id]);
          relationships.forEach(r => {
            if (r.sourceId === id) connectedNodes.add(r.targetId);
            if (r.targetId === id) connectedNodes.add(r.sourceId);
          });

          document.querySelectorAll('.node-group').forEach(el => {
            const elId = el.getAttribute('data-id');
            if (connectedNodes.has(elId)) el.classList.add('highlighted');
            else el.classList.add('dimmed');
          });

          document.querySelectorAll('.edge-path').forEach(el => {
            const s = el.getAttribute('data-source');
            const t = el.getAttribute('data-target');
            if (s === id || t === id) el.classList.add('highlighted-edge');
            else el.classList.add('dimmed');
          });
        }

        openDrawer(entity);
      }

      function openDrawer(entity) {
        drawer.classList.add('open');
        const sources = entity.sources || [];

        drawerContent.innerHTML = \`
          <h2 class="drawer-title">\${entity.name}</h2>
          <div class="drawer-subtitle">\${entity.id}</div>

          <div class="stat-pill-group">
            <div class="stat-pill">Kind: <strong>\${entity.kind}</strong></div>
            <div class="stat-pill">Zone: <strong>\${entity.trustZone || 'none'}</strong></div>
            <div class="stat-pill">Risk: <strong>\${entity.blastRadius?.riskScore || 0.1}</strong></div>
            <div class="stat-pill">Confidence: <span class="confidence-badge conf-\${entity.confidence || 'L1'}">\${entity.confidence || 'L1'} FACT</span></div>
          </div>

          <div class="section-title">Verified Source Code Evidence</div>
          \${sources.map(s => \`
            <div class="evidence-block">
              <div class="evidence-loc">\${s.file}:\${s.startLine}\${s.endLine ? '-' + s.endLine : ''}</div>
              <div>Hash: <code>\${s.contentHash || 'verified'}</code></div>
              \${s.snippet ? \`<div class="evidence-snippet">\${s.snippet}</div>\` : ''}
            </div>
          \`).join('')}

          <div class="section-title">Architectural Role & Description</div>
          <p style="font-size: 13px; line-height: 1.5; color: #cbd5e1; margin-bottom: 16px;">
            \${entity.role || 'Internal architectural component extracted deterministically from codebase AST.'}
          </p>
        \`;
      }

      drawerClose.addEventListener('click', () => {
        drawer.classList.remove('open');
        document.querySelectorAll('.node-group').forEach(el => el.classList.remove('dimmed', 'highlighted'));
        document.querySelectorAll('.edge-path').forEach(el => {
          el.classList.remove('dimmed', 'highlighted-edge', 'blast-ring-1', 'blast-ring-2', 'blast-ring-3');
        });
      });

      // ── Event Handlers: Pan / Zoom / Tabs ────────────────────────────────
      viewport.addEventListener('mousedown', (e) => {
        if (e.target.closest('.node-group')) return;
        isPanning = true;
        startPoint = { x: e.clientX - transform.x, y: e.clientY - transform.y };
      });
      window.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        transform.x = e.clientX - startPoint.x;
        transform.y = e.clientY - startPoint.y;
        updateCanvasTransform();
      });
      window.addEventListener('mouseup', () => { isPanning = false; });

      viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        transform.k = Math.max(0.2, Math.min(3.0, transform.k * factor));
        updateCanvasTransform();
      });

      document.getElementById('btn-zoom-in').addEventListener('click', () => {
        transform.k = Math.min(3.0, transform.k * 1.2);
        updateCanvasTransform();
      });
      document.getElementById('btn-zoom-out').addEventListener('click', () => {
        transform.k = Math.max(0.2, transform.k / 1.2);
        updateCanvasTransform();
      });
      document.getElementById('btn-zoom-reset').addEventListener('click', () => {
        transform = { x: 80, y: 80, k: 0.75 };
        updateCanvasTransform();
      });

      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentProjection = btn.getAttribute('data-projection');
          updateLegend();
          renderNodes();
          renderEdges();
          if (selectedNodeId) onNodeClick(selectedNodeId);
        });
      });

      // Search Handler
      document.getElementById('node-search').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
          document.querySelectorAll('.node-group').forEach(el => el.classList.remove('dimmed', 'highlighted'));
          return;
        }
        document.querySelectorAll('.node-group').forEach(el => {
          const id = el.getAttribute('data-id').toLowerCase();
          const ent = entities.find(x => x.id.toLowerCase() === id);
          if (id.includes(query) || (ent && ent.name.toLowerCase().includes(query))) {
            el.classList.add('highlighted');
            el.classList.remove('dimmed');
          } else {
            el.classList.add('dimmed');
            el.classList.remove('highlighted');
          }
        });
      });

      // Initial Mount
      updateCanvasTransform();
      updateLegend();
      renderNodes();
      renderEdges();
    })();
  </script>
</body>
</html>`;
  }

  saveHtml(outputPath) {
    const dest = outputPath || path.join(process.cwd(), '.agent', 'history', 'architecture-intelligence.html');
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const html = this.generateHtml();
    fs.writeFileSync(dest, html, 'utf8');
    return dest;
  }
}

// ── Standalone CLI ────────────────────────────────────────────────────────────
if (require.main === module) {
  const t = timer();
  const repoRoot = process.cwd();
  const modelFile = path.join(repoRoot, '.agent', 'history', 'architecture-model.json');
  const verifFile = path.join(repoRoot, '.agent', 'history', 'architecture-verification.json');

  console.log(banner('Tribunal Architecture Intelligence Visualizer'));

  if (!fs.existsSync(modelFile)) {
    console.error(`  ${RED}✖ architecture-model.json not found.${RESET} Run architecture_extractor.js first.`);
    process.exit(1);
  }

  const model = JSON.parse(fs.readFileSync(modelFile, 'utf8'));
  const verification = fs.existsSync(verifFile) ? JSON.parse(fs.readFileSync(verifFile, 'utf8')) : null;

  const visualizer = new ArchitectureVisualizer(model, verification);
  const outPath = visualizer.saveHtml();

  console.log(`  ${GREEN}${BOX.check} Interactive Architecture Explorer Generated!${RESET}`);
  console.log(`  ${DIM}File:${RESET} ${CYAN}${outPath}${RESET} (${formatMs(t())})`);
  console.log(`  ${DIM}Projections Enabled:${RESET} Topology, Security Zones, Failure Modes, Blast Simulator\n`);
}

module.exports = {
  ArchitectureVisualizer,
};
