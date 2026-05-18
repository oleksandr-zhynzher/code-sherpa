import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ProductShell } from './product-shell';

describe('ProductShell', () => {
  it('renders the primary navigation with the active page marked', () => {
    const markup = renderToStaticMarkup(
      <ProductShell activePath="/setup">
        <h1>Setup</h1>
      </ProductShell>,
    );

    expect(markup).toContain('aria-label="Primary navigation"');
    expect(markup).toContain('href="/"');
    expect(markup).toContain('href="/setup"');
    expect(markup).toContain('href="/learn"');
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain('<main');
    expect(markup).toContain('Setup');
  });
});
