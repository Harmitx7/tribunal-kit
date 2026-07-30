---
name: product-aware-heuristics
description: Defines specific visual and structural design heuristics and React/Tailwind templates tailored to different product types (SaaS, developer tools, AI interfaces, landing pages, fintech, e-commerce, and editorial).
version: 3.0.0
last-updated: 2026-07-30
skills:
  - ui-reasoning-engine
  - interface-design
  - baseline-ui
  - better-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Product-Aware Heuristics — Category-Specific Design Systems

---

## Mandatory Pre-Flight Context Inspection

Before selecting layout templates or component heuristics, you MUST inspect:
1. `DESIGN.md` / `package.json` → Identify product domain (SaaS, DevTool, AI Chat, Landing Page, Fintech)
2. Tabular Data & Monospace Rules → Enforce `font-variant-numeric: tabular-nums` for financial data and `JetBrains Mono` for developer tools
3. Touch & Pointer Bounds → Ensure interactive buttons and checkboxes meet 44x44px touch target guidelines

An interface must match its domain context. A developer tool should not look like a luxury editorial website. This skill defines the heuristics, layout requirements, and drop-in layout templates for different product categories.

---

## 1. SaaS & Enterprise Applications
*   **Goal:** Operational efficiency, scannability, multi-record management, and action density.
*   **Visual Tone:** Swiss Precision or Soft Minimal. Clear borders, muted tinted grays, and highly legible typography.
*   **Heuristics:**
    *   **Data Density:** Prefer structured tables and compact list views. Spacing should be tight but consistent (`8px` to `16px` grid).
    *   **Keyboard Workflows:** All common actions must have keyboard shortcuts. Tab focus paths must be linear and predictable.
    *   **Filters & Actions:** Provide global filters, batch action bars (appearing only when records are selected), and quick search boundaries.
    *   **Responsive:** Grid layouts reflow to linear scroll cards on smaller screens; large tabular displays must support horizontal scrolling with sticky primary columns.

### SaaS Code Template (Dense Dynamic Table with Sidebar Detail Panel)
```tsx
import React, { useState } from 'react';
import { Filter, MoreHorizontal, FileText, Check, ChevronRight, X } from 'lucide-react';

export function SaaSDataTable({ records }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeDetailId, setActiveDetailId] = useState<string | null>(null);
  
  const activeRecord = records.find(r => r.id === activeDetailId);
  
  return (
    <div className="w-full flex gap-4 bg-[var(--bg-base)] p-4 rounded-[var(--radius-lg)]">
      {/* Table Main Area */}
      <div className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] overflow-hidden shadow-[var(--shadow-sm)]">
        {/* Table Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]">
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all text-xs font-medium">
              <Filter size={14} /> Filter
            </button>
          </div>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 animate-fade-in">
              <span className="text-xs text-[var(--text-secondary)]">{selectedIds.length} selected</span>
              <button className="px-3 py-1.5 bg-[var(--color-error)] text-white text-xs font-semibold rounded-[var(--radius-sm)] hover:opacity-90 transition-all">
                Delete Selected
              </button>
            </div>
          )}
        </div>
        
        {/* Table container */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-base)] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                <th className="p-3 w-8">
                  <input 
                    type="checkbox" 
                    onChange={(e) => setSelectedIds(e.target.checked ? records.map(r => r.id) : [])}
                    checked={selectedIds.length === records.length}
                    className="rounded border-[var(--border-subtle)]"
                  />
                </th>
                <th className="p-3 font-semibold">Name</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold">Usage</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {records.map((record) => (
                <tr 
                  key={record.id} 
                  onClick={() => setActiveDetailId(record.id)}
                  className={`hover:bg-[var(--bg-base)]/50 transition-colors group cursor-pointer ${activeDetailId === record.id ? 'bg-[var(--bg-base)]' : ''}`}
                >
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox"
                      checked={selectedIds.includes(record.id)}
                      onChange={(e) => setSelectedIds(prev => e.target.checked ? [...prev, record.id] : prev.filter(id => id !== record.id))}
                      className="rounded border-[var(--border-subtle)]"
                    />
                  </td>
                  <td className="p-3 font-medium text-[var(--text-primary)]">{record.name}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                    </span>
                  </td>
                  <td className="p-3 font-mono text-[var(--text-secondary)]">{record.usage} GB</td>
                  <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button className="p-1 rounded hover:bg-[var(--bg-surface-raised)] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-all">
                      <MoreHorizontal size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Detail Slideout Panel */}
      {activeRecord && (
        <div className="w-[300px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] flex flex-col justify-between animate-slide-in">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Record details</h3>
              <button onClick={() => setActiveDetailId(null)} className="p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-base)] rounded">
                <X size={14} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-[10px] text-[var(--text-muted)] block">Name</span>
                <span className="text-xs font-semibold text-[var(--text-primary)]">{activeRecord.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--text-muted)] block">Usage Metrics</span>
                <span className="text-xs font-mono text-[var(--text-secondary)]">{activeRecord.usage} Gigabytes</span>
              </div>
            </div>
          </div>
          <button className="w-full mt-6 py-2 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] rounded text-xs font-semibold transition-all">
            Open full report
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## 2. Developer Tools
*   **Goal:** Technical clarity, command-driven inputs, diagnostics readability, and low cognitive overhead.
*   **Visual Tone:** Swiss Precision or Neon Cyberpunk. Dark backgrounds, high contrast, monospace font blocks, and flat borders.
*   **Heuristics:**
    *   **Monospace Integration:** Log listings, code snippets, status outputs, and parameters must be wrapped in `<code/>` or `<pre/>` containers using `JetBrains Mono` or equivalent.
    *   **Interactive Consoles:** Integrate quick-copy buttons for snippets. Terminal emulator areas should have responsive layouts that prevent truncation of long lines.
    *   **Status Indicators:** Use explicit semantic color markers (e.g., solid red circle for critical error, pulsing green for active daemon) accompanied by text labels, never color alone.
    *   **Density:** Extreme. Maximize visible data on-screen; minimize decorative card wrapping and whitespace.

### Developer Tool Code Template (Terminal log stream)
```tsx
import React, { useState } from 'react';
import { Copy, Terminal, Check } from 'lucide-react';

