#!/usr/bin/env node
/**
 * changelog.js — Auto-generate CHANGELOG from git history
 * 
 * Categorizes commits by conventional commit type:
 *   feat:     → ✨ Features
 *   fix:      → 🐛 Bug Fixes
 *   perf:     → ⚡ Performance
 *   docs:     → 📝 Documentation
 *   test:     → ✅ Tests
 *   refactor: → ♻️ Refactors
 *   chore:    → 🔧 Chores
 *   BREAKING: → 💥 Breaking Changes
 * 
 * Usage:
 *   node scripts/changelog.js                  → Generate full changelog
 *   node scripts/changelog.js --preview        → Preview unreleased changes
 *   node scripts/changelog.js --since v4.1.0   → Changes since a specific tag
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PKG = require(path.resolve(__dirname, '..', 'package.json'));
const CHANGELOG_PATH = path.resolve(__dirname, '..', 'CHANGELOG.md');

// ── Commit Categories ────────────────────────────────────
const CATEGORIES = {
    feat:     { emoji: '✨', title: 'Features' },
    fix:      { emoji: '🐛', title: 'Bug Fixes' },
    perf:     { emoji: '⚡', title: 'Performance' },
    docs:     { emoji: '📝', title: 'Documentation' },
    test:     { emoji: '✅', title: 'Tests' },
    refactor: { emoji: '♻️', title: 'Refactors' },
    chore:    { emoji: '🔧', title: 'Chores' },
    ci:       { emoji: '🏗️', title: 'CI/CD' },
    style:    { emoji: '🎨', title: 'Style' },
    breaking: { emoji: '💥', title: 'Breaking Changes' },
};

// ── Git Helpers ──────────────────────────────────────────
function git(cmd) {
    try {
        return execSync(`git ${cmd}`, { encoding: 'utf8', timeout: 10000 }).trim();
    } catch {
        return '';
    }
}

function getLatestTag() {
    return git('describe --tags --abbrev=0 2>nul') || git('describe --tags --abbrev=0 2>/dev/null') || '';
}

function getCommits(since) {
    const range = since ? `${since}..HEAD` : 'HEAD';
    const format = '--format="%H||%s||%an||%ai"';
    const raw = git(`log ${range} ${format} --no-merges`);
    if (!raw) return [];

    return raw.split('\n').filter(Boolean).map(line => {
        const [hash, subject, author, date] = line.split('||');
        return { hash: hash?.slice(0, 7), subject, author, date: date?.slice(0, 10) };
    });
}

function categorize(subject) {
    const lower = subject.toLowerCase();

    // Check for BREAKING CHANGE
    if (lower.includes('breaking') || lower.includes('!:')) {
        return 'breaking';
    }

    // Match conventional commit prefix
    const match = subject.match(/^(\w+)(?:\(.+?\))?:\s*/);
    if (match) {
        const type = match[1].toLowerCase();
        if (CATEGORIES[type]) return type;
    }

    // Heuristic fallback
    if (lower.includes('fix') || lower.includes('bug')) return 'fix';
    if (lower.includes('add') || lower.includes('new') || lower.includes('feat')) return 'feat';
    if (lower.includes('doc') || lower.includes('readme')) return 'docs';
    if (lower.includes('test')) return 'test';
    if (lower.includes('refactor') || lower.includes('clean')) return 'refactor';
    if (lower.includes('perf') || lower.includes('optim')) return 'perf';
    if (lower.includes('ci') || lower.includes('workflow')) return 'ci';

    return 'chore';
}

// ── Changelog Generation ─────────────────────────────────
function generateChangelog(commits, version, date) {
    const grouped = {};
    for (const commit of commits) {
        const cat = categorize(commit.subject);
        if (!grouped[cat]) grouped[cat] = [];
        // Strip conventional prefix for cleaner display
        const clean = commit.subject.replace(/^\w+(\(.+?\))?:\s*/, '');
        grouped[cat].push({ ...commit, clean });
    }

    let md = `## [${version}] — ${date}\n\n`;

    // Breaking changes first
    const order = ['breaking', 'feat', 'fix', 'perf', 'refactor', 'docs', 'test', 'ci', 'style', 'chore'];
    for (const cat of order) {
        if (!grouped[cat] || grouped[cat].length === 0) continue;
        const { emoji, title } = CATEGORIES[cat];
        md += `### ${emoji} ${title}\n\n`;
        for (const c of grouped[cat]) {
            md += `- ${c.clean} (\`${c.hash}\`)\n`;
        }
        md += '\n';
    }

    return md;
}

// ── Main ─────────────────────────────────────────────────
function main() {
    const args = process.argv.slice(2);
    const isPreview = args.includes('--preview');
    const sinceIdx = args.indexOf('--since');
    const sinceTag = sinceIdx !== -1 ? args[sinceIdx + 1] : null;

    const since = sinceTag || getLatestTag();
    const commits = getCommits(since);

    if (commits.length === 0) {
        console.log('  ℹ️  No new commits found since', since || 'beginning');
        process.exit(0);
    }

    const today = new Date().toISOString().slice(0, 10);
    const version = isPreview ? 'Unreleased' : PKG.version;

    const changelog = generateChangelog(commits, version, today);

    if (isPreview) {
        console.log('\n  📋 Changelog Preview\n  ' + '─'.repeat(40) + '\n');
        console.log(changelog);
        console.log(`  📊 ${commits.length} commits since ${since || 'initial commit'}`);
        return;
    }

    // Write or prepend to CHANGELOG.md
    const header = `# Changelog\n\nAll notable changes to Tribunal Kit are documented here.\nFormat follows [Keep a Changelog](https://keepachangelog.com/).\n\n`;

    let existing = '';
    if (fs.existsSync(CHANGELOG_PATH)) {
        existing = fs.readFileSync(CHANGELOG_PATH, 'utf8');
        // Remove existing header
        existing = existing.replace(/^# Changelog[\s\S]*?(?=## )/, '');
    }

    const full = header + changelog + existing;
    fs.writeFileSync(CHANGELOG_PATH, full, 'utf8');

    console.log(`  ✔ CHANGELOG.md updated — v${version} (${commits.length} commits)`);
}

main();
