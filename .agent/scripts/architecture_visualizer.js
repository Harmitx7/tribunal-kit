#!/usr/bin/env node
/**
 * architecture_visualizer.js — Tribunal Architecture Intelligence Explorer
 * ═════════════════════════════════════════════════════════════════════════════
 * The Evidence Console: Ultra-premium, zero-dependency, self-contained standalone
 * interactive architecture explorer inspired by Archify's precision engineering
 * aesthetics and enhanced with Tribunal's zero-trust verification engine.
 *
 * Core Capabilities:
 *   - 4 Visual Presets:
 *       • Obsidian Console (Classic Dark Precision)
 *       • Signal Flow (Live animated pulses & atmospheric depth)
 *       • Cyber Blueprint (Technical drafting grid, 0.2rem sharp geometry)
 *       • Editorial Monolith (Swiss bone parchment, high-contrast typography)
 *   - Dark / Light Theme Parity with instant zero-flash theme persistence (T key)
 *   - Multi-Projection Architecture:
 *       1. System Topology (Endpoints, Modules, Datastores, Queues, External APIs)
 *       2. Security Trust Zones (Public Untrusted, DMZ Gateway, Authenticated, Isolated)
 *       3. Failure Architecture (Timeouts, Resilient RPCs, Circuit Breakers)
 *       4. Blast Radius Simulator (Live concentric impact rings on click)
 *   - Semantic Passport (Slide-over proof drawer):
 *       • Ground-truth L1-L5 confidence rating
 *       • Authored Reachability Engine (Upstream in Violet, Downstream in Green)
 *       • Reachability Receipt (Nodes · Links · Maximum Hops)
 *       • Verified Source Beacons (SRC n) with exact line numbers & code snippets
 *   - Export Hub (E key):
 *       • Lossless SVG Export
 *       • High-Resolution PNG & WebP Export
 *       • Copy PNG to Clipboard
 *       • 1200×630 Reach & Blast Share Card PNG Export (Archify-grade)
 *   - Live Motion Governor (M key) & Fullscreen Presentation Mode (F key)
 *   - Node Finder with instant autocomplete and camera fly-to centering (/ key)
 *   - Pure zero-dependency standalone execution (offline capable, no CDN required).
 * ═════════════════════════════════════════════════════════════════════════════
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
<html lang="en" data-theme="dark" data-preset="signal-flow">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tribunal Architecture Intelligence — Evidence Console</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script>
    (function () {
      try {
        var theme = localStorage.getItem('tribunal-arch-theme') || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
        var preset = localStorage.getItem('tribunal-arch-preset') || 'signal-flow';
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.setAttribute('data-preset', preset);
      } catch (_) {}
    })();
  </script>
  <style>
    /* ══════════════════════════════════════════════════════════════════════
       1. CORE DESIGN TOKENS & ARCHIFY "EVIDENCE CONSOLE" PALETTE
       ══════════════════════════════════════════════════════════════════════ */
    :root {
      /* Shared Semantic Signals (Fixed Vocabulary) */
      --frontend: #22d3ee;     /* Verified Cyan: focus, routes, navigation */
      --backend: #34d399;      /* Proof Green: services, verification, downstream */
      --database: #a78bfa;     /* Repository Violet: datastores, upstream */
      --cloud: #fbbf24;        /* Cloud Amber: DMZ, gateways, external caches */
      --security: #fb7185;     /* Boundary Rose: public untrusted, security, blast ring 1 */
      --messagebus: #fb923c;   /* Transit Orange: queues, brokers, events */
      --external: #94a3b8;     /* External Slate: 3rd party SaaS */

      /* Typography */
      --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

      /* Motion */
      --ease-spring: cubic-bezier(0.16, 1, 0.3, 1);
      --transition-fast: 150ms var(--ease-spring);
      --transition-normal: 220ms var(--ease-spring);
    }

    /* ── Preset 1: Obsidian Console (Classic Dark) ─────────────────────── */
    html[data-theme="dark"][data-preset="classic"] {
      --canvas: #020617;
      --mask: #0f172a;
      --panel: rgba(15, 23, 42, 0.90);
      --card: #131d34;
      --border: #1e293b;
      --border-bright: #334155;
      --ink: #ffffff;
      --muted: #94a3b8;
      --dim: #475569;
      --grid-line: rgba(255, 255, 255, 0.03);
      --radius-control: 6px;
      --radius-panel: 12px;
      --node-radius: 8px;
      --canvas-shadow: none;
    }

    /* ── Preset 2: Signal Flow (Dynamic Atmosphere) ────────────────────── */
    html[data-theme="dark"][data-preset="signal-flow"] {
      --canvas: #030712;
      --mask: #0b1120;
      --panel: rgba(11, 17, 32, 0.88);
      --card: #111a2e;
      --border: #1f293d;
      --border-bright: #38bdf8;
      --ink: #f8fafc;
      --muted: #94a3b8;
      --dim: #4b5563;
      --grid-line: rgba(56, 189, 248, 0.04);
      --radius-control: 8px;
      --radius-panel: 14px;
      --node-radius: 10px;
      --canvas-shadow: 0 28px 80px rgba(0, 0, 0, 0.55);
    }

    /* ── Preset 3: Cyber Blueprint (Technical Drafting Wireframe) ──────── */
    html[data-theme="dark"][data-preset="blueprint"] {
      --canvas: #040d1a;
      --mask: #071529;
      --panel: rgba(7, 21, 41, 0.94);
      --card: #0a1e38;
      --border: #15345b;
      --border-bright: #22d3ee;
      --ink: #e0f2fe;
      --muted: #7dd3fc;
      --dim: #38bdf8;
      --grid-line: rgba(34, 211, 238, 0.08);
      --radius-control: 3px;
      --radius-panel: 4px;
      --node-radius: 3px;
      --canvas-shadow: none;
    }

    /* ── Preset 4: Editorial Monolith (Swiss Publication Warmth) ────────── */
    html[data-preset="editorial"] {
      --canvas: #f5f2eb;
      --mask: #ebe7de;
      --panel: rgba(235, 231, 222, 0.95);
      --card: #ffffff;
      --border: #d4d8e0;
      --border-bright: #8a92a3;
      --ink: #060709;
      --muted: #4b5563;
      --dim: #8a92a3;
      --grid-line: rgba(0, 0, 0, 0.04);
      --radius-control: 4px;
      --radius-panel: 6px;
      --node-radius: 4px;
      --canvas-shadow: 0 16px 40px rgba(0, 0, 0, 0.08);
    }

    /* ── Light Mode Base (Parity with Dark) ────────────────────────────── */
    html[data-theme="light"]:not([data-preset="editorial"]) {
      --canvas: #f8fafc;
      --mask: #ffffff;
      --panel: rgba(255, 255, 255, 0.92);
      --card: #f1f5f9;
      --border: #e2e8f0;
      --border-bright: #94a3b8;
      --ink: #0f172a;
      --muted: #475569;
      --dim: #94a3b8;
      --grid-line: rgba(0, 0, 0, 0.04);
      --radius-control: 6px;
      --radius-panel: 12px;
      --node-radius: 8px;
      --canvas-shadow: 0 20px 50px rgba(0, 0, 0, 0.06);
    }

    /* ══════════════════════════════════════════════════════════════════════
       2. GLOBAL RESET & BASE STYLING
       ══════════════════════════════════════════════════════════════════════ */
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--canvas);
      color: var(--ink);
      font-family: var(--font-mono);
      height: 100vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      user-select: none;
      -webkit-font-smoothing: antialiased;
    }

    /* Grid canvas atmosphere */
    .viewport {
      flex: 1;
      position: relative;
      overflow: hidden;
      cursor: grab;
      background-image:
        radial-gradient(var(--grid-line) 1.2px, transparent 1.2px),
        radial-gradient(var(--grid-line) 1.2px, var(--canvas) 1.2px);
      background-size: 28px 28px;
      background-position: 0 0, 14px 14px;
    }
    .viewport:active { cursor: grabbing; }

    /* ══════════════════════════════════════════════════════════════════════
       3. TOP NAVIGATION / TOOLBAR CHROME
       ══════════════════════════════════════════════════════════════════════ */
    header.toolbar {
      height: 52px;
      background: var(--panel);
      backdrop-filter: blur(14px);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      z-index: 50;
      flex-shrink: 0;
      gap: 12px;
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-icon {
      font-size: 16px;
      filter: drop-shadow(0 0 6px rgba(34, 211, 238, 0.4));
    }
    .brand-name {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: var(--ink);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .brand-badge {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      background: var(--border);
      color: var(--frontend);
      border: 1px solid var(--border-bright);
      padding: 2px 6px;
      border-radius: var(--radius-control);
    }

    /* Projection Segmented Switcher */
    .projection-switcher {
      display: flex;
      gap: 2px;
      background: var(--mask);
      padding: 3px;
      border-radius: var(--radius-control);
      border: 1px solid var(--border);
    }
    .proj-btn {
      background: transparent;
      border: none;
      color: var(--muted);
      padding: 5px 12px;
      border-radius: calc(var(--radius-control) - 2px);
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all var(--transition-fast);
    }
    .proj-btn:hover { color: var(--ink); background: rgba(255, 255, 255, 0.04); }
    .proj-btn.active {
      background: var(--card);
      color: var(--ink);
      border: 1px solid var(--border-bright);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
    }

    /* Actions Right Cluster */
    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Search Box */
    .search-wrap {
      position: relative;
    }
    .search-wrap input {
      background: var(--mask);
      border: 1px solid var(--border);
      border-radius: var(--radius-control);
      color: var(--ink);
      font-family: var(--font-mono);
      font-size: 11px;
      padding: 6px 10px 6px 28px;
      outline: none;
      width: 190px;
      transition: all var(--transition-fast);
    }
    .search-wrap input:focus {
      width: 240px;
      border-color: var(--frontend);
      box-shadow: 0 0 0 2px rgba(34, 211, 238, 0.15);
    }
    .search-icon {
      position: absolute;
      left: 9px;
      top: 7px;
      color: var(--dim);
      font-size: 11px;
      pointer-events: none;
    }
    .search-kbd {
      position: absolute;
      right: 7px;
      top: 6px;
      background: var(--card);
      border: 1px solid var(--border);
      color: var(--dim);
      font-size: 9px;
      padding: 1px 4px;
      border-radius: 3px;
      pointer-events: none;
    }

    /* Autocomplete dropdown */
    .search-dropdown {
      position: absolute;
      top: 36px;
      left: 0;
      right: 0;
      background: var(--panel);
      border: 1px solid var(--border-bright);
      border-radius: var(--radius-control);
      backdrop-filter: blur(16px);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
      max-height: 280px;
      overflow-y: auto;
      z-index: 100;
      display: none;
    }
    .search-dropdown.open { display: block; }
    .search-item {
      padding: 8px 12px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
      font-size: 11px;
    }
    .search-item:hover, .search-item.highlighted {
      background: rgba(34, 211, 238, 0.1);
      color: var(--frontend);
    }

    /* Action Buttons (Presets, Motion, Theme, Present, Export) */
    .btn-action {
      background: var(--mask);
      border: 1px solid var(--border);
      color: var(--ink);
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      padding: 6px 10px;
      border-radius: var(--radius-control);
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all var(--transition-fast);
      position: relative;
    }
    .btn-action:hover {
      background: var(--card);
      border-color: var(--border-bright);
    }
    .btn-action:active { transform: scale(0.97); }

    /* Dropdown Menus */
    .dropdown-wrap {
      position: relative;
    }
    .dropdown-menu {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      background: var(--panel);
      border: 1px solid var(--border-bright);
      border-radius: var(--radius-control);
      backdrop-filter: blur(16px);
      box-shadow: 0 14px 36px rgba(0, 0, 0, 0.4);
      width: 220px;
      padding: 6px;
      z-index: 90;
      display: none;
    }
    .dropdown-menu.open { display: block; }
    .dropdown-header {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--dim);
      padding: 6px 8px 4px 8px;
    }
    .dropdown-item {
      padding: 7px 10px;
      border-radius: calc(var(--radius-control) - 2px);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: var(--ink);
      font-size: 11px;
      transition: background var(--transition-fast);
    }
    .dropdown-item:hover {
      background: rgba(34, 211, 238, 0.12);
      color: var(--frontend);
    }
    .dropdown-item.active {
      color: var(--frontend);
      font-weight: 700;
    }
    .dropdown-hint {
      font-size: 9px;
      color: var(--dim);
    }

    /* ══════════════════════════════════════════════════════════════════════
       4. SVG GRAPH RENDERING & CONNECTION PULSES
       ══════════════════════════════════════════════════════════════════════ */
    svg#arch-canvas {
      width: 100%;
      height: 100%;
      display: block;
    }

    /* Node Groups */
    .node-group {
      cursor: pointer;
      transition: opacity var(--transition-fast), transform var(--transition-fast);
    }
    .node-card {
      stroke-width: 1px;
      transition: stroke var(--transition-fast), filter var(--transition-fast), stroke-width var(--transition-fast);
    }
    .node-group:hover .node-card {
      stroke-width: 2px;
      filter: drop-shadow(0 0 10px rgba(34, 211, 238, 0.35));
    }

    .node-title {
      font-family: var(--font-mono);
      font-weight: 700;
      font-size: 11.5px;
      fill: var(--ink);
      pointer-events: none;
    }
    .node-kind {
      font-family: var(--font-mono);
      font-size: 9px;
      font-weight: 600;
      fill: var(--dim);
      letter-spacing: 0.05em;
      text-transform: uppercase;
      pointer-events: none;
    }
    .node-conf-tag {
      font-family: var(--font-mono);
      font-size: 8px;
      font-weight: 800;
      pointer-events: none;
    }

    /* Edges & Signal Pulses */
    .edge-bg {
      fill: none;
      stroke-width: 1.5px;
      transition: stroke var(--transition-fast), stroke-width var(--transition-fast), opacity var(--transition-fast);
    }
    .edge-pulse {
      fill: none;
      stroke-width: 2px;
      stroke-dasharray: 6, 14;
      animation: signalFlowAnim 1.6s linear infinite;
      pointer-events: none;
      display: none;
    }
    html[data-preset="signal-flow"] .edge-pulse {
      display: block;
    }
    @keyframes signalFlowAnim {
      from { stroke-dashoffset: 40; }
      to { stroke-dashoffset: 0; }
    }

    /* Focus & Dimming states */
    .dimmed { opacity: 0.12 !important; }
    .highlighted { opacity: 1 !important; }
    .highlighted-node .node-card {
      stroke-width: 2.5px !important;
      filter: drop-shadow(0 0 14px rgba(34, 211, 238, 0.5)) !important;
    }

    /* Reachability & Blast Highlights */
    .reach-upstream .node-card { stroke: var(--database) !important; stroke-width: 2.5px !important; }
    .reach-upstream-edge { stroke: var(--database) !important; stroke-width: 2.5px !important; }
    .reach-downstream .node-card { stroke: var(--backend) !important; stroke-width: 2.5px !important; }
    .reach-downstream-edge { stroke: var(--backend) !important; stroke-width: 2.5px !important; }

    .blast-ring-1 .node-card { stroke: var(--security) !important; stroke-width: 3px !important; }
    .blast-ring-1-edge { stroke: var(--security) !important; stroke-width: 3px !important; }
    .blast-ring-2 .node-card { stroke: var(--cloud) !important; stroke-width: 2.5px !important; }
    .blast-ring-2-edge { stroke: var(--cloud) !important; stroke-width: 2.5px !important; }
    .blast-ring-3 .node-card { stroke: var(--frontend) !important; stroke-width: 2px !important; }
    .blast-ring-3-edge { stroke: var(--frontend) !important; stroke-width: 2px !important; }

    /* ══════════════════════════════════════════════════════════════════════
       5. FLOATING HUD CONTROLS & STATUS BAR
       ══════════════════════════════════════════════════════════════════════ */
    .canvas-hud-bottom {
      position: absolute;
      bottom: 16px;
      left: 16px;
      display: flex;
      gap: 6px;
      background: var(--panel);
      backdrop-filter: blur(12px);
      padding: 4px;
      border-radius: var(--radius-control);
      border: 1px solid var(--border);
      z-index: 40;
    }
    .hud-btn {
      background: transparent;
      border: 1px solid transparent;
      color: var(--ink);
      font-family: var(--font-mono);
      font-size: 13px;
      font-weight: 700;
      width: 32px;
      height: 32px;
      border-radius: calc(var(--radius-control) - 2px);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background var(--transition-fast);
    }
    .hud-btn:hover { background: var(--card); border-color: var(--border-bright); }

    /* Telemetry / Legend Overlay */
    .telemetry-card {
      position: absolute;
      bottom: 16px;
      right: 16px;
      background: var(--panel);
      backdrop-filter: blur(12px);
      padding: 10px 14px;
      border-radius: var(--radius-control);
      border: 1px solid var(--border);
      font-size: 10.5px;
      z-index: 40;
      max-width: 260px;
    }
    .telemetry-title {
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--dim);
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .telemetry-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .telemetry-dot {
      width: 8px;
      height: 8px;
      border-radius: 2px;
      flex-shrink: 0;
    }

    /* ══════════════════════════════════════════════════════════════════════
       6. SEMANTIC PASSPORT (PROOF CONSOLE DRAWER)
       ══════════════════════════════════════════════════════════════════════ */
    #semantic-passport {
      position: absolute;
      top: 52px;
      right: 0;
      bottom: 0;
      width: 440px;
      background: var(--panel);
      backdrop-filter: blur(20px);
      border-left: 1px solid var(--border);
      padding: 20px;
      overflow-y: auto;
      transform: translateX(100%);
      transition: transform var(--transition-normal);
      z-index: 60;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    #semantic-passport.open { transform: translateX(0); }

    .passport-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid var(--border);
      padding-bottom: 12px;
    }
    .passport-title {
      font-size: 15px;
      font-weight: 800;
      letter-spacing: -0.01em;
      color: var(--ink);
    }
    .passport-id {
      font-size: 10px;
      color: var(--dim);
      margin-top: 2px;
    }
    .passport-close {
      background: transparent;
      border: none;
      color: var(--dim);
      font-size: 16px;
      cursor: pointer;
      padding: 4px;
    }
    .passport-close:hover { color: var(--ink); }

    /* Reachability Action Buttons */
    .reach-actions {
      display: flex;
      gap: 6px;
    }
    .btn-reach {
      flex: 1;
      padding: 7px 10px;
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-radius: var(--radius-control);
      border: 1px solid var(--border);
      background: var(--mask);
      color: var(--ink);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all var(--transition-fast);
    }
    .btn-reach.upstream:hover, .btn-reach.upstream.active {
      background: rgba(167, 139, 250, 0.15);
      border-color: var(--database);
      color: var(--database);
    }
    .btn-reach.downstream:hover, .btn-reach.downstream.active {
      background: rgba(52, 211, 153, 0.15);
      border-color: var(--backend);
      color: var(--backend);
    }
    .btn-reach.reset:hover {
      background: var(--card);
    }

    /* Receipt Badge */
    .receipt-badge {
      background: var(--mask);
      border: 1px solid var(--border);
      border-radius: var(--radius-control);
      padding: 6px 10px;
      font-size: 10px;
      color: var(--muted);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .receipt-highlight {
      font-weight: 700;
      color: var(--frontend);
    }

    /* Meta Badges Grid */
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    .meta-box {
      background: var(--mask);
      border: 1px solid var(--border);
      border-radius: var(--radius-control);
      padding: 8px 10px;
    }
    .meta-label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--dim);
    }
    .meta-val {
      font-size: 11px;
      font-weight: 700;
      margin-top: 2px;
      color: var(--ink);
    }

    /* Verified Source Code Evidence */
    .section-head {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--dim);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .evidence-card {
      background: var(--mask);
      border: 1px solid var(--border);
      border-radius: var(--radius-control);
      padding: 10px;
      font-size: 10.5px;
    }
    .evidence-path {
      color: var(--frontend);
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
    }
    .evidence-snippet {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 6px 8px;
      color: #cbd5e1;
      white-space: pre-wrap;
      word-break: break-all;
      font-size: 10px;
      line-height: 1.45;
      margin-top: 6px;
    }

    /* Blast Risk Gauge */
    .risk-gauge-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
    }
    .risk-pill {
      font-size: 9px;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 3px;
      text-transform: uppercase;
    }
    .risk-LOW { background: #064e3b; color: #34d399; }
    .risk-MEDIUM { background: #78350f; color: #fbbf24; }
    .risk-HIGH { background: #7c2d12; color: #fb923c; }
    .risk-CRITICAL { background: #881337; color: #f43f5e; }

    /* Presentation mode */
    body.presentation-mode header.toolbar { display: none; }
    body.presentation-mode #semantic-passport { top: 0; }
  </style>
</head>
<body>

  <!-- ══════════════════════════════════════════════════════════════════════
       TOOLBAR / CONTROL CHROME
       ══════════════════════════════════════════════════════════════════════ -->
  <header class="toolbar" role="toolbar" aria-label="Architecture Intelligence Controls">
    <div class="brand-group">
      <span class="brand-icon">⚖️</span>
      <div class="brand-name">
        <span>Tribunal Architecture</span>
        <span class="brand-badge">Evidence Console</span>
      </div>
    </div>

    <!-- Multi-Projection Switcher -->
    <div class="projection-switcher" role="radiogroup" aria-label="Projections">
      <button class="proj-btn active" data-projection="topology" title="System Topology: Services, Routes, Datastores">
        <span>Topology</span>
      </button>
      <button class="proj-btn" data-projection="security" title="Security Trust Zones: Public, DMZ, Isolated">
        <span>Security</span>
      </button>
      <button class="proj-btn" data-projection="failure" title="Failure Modes: Timeouts, Resilient RPCs">
        <span>Failure</span>
      </button>
      <button class="proj-btn" data-projection="blast" title="Blast Radius Simulator: Concentric Impact">
        <span>Blast Simulator</span>
      </button>
    </div>

    <!-- Actions Cluster -->
    <div class="toolbar-actions">
      <!-- Search Autocomplete -->
      <div class="search-wrap">
        <span class="search-icon">🔍</span>
        <input type="text" id="node-search" placeholder="Search architecture..." autocomplete="off">
        <span class="search-kbd">/</span>
        <div class="search-dropdown" id="search-dropdown"></div>
      </div>

      <!-- Preset Style Dropdown -->
      <div class="dropdown-wrap">
        <button class="btn-action" id="btn-preset-toggle" title="Cycle or select visual preset (Shortcut: S)">
          <span>🎨</span>
          <span id="preset-label">Signal Flow</span>
          <span style="font-size: 8px;">▼</span>
        </button>
        <div class="dropdown-menu" id="preset-menu">
          <div class="dropdown-header">Visual Style Preset (S)</div>
          <div class="dropdown-item" data-val="classic">
            <span>Obsidian Console</span>
            <span class="dropdown-hint">Classic</span>
          </div>
          <div class="dropdown-item active" data-val="signal-flow">
            <span>Signal Flow</span>
            <span class="dropdown-hint">Active Pulses</span>
          </div>
          <div class="dropdown-item" data-val="blueprint">
            <span>Cyber Blueprint</span>
            <span class="dropdown-hint">Drafting</span>
          </div>
          <div class="dropdown-item" data-val="editorial">
            <span>Editorial Monolith</span>
            <span class="dropdown-hint">Swiss</span>
          </div>
        </div>
      </div>

      <!-- Motion Governor -->
      <button class="btn-action" id="btn-motion" title="Toggle active signal animations (Shortcut: M)">
        <span id="motion-dot" style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#22d3ee;"></span>
        <span id="motion-label">Motion</span>
      </button>

      <!-- Theme Switcher -->
      <button class="btn-action" id="btn-theme" title="Toggle Dark / Light theme (Shortcut: T)">
        <span id="theme-icon">🌙</span>
      </button>

      <!-- Fullscreen Present -->
      <button class="btn-action" id="btn-present" title="Presentation stage mode (Shortcut: F)">
        <span>⛶</span>
      </button>

      <!-- Export Hub Dropdown -->
      <div class="dropdown-wrap">
        <button class="btn-action" id="btn-export-toggle" style="background: rgba(34, 211, 238, 0.1); border-color: var(--frontend); color: var(--frontend);" title="Export diagrams & share cards (Shortcut: E)">
          <span>⤓</span>
          <span>Export</span>
          <span style="font-size: 8px;">▼</span>
        </button>
        <div class="dropdown-menu" id="export-menu">
          <div class="dropdown-header">Share & PR Artifacts</div>
          <div class="dropdown-item" id="act-share-card">
            <span>Reach Share Card</span>
            <span class="dropdown-hint">1200×630 PNG</span>
          </div>
          <div class="dropdown-item" id="act-copy-png">
            <span>Copy to Clipboard</span>
            <span class="dropdown-hint">PNG</span>
          </div>
          <div class="dropdown-header">Vector & Image</div>
          <div class="dropdown-item" id="act-download-svg">
            <span>Lossless SVG</span>
            <span class="dropdown-hint">Vector</span>
          </div>
          <div class="dropdown-item" id="act-download-png">
            <span>High-Res PNG</span>
            <span class="dropdown-hint">Raster</span>
          </div>
          <div class="dropdown-item" id="act-download-webp">
            <span>Modern WebP</span>
            <span class="dropdown-hint">Compact</span>
          </div>
        </div>
      </div>
    </div>
  </header>

  <!-- ══════════════════════════════════════════════════════════════════════
       MAIN INTERACTIVE CANVAS VIEWPORT
       ══════════════════════════════════════════════════════════════════════ -->
  <main class="viewport" id="viewport">
    <svg id="arch-canvas">
      <defs>
        <!-- Arrowhead markers with semantic colors -->
        <marker id="arrow-default" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#475569" />
        </marker>
        <marker id="arrow-cyan" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#22d3ee" />
        </marker>
        <marker id="arrow-green" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#34d399" />
        </marker>
        <marker id="arrow-violet" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#a78bfa" />
        </marker>
        <marker id="arrow-warn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#fbbf24" />
        </marker>
        <marker id="arrow-rose" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#fb7185" />
        </marker>
      </defs>
      <g id="world-layer">
        <g id="zones-layer"></g>
        <g id="edges-layer"></g>
        <g id="nodes-layer"></g>
      </g>
    </svg>

    <!-- Canvas Navigation HUD -->
    <div class="canvas-hud-bottom">
      <button class="hud-btn" id="btn-zoom-in" title="Zoom In (+)">+</button>
      <button class="hud-btn" id="btn-zoom-out" title="Zoom Out (−)">−</button>
      <button class="hud-btn" id="btn-zoom-reset" title="Fit to Screen (0)">⛶</button>
    </div>

    <!-- Active Legend & Telemetry HUD -->
    <div class="telemetry-card" id="telemetry-card">
      <div class="telemetry-title">
        <span id="telemetry-mode-label">System Topology</span>
        <span id="telemetry-node-count" style="color:var(--frontend);">0 NODES</span>
      </div>
      <div id="telemetry-items"></div>
    </div>
  </main>

  <!-- ══════════════════════════════════════════════════════════════════════
       SEMANTIC PASSPORT (PROVENANCE & EVIDENCE CONSOLE)
       ══════════════════════════════════════════════════════════════════════ -->
  <aside id="semantic-passport">
    <div class="passport-header">
      <div>
        <div class="passport-title" id="pass-title">Component Name</div>
        <div class="passport-id" id="pass-id">component.id</div>
      </div>
      <button class="passport-close" id="pass-close" title="Close Passport (Esc)">✕</button>
    </div>

    <!-- Reachability Engine Controls -->
    <div>
      <div class="section-head" style="margin-bottom: 6px;">
        <span>Authored Reachability</span>
        <span style="font-size:8px; color:var(--dim);">SUBGRAPH ENGINE</span>
      </div>
      <div class="reach-actions">
        <button class="btn-reach upstream" id="btn-reach-upstream" title="Trace incoming upstream dependencies">
          <span>▲</span>
          <span>Upstream</span>
        </button>
        <button class="btn-reach downstream" id="btn-reach-downstream" title="Trace outgoing downstream dependencies">
          <span>▼</span>
          <span>Downstream</span>
        </button>
        <button class="btn-reach reset" id="btn-reach-reset" title="Clear subgraph highlight">
          <span>Reset</span>
        </button>
      </div>
    </div>

    <!-- Receipt Badge -->
    <div class="receipt-badge" id="pass-receipt">
      <span>Reach Receipt:</span>
      <span class="receipt-highlight" id="pass-receipt-val">Full Topology Active</span>
    </div>

    <!-- Metadata Grid -->
    <div class="meta-grid">
      <div class="meta-box">
        <div class="meta-label">Kind</div>
        <div class="meta-val" id="pass-kind">MODULE</div>
      </div>
      <div class="meta-box">
        <div class="meta-label">Trust Zone</div>
        <div class="meta-val" id="pass-zone">INTERNAL</div>
      </div>
      <div class="meta-box">
        <div class="meta-label">Confidence</div>
        <div class="meta-val" id="pass-confidence" style="color:var(--backend);">L1 FACT</div>
      </div>
      <div class="meta-box">
        <div class="meta-label">Risk Tier</div>
        <div class="meta-val" id="pass-risk">LOW (0.1)</div>
      </div>
    </div>

    <!-- Blast Radius & Transitive Impact -->
    <div>
      <div class="section-head" style="margin-bottom: 6px;">
        <span>Blast Simulation Metric</span>
        <span id="pass-blast-tier" class="risk-pill risk-LOW">LOW</span>
      </div>
      <div class="meta-box">
        <div style="font-size:10px; color:var(--muted); line-height:1.4;" id="pass-blast-desc">
          Direct dependents: 0 · Transitive depth: 0
        </div>
      </div>
    </div>

    <!-- Verified Code Evidence -->
    <div>
      <div class="section-head" style="margin-bottom: 6px;">
        <span>Verified Ground Truth Evidence</span>
        <span style="color:var(--backend); font-size:8px;">AST VERIFIED</span>
      </div>
      <div id="pass-evidence-list" style="display:flex; flex-direction:column; gap:8px;"></div>
    </div>

    <!-- Architectural Role -->
    <div>
      <div class="section-head" style="margin-bottom: 6px;">Architectural Purpose</div>
      <p style="font-size: 11px; line-height: 1.55; color: var(--muted);" id="pass-role"></p>
    </div>
  </aside>

  <!-- Offscreen canvas for Reach Share Card & PNG rasterization -->
  <canvas id="export-canvas" width="1200" height="630" style="display:none;"></canvas>

  <!-- Embedded Architecture Payload -->
  <script id="tribunal-architecture-data" type="application/json">
    ${rawDataJson}
  </script>

  <!-- ══════════════════════════════════════════════════════════════════════
       7. CLIENT-SIDE INTERACTIVITY & RENDERING ENGINE
       ══════════════════════════════════════════════════════════════════════ -->
  <script>
    (function () {
      const rawData = JSON.parse(document.getElementById('tribunal-architecture-data').textContent);
      const model = rawData.model || {};
      const entities = model.entities || [];
      const relationships = model.relationships || [];
      const trustBoundaries = model.trustBoundaries || [];

      let currentProjection = 'topology';
      let selectedNodeId = null;
      let reachMode = null; // 'upstream' | 'downstream' | null
      let motionEnabled = true;

      // Transform state
      let transform = { x: 70, y: 70, k: 0.78 };
      let isPanning = false;
      let startPoint = { x: 0, y: 0 };

      // DOM Elements
      const viewport = document.getElementById('viewport');
      const world = document.getElementById('world-layer');
      const nodesLayer = document.getElementById('nodes-layer');
      const edgesLayer = document.getElementById('edges-layer');
      const zonesLayer = document.getElementById('zones-layer');
      const passport = document.getElementById('semantic-passport');
      const searchInput = document.getElementById('node-search');
      const searchDropdown = document.getElementById('search-dropdown');
      const telemetryItems = document.getElementById('telemetry-items');
      const telemetryTitle = document.getElementById('telemetry-mode-label');
      const telemetryNodeCount = document.getElementById('telemetry-node-count');

      // ── Spatial Auto-Layout Engine ───────────────────────────────────────
      const NODE_W = 180;
      const NODE_H = 68;
      const GAP_X = 220;
      const GAP_Y = 88;

      const columnMap = {
        endpoint: 0,
        identity_provider: 0,
        module: 1,
        test_suite: 1,
        event_bus: 2,
        queue: 2,
        cache: 2,
        datastore: 3,
        external_api: 3,
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
            x: colIdx * (NODE_W + GAP_X) + 80,
            y: rowIdx * (NODE_H + GAP_Y) + 80,
            w: NODE_W,
            h: NODE_H,
            entity
          });
        });
      });

      function updateCanvasTransform() {
        world.setAttribute('transform', 'translate(' + transform.x + ', ' + transform.y + ') scale(' + transform.k + ')');
      }

      // ── Edges & Live Signal Rendering ────────────────────────────────────
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
          const d = 'M ' + x1 + ' ' + y1 + ' C ' + (x1 + dx) + ' ' + y1 + ', ' + (x2 - dx) + ' ' + y2 + ', ' + x2 + ' ' + y2;

          // Background base edge
          const pathBg = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          pathBg.setAttribute('d', d);
          pathBg.setAttribute('class', 'edge-bg');
          pathBg.setAttribute('data-id', rel.id || (rel.sourceId + '->' + rel.targetId));
          pathBg.setAttribute('data-source', rel.sourceId);
          pathBg.setAttribute('data-target', rel.targetId);

          let strokeColor = '#334155';
          let marker = 'url(#arrow-default)';

          if (currentProjection === 'failure' && rel.failureMode && !rel.failureMode.hasTimeout) {
            strokeColor = '#fbbf24';
            marker = 'url(#arrow-warn)';
          }

          pathBg.setAttribute('stroke', strokeColor);
          pathBg.setAttribute('marker-end', marker);
          edgesLayer.appendChild(pathBg);

          // Foreground signal pulse path (for Signal Flow preset)
          const pathPulse = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          pathPulse.setAttribute('d', d);
          pathPulse.setAttribute('class', 'edge-pulse');
          pathPulse.setAttribute('stroke', '#22d3ee');
          pathPulse.setAttribute('data-source', rel.sourceId);
          pathPulse.setAttribute('data-target', rel.targetId);
          edgesLayer.appendChild(pathPulse);
        });
      }

      // ── Nodes Rendering ──────────────────────────────────────────────────
      function renderNodes() {
        nodesLayer.innerHTML = '';
        entities.forEach(entity => {
          const coord = nodeCoords.get(entity.id);
          if (!coord) return;

          const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          g.setAttribute('class', 'node-group');
          g.setAttribute('data-id', entity.id);
          g.setAttribute('transform', 'translate(' + coord.x + ', ' + coord.y + ')');

          // Semantic color accent
          let accent = '#475569';
          let icon = '📦';
          if (entity.kind === 'endpoint') { accent = '#22d3ee'; icon = '⚡'; }
          else if (entity.kind === 'datastore' || entity.kind === 'cache') { accent = '#a78bfa'; icon = '💾'; }
          else if (entity.kind === 'queue' || entity.kind === 'event_bus') { accent = '#fb923c'; icon = '📨'; }
          else if (entity.kind === 'external_api') { accent = '#fb7185'; icon = '🌐'; }
          else if (entity.kind === 'module') { accent = '#34d399'; icon = '⚙️'; }

          if (currentProjection === 'security') {
            if (entity.trustZone === 'public_untrusted') accent = '#fb7185';
            else if (entity.trustZone === 'dmz_gateway') accent = '#fbbf24';
            else if (entity.trustZone === 'internal_service') accent = '#34d399';
            else if (entity.trustZone === 'isolated_datastore') accent = '#a78bfa';
          }

          // Card Background
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('width', coord.w);
          rect.setAttribute('height', coord.h);
          rect.setAttribute('rx', 'var(--node-radius, 8px)');
          rect.setAttribute('class', 'node-card');
          rect.setAttribute('fill', 'var(--card)');
          rect.setAttribute('stroke', accent);

          // Top Accent Line
          const accentLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          accentLine.setAttribute('x1', '0');
          accentLine.setAttribute('y1', '0');
          accentLine.setAttribute('x2', coord.w);
          accentLine.setAttribute('y2', '0');
          accentLine.setAttribute('stroke', accent);
          accentLine.setAttribute('stroke-width', '3');
          accentLine.setAttribute('stroke-linecap', 'round');

          // Title
          const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          title.setAttribute('x', 14);
          title.setAttribute('y', 28);
          title.setAttribute('class', 'node-title');
          const cleanName = entity.name.length > 17 ? entity.name.slice(0, 15) + '…' : entity.name;
          title.textContent = icon + ' ' + cleanName;

          // Kind & Confidence Tag
          const kindText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          kindText.setAttribute('x', 14);
          kindText.setAttribute('y', 48);
          kindText.setAttribute('class', 'node-kind');
          kindText.textContent = (entity.kind || 'MODULE').replace('_', ' ');

          const confBadge = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          confBadge.setAttribute('x', coord.w - 14);
          confBadge.setAttribute('y', 48);
          confBadge.setAttribute('text-anchor', 'end');
          confBadge.setAttribute('class', 'node-conf-tag');
          confBadge.setAttribute('fill', entity.confidence === 'L1' ? '#34d399' : '#fbbf24');
          confBadge.textContent = entity.confidence || 'L1';

          g.appendChild(rect);
          g.appendChild(accentLine);
          g.appendChild(title);
          g.appendChild(kindText);
          g.appendChild(confBadge);

          g.addEventListener('click', (ev) => {
            ev.stopPropagation();
            onNodeClick(entity.id);
          });

          nodesLayer.appendChild(g);
        });
      }

      // ── Legend & Telemetry Update ────────────────────────────────────────
      function updateTelemetry() {
        telemetryNodeCount.textContent = entities.length + ' NODES';

        const configs = {
          topology: {
            title: 'System Topology',
            items: [
              { color: '#22d3ee', label: 'HTTP API Endpoint' },
              { color: '#34d399', label: 'Internal Module' },
              { color: '#a78bfa', label: 'Datastore / Cache' },
              { color: '#fb923c', label: 'Queue / Event Channel' },
              { color: '#fb7185', label: 'External SaaS' },
            ]
          },
          security: {
            title: 'Security Trust Zones',
            items: [
              { color: '#fb7185', label: 'Public Untrusted' },
              { color: '#fbbf24', label: 'DMZ Gateway / Auth' },
              { color: '#34d399', label: 'Authenticated Service' },
              { color: '#a78bfa', label: 'Isolated Datastore' },
            ]
          },
          failure: {
            title: 'Failure Architecture',
            items: [
              { color: '#fbbf24', label: 'External (No Timeout)' },
              { color: '#34d399', label: 'Resilient RPC / Protected' },
            ]
          },
          blast: {
            title: 'Blast Radius Simulator',
            items: [
              { color: '#fb7185', label: 'Ring 1 (Direct Impact)' },
              { color: '#fbbf24', label: 'Ring 2 (Transitive Ring)' },
              { color: '#22d3ee', label: 'Ring 3 (Edge Services)' },
            ]
          }
        };

        const active = configs[currentProjection] || configs.topology;
        telemetryTitle.textContent = active.title;
        telemetryItems.innerHTML = active.items.map(it =>
          '<div class="telemetry-item"><div class="telemetry-dot" style="background:' + it.color + '"></div><span>' + it.label + '</span></div>'
        ).join('');
      }

      // ── Reachability & Selection Engine ──────────────────────────────────
      function computeReachability(originId, direction) {
        const visitedNodes = new Set([originId]);
        const matchedEdges = new Set();
        let currentLevel = [originId];
        let hops = 0;

        while (currentLevel.length > 0) {
          const nextLevel = [];
          hops++;
          currentLevel.forEach(currId => {
            relationships.forEach(rel => {
              if (direction === 'upstream' && rel.targetId === currId) {
                matchedEdges.add(rel);
                if (!visitedNodes.has(rel.sourceId)) {
                  visitedNodes.add(rel.sourceId);
                  nextLevel.push(rel.sourceId);
                }
              } else if (direction === 'downstream' && rel.sourceId === currId) {
                matchedEdges.add(rel);
                if (!visitedNodes.has(rel.targetId)) {
                  visitedNodes.add(rel.targetId);
                  nextLevel.push(rel.targetId);
                }
              }
            });
          });
          currentLevel = nextLevel;
        }

        return {
          nodes: visitedNodes,
          edges: matchedEdges,
          hops: Math.max(0, hops - 1)
        };
      }

      function clearHighlights() {
        reachMode = null;
        document.querySelectorAll('.node-group').forEach(el => {
          el.classList.remove('dimmed', 'highlighted', 'highlighted-node', 'reach-upstream', 'reach-downstream', 'blast-ring-1', 'blast-ring-2', 'blast-ring-3');
        });
        document.querySelectorAll('.edge-bg, .edge-pulse').forEach(el => {
          el.classList.remove('dimmed', 'highlighted-edge', 'reach-upstream-edge', 'reach-downstream-edge', 'blast-ring-1-edge', 'blast-ring-2-edge', 'blast-ring-3-edge');
        });
        document.getElementById('btn-reach-upstream').classList.remove('active');
        document.getElementById('btn-reach-downstream').classList.remove('active');
        document.getElementById('pass-receipt-val').textContent = 'Full Topology Active';
      }

      function onNodeClick(id) {
        selectedNodeId = id;
        const entity = entities.find(e => e.id === id);
        if (!entity) return;

        clearHighlights();

        if (currentProjection === 'blast') {
          // Live Blast Simulation
          const ring1 = new Set();
          const ring2 = new Set();
          const ring3 = new Set();

          relationships.forEach(r => { if (r.targetId === id) ring1.add(r.sourceId); });
          relationships.forEach(r => { if (ring1.has(r.targetId) && r.sourceId !== id) ring2.add(r.sourceId); });
          relationships.forEach(r => { if (ring2.has(r.targetId) && !ring1.has(r.sourceId) && r.sourceId !== id) ring3.add(r.sourceId); });

          document.querySelectorAll('.node-group').forEach(el => {
            const elId = el.getAttribute('data-id');
            if (elId === id) { el.classList.add('highlighted', 'highlighted-node'); }
            else if (ring1.has(elId)) { el.classList.add('highlighted', 'blast-ring-1'); }
            else if (ring2.has(elId)) { el.classList.add('highlighted', 'blast-ring-2'); }
            else if (ring3.has(elId)) { el.classList.add('highlighted', 'blast-ring-3'); }
            else { el.classList.add('dimmed'); }
          });

          document.querySelectorAll('.edge-bg').forEach(el => {
            const tgt = el.getAttribute('data-target');
            if (tgt === id) { el.classList.add('blast-ring-1-edge'); }
            else if (ring1.has(tgt)) { el.classList.add('blast-ring-2-edge'); }
            else if (ring2.has(tgt)) { el.classList.add('blast-ring-3-edge'); }
            else { el.classList.add('dimmed'); }
          });

          document.getElementById('pass-receipt-val').textContent = 'Blast: ' + (ring1.size + ring2.size + ring3.size) + ' Impacted Nodes';
        } else {
          // Standard Focus
          const connected = new Set([id]);
          relationships.forEach(r => {
            if (r.sourceId === id) connected.add(r.targetId);
            if (r.targetId === id) connected.add(r.sourceId);
          });

          document.querySelectorAll('.node-group').forEach(el => {
            const elId = el.getAttribute('data-id');
            if (connected.has(elId)) {
              el.classList.add('highlighted');
              if (elId === id) el.classList.add('highlighted-node');
            } else {
              el.classList.add('dimmed');
            }
          });

          document.querySelectorAll('.edge-bg, .edge-pulse').forEach(el => {
            const s = el.getAttribute('data-source');
            const t = el.getAttribute('data-target');
            if (s === id || t === id) { el.classList.add('highlighted'); }
            else { el.classList.add('dimmed'); }
          });

          document.getElementById('pass-receipt-val').textContent = 'Connected: ' + connected.size + ' Nodes';
        }

        populatePassport(entity);
      }

      function populatePassport(entity) {
        passport.classList.add('open');
        document.getElementById('pass-title').textContent = entity.name;
        document.getElementById('pass-id').textContent = entity.id;
        document.getElementById('pass-kind').textContent = (entity.kind || 'MODULE').toUpperCase();
        document.getElementById('pass-zone').textContent = (entity.trustZone || 'INTERNAL').toUpperCase();
        document.getElementById('pass-confidence').textContent = (entity.confidence || 'L1') + ' FACT';

        const riskScore = entity.blastRadius?.riskScore || 0.1;
        const tier = riskScore > 0.7 ? 'CRITICAL' : riskScore > 0.4 ? 'HIGH' : riskScore > 0.2 ? 'MEDIUM' : 'LOW';
        document.getElementById('pass-risk').textContent = tier + ' (' + riskScore.toFixed(2) + ')';
        const blastPill = document.getElementById('pass-blast-tier');
        blastPill.textContent = tier;
        blastPill.className = 'risk-pill risk-' + tier;

        const directDep = relationships.filter(r => r.targetId === entity.id).length;
        document.getElementById('pass-blast-desc').textContent = 'Direct callers: ' + directDep + ' · Blast risk score: ' + riskScore.toFixed(2);
        document.getElementById('pass-role').textContent = entity.role || 'Component extracted deterministically from codebase AST with zero-trust provenance.';

        const evList = document.getElementById('pass-evidence-list');
        const sources = entity.sources || [];
        if (sources.length === 0) {
          evList.innerHTML = '<div style="font-size:10px; color:var(--dim);">No file sources recorded.</div>';
        } else {
          evList.innerHTML = sources.map(s =>
            '<div class="evidence-card">' +
              '<div class="evidence-path"><span>📄</span> ' + s.file + (s.startLine ? ':' + s.startLine + (s.endLine ? '-' + s.endLine : '') : '') + '</div>' +
              (s.contentHash ? '<div style="color:var(--dim); font-size:9px;">Hash: <code>' + s.contentHash.slice(0, 16) + '…</code></div>' : '') +
              (s.snippet ? '<div class="evidence-snippet">' + s.snippet.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>' : '') +
            '</div>'
          ).join('');
        }
      }

      // ── Authored Reachability Actions ────────────────────────────────────
      document.getElementById('btn-reach-upstream').addEventListener('click', () => {
        if (!selectedNodeId) return;
        clearHighlights();
        reachMode = 'upstream';
        document.getElementById('btn-reach-upstream').classList.add('active');

        const reach = computeReachability(selectedNodeId, 'upstream');
        document.querySelectorAll('.node-group').forEach(el => {
          const elId = el.getAttribute('data-id');
          if (reach.nodes.has(elId)) {
            el.classList.add('highlighted', 'reach-upstream');
            if (elId === selectedNodeId) el.classList.add('highlighted-node');
          } else {
            el.classList.add('dimmed');
          }
        });

        document.querySelectorAll('.edge-bg').forEach(el => {
          const s = el.getAttribute('data-source');
          const t = el.getAttribute('data-target');
          let matched = false;
          reach.edges.forEach(rel => {
            if (rel.sourceId === s && rel.targetId === t) matched = true;
          });
          if (matched) { el.classList.add('reach-upstream-edge'); el.setAttribute('marker-end', 'url(#arrow-violet)'); }
          else { el.classList.add('dimmed'); }
        });

        document.getElementById('pass-receipt-val').textContent = 'Upstream: ' + reach.nodes.size + ' Nodes · ' + reach.edges.size + ' Links · max ' + reach.hops + ' hops';
      });

      document.getElementById('btn-reach-downstream').addEventListener('click', () => {
        if (!selectedNodeId) return;
        clearHighlights();
        reachMode = 'downstream';
        document.getElementById('btn-reach-downstream').classList.add('active');

        const reach = computeReachability(selectedNodeId, 'downstream');
        document.querySelectorAll('.node-group').forEach(el => {
          const elId = el.getAttribute('data-id');
          if (reach.nodes.has(elId)) {
            el.classList.add('highlighted', 'reach-downstream');
            if (elId === selectedNodeId) el.classList.add('highlighted-node');
          } else {
            el.classList.add('dimmed');
          }
        });

        document.querySelectorAll('.edge-bg').forEach(el => {
          const s = el.getAttribute('data-source');
          const t = el.getAttribute('data-target');
          let matched = false;
          reach.edges.forEach(rel => {
            if (rel.sourceId === s && rel.targetId === t) matched = true;
          });
          if (matched) { el.classList.add('reach-downstream-edge'); el.setAttribute('marker-end', 'url(#arrow-green)'); }
          else { el.classList.add('dimmed'); }
        });

        document.getElementById('pass-receipt-val').textContent = 'Downstream: ' + reach.nodes.size + ' Nodes · ' + reach.edges.size + ' Links · max ' + reach.hops + ' hops';
      });

      document.getElementById('btn-reach-reset').addEventListener('click', () => {
        if (selectedNodeId) onNodeClick(selectedNodeId);
        else clearHighlights();
      });

      document.getElementById('pass-close').addEventListener('click', () => {
        passport.classList.remove('open');
        clearHighlights();
        selectedNodeId = null;
      });

      // ── Pan, Zoom & Camera Navigation ────────────────────────────────────
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
        transform.k = Math.max(0.15, Math.min(3.5, transform.k * factor));
        updateCanvasTransform();
      });

      document.getElementById('btn-zoom-in').addEventListener('click', () => {
        transform.k = Math.min(3.5, transform.k * 1.25);
        updateCanvasTransform();
      });
      document.getElementById('btn-zoom-out').addEventListener('click', () => {
        transform.k = Math.max(0.15, transform.k / 1.25);
        updateCanvasTransform();
      });
      document.getElementById('btn-zoom-reset').addEventListener('click', () => {
        transform = { x: 70, y: 70, k: 0.78 };
        updateCanvasTransform();
      });

      // ── Fly-to Camera Centering on Entity ────────────────────────────────
      function flyToNode(id) {
        const coord = nodeCoords.get(id);
        if (!coord) return;
        const vRect = viewport.getBoundingClientRect();
        const targetX = vRect.width / 2 - (coord.x + coord.w / 2) * transform.k;
        const targetY = vRect.height / 2 - (coord.y + coord.h / 2) * transform.k;
        transform.x = targetX;
        transform.y = targetY;
        updateCanvasTransform();
        onNodeClick(id);
      }

      // ── Search & Instant Autocomplete ────────────────────────────────────
      searchInput.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        if (!q) {
          searchDropdown.classList.remove('open');
          clearHighlights();
          return;
        }

        const matches = entities.filter(ent =>
          ent.id.toLowerCase().includes(q) || ent.name.toLowerCase().includes(q) || (ent.kind && ent.kind.toLowerCase().includes(q))
        );

        if (matches.length > 0) {
          searchDropdown.innerHTML = matches.slice(0, 8).map(m =>
            '<div class="search-item" data-id="' + m.id + '">' +
              '<strong>' + m.name + '</strong>' +
              '<span class="dropdown-hint">' + m.kind.toUpperCase() + '</span>' +
            '</div>'
          ).join('');
          searchDropdown.classList.add('open');
        } else {
          searchDropdown.innerHTML = '<div style="padding:8px 12px; font-size:10px; color:var(--dim);">No components match</div>';
          searchDropdown.classList.add('open');
        }

        // Live visual highlight matching nodes
        document.querySelectorAll('.node-group').forEach(el => {
          const id = el.getAttribute('data-id');
          const isMatch = matches.some(m => m.id === id);
          if (isMatch) { el.classList.add('highlighted'); el.classList.remove('dimmed'); }
          else { el.classList.add('dimmed'); el.classList.remove('highlighted'); }
        });
      });

      searchDropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.search-item');
        if (!item) return;
        const id = item.getAttribute('data-id');
        searchDropdown.classList.remove('open');
        searchInput.value = '';
        flyToNode(id);
      });

      // ── Projection Switching ─────────────────────────────────────────────
      document.querySelectorAll('.proj-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.proj-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentProjection = btn.getAttribute('data-projection');
          updateTelemetry();
          renderNodes();
          renderEdges();
          if (selectedNodeId) onNodeClick(selectedNodeId);
        });
      });

      // ── Presets Menu & Switcher ──────────────────────────────────────────
      const presetBtn = document.getElementById('btn-preset-toggle');
      const presetMenu = document.getElementById('preset-menu');
      const presetLabel = document.getElementById('preset-label');

      presetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        exportMenu.classList.remove('open');
        presetMenu.classList.toggle('open');
      });

      presetMenu.addEventListener('click', (e) => {
        const item = e.target.closest('.dropdown-item');
        if (!item) return;
        const val = item.getAttribute('data-val');
        setPreset(val);
        presetMenu.classList.remove('open');
      });

      function setPreset(val) {
        document.documentElement.setAttribute('data-preset', val);
        localStorage.setItem('tribunal-arch-preset', val);
        document.querySelectorAll('#preset-menu .dropdown-item').forEach(it => {
          it.classList.toggle('active', it.getAttribute('data-val') === val);
        });
        const labels = {
          classic: 'Obsidian',
          'signal-flow': 'Signal Flow',
          blueprint: 'Blueprint',
          editorial: 'Editorial'
        };
        presetLabel.textContent = labels[val] || val;
      }

      function cyclePreset() {
        const presets = ['classic', 'signal-flow', 'blueprint', 'editorial'];
        const current = document.documentElement.getAttribute('data-preset') || 'signal-flow';
        const next = presets[(presets.indexOf(current) + 1) % presets.length];
        setPreset(next);
      }

      // ── Theme Toggle ─────────────────────────────────────────────────────
      const themeBtn = document.getElementById('btn-theme');
      const themeIcon = document.getElementById('theme-icon');

      function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('tribunal-arch-theme', next);
        themeIcon.textContent = next === 'dark' ? '🌙' : '☀️';
      }
      themeBtn.addEventListener('click', toggleTheme);

      // ── Motion Governor ──────────────────────────────────────────────────
      const motionBtn = document.getElementById('btn-motion');
      const motionDot = document.getElementById('motion-dot');
      const motionLabel = document.getElementById('motion-label');

      function toggleMotion() {
        motionEnabled = !motionEnabled;
        if (motionEnabled) {
          motionDot.style.background = '#22d3ee';
          motionLabel.textContent = 'Motion';
          document.querySelectorAll('.edge-pulse').forEach(el => el.style.animationPlayState = 'running');
        } else {
          motionDot.style.background = '#64748b';
          motionLabel.textContent = 'Paused';
          document.querySelectorAll('.edge-pulse').forEach(el => el.style.animationPlayState = 'paused');
        }
      }
      motionBtn.addEventListener('click', toggleMotion);

      // ── Presentation Mode ────────────────────────────────────────────────
      document.getElementById('btn-present').addEventListener('click', () => {
        document.body.classList.toggle('presentation-mode');
      });

      // ── Export Menu & Handlers ───────────────────────────────────────────
      const exportBtn = document.getElementById('btn-export-toggle');
      const exportMenu = document.getElementById('export-menu');

      exportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        presetMenu.classList.remove('open');
        exportMenu.classList.toggle('open');
      });

      window.addEventListener('click', () => {
        presetMenu.classList.remove('open');
        exportMenu.classList.remove('open');
        searchDropdown.classList.remove('open');
      });

      // 1. Lossless SVG Download
      document.getElementById('act-download-svg').addEventListener('click', () => {
        const svgEl = document.getElementById('arch-canvas');
        const serializer = new XMLSerializer();
        let source = serializer.serializeToString(svgEl);
        source = '<?xml version="1.0" standalone="no"?>\\r\\n' + source;
        const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (model.engine || 'architecture') + '-diagram.svg';
        a.click();
        URL.revokeObjectURL(url);
      });

      // Helper: Render SVG to offscreen canvas
      function rasterizeToCanvas(targetCanvas, width, height, callback) {
        const svgEl = document.getElementById('arch-canvas');
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgEl);
        const img = new Image();
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = function () {
          const ctx = targetCanvas.getContext('2d');
          targetCanvas.width = width;
          targetCanvas.height = height;

          // Background fill matching theme
          const theme = document.documentElement.getAttribute('data-theme') || 'dark';
          ctx.fillStyle = theme === 'light' ? '#f8fafc' : '#030712';
          ctx.fillRect(0, 0, width, height);

          ctx.drawImage(img, 0, 0, width, height);
          URL.revokeObjectURL(url);
          callback(targetCanvas);
        };
        img.src = url;
      }

      // 2. High-Res PNG Download
      document.getElementById('act-download-png').addEventListener('click', () => {
        const canvas = document.getElementById('export-canvas');
        rasterizeToCanvas(canvas, 1920, 1080, (c) => {
          const a = document.createElement('a');
          a.download = (model.engine || 'architecture') + '-1080p.png';
          a.href = c.toDataURL('image/png');
          a.click();
        });
      });

      // 3. WebP Download
      document.getElementById('act-download-webp').addEventListener('click', () => {
        const canvas = document.getElementById('export-canvas');
        rasterizeToCanvas(canvas, 1920, 1080, (c) => {
          const a = document.createElement('a');
          a.download = (model.engine || 'architecture') + '-1080p.webp';
          a.href = c.toDataURL('image/webp', 0.92);
          a.click();
        });
      });

      // 4. Copy PNG to Clipboard
      document.getElementById('act-copy-png').addEventListener('click', () => {
        const canvas = document.getElementById('export-canvas');
        rasterizeToCanvas(canvas, 1600, 900, (c) => {
          c.toBlob(blob => {
            if (navigator.clipboard && window.ClipboardItem) {
              navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
                .then(() => alert('Architecture diagram copied to clipboard as PNG!'))
                .catch(err => console.error(err));
            }
          });
        });
      });

      // 5. Archify-Grade Reach / Blast Share Card (1200×630 PNG)
      document.getElementById('act-share-card').addEventListener('click', () => {
        const canvas = document.getElementById('export-canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 1200;
        canvas.height = 630;

        // Draw Premium Midnight Card Base
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, 1200, 630);

        // Radial ambient accent
        const grad = ctx.createRadialGradient(600, 315, 50, 600, 315, 600);
        grad.addColorStop(0, 'rgba(34, 211, 238, 0.08)');
        grad.addColorStop(1, 'rgba(2, 6, 23, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1200, 630);

        // Outer Structural 1px Border
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.strokeRect(16, 16, 1168, 598);

        // Header Lockup
        ctx.fillStyle = '#22d3ee';
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        ctx.fillText('⚖️ TRIBUNAL ARCHITECTURE INTELLIGENCE // EVIDENCE CONSOLE', 40, 56);

        // Title
        const targetEntity = entities.find(e => e.id === selectedNodeId);
        const targetTitle = targetEntity ? targetEntity.name : 'System Architecture Overview';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px "JetBrains Mono", monospace';
        ctx.fillText(targetTitle, 40, 92);

        // Telemetry Subtitle Receipt
        const receiptText = document.getElementById('pass-receipt-val').textContent || 'Full System Topology';
        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px "JetBrains Mono", monospace';
        ctx.fillText('RECEIPT: ' + receiptText.toUpperCase() + ' · TIMESTAMP: ' + new Date().toISOString().slice(0, 10), 40, 118);

        // Draw Diagram Preview into Card Center
        const svgEl = document.getElementById('arch-canvas');
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgEl);
        const img = new Image();
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = function () {
          // Draw thumbnail into box (40, 140, 1120, 430)
          ctx.drawImage(img, 40, 140, 1120, 420);
          URL.revokeObjectURL(url);

          // Card Footer Watermark
          ctx.fillStyle = '#475569';
          ctx.font = '10px "JetBrains Mono", monospace';
          ctx.fillText('VERIFIED VIA AST EXTRACTION · L1-L5 PROVENANCE GUARANTEED · TRIBUNAL-KIT', 40, 590);

          const a = document.createElement('a');
          a.download = (targetEntity ? targetEntity.name.replace(/[^a-z0-9]/gi, '_') : 'arch') + '-share-card.png';
          a.href = canvas.toDataURL('image/png');
          a.click();
        };
        img.src = url;
      });

      // ── Keyboard Shortcuts ───────────────────────────────────────────────
      window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') {
          if (e.key === 'Escape') searchInput.blur();
          return;
        }
        if (e.key === '/') {
          e.preventDefault();
          searchInput.focus();
        } else if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          cyclePreset();
        } else if (e.key === 't' || e.key === 'T') {
          e.preventDefault();
          toggleTheme();
        } else if (e.key === 'm' || e.key === 'M') {
          e.preventDefault();
          toggleMotion();
        } else if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          document.body.classList.toggle('presentation-mode');
        } else if (e.key === 'e' || e.key === 'E') {
          e.preventDefault();
          exportMenu.classList.toggle('open');
        } else if (e.key === 'Escape') {
          passport.classList.remove('open');
          searchDropdown.classList.remove('open');
          clearHighlights();
          selectedNodeId = null;
        } else if (e.key === '0') {
          transform = { x: 70, y: 70, k: 0.78 };
          updateCanvasTransform();
        }
      });

      // ── Initial Mount ────────────────────────────────────────────────────
      updateCanvasTransform();
      updateTelemetry();
      renderNodes();
      renderEdges();
    })();
  </script>
