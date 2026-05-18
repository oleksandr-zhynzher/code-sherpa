import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { SetupState } from '../../lib/types';
import { SetupConfiguration } from './setup-configuration';

const setup: SetupState = {
  agentDriver: 'copilot',
  agentModel: null,
  autoSaveProgress: true,
  claudePath: '/usr/local/bin/claude',
  copilotPath: '/usr/local/bin/copilot',
  exerciseLanguage: 'python',
  guideTone: 'encouraging',
  repoUrl: 'git@github.com:me/algos-journal.git',
  safeRunChecks: true,
  workspacePath: './workspace',
};

describe('SetupConfiguration', () => {
  it('renders assistant, folder, and preference configuration sections', () => {
    const markup = renderToStaticMarkup(
      <SetupConfiguration draft={setup} isSaving={false} onChange={() => {}} onSave={() => {}} />,
    );

    expect(markup).toContain('Connect Your Guide');
    expect(markup).toContain('Agent runtime');
    expect(markup).toContain('/usr/local/bin/copilot');
    expect(markup).toContain('Connect Your Practice Folder');
    expect(markup).toContain('Local folder');
    expect(markup).toContain('./workspace');
    expect(markup).toContain('git@github.com:me/algos-journal.git');
    expect(markup).toContain('Your Preferences');
    expect(markup).toContain('Exercise Language');
    expect(markup).toContain('Ask before running checks');
    expect(markup).toContain('Save Preferences');
  });
});
