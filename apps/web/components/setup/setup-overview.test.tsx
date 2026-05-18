import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { SetupState } from '../../lib/types';
import { SetupOverview } from './setup-overview';

const baseSetup: SetupState = {
  agentDriver: 'copilot',
  agentModel: null,
  autoSaveProgress: true,
  claudePath: null,
  copilotPath: null,
  exerciseLanguage: 'python',
  guideTone: 'encouraging',
  repoUrl: null,
  safeRunChecks: true,
  workspacePath: './workspace',
};

describe('SetupOverview', () => {
  it('renders the healthy setup state', () => {
    const markup = renderToStaticMarkup(
      <SetupOverview
        setup={{
          ...baseSetup,
          claudePath: '/usr/local/bin/claude',
          copilotPath: '/usr/local/bin/copilot',
          repoUrl: 'git@github.com:me/algos-journal.git',
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
          ...baseSetup,
          claudePath: null,
          repoUrl: null,
          workspacePath: '',
        }}
      />,
    );

    expect(markup).toContain('Some connections need attention — fix them below to continue');
    expect(markup).toContain('Disconnected');
    expect(markup).toContain('Not set');
    expect(markup).toContain('Configure');
  });
});
