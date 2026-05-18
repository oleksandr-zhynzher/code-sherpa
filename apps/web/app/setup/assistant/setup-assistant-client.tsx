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

type DriverOption = {
  desc: string;
  hint: string;
  id: 'claude' | 'copilot';
  installCmd: string;
  label: string;
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
  },
  {
    id: 'claude',
    label: 'Claude CLI',
    desc: "Use Anthropic's Claude CLI as the AI guide",
    placeholder: 'e.g. /usr/local/bin/claude',
    hint: 'Run `which claude` in your terminal to get the full path. Required when running via Docker.',
    installCmd: 'npm install -g @anthropic-ai/claude-cli',
  },
];

export function SetupAssistantClient() {
  const [setup, setSetup] = useState<SetupState>(defaultSetup);
  const [cliPath, setCliPath] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ message: string; ok: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const driver = setup.agentDriver;

  useEffect(() => {
    void api.getSetup().then((s) => {
      setSetup(s);
      setCliPath(s.agentDriver === 'claude' ? (s.claudePath ?? '') : (s.copilotPath ?? ''));
    });
  }, []);

  const selectDriver = (d: 'claude' | 'copilot') => {
    setSetup((prev) => ({ ...prev, agentDriver: d }));
    setCliPath(d === 'claude' ? (setup.claudePath ?? '') : (setup.copilotPath ?? ''));
    setTestResult(null);
  };

  const buildPayload = (): SetupState => ({
    ...setup,
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
