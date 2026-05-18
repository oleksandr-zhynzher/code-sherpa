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

const MODELS = ['Claude 3.5 Sonnet', 'Claude 3 Haiku', 'GitHub Copilot'];

export function SetupAssistantClient() {
  const [setup, setSetup] = useState<SetupState>(defaultSetup);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(MODELS[0]);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.getSetup().then((s) => {
      setSetup(s);
      setApiKey(s.claudePath ?? s.copilotPath ?? '');
    });
  }, []);

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      // Save the key temporarily to test; the backend /api/setup will validate
      await api.saveSetup({ ...setup, claudePath: apiKey || null, copilotPath: apiKey || null });
      setTestResult('success');
    } catch {
      setTestResult('error');
    } finally {
      setIsTesting(false);
    }
  };

  const save = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const driverPath =
        setup.agentDriver === 'claude' ? { claudePath: apiKey } : { copilotPath: apiKey };
      await api.saveSetup({ ...setup, ...driverPath });
      window.location.href = '/setup';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save configuration.');
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
        <h1>Connect Your Guide</h1>
        <p>Set up the AI assistant that will help you learn</p>
      </div>

      <div className="setup-form-card">
        <div className="setup-field">
          <label htmlFor="api-key">API Key</label>
          <input
            id="api-key"
            placeholder="sk-..."
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <p className="setup-field__hint">
            Your key stays on your device and is never sent to external servers
          </p>
        </div>

        <div className="setup-field">
          <label htmlFor="model">Model</label>
          <select id="model" value={model} onChange={(e) => setModel(e.target.value)}>
            {MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <button
          className="setup-test-btn"
          disabled={isTesting}
          type="button"
          onClick={() => void testConnection()}
        >
          {isTesting ? 'Testing…' : 'Test Connection'}
        </button>

        {testResult === 'success' && (
          <div className="setup-conn-status">
            <span>✅</span>
            <p>Connection successful — your guide is ready</p>
          </div>
        )}
        {testResult === 'error' && (
          <div className="setup-conn-status" style={{ background: '#fdeaea' }}>
            <span>❌</span>
            <p>Connection failed — check your API key and try again</p>
          </div>
        )}

        {error && <p style={{ color: 'var(--error)', fontSize: '0.875rem', margin: 0 }}>{error}</p>}

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
