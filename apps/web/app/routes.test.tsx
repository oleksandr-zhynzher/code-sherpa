import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import LearnPage from './learn/page';
import HomePage from './page';
import SetupPage from './setup/page';

describe('app routes', () => {
  it('renders the home route as the product entry point', () => {
    const markup = renderToStaticMarkup(<HomePage />);

    expect(markup).toContain('Your guide to mastering problem-solving');
    expect(markup).toContain('Built for learners who want to grow');
    expect(markup).toContain('Four steps to the summit');
    expect(markup).toContain('A guide, not a judge');
    expect(markup).toContain('/images/generated-1778944760160.png');
    expect(markup).toContain('/images/generated-1778948563108.png');
    expect(markup).toContain('href="/learn"');
  });

  it('renders setup and learning routes', () => {
    const setupMarkup = renderToStaticMarkup(<SetupPage />);
    const learnMarkup = renderToStaticMarkup(<LearnPage />);

    expect(setupMarkup).toContain('Connect what you need');
    expect(setupMarkup).toContain('AI Assistant');
    expect(learnMarkup).toContain('code-sherpa POC');
    expect(learnMarkup).toContain('Generate a plan');
  });
});