export function DevConsole({ logs }) {
  const [copied, setCopied] = useState(false);
  const command = 'npm run dev --port 8080';
  
  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="w-full bg-[var(--bg-base)] dark:bg-black border border-[var(--border-default)] rounded-[var(--radius-sm)] overflow-hidden font-mono shadow-[var(--shadow-sm)]">
      {/* Console Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <Terminal size={14} /> console.log
        </div>
        <button 
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 text-[10px] bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
        >
          {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      
      {/* Console Body */}
      <div className="p-3 text-xs text-slate-300 space-y-1.5 overflow-y-auto max-h-[300px] leading-relaxed">
        <div className="text-[var(--text-muted)]">$ {command}</div>
        {logs.map((log, index) => (
          <div key={index} className="flex gap-2 items-start">
            <span className="text-[var(--text-muted)] select-none">[{log.time}]</span>
            <span className={log.type === 'error' ? 'text-rose-400' : log.type === 'warn' ? 'text-amber-400' : 'text-emerald-400'}>
              {log.type.toUpperCase()}:
            </span>
            <span className="text-slate-100">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 3. Consumer Marketing & Landing Pages
*   **Goal:** Emotional appeal, high conversion flows, brand differentiation, and typographic pacing.
*   **Visual Tone:** Editorial, Dark Luxury, Swiss Precision, or Organic Natural.
*   **Heuristics:**
    *   **Layout Asymmetry:** Avoid 50/50 hero templates. Use overlapping layers, full-bleed media breakouts, and dramatic grid breaks.
    *   **Typography Hierarchy:** Large, expressive display headings paired with highly legible body columns constrained to `60-70ch` to prevent eye strain.
    *   **Controlled Motion:** Use scroll-driven reveals (e.g., clip-path reveals, stagger entry) to guide reading flow. Avoid constant looping animations.
    *   **Visual Proof Grid:** Grid rows for logos and customer reviews must balance visual weight and scale.

### Landing Page Code Template (Asymmetric Hero Section)
```tsx
import React from 'react';
import { ArrowRight } from 'lucide-react';

export function AsymmetricHero() {
  return (
    <section className="relative w-full py-20 px-4 md:px-8 overflow-hidden bg-[var(--bg-base)]">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Side: Editorial Typography Column (Spans 7 columns) */}
        <div className="lg:col-span-7 space-y-6">
          <span className="inline-flex px-3 py-1 text-[10px] uppercase font-bold tracking-widest bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full">
            Flagship Release
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05] text-[var(--text-primary)] text-wrap-balance">
            Create interfaces that feel <span className="underline decoration-wavy decoration-[var(--color-primary)]">human</span> again.
          </h1>
          <p className="text-base text-[var(--text-secondary)] max-w-[55ch] leading-relaxed text-wrap-pretty">
            We extract clean, reusable design principles from elite developer interfaces and encode them into deterministic token specifications.
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            <button className="flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] active:scale-95 transition-all rounded-[var(--radius-soft)] text-sm font-semibold shadow-[var(--shadow-md)]">
              Get Started <ArrowRight size={16} />
            </button>
            <button className="px-6 py-3 border border-[var(--border-default)] hover:bg-[var(--bg-surface-raised)] transition-all rounded-[var(--radius-soft)] text-sm font-semibold text-[var(--text-secondary)]">
              View Design Kit
            </button>
          </div>
        </div>
        
        {/* Right Side: Visual Accent Panel (Spans 5 columns, asymmetric displacement) */}
        <div className="lg:col-span-5 relative mt-8 lg:mt-0">
          <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-primary)]/20 to-transparent blur-3xl -z-10" />
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] transform hover:-translate-y-1 hover:rotate-1 transition-all duration-300">
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">Picasso v3 Token Output</h3>
            <pre className="text-[10px] font-mono text-[var(--text-secondary)] bg-[var(--bg-base)] p-3 rounded border border-[var(--border-subtle)] overflow-x-auto">
{`{
  "theme": "dark-luxury",
  "primary": "oklch(65% 0.22 250)",
  "geometry": {
    "radius-default": "12px",
    "border-subtle": "1px hairlines"
  }
}`}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
```

---

## 4. AI Interfaces
*   **Goal:** Interactive stream clarity, model transparency, history containment, and prompting accessibility.
*   **Visual Tone:** Neo-Glassmorphism, Dark Luxury, or Soft Minimal.
*   **Heuristics:**
    *   **Streaming Content States:** Show skeleton overlays or pulsing typing indicator bubbles during LLM processing. Stream response blocks chunk-by-chunk without layout shifts.
    *   **System Boundaries:** Visually differentiate user inputs, assistant responses, and system alerts (using background tinting or subtle border lines).
    *   **Actionable Prompts:** Provide quick-start suggestion chips at the bottom of empty chat views.
    *   **Scroll Locking:** Automatically anchor chat containers to the bottom as long messages render, but release lock if the user manually scrolls up to read history.

### AI Chat Code Template (Input Prompt Area)
```tsx
import React, { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';

export function AIChatInput({ onSubmit }) {
  const [input, setInput] = useState('');
  const suggestions = ['Generate SaaS Layout', 'Optimize CSS Grids', 'APCA Contrast Check'];
  
  return (
    <div className="w-full max-w-2xl mx-auto space-y-3 p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] shadow-[var(--shadow-md)]">
      {/* Suggestions Chips Row */}
      <div className="flex flex-wrap gap-2">
        {suggestions.map((sug, i) => (
          <button 
            key={i}
            onClick={() => setInput(sug)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-base)] hover:bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-full text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all font-medium"
          >
            <Sparkles size={12} className="text-[var(--color-primary)]" /> {sug}
          </button>
        ))}
      </div>
      
      {/* Input Text Form */}
      <form 
        onSubmit={(e) => { e.preventDefault(); if (input.trim()) { onSubmit(input); setInput(''); } }}
        className="flex gap-2 items-center border border-[var(--border-default)] rounded-[var(--radius-sm)] px-3 py-2 bg-[var(--bg-base)] focus-within:ring-1 focus-within:ring-[var(--color-primary)] transition-all"
      >
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Antigravity UI to design..." 
          className="flex-1 bg-transparent border-0 outline-none text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)]"
        />
        <button 
          type="submit"
          disabled={!input.trim()}
          className="p-2 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--text-muted)] disabled:opacity-50 disabled:cursor-not-allowed rounded-[var(--radius-sm)] transition-all"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
```

---

## 5. Fintech & Dashboards
*   **Goal:** Financial precision, trust, quick status retrieval, and clean charts.
*   **Visual Tone:** Soft Minimal or Dark Luxury. Green/red semantic indicators should be soft sage and terracotta to avoid harsh, alarmist styling.
*   **Heuristics:**
    *   **Tabular Data Precision:** Use tabular numbers (`font-variant-numeric: tabular-nums`) to align digits perfectly in records.
    *   **Interactive Visualizations:** Chart axes must have visible grids and clear legend labels. Hover tooltips must follow mouse movements and show precise numerical values.

---

## Pre-Flight Checklist
- [ ] Have I verified the visual guidelines match the target Product Category?
- [ ] Have I checked for tabular numbers alignment in Fintech interfaces?
- [ ] Have I checked for monospace format in Developer Tools?

## VBC Protocol (Verification-Before-Completion)
You MUST verify existing code signatures and variables before attempting to modify or call them. No hallucination is permitted.
