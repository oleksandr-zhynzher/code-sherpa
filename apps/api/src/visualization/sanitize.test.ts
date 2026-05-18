import { describe, expect, it } from 'vitest';

import { sanitizeVisualizationPayload } from './sanitize.js';

const unsafeContentMsg = 'SVG payload contains unsafe content';
const mermaidDiagram = 'graph TD\n  A --> B';

describe('sanitizeVisualizationPayload', () => {
  describe('mermaid', () => {
    it('accepts a valid mermaid diagram', () => {
      expect(sanitizeVisualizationPayload('mermaid', mermaidDiagram)).toBe(mermaidDiagram);
    });

    it('trims surrounding whitespace', () => {
      expect(sanitizeVisualizationPayload('mermaid', `  ${mermaidDiagram}  `)).toBe(mermaidDiagram);
    });

    it('rejects an empty payload', () => {
      expect(() => sanitizeVisualizationPayload('mermaid', '   ')).toThrow(
        'Mermaid payload must not be empty',
      );
    });
  });

  describe('svg', () => {
    it('accepts a safe SVG', () => {
      const payload =
        '<svg xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100"/></svg>';

      expect(sanitizeVisualizationPayload('svg', payload)).toBe(payload);
    });

    it('rejects SVG with a script tag', () => {
      expect(() =>
        sanitizeVisualizationPayload('svg', '<svg><script>alert(1)</script></svg>'),
      ).toThrow(unsafeContentMsg);
    });

    it('rejects SVG with javascript: href', () => {
      expect(() =>
        sanitizeVisualizationPayload('svg', '<svg><a href="javascript:alert(1)">click</a></svg>'),
      ).toThrow(unsafeContentMsg);
    });

    it('rejects SVG with an event handler attribute', () => {
      expect(() => sanitizeVisualizationPayload('svg', '<svg onload="alert(1)"></svg>')).toThrow(
        unsafeContentMsg,
      );
    });

    it('rejects SVG with an iframe', () => {
      expect(() =>
        sanitizeVisualizationPayload('svg', '<svg><iframe src="evil.html"/></svg>'),
      ).toThrow(unsafeContentMsg);
    });
  });

  describe('chartjs', () => {
    it('accepts a valid Chart.js config object', () => {
      const config = { data: { datasets: [], labels: [] }, type: 'bar' };
      const payload = JSON.stringify(config);

      expect(sanitizeVisualizationPayload('chartjs', payload)).toBe(JSON.stringify(config));
    });

    it('rejects invalid JSON', () => {
      expect(() => sanitizeVisualizationPayload('chartjs', 'not json')).toThrow('valid JSON');
    });

    it('rejects a JSON array (not an object)', () => {
      expect(() => sanitizeVisualizationPayload('chartjs', '[]')).toThrow('JSON object');
    });
  });

  describe('html', () => {
    it('always rejects html kind', () => {
      expect(() => sanitizeVisualizationPayload('html', '<p>hello</p>')).toThrow('not supported');
    });
  });
});
