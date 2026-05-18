import type { Visualization } from '../domain/types.js';
import { ValidationError } from '../http/errors.js';

// Fixed patterns for SVG safety checks. Avoid adjacent quantifiers.
// The javascript: pattern already catches href="javascript:..." and xlink:href="javascript:..."
const UNSAFE_SVG_PATTERNS = [
  /<script[\s>]/iu,
  /javascript:/iu,
  /\bon\w+=/iu,
  /<iframe[\s>]/iu,
  /<object[\s>]/iu,
  /<embed[\s>]/iu,
  /data:text\/html/iu,
];

function sanitizeSvg(payload: string): string {
  for (const pattern of UNSAFE_SVG_PATTERNS) {
    if (pattern.test(payload)) {
      throw new ValidationError('SVG payload contains unsafe content');
    }
  }

  return payload;
}

function sanitizeMermaid(payload: string): string {
  const trimmed = payload.trim();

  if (trimmed.length === 0) {
    throw new ValidationError('Mermaid payload must not be empty');
  }

  return trimmed;
}

function sanitizeChartJs(payload: string): string {
  let parsed: unknown;

  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new ValidationError('ChartJS payload must be valid JSON');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new ValidationError('ChartJS payload must be a JSON object');
  }

  return JSON.stringify(parsed);
}

export function sanitizeVisualizationPayload(kind: Visualization['kind'], payload: string): string {
  switch (kind) {
    case 'html':
      throw new ValidationError('HTML visualization kind is not supported');
    case 'svg':
      return sanitizeSvg(payload);
    case 'mermaid':
      return sanitizeMermaid(payload);
    case 'chartjs':
      return sanitizeChartJs(payload);
  }
}
