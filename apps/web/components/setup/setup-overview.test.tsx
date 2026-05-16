import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SetupOverview } from './setup-overview';

describe('SetupOverview', () => {
  it('renders the healthy setup state', () => {
    const markup = renderToStaticMarkup(
      <SetupOverview
        setup={{
          claudePath: '/usr/local/bin/claude',
          repoUrl: 'git@github.com:me/algos-journal.git',
          workspacePath: './workspace',
        }}
      />,
    );

    expect(markup).toContain('All systems ready');
    expect(markup).toContain('Go to Learning Space');
    expect(markup).toContain('Connected');
    expect(markup).toContain('2 preferences set');
  });

  it('renders actionable connection errors when setup is incomplete', () => {
    const markup = renderToStaticMarkup(
      <SetupOverview
        setup={{
          claudePath: null,
          repoUrl: null,
          workspacePath: './workspace',
        }}
      />,
    );

    expect(markup).toContain('Some connections need attention — fix them below to continue');
    expect(markup).toContain('reach your guide');
    expect(markup).toContain('Your practice folder is not connected yet');
    expect(markup).toContain('Reconnect');
    expect(markup).toContain('Fix Connection');
  });
});
