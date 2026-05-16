import { describe, expect, it } from 'vitest';

import HomePage from './page';

describe('home page', () => {
  it('renders the landing page component', () => {
    const page = HomePage();

    expect(page.type).toBe('main');
  });
});