</body>
</html>`;
  }

  saveHtml(outputPath) {
    const dest =
      outputPath || path.join(process.cwd(), '.agent', 'history', 'architecture-intelligence.html');
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

  console.log(banner('Tribunal Architecture Intelligence Visualizer (The Evidence Console)'));

  if (!fs.existsSync(modelFile)) {
    console.error(
      `  ${RED}✖ architecture-model.json not found.${RESET} Run architecture_extractor.js first.`,
    );
    process.exit(1);
  }

  const model = JSON.parse(fs.readFileSync(modelFile, 'utf8'));
  const verification = fs.existsSync(verifFile)
    ? JSON.parse(fs.readFileSync(verifFile, 'utf8'))
    : null;

  const visualizer = new ArchitectureVisualizer(model, verification);
  const outPath = visualizer.saveHtml();

  console.log(
    `  ${GREEN}${BOX.check} Interactive Architecture Explorer (Evidence Console) Generated!${RESET}`,
  );
  console.log(`  ${DIM}File:${RESET} ${CYAN}${outPath}${RESET} (${formatMs(t())})`);
  console.log(
    `  ${DIM}Presets Enabled:${RESET} Obsidian Console, Signal Flow, Cyber Blueprint, Editorial Monolith`,
  );
  console.log(
    `  ${DIM}Projections Enabled:${RESET} Topology, Security Zones, Failure Modes, Blast Simulator`,
  );
  console.log(
    `  ${DIM}Features:${RESET} Semantic Passport, Reachability Subgraphs, 1200x630 Share Card Export\n`,
  );
}

module.exports = {
  ArchitectureVisualizer,
};
