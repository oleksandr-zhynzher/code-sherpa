import type { ChangeEvent, FormEvent, ReactNode } from 'react';

import type { SetupState } from '../../lib/types';
import { Button, TextField, Toggle } from '../ui/design-system';

type SetupConfigurationProps = Readonly<{
  draft: SetupState;
  isSaving: boolean;
  onChange: (draft: SetupState) => void;
  onSave: () => void;
}>;

function updateDraft<K extends keyof SetupState>(
  draft: SetupState,
  key: K,
  value: SetupState[K],
): SetupState {
  return {
    ...draft,
    [key]: value,
  };
}

export function SetupConfiguration({
  draft,
  isSaving,
  onChange,
  onSave,
}: SetupConfigurationProps): ReactNode {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave();
  };

  const updateText =
    (key: 'claudePath' | 'copilotPath' | 'repoUrl') =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      onChange(updateDraft(draft, key, event.target.value));
    };

  return (
    <form className="setup-config" onSubmit={handleSubmit}>
      <section className="setup-config__panel" id="assistant">
        <div>
          <a className="setup-config__back" href="/setup">
            Back to Setup
          </a>
          <h2>Connect Your Guide</h2>
          <p>Set up the AI assistant that will help you learn.</p>
        </div>
        <label className="cs-field" htmlFor="agent-runtime">
          <span>Agent runtime</span>
          <select
            id="agent-runtime"
            onChange={(event) =>
              onChange(
                updateDraft(draft, 'agentDriver', event.target.value as SetupState['agentDriver']),
              )
            }
            value={draft.agentDriver}
          >
            <option value="copilot">GitHub Copilot CLI</option>
            <option value="claude">Claude CLI</option>
          </select>
        </label>
        <TextField
          id="copilot-path"
          label="Copilot CLI path"
          onChange={updateText('copilotPath')}
          placeholder="/usr/local/bin/copilot"
          value={draft.copilotPath ?? ''}
        />
        <TextField
          id="claude-path"
          label="Claude CLI path"
          onChange={updateText('claudePath')}
          placeholder="/usr/local/bin/claude"
          value={draft.claudePath ?? ''}
        />
        <p className="setup-card__hint">Your assistant configuration stays on this device.</p>
      </section>

      <section className="setup-config__panel" id="practice-folder">
        <div>
          <a className="setup-config__back" href="/setup">
            Back to Setup
          </a>
          <h2>Connect Your Practice Folder</h2>
          <p>Choose where your work and progress are saved.</p>
        </div>
        <TextField
          id="repo-url"
          label="GitHub Repository"
          onChange={updateText('repoUrl')}
          placeholder="git@github.com:me/algos-journal.git"
          value={draft.repoUrl ?? ''}
        />
        <p className="setup-card__hint">Workspace: {draft.workspacePath}</p>
      </section>

      <section className="setup-config__panel" id="preferences">
        <div>
          <a className="setup-config__back" href="/setup">
            Back to Setup
          </a>
          <h2>Your Preferences</h2>
          <p>Customize language, safety, and guide behavior.</p>
        </div>
        <label className="cs-field" htmlFor="exercise-language">
          <span>Exercise Language</span>
          <select
            id="exercise-language"
            onChange={(event) =>
              onChange(
                updateDraft(
                  draft,
                  'exerciseLanguage',
                  event.target.value as SetupState['exerciseLanguage'],
                ),
              )
            }
            value={draft.exerciseLanguage}
          >
            <option value="python">Python</option>
            <option value="typescript">TypeScript</option>
          </select>
        </label>
        <label className="cs-field" htmlFor="guide-tone">
          <span>Guide Tone</span>
          <select
            id="guide-tone"
            onChange={(event) =>
              onChange(
                updateDraft(draft, 'guideTone', event.target.value as SetupState['guideTone']),
              )
            }
            value={draft.guideTone}
          >
            <option value="encouraging">Encouraging</option>
            <option value="direct">Direct</option>
            <option value="socratic">Socratic</option>
          </select>
        </label>
        <Toggle
          id="safe-run-checks"
          label="Ask before running checks"
          onPressedChange={(pressed) => onChange(updateDraft(draft, 'safeRunChecks', pressed))}
          pressed={draft.safeRunChecks}
        />
        <Toggle
          id="auto-save-progress"
          label="Auto-save progress"
          onPressedChange={(pressed) => onChange(updateDraft(draft, 'autoSaveProgress', pressed))}
          pressed={draft.autoSaveProgress}
        />
      </section>

      <div className="setup-config__actions">
        <a className="cs-button cs-button--secondary" href="/setup">
          Cancel
        </a>
        <Button disabled={isSaving} type="submit">
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </form>
  );
}
