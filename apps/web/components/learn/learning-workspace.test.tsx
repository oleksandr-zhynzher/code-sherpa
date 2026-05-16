import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LearningWorkspace } from './learning-workspace';

describe('LearningWorkspace', () => {
  it('renders the designed exercise workspace sections', () => {
    const markup = renderToStaticMarkup(<LearningWorkspace />);

    expect(markup).toContain('All systems ready');
    expect(markup).toContain('Continue where you left off');
    expect(markup).toContain('Arrays &amp; Hash Maps');
    expect(markup).toContain('Two Sum');
    expect(markup).toContain('Your Solution');
    expect(markup).toContain('Check My Answer');
    expect(markup).toContain('All tests passed!');
    expect(markup).toContain('Guide');
    expect(markup).toContain('Visualize');
    expect(markup).toContain('Progress');
    expect(markup).toContain('Small hint');
  });
});
