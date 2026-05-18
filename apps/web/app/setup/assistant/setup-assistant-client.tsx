'use client';

import { useEffect, useState } from 'react';

import { api } from '../../../lib/api';
import type { SetupState } from '../../../lib/types';

const defaultSetup: SetupState = {
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

type DriverOption = {
  desc: string;
  hint: string;
  id: 'claude' | 'copilot';
  installCmd: string;
  label: string;
  models: ReadonlyArray<{ label: string; value: string }>;
  placeholder: string;
};

const DRIVERS: DriverOption[] = [
  {
    id: 'copilot',
    label: 'GitHub Copilot CLI',
    desc: 'Use your locally installed Copilot CLI as the AI guide',
    placeholder: 'e.g. /Users/you/.nvm/versions/node/v22/bin/copilot',
    hint: 'Run `which copilot` in your terminal to get the full path. Required when running via Docker.',
    installCmd: 'npm install -g @github/copilot-cli',
    models: [
      { label: 'Default (CLI default)', value: '' },
      { label: 'GPT-4o', value: 'gpt-4o' },
      { label: 'GPT-4o mini', value: 'gpt-4o-mini' },
      { label: 'o1', value: 'o1' },
      { label: 'o3-mini', value: 'o3-mini' },
      { label: 'Claude 3.5 Sonnet', value: 'claude-3.5-sonnet' },
    ],
  },
  {
    id: 'claude',
    label: 'Claude CLI',
    desc: "Use Anthropic's Claude CLI as the AI guide",
    placeholder: 'e.g. /usr/local/bin/claude',
    hint: 'Run `which claude` in your terminal to get the full path. Required when running via Docker.',
    installCmd: 'npm install -g @anthropic-ai/claude-cli',
    models: [
      { label: 'Default (CLI default)', value: '' },
      { label: 'Claude Sonnet 4.5', value: 'claude-sonnet-4-5' },
      { label: 'Claude Opus 4.5', value: 'claude-opus-4-5' },
      { label: 'Claude Haiku 3.5', value: 'claude-haiku-3-5' },
    ],
  },
];

export function SetupAssistantClient() {
  const [setup, setSetup] = useState<SetupState>(defaultSetup);
  const [cliPath, setCliPath] = useState('');
  const [model, setModel] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ message: string; ok: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const driver = setup.agentDriver;

  useEffect(() => {
    void api.getSetup().then((s) => {
      setSetup(s);
      setCliPath(s.agentDriver === 'claude' ? (s.claudePath ?? '') : (s.copilotPath ?? ''));
      setModel(s.agentModel ?? '');
    });
  }, []);

  const selectDriver = (d: 'claude' | 'copilot') => {
    setSetup((prev) => ({ ...prev, agentDriver: d }));
    setCliPath(d === 'claude' ? (setup.claudePath ?? '') : (setup.copilotPath ?? ''));
    setModel('');
    setTestResult(null);
  };

  const buildPayload = (): SetupState => ({
    ...setup,
    agentModel: model.trim().length > 0 ? model.trim() : null,
    claudePath: driver === 'claude' ? cliPath || null : setup.claudePath,
    copilotPath: driver === 'copilot' ? cliPath || null : setup.copilotPath,
  });

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      await api.saveSetup(buildPayload());
      const result = await api.testAgentHealth();
      setTestResult(result.health);
    } catch (e) {
      setTestResult({
        ok: false,
        message: e instanceof Error ? e.message : 'Connection failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const save = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await api.saveSetup(buildPayload());
      window.location.href = '/setup';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const currentDriver = DRIVERS.find((d) => d.id === driver) ?? DRIVERS[0];

  return (
    <>
      <a className="setup-back-link" href="/setup">
        ← Back to Setup
      </a>

      <div className="setup-sub-title">
        <h1>Connect Your Guide</h1>
        <p>Choose which locally installed AI CLI to use as your learning guide</p>
      </div>

      <div className="setup-form-card">
        {/* Driver selector */}
        <fieldset className="setup-field">
          <legend className="setup-field__legend">AI Agent</legend>
          <div aria-label="AI agent selection" className="setup-driver-selector" role="radiogroup">
            {DRIVERS.map((d) => (
              <button
                aria-checked={driver === d.id}
                className={`setup-driver-option${driver === d.id ? ' selected' : ''}`}
                key={d.id}
                role="radio"
                type="button"
                onClick={() => selectDriver(d.id)}
              >
                <strong className="setup-driver-option__name">{d.label}</strong>
                <span className="setup-driver-option__desc">{d.desc}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="setup-field">
          <label htmlFor="cli-path">
            {driver === 'copilot' ? 'Copilot CLI' : 'Claude CLI'} Path{' '}
            <span className="setup-field__optional">(optional)</span>
          </label>
          <input
            id="cli-path"
            placeholder={currentDriver?.placeholder}
            type="text"
            value={cliPath}
            onChange={(e) => {
              setCliPath(e.target.value);
              setTestResult(null);
            }}
          />
          <p className="setup-field__hint">{currentDriver?.hint}</p>
        </div>

        {/* Model selector */}
        <div className="setup-field">
          <label htmlFor="model-select">
            Model <span className="setup-field__optional">(optional)</span>
          </label>
          <select
            id="model-select"
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              setTestResult(null);
            }}
          >
            {currentDriver?.models.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <p className="setup-field__hint">
            Override the model used for AI responses. Leave as &ldquo;Default&rdquo; to use the
            CLI&apos;s default model.
          </p>
        </div>

        {/* Install hint */}
        <div className="setup-install-hint">
          <span className="setup-install-hint__label">Install command:</span>
          <code>{currentDriver?.installCmd}</code>
        </div>

        {/* Test connection */}
        <button
          className="setup-test-btn"
          disabled={isTesting}
          type="button"
          onClick={() => void testConnection()}
        >
          {isTesting ? 'Testing connection…' : 'Test Connection'}
        </button>

        {testResult !== null && (
          <div className="setup-conn-status" style={testResult.ok ? {} : { background: '#fdeaea' }}>
            <span aria-hidden="true">{testResult.ok ? '✅' : '❌'}</span>
            <p>
              {testResult.ok ? 'Connection successful — your guide is ready' : testResult.message}
            </p>
          </div>
        )}

        {error !== null && (
          <p style={{ color: 'var(--error)', fontSize: '0.875rem', margin: 0 }}>{error}</p>
        )}

        <div className="setup-divider" />

        <button
          className="setup-save-btn"
          disabled={isSaving}
          type="button"
          onClick={() => void save()}
        >
          {isSaving ? 'Saving…' : 'Save & Continue'}
        </button>
      </div>
    </>
  );
}
