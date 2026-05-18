'use client';

import { useEffect, useState } from 'react';

import { api } from '../../../lib/api';
import type { SetupState } from '../../../lib/types';

const defaultSetup: SetupState = {
  agentDriver: 'copilot',
  autoSaveProgress: true,
  claudePath: null,
  copilotPath: null,
  exerciseLanguage: 'python',
  guideTone: 'encouraging',
  repoUrl: null,
  safeRunChecks: true,
  workspacePath: './workspace',
};

type ExerciseDifficulty = 'beginner' | 'intermediate' | 'advanced';
type HelpStyle = 'step-by-step' | 'overview' | 'minimal';

type LocalPrefs = {
  difficulty: ExerciseDifficulty;
  showHints: boolean;
  askBeforeSaving: boolean;
  showDiagrams: boolean;
  helpStyle: HelpStyle;
};

export function SetupPreferencesClient() {
  const [setup, setSetup] = useState<SetupState>(defaultSetup);
  const [local, setLocal] = useState<LocalPrefs>({
    difficulty: 'intermediate',
    showHints: true,
    askBeforeSaving: false,
    showDiagrams: true,
    helpStyle: 'step-by-step',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.getSetup().then(setSetup);
  }, []);

  function patchSetup(partial: Partial<SetupState>) {
    setSetup((prev) => ({ ...prev, ...partial }));
  }

  function patchLocal(partial: Partial<LocalPrefs>) {
    setLocal((prev) => ({ ...prev, ...partial }));
  }

  const save = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await api.saveSetup(setup);
      window.location.href = '/setup';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save preferences.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <a className="setup-back-link" href="/setup">
        ← Back to Setup
      </a>

      <div className="setup-sub-title">
        <h1>Your Preferences</h1>
        <p>Customise how code-sherpa guides and challenges you</p>
      </div>

      {/* Exercise Settings */}
      <div className="setup-pref-card">
        <div className="setup-pref-card__header">
          <div className="setup-pref-card__icon">📚</div>
          <div className="setup-pref-card__header-text">
            <h3>Exercise Settings</h3>
            <p>Control how exercises are generated and presented</p>
          </div>
        </div>
        <div className="setup-pref-card__body">
          <div className="setup-pref-field">
            <div className="setup-pref-field__left">
              <label htmlFor="exercise-language">Exercise Language</label>
              <p>The language used for generated code exercises</p>
            </div>
            <div className="setup-pref-select">
              <select
                id="exercise-language"
                value={setup.exerciseLanguage}
                onChange={(e) =>
                  patchSetup({ exerciseLanguage: e.target.value as 'python' | 'typescript' })
                }
              >
                <option value="python">Python</option>
                <option value="typescript">TypeScript</option>
              </select>
            </div>
          </div>

          <div className="setup-pref-field">
            <div className="setup-pref-field__left">
              <label htmlFor="difficulty">Default Difficulty</label>
              <p>Starting difficulty level for new exercises</p>
            </div>
            <div className="setup-pref-select">
              <select
                id="difficulty"
                value={local.difficulty}
                onChange={(e) => patchLocal({ difficulty: e.target.value as ExerciseDifficulty })}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div className="setup-pref-field">
            <div className="setup-pref-field__left">
              <span className="setup-pref-label">Show Hints First</span>
              <p>Show a hint before revealing the solution</p>
            </div>
            <ToggleSwitch
              checked={local.showHints}
              id="show-hints"
              onChange={(v) => patchLocal({ showHints: v })}
            />
          </div>
        </div>
      </div>

      {/* Safety Choices */}
      <div className="setup-pref-card">
        <div className="setup-pref-card__header">
          <div className="setup-pref-card__icon">🛡️</div>
          <div className="setup-pref-card__header-text">
            <h3>Safety Choices</h3>
            <p>Control what happens automatically vs. what requires your approval</p>
          </div>
        </div>
        <div className="setup-pref-card__body">
          <div className="setup-pref-field">
            <div className="setup-pref-field__left">
              <span className="setup-pref-label">Ask before running checks</span>
              <p>Prompt before auto-running test or lint commands</p>
            </div>
            <ToggleSwitch
              checked={setup.safeRunChecks}
              id="safe-run"
              onChange={(v) => patchSetup({ safeRunChecks: v })}
            />
          </div>

          <div className="setup-pref-field">
            <div className="setup-pref-field__left">
              <span className="setup-pref-label">Ask before saving big changes</span>
              <p>Confirm before overwriting existing practice files</p>
            </div>
            <ToggleSwitch
              checked={local.askBeforeSaving}
              id="ask-before-saving"
              onChange={(v) => patchLocal({ askBeforeSaving: v })}
            />
          </div>

          <div className="setup-pref-field">
            <div className="setup-pref-field__left">
              <span className="setup-pref-label">Auto-save progress</span>
              <p>Automatically save your work as you go</p>
            </div>
            <ToggleSwitch
              checked={setup.autoSaveProgress}
              id="auto-save"
              onChange={(v) => patchSetup({ autoSaveProgress: v })}
            />
          </div>
        </div>
      </div>

      {/* Guide Behavior */}
      <div className="setup-pref-card">
        <div className="setup-pref-card__header">
          <div className="setup-pref-card__icon">🧭</div>
          <div className="setup-pref-card__header-text">
            <h3>Guide Behavior</h3>
            <p>Shape how your AI guide communicates and teaches</p>
          </div>
        </div>
        <div className="setup-pref-card__body">
          <div className="setup-pref-field">
            <div className="setup-pref-field__left">
              <label htmlFor="help-style">Help Style</label>
              <p>How the guide breaks down complex topics</p>
            </div>
            <div className="setup-pref-select">
              <select
                id="help-style"
                value={local.helpStyle}
                onChange={(e) => patchLocal({ helpStyle: e.target.value as HelpStyle })}
              >
                <option value="step-by-step">Step by step</option>
                <option value="overview">Overview first</option>
                <option value="minimal">Minimal</option>
              </select>
            </div>
          </div>

          <div className="setup-pref-field">
            <div className="setup-pref-field__left">
              <span className="setup-pref-label">Show visual diagrams</span>
              <p>Include Mermaid diagrams and charts in explanations</p>
            </div>
            <ToggleSwitch
              checked={local.showDiagrams}
              id="show-diagrams"
              onChange={(v) => patchLocal({ showDiagrams: v })}
            />
          </div>

          <div className="setup-pref-field">
            <div className="setup-pref-field__left">
              <label htmlFor="guide-tone">Guide Tone</label>
              <p>The communication style your guide uses</p>
            </div>
            <div className="setup-pref-select">
              <select
                id="guide-tone"
                value={setup.guideTone}
                onChange={(e) =>
                  patchSetup({ guideTone: e.target.value as SetupState['guideTone'] })
                }
              >
                <option value="encouraging">Encouraging</option>
                <option value="direct">Direct</option>
                <option value="socratic">Socratic</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {error && <p style={{ color: 'var(--error)', fontSize: '0.875rem', margin: 0 }}>{error}</p>}

      <div className="setup-action-bar">
        <div className="setup-action-bar__hint">
          <span>💾</span>
          Changes take effect immediately
        </div>
        <div className="setup-action-bar__buttons">
          <a className="setup-cancel-btn" href="/setup">
            Cancel
          </a>
          <button
            className="setup-save-prefs-btn"
            disabled={isSaving}
            type="button"
            onClick={() => void save()}
          >
            ✓ {isSaving ? 'Saving…' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </>
  );
}

type ToggleSwitchProps = Readonly<{
  checked: boolean;
  id: string;
  onChange: (value: boolean) => void;
}>;

function ToggleSwitch({ checked, id, onChange }: ToggleSwitchProps) {
  return (
    <button
      aria-checked={checked}
      aria-label={id}
      className="cs-toggle"
      role="switch"
      style={{
        background: checked ? 'var(--accent-primary)' : 'var(--surface-input)',
        border: '1px solid var(--border-subtle)',
      }}
      type="button"
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}
