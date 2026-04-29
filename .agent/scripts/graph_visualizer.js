#!/usr/bin/env node
/**
 * graph_visualizer.js — Tribunal Kit Architecture Visualizer
 * Reads the graph cache and generates a standalone HTML visualizer.
 * Uses a native zero-dependency Canvas force-directed graph.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const AGENT_DIR = path.join(process.cwd(), '.agent');
const HISTORY_DIR = path.join(AGENT_DIR, 'history');
const CACHE_FILE = path.join(HISTORY_DIR, 'graph-cache.json');
const HTML_FILE = path.join(HISTORY_DIR, 'architecture-explorer.html');

function main() {
    if (!fs.existsSync(CACHE_FILE)) {
        console.error('\x1b[31m✖ Error: graph-cache.json not found. Run graph_builder.js first.\x1b[0m');
        process.exit(1);
    }

    const cacheData = fs.readFileSync(CACHE_FILE, 'utf8');

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tribunal Architecture Explorer</title>
    <style>
        :root {
            --bg: #09090b;
            --panel-bg: rgba(24, 24, 27, 0.8);
            --border: #27272a;
            --text: #e4e4e7;
            --text-dim: #a1a1aa;
            --critical: #ef4444;
            --high: #f97316;
            --medium: #eab308;
            --low: #3b82f6;
            --edge: rgba(255, 255, 255, 0.1);
        }
        body {
            margin: 0;
            padding: 0;
            background: var(--bg);
            color: var(--text);
            font-family: system-ui, -apple-system, sans-serif;
            overflow: hidden;
        }
        canvas {
            display: block;
            width: 100vw;
            height: 100vh;
        }
        #ui-panel {
            position: absolute;
            top: 20px;
            left: 20px;
            width: 320px;
            background: var(--panel-bg);
            backdrop-filter: blur(12px);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            pointer-events: none; /* Let clicks pass to canvas if not on panel */
        }
        h1 { margin: 0 0 10px 0; font-size: 1.2rem; font-weight: 600; }
        .stat { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.9rem; }
        .stat .val { font-family: monospace; color: white; }
        .legend { margin-top: 20px; display: grid; gap: 8px; font-size: 0.85rem; }
        .legend-item { display: flex; align-items: center; gap: 8px; }
        .dot { width: 10px; height: 10px; border-radius: 50%; }
        
        #node-details {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid var(--border);
            display: none;
            pointer-events: auto;
        }
        #node-details h2 { margin: 0 0 10px 0; font-size: 1rem; word-break: break-all; }
        .detail-row { font-size: 0.85rem; margin-bottom: 4px; color: var(--text-dim); }
        .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; color: black; }
        ul { margin: 8px 0; padding-left: 20px; font-size: 0.85rem; color: var(--text-dim); max-height: 150px; overflow-y: auto; }
    </style>
