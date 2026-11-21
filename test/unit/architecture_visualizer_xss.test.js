'use strict';

const path = require('path');

describe('TK-010: Architecture Visualizer DOM XSS Prevention', () => {
  const scriptsDir = path.resolve(__dirname, '../../.agent/scripts');
  const { ArchitectureVisualizer } = require(path.join(scriptsDir, 'architecture_visualizer'));

  test('renderHtml includes strict Content-Security-Policy header', () => {
    const visualizer = new ArchitectureVisualizer({ entities: [], relationships: [] }, {});
    const html = visualizer.renderHtml();

    expect(html).toContain('<meta http-equiv="Content-Security-Policy"');
    expect(html).toContain("default-src 'none'");
    expect(html).toContain("style-src 'unsafe-inline'");
    expect(html).toContain("script-src 'unsafe-inline'");
  });

  test('renderHtml removes third-party Google Fonts CDN references', () => {
    const visualizer = new ArchitectureVisualizer({ entities: [], relationships: [] }, {});
    const html = visualizer.renderHtml();

    expect(html).not.toContain('fonts.googleapis.com');
    expect(html).not.toContain('fonts.gstatic.com');
  });

  test('renderHtml uses safe textContent and DOM creation instead of innerHTML for evidence and search', () => {
    const visualizer = new ArchitectureVisualizer({ entities: [], relationships: [] }, {});
    const html = visualizer.renderHtml();

    // Verify raw unsafe innerHTML bindings were removed
    expect(html).not.toContain('evList.innerHTML = sources.map');
    expect(html).not.toContain('searchDropdown.innerHTML = matches');

    // Verify safe DOM methods are present in the client script
    expect(html).toContain('document.createElement');
    expect(html).toContain('textContent');
  });
});
