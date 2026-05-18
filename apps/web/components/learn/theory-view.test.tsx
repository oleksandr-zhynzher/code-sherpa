import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { TheoryView } from './theory-view';

describe('TheoryView', () => {
  it('renders the designed theory lesson and guide prompt', () => {
    const markup = renderToStaticMarkup(<TheoryView />);

    expect(markup).toContain('What is a Hash Map?');
    expect(markup).toContain('KEY CONCEPT');
    expect(markup).toContain('How It Works');
    expect(markup).toContain('Example: Python Dictionary');
    expect(markup).toContain('Time Complexity');
    expect(markup).toContain('chaining and open addressing');
    expect(markup).toContain('Selected from theory');
    expect(markup).toContain('Can you explain what chaining and open addressing mean?');
  });
});