</head>
<body>

    <canvas id="graph"></canvas>

    <div id="ui-panel">
        <h1>Tribunal Architecture</h1>
        <div class="stat"><span>Nodes</span><span class="val" id="stat-nodes">0</span></div>
        <div class="stat"><span>Edges</span><span class="val" id="stat-edges">0</span></div>
        
        <div class="legend">
            <div class="legend-item"><div class="dot" style="background: var(--critical)"></div> Critical (>10 dependents)</div>
            <div class="legend-item"><div class="dot" style="background: var(--high)"></div> High (5-10 dependents)</div>
            <div class="legend-item"><div class="dot" style="background: var(--medium)"></div> Medium (2-4 dependents)</div>
            <div class="legend-item"><div class="dot" style="background: var(--low)"></div> Low (0-1 dependents)</div>
        </div>

        <div id="node-details">
            <h2 id="nd-title">file.js</h2>
            <div class="detail-row">Risk Score: <span id="nd-risk" class="badge">Low</span></div>
            <div class="detail-row">Blast Radius: <span id="nd-blast" style="color:white;font-weight:bold">0</span> files</div>
            <div class="detail-row" style="margin-top:10px">Imports:</div>
            <ul id="nd-imports"></ul>
            <div class="detail-row">Dependents:</div>
            <ul id="nd-dependents"></ul>
        </div>
    </div>

    <script>
        const rawData = JSON.parse(decodeURIComponent("${encodeURIComponent(cacheData)}"));
        
        const nodes = [];
        const edges = [];
        const nodeMap = new Map();

        // Build Nodes
        Object.keys(rawData).forEach(file => {
            const info = rawData[file];
            const node = {
                id: file,
                imports: info.imports || [],
                dependents: info.dependents || [],
                riskScore: info.riskScore || 'Low',
                blastRadius: info.blastRadius || 0,
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: 0,
                vy: 0,
                radius: Math.min(20, Math.max(5, 5 + (info.blastRadius * 1.5)))
            };
            
            if (node.riskScore === 'Critical') node.color = '#ef4444';
            else if (node.riskScore === 'High') node.color = '#f97316';
            else if (node.riskScore === 'Medium') node.color = '#eab308';
            else node.color = '#3b82f6';

            nodes.push(node);
            nodeMap.set(file, node);
        });

        // Build Edges
        nodes.forEach(node => {
            node.imports.forEach(imp => {
                if (imp.startsWith('.')) {
                    // Try to resolve
                    const dir = node.id.split('/').slice(0, -1).join('/');
                    let resolved = dir ? dir + '/' + imp.replace('./', '') : imp.replace('./', '');
                    
                    // Normalize standard paths relative to array
                    let target = nodes.find(n => n.id === resolved || n.id === resolved + '.js' || n.id === resolved + '.ts');
                    if (target) {
                        edges.push({ source: node, target: target });
                    }
                }
            });
        });

        document.getElementById('stat-nodes').innerText = nodes.length;
        document.getElementById('stat-edges').innerText = edges.length;

        // Force Directed Graph Simulation
        const canvas = document.getElementById('graph');
        const ctx = canvas.getContext('2d');
        
        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resize);
        resize();

        let hoveredNode = null;
        let selectedNode = null;
        let isDragging = false;
        
        // Physics constants
        const REPULSION = 2000;
        const SPRING_LENGTH = 100;
        const SPRING_STRENGTH = 0.05;
        const DAMPING = 0.85;

        function simulate() {
            // Repulsion
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const n1 = nodes[i];
                    const n2 = nodes[j];
                    const dx = n2.x - n1.x;
                    const dy = n2.y - n1.y;
                    let dist = Math.sqrt(dx*dx + dy*dy) || 1;
                    if (dist < 300) {
                        const force = REPULSION / (dist * dist);
                        const fx = (dx / dist) * force;
                        const fy = (dy / dist) * force;
                        n1.vx -= fx;
                        n1.vy -= fy;
                        n2.vx += fx;
                        n2.vy += fy;
                    }
                }
            }

            // Attraction (Springs)
            edges.forEach(edge => {
                const dx = edge.target.x - edge.source.x;
                const dy = edge.target.y - edge.source.y;
                const dist = Math.sqrt(dx*dx + dy*dy) || 1;
                const force = (dist - SPRING_LENGTH) * SPRING_STRENGTH;
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;
                
                edge.source.vx += fx;
                edge.source.vy += fy;
                edge.target.vx -= fx;
                edge.target.vy -= fy;
            });

            // Center gravity
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            nodes.forEach(n => {
                n.vx += (cx - n.x) * 0.01;
                n.vy += (cy - n.y) * 0.01;
            });

            // Update positions
            nodes.forEach(n => {
                if (n === selectedNode && isDragging) return; // don't move dragged node
                n.vx *= DAMPING;
                n.vy *= DAMPING;
                n.x += n.vx;
                n.y += n.vy;
            });
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw edges
            ctx.lineWidth = 1;
            edges.forEach(edge => {
                let isHighlighted = false;
                if (hoveredNode) {
                    isHighlighted = (edge.source === hoveredNode || edge.target === hoveredNode);
                } else if (selectedNode) {
                    isHighlighted = (edge.source === selectedNode || edge.target === selectedNode);
                }

                if (hoveredNode || selectedNode) {
                    ctx.strokeStyle = isHighlighted ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.05)';
                    ctx.lineWidth = isHighlighted ? 2 : 1;
                } else {
                    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                    ctx.lineWidth = 1;
                }

                ctx.beginPath();
                ctx.moveTo(edge.source.x, edge.source.y);
                ctx.lineTo(edge.target.x, edge.target.y);
                ctx.stroke();
            });

            // Draw nodes
            nodes.forEach(n => {
                let opacity = 1;
                if (hoveredNode && n !== hoveredNode && !edges.some(e => (e.source===hoveredNode && e.target===n) || (e.target===hoveredNode && e.source===n))) {
                    opacity = 0.2;
                } else if (selectedNode && !hoveredNode && n !== selectedNode && !edges.some(e => (e.source===selectedNode && e.target===n) || (e.target===selectedNode && e.source===n))) {
                    opacity = 0.2;
                }

                ctx.beginPath();
                ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
                ctx.fillStyle = n.color;
                ctx.globalAlpha = opacity;
                ctx.fill();
                
                if (n === hoveredNode || n === selectedNode) {
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    
                    ctx.globalAlpha = 1;
                    ctx.fillStyle = '#fff';
                    ctx.font = '12px system-ui';
                    ctx.fillText(n.id.split('/').pop(), n.x + n.radius + 5, n.y + 4);
                }
                ctx.globalAlpha = 1;
            });
        }

        function loop() {
            simulate();
            draw();
            requestAnimationFrame(loop);
        }
        loop();

        // Interaction
        canvas.addEventListener('mousemove', e => {
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            
            if (isDragging && selectedNode) {
                selectedNode.x = mx;
                selectedNode.y = my;
                return;
            }

            hoveredNode = null;
            for (let i = nodes.length - 1; i >= 0; i--) {
                const n = nodes[i];
                const dx = mx - n.x;
                const dy = my - n.y;
                if (dx*dx + dy*dy < (n.radius + 5)**2) {
                    hoveredNode = n;
                    break;
                }
            }
            canvas.style.cursor = hoveredNode ? 'pointer' : 'default';
        });

        canvas.addEventListener('mousedown', e => {
            if (hoveredNode) {
                selectedNode = hoveredNode;
                isDragging = true;
                showDetails(selectedNode);
            } else {
                selectedNode = null;
                document.getElementById('node-details').style.display = 'none';
            }
        });

        canvas.addEventListener('mouseup', () => { isDragging = false; });
        
        function showDetails(n) {
            const panel = document.getElementById('node-details');
            panel.style.display = 'block';
            document.getElementById('nd-title').innerText = n.id;
            
            const riskEl = document.getElementById('nd-risk');
            riskEl.innerText = n.riskScore;
            riskEl.style.backgroundColor = n.color;
            
            document.getElementById('nd-blast').innerText = n.blastRadius;
            
            const importsUl = document.getElementById('nd-imports');
            importsUl.innerHTML = '';
            n.imports.forEach(i => {
                const li = document.createElement('li');
                li.innerText = i;
                importsUl.appendChild(li);
            });
            if(n.imports.length===0) importsUl.innerHTML = '<li>None</li>';

            const depsUl = document.getElementById('nd-dependents');
            depsUl.innerHTML = '';
            n.dependents.forEach(d => {
                const li = document.createElement('li');
                li.innerText = d;
                depsUl.appendChild(li);
            });
            if(n.dependents.length===0) depsUl.innerHTML = '<li>None</li>';
        }
    </script>
</body>
</html>`;

    fs.writeFileSync(HTML_FILE, htmlContent);
    console.log(`\x1b[32m✔ Interactive visualizer generated.\x1b[0m`);
    console.log(`  \x1b[2mSaved to: ${HTML_FILE}\x1b[0m`);
}

main();
